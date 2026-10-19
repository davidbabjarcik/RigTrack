-- RigTrack: ľudia (1.13).
-- 1) Karta zamestnanca: dátum narodenia, meniny (deň a mesiac), skupiny vodičského oprávnenia,
--    či prešiel úvodným dotazníkom po prvom prihlásení.
-- 2) Výnimky zo zariadení: kto nemusí mať zapísaný mobil / tablet / notebook (nastavuje admin).
-- 3) Posádka eventu potvrdzuje účasť: môžem / nemôžem (a prečo).
-- 4) Novinky vo firme (napr. nový event) s „prečítané“ pre každého zvlášť.
-- 5) Kto chce e-mail pri novom evente (nastaví si admin sám pre seba).

-- 1) Karta zamestnanca
alter table public.staff add column birth_date date;
alter table public.staff add column name_day text not null default '' check (name_day = '' or name_day ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$');
alter table public.staff add column licences text[] not null default '{}'
  check (licences <@ array['AM', 'A1', 'A2', 'A', 'B1', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'T']::text[]);
alter table public.staff add column onboarded boolean not null default false;
grant update (birth_date, name_day, licences, onboarded) on public.staff to authenticated;

-- 2) Výnimky zo zariadení
create table public.device_exemptions (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('phone', 'laptop', 'tablet')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id, kind)
);
alter table public.device_exemptions enable row level security;
create policy device_exemptions_select on public.device_exemptions for select to authenticated
  using (user_id = auth.uid() or public.can(company_id, 'staff.manage'));
create policy device_exemptions_insert on public.device_exemptions for insert to authenticated
  with check (public.has_role(company_id, 'admin'));
create policy device_exemptions_delete on public.device_exemptions for delete to authenticated
  using (public.has_role(company_id, 'admin'));
revoke all on public.device_exemptions from anon, authenticated;
grant select, insert, delete on public.device_exemptions to authenticated;

-- 3) Potvrdenie účasti na evente
alter table public.event_crew add column response text not null default 'pending' check (response in ('pending', 'yes', 'no'));
alter table public.event_crew add column response_note text not null default '' check (char_length(response_note) <= 300);
create policy event_crew_update on public.event_crew for update to authenticated
  using (member_id = auth.uid() or public.can(company_id, 'events.edit'))
  with check (member_id = auth.uid() or public.can(company_id, 'events.edit'));
grant update (response, response_note) on public.event_crew to authenticated;

-- 4) Novinky vo firme
create table public.company_news (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('event', 'crew', 'other')),
  title text not null check (char_length(title) between 1 and 200),
  link text not null default '' check (char_length(link) <= 200),
  actor_id uuid default auth.uid() references public.profiles (id) on delete set null,
  actor_name text not null default '',
  created_at timestamptz not null default now()
);
create index company_news_company_idx on public.company_news (company_id, created_at desc);
alter table public.company_news enable row level security;
create policy company_news_select on public.company_news for select to authenticated
  using (public.is_company_member(company_id));
revoke all on public.company_news from anon, authenticated;
grant select on public.company_news to authenticated;

-- Do kedy má kto prečítané novinky (všetko staršie je prečítané).
create table public.news_reads (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  read_until timestamptz not null default now(),
  primary key (company_id, user_id)
);
alter table public.news_reads enable row level security;
create policy news_reads_own on public.news_reads for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_company_member(company_id));
revoke all on public.news_reads from anon, authenticated;
grant select, insert, update, delete on public.news_reads to authenticated;

-- Nový event a priradenie do posádky sa zapíšu do noviniek samé.
create function public.write_event_news()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _actor text := coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
  _event record;
begin
  if tg_table_name = 'events' then
    insert into public.company_news (company_id, kind, title, link, actor_name)
    values (new.company_id, 'event', left('Nový event: ' || new.name || ' (' || to_char(new.starts_on, 'DD. MM. YYYY') || ')', 200), '/events/' || new.id, _actor);
  elsif new.member_id is not null and new.member_id is distinct from auth.uid() then
    select e.name, e.starts_on into _event from public.events e where e.id = new.event_id;
    insert into public.company_news (company_id, kind, title, link, actor_name)
    values (
      new.company_id, 'crew',
      left(coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = new.member_id), 'Člen')
        || ' je v posádke: ' || _event.name || ' (' || to_char(_event.starts_on, 'DD. MM. YYYY') || ')', 200),
      '/events/' || new.event_id, _actor
    );
  end if;
  return new;
end;
$$;
revoke execute on function public.write_event_news() from public, anon, authenticated;

create trigger events_news after insert on public.events
  for each row execute function public.write_event_news();
create trigger event_crew_news after insert on public.event_crew
  for each row execute function public.write_event_news();

-- 5) E-mail pri novom evente (opt-in pre adminov / CEO)
create table public.notification_prefs (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  email_new_event boolean not null default false,
  primary key (company_id, user_id)
);
alter table public.notification_prefs enable row level security;
create policy notification_prefs_own on public.notification_prefs for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_company_member(company_id));
revoke all on public.notification_prefs from anon, authenticated;
grant select, insert, update, delete on public.notification_prefs to authenticated;

-- Kedy odišiel e-mail o novom evente (aby sa poslal len raz). Zapisuje ho len serverová funkcia.
alter table public.events add column emailed_at timestamptz;
