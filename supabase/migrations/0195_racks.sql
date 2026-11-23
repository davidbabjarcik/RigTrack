-- 0195: Racky (19") po jednotkách U – fáza 1: návrh racku, osadenie a história verzií.
-- Návrh racku je samostatný dokument (voliteľne k fyzickému racku zo skladu a k akcii); osadenie sú zariadenia
-- zo skladu (aj konkrétny kus), modely z katalógu alebo doplnky (záslepka, polička…). Každé uloženie je verzia
-- v doc_versions – spoločnej histórii pre dokumenty akcie (neskôr input listy, stage plán…).
-- Nové oprávnenia racks.view / racks.edit / racks.delete (predvolene ako pri cases).

create or replace function public.permission_defaults()
returns table (permission text, roles public.app_role[])
language sql immutable set search_path = '' as $$
  values
    ('equipment.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('equipment.edit', array['skladnik', 'technik']::public.app_role[]),
    ('equipment.delete', array['skladnik']::public.app_role[]),
    ('lookups.manage', array['skladnik']::public.app_role[]),
    ('maintenance.manage', array['skladnik']::public.app_role[]),
    ('maintenance.record', array['skladnik', 'technik']::public.app_role[]),
    ('warehouse.manage', array['skladnik']::public.app_role[]),
    ('cases.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('cases.edit', array['skladnik', 'technik']::public.app_role[]),
    ('cases.delete', array['skladnik']::public.app_role[]),
    ('cases.check', array['skladnik', 'technik']::public.app_role[]),
    ('racks.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('racks.edit', array['skladnik', 'technik']::public.app_role[]),
    ('racks.delete', array['skladnik']::public.app_role[]),
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
    ('events.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('events.edit', array['skladnik', 'technik']::public.app_role[]),
    ('events.delete', array['skladnik']::public.app_role[]),
    ('service.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('service.edit', array['skladnik', 'technik']::public.app_role[]),
    ('service.delete', array['skladnik']::public.app_role[]),
    ('tasks.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('tasks.edit', array['skladnik', 'technik']::public.app_role[]),
    ('tasks.delete', array['skladnik']::public.app_role[]),
    ('shopping.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('shopping.edit', array['skladnik', 'technik']::public.app_role[]),
    ('shopping.delete', array['skladnik']::public.app_role[]),
    ('suggestions.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('suggestions.add', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('suggestions.manage', array['skladnik']::public.app_role[]),
    ('suggestions.delete', array[]::public.app_role[]),
    ('payouts.view_all', array[]::public.app_role[]),
    ('payouts.manage', array[]::public.app_role[]),
    ('audit.view', array[]::public.app_role[]),
    ('staff.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('staff.manage', array['skladnik']::public.app_role[]),
    ('report.view', array['skladnik', 'technik']::public.app_role[]),
    ('report.money', array[]::public.app_role[]),
    ('offers.view', array['skladnik']::public.app_role[]),
    ('offers.edit', array['skladnik']::public.app_role[]),
    ('offers.delete', array[]::public.app_role[]),
    ('networks.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('networks.addresses', array['skladnik', 'technik']::public.app_role[]),
    ('networks.passwords', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('networks.admin', array['skladnik', 'technik']::public.app_role[]),
    ('checks.all', array['skladnik']::public.app_role[])
$$;

create table if not exists public.rack_designs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  rack_type text not null default 'shock' check (rack_type in ('shock', 'open', 'desk')),
  units smallint not null default 12 check (units between 2 and 48),
  depth_mm integer check (depth_mm is null or depth_mm between 100 and 1500),
  rails text not null default 'both' check (rails in ('front', 'both')),
  max_load_kg numeric(7, 1) check (max_load_kg is null or (max_load_kg > 0 and max_load_kg < 10000)),
  own_weight_kg numeric(7, 1) check (own_weight_kg is null or (own_weight_kg >= 0 and own_weight_kg < 10000)),
  note text not null default '' check (char_length(note) <= 2000),
  case_id uuid,
  event_id uuid,
  is_template boolean not null default false,
  version integer not null default 1 check (version >= 1),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, case_id) references public.cases (company_id, id) on delete set null (case_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete set null (event_id)
);
create index if not exists rack_designs_company_idx on public.rack_designs (company_id, updated_at desc);
create index if not exists rack_designs_case_idx on public.rack_designs (company_id, case_id);
create index if not exists rack_designs_event_idx on public.rack_designs (company_id, event_id);
create index if not exists rack_designs_created_by_idx on public.rack_designs (created_by);
create index if not exists rack_designs_updated_by_idx on public.rack_designs (updated_by);

create table if not exists public.rack_slots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  rack_id uuid not null,
  side text not null default 'front' check (side in ('front', 'rear')),
  bottom_u smallint not null check (bottom_u between 1 and 48),
  height_u smallint not null default 1 check (height_u between 1 and 48),
  width text not null default 'full' check (width in ('full', 'half', 'third')),
  col smallint not null default 0 check (col between 0 and 2),
  equipment_id uuid,
  unit integer check (unit is null or unit between 1 and 100000),
  catalog_id uuid references public.equipment_catalog (id) on delete set null,
  accessory text check (accessory is null or accessory in ('blank', 'shelf', 'vent', 'patch', 'pdu', 'drawer', 'lamp')),
  label text not null default '' check (char_length(label) <= 120),
  depth_mm integer check (depth_mm is null or depth_mm between 0 and 2000),
  weight_kg numeric(7, 2) check (weight_kg is null or (weight_kg >= 0 and weight_kg < 1000)),
  power_w integer check (power_w is null or power_w between 0 and 100000),
  rear_support boolean,
  sort smallint not null default 0,
  check (num_nonnulls(equipment_id, catalog_id, accessory) <= 1),
  check (unit is null or equipment_id is not null),
  foreign key (company_id, rack_id) references public.rack_designs (company_id, id) on delete cascade,
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete set null (equipment_id)
);
create index if not exists rack_slots_rack_idx on public.rack_slots (company_id, rack_id);
create index if not exists rack_slots_equipment_idx on public.rack_slots (company_id, equipment_id);
create index if not exists rack_slots_catalog_idx on public.rack_slots (catalog_id);

-- História verzií dokumentov akcie (snímka pri každom uložení). Zatiaľ len racky.
create table if not exists public.doc_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  doc_type text not null check (doc_type in ('rack')),
  doc_id uuid not null,
  version integer not null check (version >= 1),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 500000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (doc_type, doc_id, version)
);
create index if not exists doc_versions_company_idx on public.doc_versions (company_id, doc_type, doc_id);
create index if not exists doc_versions_created_by_idx on public.doc_versions (created_by);

alter table public.rack_designs enable row level security;
alter table public.rack_slots enable row level security;
alter table public.doc_versions enable row level security;

drop policy if exists rack_designs_select on public.rack_designs;
create policy rack_designs_select on public.rack_designs for select to authenticated using (public.can(company_id, 'racks.view'));
drop policy if exists rack_designs_insert on public.rack_designs;
create policy rack_designs_insert on public.rack_designs for insert to authenticated with check (public.can(company_id, 'racks.edit'));
drop policy if exists rack_designs_update on public.rack_designs;
create policy rack_designs_update on public.rack_designs for update to authenticated
  using (public.can(company_id, 'racks.edit')) with check (public.can(company_id, 'racks.edit'));
drop policy if exists rack_designs_delete on public.rack_designs;
create policy rack_designs_delete on public.rack_designs for delete to authenticated using (public.can(company_id, 'racks.delete'));

drop policy if exists rack_slots_select on public.rack_slots;
create policy rack_slots_select on public.rack_slots for select to authenticated using (public.can(company_id, 'racks.view'));

drop policy if exists doc_versions_select on public.doc_versions;
create policy doc_versions_select on public.doc_versions for select to authenticated
  using (doc_type = 'rack' and public.can(company_id, 'racks.view'));

-- 2FA (0194): aj nové tabuľky len po zadaní kódu pri zapnutom 2FA.
do $$
declare
  t text;
begin
  foreach t in array array['rack_designs', 'rack_slots', 'doc_versions'] loop
    execute format('drop policy if exists mfa_required on public.%I', t);
    execute format('create policy mfa_required on public.%I as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()))', t);
  end loop;
end;
$$;

-- Osadenie a verzie sa menia len cez save_rack (naraz a s verziou); priamo len čítanie.
revoke all on public.rack_designs, public.rack_slots, public.doc_versions from anon, authenticated;
grant select, delete on public.rack_designs to authenticated;
grant insert (company_id, name, rack_type, units, depth_mm, rails, max_load_kg, own_weight_kg, note, case_id, event_id, is_template) on public.rack_designs to authenticated;
grant update (name, rack_type, units, depth_mm, rails, max_load_kg, own_weight_kg, note, case_id, event_id, is_template) on public.rack_designs to authenticated;
grant select on public.rack_slots, public.doc_versions to authenticated;

-- Uloženie osadenia naraz: celé osadenie a nová verzia so snímkou. _expected_version chráni pred prepísaním zmien,
-- ktoré medzitým uložil niekto iný.
create or replace function public.save_rack(_rack_id uuid, _expected_version integer, _slots jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r public.rack_designs%rowtype;
  _next integer;
begin
  select * into r from public.rack_designs where id = _rack_id for update;
  if not found or not public.can(r.company_id, 'racks.edit') then
    raise exception 'Rack neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if r.version <> _expected_version then
    raise exception 'Rack medzitým uložil niekto iný (verzia %). Obnovte stránku.', r.version using errcode = 'serialization_failure';
  end if;
  if _slots is null or jsonb_typeof(_slots) <> 'array' or jsonb_array_length(_slots) > 400 then
    raise exception 'Neplatné osadenie' using errcode = 'check_violation';
  end if;

  delete from public.rack_slots where company_id = r.company_id and rack_id = r.id;
  insert into public.rack_slots (company_id, rack_id, side, bottom_u, height_u, width, col, equipment_id, unit, catalog_id, accessory, label, depth_mm, weight_kg, power_w, rear_support, sort)
  select r.company_id, r.id,
    coalesce(x.s ->> 'side', 'front'), (x.s ->> 'bottomU')::smallint, coalesce((x.s ->> 'heightU')::smallint, 1),
    coalesce(x.s ->> 'width', 'full'), coalesce((x.s ->> 'col')::smallint, 0),
    -- Technika len z vlastnej firmy (cudzie id sa zahodí).
    (select e.id from public.equipment e where e.company_id = r.company_id and e.id::text = x.s ->> 'equipmentId'),
    case when exists (select 1 from public.equipment e where e.company_id = r.company_id and e.id::text = x.s ->> 'equipmentId') then (x.s ->> 'unit')::integer end,
    (select c.id from public.equipment_catalog c where c.id::text = x.s ->> 'catalogId'),
    x.s ->> 'accessory', left(coalesce(x.s ->> 'label', ''), 120),
    (x.s ->> 'depthMm')::integer, (x.s ->> 'weightKg')::numeric, (x.s ->> 'powerW')::integer, (x.s ->> 'rearSupport')::boolean,
    x.n::smallint
  from jsonb_array_elements(_slots) with ordinality as x(s, n);

  _next := r.version + 1;
  update public.rack_designs set version = _next, updated_at = now(), updated_by = auth.uid() where id = r.id;
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  select r.company_id, 'rack', r.id, _next, jsonb_build_object(
    'rack', (select to_jsonb(d) - 'company_id' from public.rack_designs d where d.id = r.id),
    'slots', coalesce((select jsonb_agg(to_jsonb(s) - 'company_id' - 'rack_id' order by s.sort) from public.rack_slots s where s.company_id = r.company_id and s.rack_id = r.id), '[]'::jsonb));
  return _next;
end;
$$;
revoke execute on function public.save_rack(uuid, integer, jsonb) from public, anon;
grant execute on function public.save_rack(uuid, integer, jsonb) to authenticated;
