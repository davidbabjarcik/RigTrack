-- RigTrack: firemné vozidlá, ich termíny (STK, EK, diaľničná známka, poistky, leasing)
-- a záznamy o prevádzke (servis, tankovanie, pneumatiky, nehody…).
-- Vozidlá vidí každý člen firmy; upravuje ich admin a skladník.
-- Záznam o prevádzke môže pridať aj technik (napr. tankovanie na ceste).

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  plate text not null check (char_length(trim(plate)) between 1 and 20),
  model text not null default '' check (char_length(model) <= 80),
  vin text not null default '' check (char_length(vin) <= 20),
  status text not null default 'active' check (status in ('active', 'in_service', 'retired')),
  driver text not null default '' check (char_length(driver) <= 80),
  odometer_km integer check (odometer_km between 0 and 5000000),
  stk_until date,
  ek_until date,
  vignette_until date,
  pzp_until date,
  casco_until date,
  leasing_until date,
  note text not null default '' check (char_length(note) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);
create unique index vehicles_plate_idx on public.vehicles (company_id, lower(plate));

create trigger vehicles_touch_updated_at
  before update on public.vehicles
  for each row execute function public.touch_updated_at();

create table public.vehicle_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  vehicle_id uuid not null,
  kind text not null check (kind in ('service', 'repair', 'oil', 'tyres', 'fuel', 'accident', 'other')),
  happened_on date not null default current_date,
  odometer_km integer check (odometer_km between 0 and 5000000),
  cost numeric(10, 2) check (cost >= 0),
  liters numeric(7, 2) check (liters > 0),
  description text not null default '' check (char_length(description) <= 1000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (company_id, vehicle_id) references public.vehicles (company_id, id) on delete cascade
);
create index vehicle_records_vehicle_idx on public.vehicle_records (vehicle_id, happened_on desc);

-- Záznam s vyšším stavom kilometrov posunie tachometer vozidla.
-- SECURITY DEFINER: záznam smie pridať aj technik, ktorý vozidlo sám upraviť nemôže.
create function public.bump_vehicle_odometer()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.odometer_km is not null then
    update public.vehicles set odometer_km = new.odometer_km
    where id = new.vehicle_id and company_id = new.company_id
      and (odometer_km is null or odometer_km < new.odometer_km);
  end if;
  return new;
end;
$$;

create trigger vehicle_records_bump_odometer
  after insert on public.vehicle_records
  for each row execute function public.bump_vehicle_odometer();

revoke execute on function public.bump_vehicle_odometer() from public, anon;

alter table public.vehicles enable row level security;
alter table public.vehicle_records enable row level security;

create policy vehicles_select on public.vehicles for select to authenticated
  using (public.is_company_member(company_id));
create policy vehicles_insert on public.vehicles for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy vehicles_update on public.vehicles for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'))
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy vehicles_delete on public.vehicles for delete to authenticated
  using (public.has_role(company_id, 'admin'));

create policy vehicle_records_select on public.vehicle_records for select to authenticated
  using (public.is_company_member(company_id));
create policy vehicle_records_insert on public.vehicle_records for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy vehicle_records_delete on public.vehicle_records for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.vehicles, public.vehicle_records from anon, authenticated;
grant select, insert, delete on public.vehicles to authenticated;
grant update (plate, model, vin, status, driver, odometer_km, stk_until, ek_until, vignette_until, pzp_until,
  casco_until, leasing_until, note) on public.vehicles to authenticated;
grant select, insert, delete on public.vehicle_records to authenticated;
