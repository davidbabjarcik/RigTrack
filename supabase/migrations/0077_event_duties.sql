-- RigTrack: činnosti pri evente (2.15).
-- Admin si v Nastaveniach nadefinuje činnosti (napr. nakladanie, vykladanie, kontrola a naskladnenie hliníka,
-- kontrola kabeláže). Pri evente sa ku každej zapíšu ľudia – členovia alebo externisti menom.
-- Štatistiky z toho rátajú, kto čo robil najčastejšie.

create table if not exists public.company_duty_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create unique index if not exists company_duty_types_name_idx on public.company_duty_types (company_id, lower(trim(name)));

create table if not exists public.event_duties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  duty_type_id uuid not null,
  member_id uuid references public.profiles (id) on delete cascade,
  person_name text not null default '' check (char_length(person_name) <= 80),
  created_at timestamptz not null default now(),
  check ((member_id is null) <> (trim(person_name) = '')),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade,
  foreign key (company_id, duty_type_id) references public.company_duty_types (company_id, id) on delete cascade
);
create unique index if not exists event_duties_person_idx
  on public.event_duties (event_id, duty_type_id, coalesce(member_id::text, lower(trim(person_name))));
create index if not exists event_duties_company_idx on public.event_duties (company_id, duty_type_id);

alter table public.company_duty_types enable row level security;
alter table public.event_duties enable row level security;
drop policy if exists company_duty_types_select on public.company_duty_types;
drop policy if exists company_duty_types_write on public.company_duty_types;
create policy company_duty_types_select on public.company_duty_types for select to authenticated using (public.is_company_member(company_id));
create policy company_duty_types_write on public.company_duty_types for all to authenticated
  using (public.has_role(company_id, 'admin')) with check (public.has_role(company_id, 'admin'));

-- Ľudí na činnosti zapisuje, kto upravuje eventy; člen posádky môže zapísať (a zmazať) sám seba.
drop policy if exists event_duties_select on public.event_duties;
drop policy if exists event_duties_insert on public.event_duties;
drop policy if exists event_duties_delete on public.event_duties;
create policy event_duties_select on public.event_duties for select to authenticated
  using (public.can(company_id, 'events.view') or public.is_event_crew(event_id));
create policy event_duties_insert on public.event_duties for insert to authenticated
  with check (
    public.can(company_id, 'events.edit')
    or (member_id = auth.uid() and public.is_company_member(company_id) and public.is_event_crew(event_id))
  );
create policy event_duties_delete on public.event_duties for delete to authenticated
  using (public.can(company_id, 'events.edit') or (member_id = auth.uid() and public.is_company_member(company_id)));

revoke all on public.company_duty_types, public.event_duties from anon, authenticated;
grant select, insert, delete on public.company_duty_types to authenticated;
grant update (name, sort, active) on public.company_duty_types to authenticated;
grant select, insert, delete on public.event_duties to authenticated;
