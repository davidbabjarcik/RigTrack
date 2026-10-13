-- RigTrack: plán skladu.
-- Pôdorys skladu (jeden na firmu) s miestami: regály, palety a voľné zóny. Každý case môže
-- mať miesto a pri regáli aj poschodie, takže na pláne vidno, kde čo leží.
-- Plán vidí každý člen; kreslí ho ten, kto spravuje zoznamy (lookups.manage);
-- case na miesto ukladá ten, kto smie upravovať cases.
-- Súradnice v cm: x zľava doprava, y zhora nadol.

create table public.warehouses (
  company_id uuid primary key references public.companies (id) on delete cascade,
  length_cm integer not null check (length_cm between 100 and 100000),
  width_cm integer not null check (width_cm between 100 and 100000)
);

create table public.warehouse_spots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  kind text not null default 'rack' check (kind in ('rack', 'pallet', 'zone')),
  x integer not null check (x >= 0),
  y integer not null check (y >= 0),
  length integer not null check (length > 0),
  width integer not null check (width > 0),
  -- Počet poschodí regála; paleta a zóna majú jedno.
  levels integer not null default 1 check (levels between 1 and 20),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create index warehouse_spots_company_idx on public.warehouse_spots (company_id);

alter table public.cases
  add column spot_id uuid,
  add column spot_level integer check (spot_level between 1 and 20),
  add foreign key (company_id, spot_id) references public.warehouse_spots (company_id, id) on delete set null (spot_id);
create index cases_spot_idx on public.cases (spot_id) where spot_id is not null;
grant update (spot_id, spot_level) on public.cases to authenticated;

alter table public.warehouses enable row level security;
alter table public.warehouse_spots enable row level security;

create policy warehouses_select on public.warehouses for select to authenticated
  using (public.is_company_member(company_id));
create policy warehouses_insert on public.warehouses for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy warehouses_update on public.warehouses for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));

create policy warehouse_spots_select on public.warehouse_spots for select to authenticated
  using (public.is_company_member(company_id));
create policy warehouse_spots_insert on public.warehouse_spots for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy warehouse_spots_update on public.warehouse_spots for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));
create policy warehouse_spots_delete on public.warehouse_spots for delete to authenticated
  using (public.can(company_id, 'lookups.manage'));

revoke all on public.warehouses, public.warehouse_spots from anon, authenticated;
grant select, insert on public.warehouses to authenticated;
grant update (length_cm, width_cm) on public.warehouses to authenticated;
grant select, insert, delete on public.warehouse_spots to authenticated;
grant update (name, kind, x, y, length, width, levels) on public.warehouse_spots to authenticated;
