-- 0167: kalendár eventov do mobilu (odber cez odkaz).
-- Používateľ si vytvorí tajný odkaz a pridá ho do Google / Apple kalendára, TickTicku či Outlooku.
-- „Moje“ = eventy, kde je v posádke (a neodmietol), „všetky“ = všetky eventy firmy (len s právom vidieť eventy).
-- V databáze je len odtlačok (SHA-256) odkazu, nie odkaz samotný. Odkaz sa dá kedykoľvek zrušiť a pri
-- každom načítaní sa znova overí, že je človek stále vo firme a má oprávnenie.
-- Kalendár číta len Edge funkcia calendar-feed (služobný kľúč) – nikto iný funkciu calendar_feed_events nespustí.

create table if not exists public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  scope text not null check (scope in ('mine', 'all')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  app_url text not null default '' check (app_url = '' or (app_url ~* '^https?://' and char_length(app_url) <= 200)),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (user_id, company_id, scope)
);
create index if not exists calendar_feeds_company_idx on public.calendar_feeds (company_id);

alter table public.calendar_feeds enable row level security;
drop policy if exists calendar_feeds_select on public.calendar_feeds;
drop policy if exists calendar_feeds_delete on public.calendar_feeds;
create policy calendar_feeds_select on public.calendar_feeds for select to authenticated using (user_id = auth.uid());
create policy calendar_feeds_delete on public.calendar_feeds for delete to authenticated using (user_id = auth.uid());
revoke all on public.calendar_feeds from anon, authenticated;
-- Odtlačok sa nečíta ani v appke; vytvára sa len cez funkciu.
grant select (id, company_id, scope, created_at, last_used_at), delete on public.calendar_feeds to authenticated;

-- Nový odkaz (starý rovnakého druhu prestane fungovať). Vráti odkaz – ukáže sa len raz.
create or replace function public.create_calendar_feed(_company_id uuid, _scope text, _app_url text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  _token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if _scope not in ('mine', 'all') then
    raise exception 'Neznámy druh kalendára' using errcode = '22023';
  end if;
  if not public.is_company_member(_company_id) or (_scope = 'all' and not public.can(_company_id, 'events.view')) then
    raise exception 'Na tento kalendár nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  delete from public.calendar_feeds where user_id = auth.uid() and company_id = _company_id and scope = _scope;
  insert into public.calendar_feeds (user_id, company_id, scope, token_hash, app_url)
  values (
    auth.uid(), _company_id, _scope, encode(sha256(convert_to(_token, 'UTF8')), 'hex'),
    case when coalesce(_app_url, '') ~* '^https?://' and char_length(_app_url) <= 200 then _app_url else '' end
  );
  return _token;
end;
$$;
revoke execute on function public.create_calendar_feed(uuid, text, text) from public, anon;
grant execute on function public.create_calendar_feed(uuid, text, text) to authenticated;

-- Eventy pre kalendár podľa odkazu (len pre Edge funkciu). Neplatný odkaz, odchod z firmy
-- alebo odobraté oprávnenie = prázdny kalendár.
create or replace function public.calendar_feed_events(_token text)
returns table (
  id uuid, name text, venue text, starts_on date, ends_on date, status text,
  get_in_time text, show_time text, show_end_time text, crew_role text, company_name text, scope text, app_url text
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  _feed public.calendar_feeds;
begin
  if _token is null or _token !~ '^[0-9a-f]{64}$' then
    return;
  end if;
  select * into _feed from public.calendar_feeds f where f.token_hash = encode(sha256(convert_to(_token, 'UTF8')), 'hex');
  if not found then
    return;
  end if;
  -- Oprávnenia sa overia za majiteľa odkazu (rovnako ako v appke).
  perform set_config('request.jwt.claims', json_build_object('sub', _feed.user_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', _feed.user_id::text, true);
  if not public.is_company_member(_feed.company_id) or (_feed.scope = 'all' and not public.can(_feed.company_id, 'events.view')) then
    return;
  end if;
  update public.calendar_feeds set last_used_at = now() where calendar_feeds.id = _feed.id;
  return query
    select e.id, e.name, e.venue, e.starts_on, e.ends_on, e.status::text,
      coalesce(to_char(e.get_in_time, 'HH24:MI'), ''), coalesce(to_char(e.show_time, 'HH24:MI'), ''), coalesce(to_char(e.show_end_time, 'HH24:MI'), ''),
      coalesce((select string_agg(nullif(c.role, ''), ', ') from public.event_crew c where c.event_id = e.id and c.member_id = _feed.user_id), ''),
      co.name, _feed.scope, _feed.app_url
    from public.events e
    join public.companies co on co.id = e.company_id
    where e.company_id = _feed.company_id
      and e.status <> 'cancelled'
      and e.ends_on >= current_date - 90
      and (_feed.scope = 'all' or exists (
        select 1 from public.event_crew c where c.event_id = e.id and c.member_id = _feed.user_id and c.response <> 'no'
      ))
    order by e.starts_on
    limit 2000;
end;
$$;
revoke execute on function public.calendar_feed_events(text) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.calendar_feed_events(text) to service_role;
  end if;
end;
$$;
