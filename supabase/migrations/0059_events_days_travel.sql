-- RigTrack: eventy (1.14).
-- 1) Údaje o firme: obchodné meno, IČO, DIČ, IČ DPH, adresa, CEO, kontakt a adresa skladu (odkiaľ sa rátajú km).
-- 2) Program eventu po dňoch: stavba / event / balenie / cesta / voľno, časy; v posádke kto ide v ktorý deň.
-- 3) Odkazy pri evente so štítkom (rider, lightplot, stage plot…), napr. na Google Disk.
-- 4) Firmy a kontakty: organizátori a partneri (skupina s IČO a ľudia s číslami); pri evente organizátor a partneri.
-- 5) Doprava: adresa akcie a km zo skladu; po dňoch koľko áut, koľko otočiek a kde sa spalo.
-- 6) Osobný výkaz: čas od–do, prestávky a výdavky – vidí ich len autor a admin / CEO.

-- 1) Údaje o firme
create table public.company_profile (
  company_id uuid primary key references public.companies (id) on delete cascade,
  legal_name text not null default '' check (char_length(legal_name) <= 160),
  ico text not null default '' check (char_length(ico) <= 20),
  dic text not null default '' check (char_length(dic) <= 20),
  ic_dph text not null default '' check (char_length(ic_dph) <= 20),
  address text not null default '' check (char_length(address) <= 200),
  ceo_name text not null default '' check (char_length(ceo_name) <= 120),
  phone text not null default '' check (char_length(phone) <= 40),
  email text not null default '' check (char_length(email) <= 120),
  web text not null default '' check (char_length(web) <= 200),
  warehouse_address text not null default '' check (char_length(warehouse_address) <= 200),
  updated_at timestamptz not null default now()
);
alter table public.company_profile enable row level security;
create policy company_profile_select on public.company_profile for select to authenticated
  using (public.is_company_member(company_id));
create policy company_profile_insert on public.company_profile for insert to authenticated
  with check (public.has_role(company_id, 'admin'));
create policy company_profile_update on public.company_profile for update to authenticated
  using (public.has_role(company_id, 'admin')) with check (public.has_role(company_id, 'admin'));
revoke all on public.company_profile from anon, authenticated;
grant select, insert on public.company_profile to authenticated;
grant update (legal_name, ico, dic, ic_dph, address, ceo_name, phone, email, web, warehouse_address, updated_at) on public.company_profile to authenticated;

-- 2) Program po dňoch
create table public.event_days (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  day date not null,
  kind text not null default 'show' check (kind in ('build', 'show', 'teardown', 'travel', 'rest')),
  starts_at time,
  ends_at time,
  note text not null default '' check (char_length(note) <= 300),
  unique (event_id, day),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
alter table public.event_days enable row level security;
create policy event_days_select on public.event_days for select to authenticated using (public.can(company_id, 'events.view'));
create policy event_days_write on public.event_days for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
revoke all on public.event_days from anon, authenticated;
grant select, insert, delete on public.event_days to authenticated;
grant update (kind, starts_at, ends_at, note) on public.event_days to authenticated;

-- Kto ide v ktorý deň (prázdne = všetky dni).
alter table public.event_crew add column days date[] not null default '{}';
grant update (days, role) on public.event_crew to authenticated;

-- 3) Odkazy pri evente
create table public.event_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  url text not null check (url ~* '^https?://' and char_length(url) <= 1000),
  title text not null default '' check (char_length(title) <= 160),
  tag text not null default 'other' check (tag in ('rider', 'lightplot', 'stageplot', 'tech', 'contract', 'photos', 'other')),
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
alter table public.event_links enable row level security;
create policy event_links_select on public.event_links for select to authenticated using (public.can(company_id, 'events.view'));
create policy event_links_write on public.event_links for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
revoke all on public.event_links from anon, authenticated;
grant select, insert, delete on public.event_links to authenticated;
grant update (url, title, tag) on public.event_links to authenticated;

-- 4) Firmy a kontakty
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  ico text not null default '' check (char_length(ico) <= 20),
  dic text not null default '' check (char_length(dic) <= 20),
  address text not null default '' check (char_length(address) <= 200),
  -- používa aj on RigTrack?
  uses_app boolean not null default false,
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create table public.partner_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  partner_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  role text not null default '' check (char_length(role) <= 80),
  phone text not null default '' check (char_length(phone) <= 40),
  email text not null default '' check (char_length(email) <= 120),
  foreign key (company_id, partner_id) references public.partners (company_id, id) on delete cascade
);
create table public.event_partners (
  company_id uuid not null,
  event_id uuid not null,
  partner_id uuid not null,
  kind text not null default 'partner' check (kind in ('organizer', 'partner')),
  primary key (event_id, partner_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade,
  foreign key (company_id, partner_id) references public.partners (company_id, id) on delete cascade
);
alter table public.partners enable row level security;
alter table public.partner_contacts enable row level security;
alter table public.event_partners enable row level security;
create policy partners_select on public.partners for select to authenticated using (public.can(company_id, 'events.view'));
create policy partners_write on public.partners for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
create policy partner_contacts_select on public.partner_contacts for select to authenticated using (public.can(company_id, 'events.view'));
create policy partner_contacts_write on public.partner_contacts for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
create policy event_partners_select on public.event_partners for select to authenticated using (public.can(company_id, 'events.view'));
create policy event_partners_write on public.event_partners for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
revoke all on public.partners, public.partner_contacts, public.event_partners from anon, authenticated;
grant select, insert, delete on public.partners, public.partner_contacts, public.event_partners to authenticated;
grant update (name, ico, dic, address, uses_app, note) on public.partners to authenticated;
grant update (name, role, phone, email) on public.partner_contacts to authenticated;
grant update (kind) on public.event_partners to authenticated;
create trigger partners_audit after insert or update or delete on public.partners
  for each row execute function public.write_audit();

-- 5) Doprava
alter table public.events add column address text not null default '' check (char_length(address) <= 200);
-- km zo skladu na akciu jedným smerom (vypočítané z mapy alebo zadané ručne)
alter table public.events add column distance_km numeric(7, 1) check (distance_km >= 0);
grant update (address, distance_km) on public.events to authenticated;

create table public.event_travel (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  travel_date date not null,
  vehicles smallint not null default 1 check (vehicles between 0 and 50),
  -- koľkokrát sa auto otočí (tam a späť) v ten deň
  round_trips smallint not null default 1 check (round_trips between 0 and 20),
  -- kde sa spalo: doma, na akcii, inde
  stay text not null default 'home' check (stay in ('home', 'venue', 'elsewhere')),
  stay_place text not null default '' check (char_length(stay_place) <= 160),
  extra_km numeric(7, 1) not null default 0 check (extra_km >= 0),
  note text not null default '' check (char_length(note) <= 300),
  unique (event_id, travel_date),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
alter table public.event_travel enable row level security;
create policy event_travel_select on public.event_travel for select to authenticated using (public.can(company_id, 'events.view'));
create policy event_travel_write on public.event_travel for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
revoke all on public.event_travel from anon, authenticated;
grant select, insert, delete on public.event_travel to authenticated;
grant update (vehicles, round_trips, stay, stay_place, extra_km, note) on public.event_travel to authenticated;

-- 6) Osobný výkaz (len autor a admin / CEO)
create table public.event_work_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  work_date date not null,
  starts_at time not null,
  ends_at time not null,
  break_minutes smallint not null default 0 check (break_minutes between 0 and 1440),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create table public.event_expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  spent_on date not null default current_date,
  amount numeric(10, 2) not null check (amount > 0 and amount < 1000000),
  category text not null default 'other' check (category in ('fuel', 'food', 'accommodation', 'parking', 'material', 'other')),
  place text not null default '' check (char_length(place) <= 160),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
alter table public.event_work_logs enable row level security;
alter table public.event_expenses enable row level security;
create policy event_work_logs_select on public.event_work_logs for select to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.has_role(company_id, 'admin'));
create policy event_work_logs_own on public.event_work_logs for insert to authenticated
  with check (user_id = auth.uid() and public.is_company_member(company_id));
create policy event_work_logs_delete on public.event_work_logs for delete to authenticated
  using (user_id = auth.uid() or public.has_role(company_id, 'admin'));
create policy event_expenses_select on public.event_expenses for select to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.has_role(company_id, 'admin'));
create policy event_expenses_own on public.event_expenses for insert to authenticated
  with check (user_id = auth.uid() and public.is_company_member(company_id));
create policy event_expenses_delete on public.event_expenses for delete to authenticated
  using (user_id = auth.uid() or public.has_role(company_id, 'admin'));
revoke all on public.event_work_logs, public.event_expenses from anon, authenticated;
grant select, insert, delete on public.event_work_logs, public.event_expenses to authenticated;

-- 7) Zariadenia členov: druhá MAC adresa (sieťová karta ethernet / LAN, napr. notebook).
alter table public.member_devices add column ethernet_mac text not null default ''
  check (ethernet_mac = '' or ethernet_mac ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$');
grant update (ethernet_mac) on public.member_devices to authenticated;
