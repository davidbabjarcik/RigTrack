-- RigTrack 10.14: hodnotenie od klienta. Po evente vytvorí ten, kto upravuje eventy, tajný odkaz na hodnotenie.
-- Klient cez neho bez prihlásenia raz dá 1–5 hviezdičiek a poznámku. Kto dá 4–5, uvidí odkazy na recenzie firmy
-- (Google, Facebook, web – nastaví admin); hodnotenie samo von nejde. Tým, čo upravujú eventy, príde upozornenie.

alter table public.companies add column if not exists review_links jsonb not null default '{}'::jsonb;
do $$
begin
  alter table public.companies drop constraint if exists companies_review_links_check;
  alter table public.companies add constraint companies_review_links_check
    check (jsonb_typeof(review_links) = 'object' and pg_column_size(review_links) <= 3000);
end;
$$;
grant update (review_links) on public.companies to authenticated;

create table if not exists public.event_ratings (
  company_id uuid not null,
  event_id uuid not null,
  token uuid not null default gen_random_uuid() unique,
  stars smallint check (stars between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  rated_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (company_id, event_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists event_ratings_created_by_idx on public.event_ratings (created_by);
alter table public.event_ratings enable row level security;
drop policy if exists event_ratings_select on public.event_ratings;
create policy event_ratings_select on public.event_ratings for select to authenticated using (public.can(company_id, 'events.view'));
revoke all on public.event_ratings from anon, authenticated;
grant select on public.event_ratings to authenticated;

-- Iba bezpečné https odkazy (žiadne javascript: a pod.), najviac 500 znakov.
create or replace function public.safe_review_link(_value jsonb)
returns text language sql immutable set search_path = '' as $$
  select case
    when jsonb_typeof(_value) = 'string' and char_length(_value #>> '{}') between 12 and 500 and (_value #>> '{}') ~ '^https://[^\s<>"]+$'
    then _value #>> '{}' else '' end;
$$;
revoke execute on function public.safe_review_link(jsonb) from public, anon;

create or replace function public.create_event_rating(_event_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _token uuid;
begin
  select company_id into _company from public.events where id = _event_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Event neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  insert into public.event_ratings (company_id, event_id) values (_company, _event_id) on conflict (company_id, event_id) do nothing;
  select token into _token from public.event_ratings where company_id = _company and event_id = _event_id;
  return _token;
end;
$$;
revoke execute on function public.create_event_rating(uuid) from public, anon;
grant execute on function public.create_event_rating(uuid) to authenticated;

-- Pre klienta: názov akcie, dátum, firma, jeho hodnotenie a odkazy na recenzie. Nič iné.
create or replace function public.get_event_rating(_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'event', e.name, 'startsOn', e.starts_on, 'endsOn', e.ends_on, 'companyName', co.name,
    'stars', r.stars, 'comment', r.comment, 'ratedAt', r.rated_at,
    'links', jsonb_build_object(
      'google', public.safe_review_link(co.review_links -> 'google'),
      'facebook', public.safe_review_link(co.review_links -> 'facebook'),
      'web', public.safe_review_link(co.review_links -> 'web')
    )
  )
  from public.event_ratings r
  join public.events e on e.company_id = r.company_id and e.id = r.event_id
  join public.companies co on co.id = r.company_id
  where _token is not null and r.token = _token;
$$;
revoke execute on function public.get_event_rating(uuid) from public;
grant execute on function public.get_event_rating(uuid) to anon, authenticated;

create or replace function public.rate_event(_token uuid, _stars integer, _comment text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.event_ratings%rowtype;
  _event text;
begin
  select * into r from public.event_ratings where _token is not null and token = _token for update;
  if not found then
    raise exception 'Hodnotenie sa nenašlo' using errcode = 'no_data_found';
  end if;
  if r.rated_at is not null then
    raise exception 'Už ste hodnotili' using errcode = 'check_violation';
  end if;
  if _stars is null or _stars not between 1 and 5 then
    raise exception 'Vyberte 1 až 5 hviezdičiek' using errcode = 'check_violation';
  end if;
  update public.event_ratings set stars = _stars, comment = left(trim(coalesce(_comment, '')), 1000), rated_at = now()
    where company_id = r.company_id and event_id = r.event_id;
  select name into _event from public.events where company_id = r.company_id and id = r.event_id;
  insert into public.notifications (user_id, company_id, title, body, url)
  select m.user_id, r.company_id, left('Hodnotenie ' || repeat('★', _stars) || repeat('☆', 5 - _stars) || ': ' || _event, 120),
    left(trim(coalesce(_comment, '')), 300), '/events/' || r.event_id
  from public.company_members m
  where m.company_id = r.company_id and public.user_can(r.company_id, m.user_id, 'events.edit');
end;
$$;
revoke execute on function public.rate_event(uuid, integer, text) from public;
grant execute on function public.rate_event(uuid, integer, text) to anon, authenticated;
