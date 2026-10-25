-- RigTrack: zakladanie nových firiem len s povolením (3.14).
-- Novú firmu smie založiť vývojár aplikácie (app_developers) alebo človek, ktorému to vývojár povolil.
-- Ostatní pošlú žiadosť; vývojár ju v appke schváli (povolí zakladanie) alebo zamietne a človeku príde upozornenie.
-- Kým nie je zapísaný žiadny vývojár, zakladať môže každý (nová inštalácia sa nezamkne).
-- Demo firma a firma založená partnerovi (Firmy a kontakty) sa tým neobmedzujú.

create table if not exists public.company_creators (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now()
);
alter table public.company_creators enable row level security;
drop policy if exists company_creators_select on public.company_creators;
drop policy if exists company_creators_write on public.company_creators;
create policy company_creators_select on public.company_creators for select to authenticated using (user_id = auth.uid() or public.is_developer());
create policy company_creators_write on public.company_creators for all to authenticated using (public.is_developer()) with check (public.is_developer());
revoke all on public.company_creators from anon, authenticated;
grant select, insert, delete on public.company_creators to authenticated;

create table if not exists public.company_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  company_name text not null check (char_length(trim(company_name)) between 1 and 120),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists company_requests_status_idx on public.company_requests (status, created_at desc);
alter table public.company_requests enable row level security;
drop policy if exists company_requests_select on public.company_requests;
drop policy if exists company_requests_insert on public.company_requests;
drop policy if exists company_requests_delete on public.company_requests;
create policy company_requests_select on public.company_requests for select to authenticated using (user_id = auth.uid() or public.is_developer());
create policy company_requests_insert on public.company_requests for insert to authenticated with check (user_id = auth.uid());
create policy company_requests_delete on public.company_requests for delete to authenticated using (user_id = auth.uid() or public.is_developer());
revoke all on public.company_requests from anon, authenticated;
grant select, insert, delete on public.company_requests to authenticated;

/** Smie prihlásený zakladať firmy? */
create or replace function public.can_create_company()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    not exists (select 1 from public.app_developers)
    or public.is_developer()
    or exists (select 1 from public.company_creators c where c.user_id = auth.uid())
  );
$$;
revoke execute on function public.can_create_company() from public, anon;
grant execute on function public.can_create_company() to authenticated;

create or replace function public.create_company(_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.can_create_company() then
    raise exception 'Založenie novej firmy musí povoliť správca aplikácie' using errcode = 'insufficient_privilege';
  end if;
  insert into public.companies (name, created_by) values (trim(_name), auth.uid()) returning id into _id;
  insert into public.company_members (company_id, user_id, role) values (_id, auth.uid(), 'admin');
  return _id;
end;
$$;

/** Vývojár rozhodne o žiadosti: schválenie povolí človeku zakladať firmy. Človeku príde upozornenie. */
create or replace function public.decide_company_request(_request_id uuid, _approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.company_requests%rowtype;
begin
  if not public.is_developer() then
    raise exception 'Len vývojár aplikácie' using errcode = 'insufficient_privilege';
  end if;
  select * into r from public.company_requests where id = _request_id;
  if not found then return; end if;
  update public.company_requests set status = case when _approve then 'approved' else 'rejected' end, decided_at = now() where id = _request_id;
  if _approve then
    insert into public.company_creators (user_id, granted_by) values (r.user_id, auth.uid()) on conflict (user_id) do nothing;
  end if;
  insert into public.notifications (user_id, title, body, url)
  values (
    r.user_id,
    case when _approve then 'Môžete založiť firmu' else 'Žiadosť o firmu zamietnutá' end,
    left(case when _approve then 'Založte ju na „Vyberte firmu“ → Vytvoriť novú firmu: ' else 'Firma: ' end || r.company_name, 300),
    case when _approve then '/company/create' else '/company/select' end
  );
end;
$$;
revoke execute on function public.decide_company_request(uuid, boolean) from public, anon;
grant execute on function public.decide_company_request(uuid, boolean) to authenticated;

/** Žiadosti pre vývojára aj s menom a e-mailom žiadateľa. */
create or replace function public.pending_company_requests()
returns table (id uuid, user_id uuid, full_name text, email text, company_name text, note text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.user_id, coalesce(p.full_name, ''), coalesce(u.email, ''), r.company_name, r.note, r.created_at
  from public.company_requests r
  left join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = r.user_id
  where public.is_developer() and r.status = 'pending'
  order by r.created_at;
$$;
revoke execute on function public.pending_company_requests() from public, anon;
grant execute on function public.pending_company_requests() to authenticated;

-- Žiadosť o firmu pošle upozornenie všetkým vývojárom.
create or replace function public.notify_company_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, title, body, url)
  select d.user_id, left('Žiadosť o novú firmu: ' || new.company_name, 120), left(new.note, 300), '/settings'
  from public.app_developers d where d.user_id <> new.user_id;
  return new;
end;
$$;
revoke execute on function public.notify_company_request() from public, anon, authenticated;
drop trigger if exists company_requests_notify on public.company_requests;
create trigger company_requests_notify after insert on public.company_requests for each row execute function public.notify_company_request();
