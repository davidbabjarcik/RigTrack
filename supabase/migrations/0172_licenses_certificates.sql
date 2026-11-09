-- RigTrack: licencie programov a certifikácie ľudí.
-- Licencie: aké programy má firma kúpené (názov, edícia, počet inštalácií, na koho účet, kedy kúpené, dokedy platí,
-- cena, na ktorom počítači z techniky beží). Vidí ich, kto vidí techniku; spravuje, kto smie upravovať techniku.
-- Licenčný kľúč je v samostatnej tabuľke a vidí ho len ten, kto smie upravovať techniku.
-- Certifikácie: oprávnenia a školenia človeka (práca vo výškach, elektro vyhláška…) s platnosťou.
-- Vidí ich, kto vidí tím, a človek sám; spravuje ich správca tímu a človek sám.

create table if not exists public.software_licenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  edition text not null default '' check (char_length(edition) <= 80),
  seats smallint not null default 1 check (seats between 1 and 9999),
  account text not null default '' check (char_length(account) <= 200),
  purchased_on date,
  -- prázdne = trvalá licencia
  expires_on date,
  price numeric(10, 2) check (price is null or (price >= 0 and price < 1000000)),
  equipment_id uuid,
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique (company_id, id),
  check (expires_on is null or purchased_on is null or expires_on >= purchased_on),
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete set null (equipment_id)
);
create index if not exists software_licenses_company_idx on public.software_licenses (company_id, name);
create index if not exists software_licenses_equipment_idx on public.software_licenses (company_id, equipment_id);

alter table public.software_licenses enable row level security;

drop policy if exists software_licenses_select on public.software_licenses;
create policy software_licenses_select on public.software_licenses for select to authenticated
  using (public.can(company_id, 'equipment.view'));
drop policy if exists software_licenses_insert on public.software_licenses;
create policy software_licenses_insert on public.software_licenses for insert to authenticated
  with check (public.can(company_id, 'equipment.edit'));
drop policy if exists software_licenses_update on public.software_licenses;
create policy software_licenses_update on public.software_licenses for update to authenticated
  using (public.can(company_id, 'equipment.edit'))
  with check (public.can(company_id, 'equipment.edit'));
drop policy if exists software_licenses_delete on public.software_licenses;
create policy software_licenses_delete on public.software_licenses for delete to authenticated
  using (public.can(company_id, 'equipment.edit'));

revoke all on public.software_licenses from anon, authenticated;
grant select, insert, delete on public.software_licenses to authenticated;
grant update (name, edition, seats, account, purchased_on, expires_on, price, equipment_id, note) on public.software_licenses to authenticated;

drop trigger if exists software_licenses_audit on public.software_licenses;
create trigger software_licenses_audit after insert or update or delete on public.software_licenses
  for each row execute function public.write_audit();

-- Licenčný kľúč (len pre tých, čo smú upravovať techniku; bez auditu, aby sa kľúč nedostal do histórie).
create table if not exists public.software_license_keys (
  license_id uuid primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  license_key text not null default '' check (char_length(license_key) <= 1000),
  foreign key (company_id, license_id) references public.software_licenses (company_id, id) on delete cascade
);
create index if not exists software_license_keys_company_idx on public.software_license_keys (company_id, license_id);

alter table public.software_license_keys enable row level security;

drop policy if exists software_license_keys_select on public.software_license_keys;
create policy software_license_keys_select on public.software_license_keys for select to authenticated
  using (public.can(company_id, 'equipment.edit'));
drop policy if exists software_license_keys_insert on public.software_license_keys;
create policy software_license_keys_insert on public.software_license_keys for insert to authenticated
  with check (public.can(company_id, 'equipment.edit'));
drop policy if exists software_license_keys_update on public.software_license_keys;
create policy software_license_keys_update on public.software_license_keys for update to authenticated
  using (public.can(company_id, 'equipment.edit'))
  with check (public.can(company_id, 'equipment.edit'));
drop policy if exists software_license_keys_delete on public.software_license_keys;
create policy software_license_keys_delete on public.software_license_keys for delete to authenticated
  using (public.can(company_id, 'equipment.edit'));

revoke all on public.software_license_keys from anon, authenticated;
grant select, insert, delete on public.software_license_keys to authenticated;
grant update (license_key) on public.software_license_keys to authenticated;

create table if not exists public.staff_certificates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  staff_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  issuer text not null default '' check (char_length(issuer) <= 120),
  number text not null default '' check (char_length(number) <= 80),
  issued_on date,
  -- prázdne = bez obmedzenia
  valid_until date,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  check (valid_until is null or issued_on is null or valid_until >= issued_on),
  foreign key (company_id, staff_id) references public.staff (company_id, id) on delete cascade
);
create index if not exists staff_certificates_staff_idx on public.staff_certificates (company_id, staff_id);

alter table public.staff_certificates enable row level security;

drop policy if exists staff_certificates_select on public.staff_certificates;
create policy staff_certificates_select on public.staff_certificates for select to authenticated
  using (
    public.can(company_id, 'staff.view')
    or exists (select 1 from public.staff s where s.id = staff_id and s.company_id = staff_certificates.company_id and s.member_id = (select auth.uid()))
  );
drop policy if exists staff_certificates_insert on public.staff_certificates;
create policy staff_certificates_insert on public.staff_certificates for insert to authenticated
  with check (
    public.can(company_id, 'staff.manage')
    or exists (select 1 from public.staff s where s.id = staff_id and s.company_id = staff_certificates.company_id and s.member_id = (select auth.uid()))
  );
drop policy if exists staff_certificates_update on public.staff_certificates;
create policy staff_certificates_update on public.staff_certificates for update to authenticated
  using (
    public.can(company_id, 'staff.manage')
    or exists (select 1 from public.staff s where s.id = staff_id and s.company_id = staff_certificates.company_id and s.member_id = (select auth.uid()))
  )
  with check (
    public.can(company_id, 'staff.manage')
    or exists (select 1 from public.staff s where s.id = staff_id and s.company_id = staff_certificates.company_id and s.member_id = (select auth.uid()))
  );
drop policy if exists staff_certificates_delete on public.staff_certificates;
create policy staff_certificates_delete on public.staff_certificates for delete to authenticated
  using (
    public.can(company_id, 'staff.manage')
    or exists (select 1 from public.staff s where s.id = staff_id and s.company_id = staff_certificates.company_id and s.member_id = (select auth.uid()))
  );

revoke all on public.staff_certificates from anon, authenticated;
grant select, insert, delete on public.staff_certificates to authenticated;
grant update (name, issuer, number, issued_on, valid_until, note) on public.staff_certificates to authenticated;

drop trigger if exists staff_certificates_audit on public.staff_certificates;
create trigger staff_certificates_audit after insert or update or delete on public.staff_certificates
  for each row execute function public.write_audit();
