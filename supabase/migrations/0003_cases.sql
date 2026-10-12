-- RigTrack: cases (prepravné kufre) a ich obsah.
-- Kus techniky je najviac v jednom case (equipment.case_id).
-- Oprávnenia ako pri technike: zapisuje admin, skladník a technik; maže admin a skladník.

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  inventory_number text not null default '' check (char_length(inventory_number) <= 40),
  location_id uuid,
  note text not null default '' check (char_length(note) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, location_id) references public.locations (company_id, id)
    on delete set null (location_id)
);
create index cases_company_idx on public.cases (company_id, name);
create unique index cases_inventory_number_idx on public.cases (company_id, lower(inventory_number))
  where inventory_number <> '';

create trigger cases_touch_updated_at
  before update on public.cases
  for each row execute function public.touch_updated_at();

-- Zložený cudzí kľúč: technika môže byť iba v case tej istej firmy.
alter table public.equipment
  add column case_id uuid,
  add foreign key (company_id, case_id) references public.cases (company_id, id)
    on delete set null (case_id);
create index equipment_case_idx on public.equipment (case_id) where case_id is not null;

alter table public.cases enable row level security;

create policy cases_select on public.cases for select to authenticated
  using (public.is_company_member(company_id));
create policy cases_insert on public.cases for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy cases_update on public.cases for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy cases_delete on public.cases for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.cases from anon, authenticated;
grant select, insert, delete on public.cases to authenticated;
grant update (name, inventory_number, location_id, note) on public.cases to authenticated;
grant update (case_id) on public.equipment to authenticated;
