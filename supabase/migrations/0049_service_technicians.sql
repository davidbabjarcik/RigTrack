-- RigTrack: servisní technici.
-- Adresár ľudí a servisov, ktorí opravujú techniku alebo autá (meno, firma, telefón, e-mail, na čo sú).
-- Servisný záznam techniky, záznam pri aute a samotné auto (stály servis) sa naň môžu odkázať.
-- Vidí ho, kto vidí servis alebo vozidlá; spravuje, kto smie upravovať servis alebo vozidlá.
-- Odkazy sú v rámci jednej firmy (zložený cudzí kľúč); zmazaním technika sa len vynulujú.

create table public.service_technicians (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  firm text not null default '' check (char_length(firm) <= 80),
  phone text not null default '' check (char_length(phone) <= 40),
  email text not null default '' check (char_length(email) <= 120),
  address text not null default '' check (char_length(address) <= 200),
  scope text not null default 'both' check (scope in ('equipment', 'vehicles', 'both')),
  specialization text not null default '' check (char_length(specialization) <= 200),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create index service_technicians_company_idx on public.service_technicians (company_id, name);

alter table public.service_technicians enable row level security;

create policy service_technicians_select on public.service_technicians for select to authenticated
  using (public.can(company_id, 'service.view') or public.can(company_id, 'vehicles.view'));
create policy service_technicians_insert on public.service_technicians for insert to authenticated
  with check (public.can(company_id, 'service.edit') or public.can(company_id, 'vehicles.edit'));
create policy service_technicians_update on public.service_technicians for update to authenticated
  using (public.can(company_id, 'service.edit') or public.can(company_id, 'vehicles.edit'))
  with check (public.can(company_id, 'service.edit') or public.can(company_id, 'vehicles.edit'));
create policy service_technicians_delete on public.service_technicians for delete to authenticated
  using (public.can(company_id, 'service.edit') or public.can(company_id, 'vehicles.edit'));

revoke all on public.service_technicians from anon, authenticated;
grant select, insert, delete on public.service_technicians to authenticated;
grant update (name, firm, phone, email, address, scope, specialization, note) on public.service_technicians to authenticated;

create trigger service_technicians_audit after insert or update or delete on public.service_technicians
  for each row execute function public.write_audit();

-- Odkazy na technika.
alter table public.service_records add column technician_id uuid;
alter table public.service_records add constraint service_records_technician_fk
  foreign key (company_id, technician_id) references public.service_technicians (company_id, id) on delete set null (technician_id);
grant update (technician_id) on public.service_records to authenticated;

alter table public.vehicle_records add column technician_id uuid;
alter table public.vehicle_records add constraint vehicle_records_technician_fk
  foreign key (company_id, technician_id) references public.service_technicians (company_id, id) on delete set null (technician_id);

-- Stály servis auta (kam s ním chodíme).
alter table public.vehicles add column technician_id uuid;
alter table public.vehicles add constraint vehicles_technician_fk
  foreign key (company_id, technician_id) references public.service_technicians (company_id, id) on delete set null (technician_id);
grant update (technician_id) on public.vehicles to authenticated;
