-- RigTrack: technika, kategórie a umiestnenia.
-- Čítať môže každý člen firmy; zapisovať admin, skladník a technik;
-- mazať a upravovať číselníky iba admin a skladník.

create type public.equipment_status as enum ('available', 'loaned', 'in_service', 'damaged', 'retired');

create table public.equipment_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create unique index equipment_categories_name_idx on public.equipment_categories (company_id, lower(name));

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create unique index locations_name_idx on public.locations (company_id, lower(name));

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  category_id uuid,
  location_id uuid,
  manufacturer text not null default '' check (char_length(manufacturer) <= 80),
  model text not null default '' check (char_length(model) <= 80),
  serial_number text not null default '' check (char_length(serial_number) <= 80),
  inventory_number text not null default '' check (char_length(inventory_number) <= 40),
  status public.equipment_status not null default 'available',
  note text not null default '' check (char_length(note) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Zložené cudzie kľúče: kategória aj umiestnenie musia patriť tej istej firme.
  foreign key (company_id, category_id) references public.equipment_categories (company_id, id)
    on delete set null (category_id),
  foreign key (company_id, location_id) references public.locations (company_id, id)
    on delete set null (location_id)
);
create index equipment_company_idx on public.equipment (company_id, name);
create unique index equipment_inventory_number_idx on public.equipment (company_id, lower(inventory_number))
  where inventory_number <> '';

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger equipment_touch_updated_at
  before update on public.equipment
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.equipment_categories enable row level security;
alter table public.locations enable row level security;
alter table public.equipment enable row level security;

create policy equipment_select on public.equipment for select to authenticated
  using (public.is_company_member(company_id));
create policy equipment_insert on public.equipment for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy equipment_update on public.equipment for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy equipment_delete on public.equipment for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

create policy equipment_categories_select on public.equipment_categories for select to authenticated
  using (public.is_company_member(company_id));
create policy equipment_categories_insert on public.equipment_categories for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy equipment_categories_update on public.equipment_categories for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'))
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy equipment_categories_delete on public.equipment_categories for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

create policy locations_select on public.locations for select to authenticated
  using (public.is_company_member(company_id));
create policy locations_insert on public.locations for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy locations_update on public.locations for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'))
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy locations_delete on public.locations for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

-- ---------------------------------------------------------------------------
-- Oprávnenia. company_id sa po vytvorení nedá zmeniť (nie je v zozname stĺpcov pre update).
-- ---------------------------------------------------------------------------

revoke all on public.equipment, public.equipment_categories, public.locations from anon, authenticated;

grant select, insert, delete on public.equipment to authenticated;
grant update (name, category_id, location_id, manufacturer, model, serial_number, inventory_number, status, note)
  on public.equipment to authenticated;

grant select, insert, delete, update (name) on public.equipment_categories to authenticated;
grant select, insert, delete, update (name) on public.locations to authenticated;

revoke execute on function public.touch_updated_at() from public, anon;
