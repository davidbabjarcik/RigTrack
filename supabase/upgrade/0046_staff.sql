-- RigTrack: zamestnanci.
-- Karta človeka z tímu: fotka, pozícia, kontakt, zručnosti, poznámka a kedy nemôže.
-- Členovia firmy majú kartu naviazanú na účet; brigádnici bez účtu sa dajú pridať len menom.
-- Vidieť ich môže každý s oprávnením staff.view (predvolene všetci); spravovať staff.manage
-- (predvolene skladník a admin). Svoju vlastnú kartu a svoje „kedy nemôžem“ si upraví každý sám.

-- Nové oprávnenia (inak rovnaké ako v 0030).
create or replace function public.permission_defaults()
returns table (permission text, roles public.app_role[])
language sql immutable set search_path = '' as $$
  values
    ('equipment.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('equipment.edit', array['skladnik', 'technik']::public.app_role[]),
    ('equipment.delete', array['skladnik']::public.app_role[]),
    ('lookups.manage', array['skladnik']::public.app_role[]),
    ('cases.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('cases.edit', array['skladnik', 'technik']::public.app_role[]),
    ('cases.delete', array['skladnik']::public.app_role[]),
    ('orders.view', array['skladnik']::public.app_role[]),
    ('orders.edit', array['skladnik']::public.app_role[]),
    ('orders.delete', array[]::public.app_role[]),
    ('vehicles.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('vehicles.log', array['skladnik', 'technik']::public.app_role[]),
    ('vehicles.edit', array['skladnik']::public.app_role[]),
    ('vehicles.delete', array[]::public.app_role[]),
    ('loans.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('loans.edit', array['skladnik', 'technik']::public.app_role[]),
    ('loans.delete', array['skladnik']::public.app_role[]),
    ('events.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('events.edit', array['skladnik', 'technik']::public.app_role[]),
    ('events.delete', array['skladnik']::public.app_role[]),
    ('service.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('service.edit', array['skladnik', 'technik']::public.app_role[]),
    ('service.delete', array['skladnik']::public.app_role[]),
    ('tasks.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('tasks.edit', array['skladnik', 'technik']::public.app_role[]),
    ('tasks.delete', array['skladnik']::public.app_role[]),
    ('shopping.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('shopping.edit', array['skladnik', 'technik']::public.app_role[]),
    ('shopping.delete', array['skladnik']::public.app_role[]),
    ('suggestions.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('suggestions.add', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('suggestions.manage', array['skladnik']::public.app_role[]),
    ('suggestions.delete', array[]::public.app_role[]),
    ('payouts.view_all', array[]::public.app_role[]),
    ('payouts.manage', array[]::public.app_role[]),
    ('audit.view', array[]::public.app_role[]),
    ('staff.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('staff.manage', array['skladnik']::public.app_role[])
$$;

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  member_id uuid references public.profiles (id) on delete set null,
  name text not null default '' check (char_length(name) <= 120),
  position text not null default '' check (char_length(position) <= 80),
  phone text not null default '' check (char_length(phone) <= 40),
  email text not null default '' check (char_length(email) <= 120),
  photo_path text not null default '' check (char_length(photo_path) <= 300),
  skills text not null default '' check (char_length(skills) <= 500),
  note text not null default '' check (char_length(note) <= 1000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, id),
  -- Brigádnik bez účtu musí mať aspoň meno.
  check (member_id is not null or char_length(trim(name)) > 0)
);
create unique index staff_member_idx on public.staff (company_id, member_id) where member_id is not null;

create table public.staff_unavailability (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  staff_id uuid not null,
  starts_on date not null,
  ends_on date not null,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  foreign key (company_id, staff_id) references public.staff (company_id, id) on delete cascade
);
create index staff_unavailability_idx on public.staff_unavailability (company_id, staff_id, starts_on);

/** Je karta moja (naviazaná na môj účet)? */
create function public.is_my_staff(_staff_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.id = _staff_id and s.member_id = auth.uid())
$$;

alter table public.staff enable row level security;
alter table public.staff_unavailability enable row level security;

create policy staff_select on public.staff for select to authenticated
  using (public.can(company_id, 'staff.view') or member_id = auth.uid());
create policy staff_insert on public.staff for insert to authenticated
  with check (public.can(company_id, 'staff.manage') or (member_id = auth.uid() and public.is_company_member(company_id)));
create policy staff_update on public.staff for update to authenticated
  using (public.can(company_id, 'staff.manage') or member_id = auth.uid())
  with check (public.can(company_id, 'staff.manage') or member_id = auth.uid());
create policy staff_delete on public.staff for delete to authenticated
  using (public.can(company_id, 'staff.manage'));

create policy staff_unavailability_select on public.staff_unavailability for select to authenticated
  using (public.can(company_id, 'staff.view') or public.is_my_staff(staff_id));
create policy staff_unavailability_insert on public.staff_unavailability for insert to authenticated
  with check (public.can(company_id, 'staff.manage') or public.is_my_staff(staff_id));
create policy staff_unavailability_delete on public.staff_unavailability for delete to authenticated
  using (public.can(company_id, 'staff.manage') or public.is_my_staff(staff_id));

revoke all on public.staff, public.staff_unavailability from anon, authenticated;
grant select, insert, delete on public.staff, public.staff_unavailability to authenticated;
grant update (name, position, phone, email, photo_path, skills, note, active) on public.staff to authenticated;
revoke execute on function public.is_my_staff(uuid) from public, anon;
grant execute on function public.is_my_staff(uuid) to authenticated;
