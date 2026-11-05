-- RigTrack 8.3: spoločný katalóg techniky. Oficiálne značky a modely (len technické údaje modelu – nikdy sériové
-- čísla, ceny ani nič o firme) vidí každý prihlásený. Keď firma zadá model, ktorý v katalógu nie je, vznikne návrh;
-- vývojár ho overí a schváli (aj s úpravou) alebo zamietne. Zapisuje sa len cez funkcie.

create table if not exists public.equipment_catalog (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('audio', 'light', 'video', 'dj', 'truss', 'stage', 'cable', 'it', 'appliance', 'consumable', 'general')),
  manufacturer text not null check (char_length(trim(manufacturer)) between 1 and 80),
  model text not null default '' check (char_length(model) <= 80),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object' and pg_column_size(attributes) <= 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists equipment_catalog_key on public.equipment_catalog (kind, lower(manufacturer), lower(model));
alter table public.equipment_catalog enable row level security;
drop policy if exists equipment_catalog_select on public.equipment_catalog;
create policy equipment_catalog_select on public.equipment_catalog for select to authenticated using (true);
revoke all on public.equipment_catalog from anon, authenticated;
grant select on public.equipment_catalog to authenticated;

create table if not exists public.equipment_catalog_submissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('audio', 'light', 'video', 'dj', 'truss', 'stage', 'cable', 'it', 'appliance', 'consumable', 'general')),
  manufacturer text not null check (char_length(trim(manufacturer)) between 1 and 80),
  model text not null default '' check (char_length(model) <= 80),
  name text not null default '' check (char_length(name) <= 200),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object' and pg_column_size(attributes) <= 8000),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text not null default '' check (char_length(review_note) <= 300),
  reviewed_at timestamptz,
  catalog_id uuid references public.equipment_catalog (id) on delete set null
);
create index if not exists equipment_catalog_submissions_company_idx on public.equipment_catalog_submissions (company_id);
create index if not exists equipment_catalog_submissions_catalog_idx on public.equipment_catalog_submissions (catalog_id);
create index if not exists equipment_catalog_submissions_pending_idx on public.equipment_catalog_submissions (kind, lower(manufacturer), lower(model)) where status = 'pending';
alter table public.equipment_catalog_submissions enable row level security;
drop policy if exists equipment_catalog_submissions_select on public.equipment_catalog_submissions;
create policy equipment_catalog_submissions_select on public.equipment_catalog_submissions for select to authenticated
  using (public.is_developer() or public.is_company_member(company_id));
revoke all on public.equipment_catalog_submissions from anon, authenticated;
grant select on public.equipment_catalog_submissions to authenticated;

-- Návrh od firmy: len kto upravuje techniku; model už v katalógu = nič; rovnaký návrh firmy sa len aktualizuje.
create or replace function public.submit_catalog_entry(_company_id uuid, _kind text, _manufacturer text, _model text, _name text, _attributes jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _id uuid;
  _maker text := trim(coalesce(_manufacturer, ''));
  _mod text := trim(coalesce(_model, ''));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.can(_company_id, 'equipment.edit') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if _maker = '' or char_length(_maker) > 80 or char_length(_mod) > 80 or _attributes is null or jsonb_typeof(_attributes) <> 'object' then
    raise exception 'Invalid entry' using errcode = '22023';
  end if;
  if exists (select 1 from public.equipment_catalog c where c.kind = _kind and lower(c.manufacturer) = lower(_maker) and lower(c.model) = lower(_mod)) then
    return null;
  end if;
  select id into _id from public.equipment_catalog_submissions s
  where s.company_id = _company_id and s.status = 'pending' and s.kind = _kind and lower(s.manufacturer) = lower(_maker) and lower(s.model) = lower(_mod);
  if _id is not null then
    update public.equipment_catalog_submissions set attributes = _attributes, name = left(coalesce(_name, ''), 200) where id = _id;
    return _id;
  end if;
  if (select count(*) from public.equipment_catalog_submissions s where s.company_id = _company_id and s.status = 'pending') >= 300 then
    raise exception 'Too many pending entries' using errcode = '54000';
  end if;
  insert into public.equipment_catalog_submissions (company_id, kind, manufacturer, model, name, attributes)
  values (_company_id, _kind, _maker, _mod, left(coalesce(_name, ''), 200), _attributes)
  returning id into _id;
  return _id;
end;
$$;

-- Na overenie (vývojár): rovnaký model od viacerých firiem ako jeden riadok – počet firiem, najnovšie údaje.
create or replace function public.catalog_review_queue()
returns table (id uuid, kind text, manufacturer text, model text, name text, attributes jsonb, companies bigint, submitted_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_developer() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
  select distinct on (s.kind, lower(s.manufacturer), lower(s.model))
    s.id, s.kind, s.manufacturer, s.model, s.name, s.attributes,
    (select count(distinct o.company_id) from public.equipment_catalog_submissions o
      where o.status = 'pending' and o.kind = s.kind and lower(o.manufacturer) = lower(s.manufacturer) and lower(o.model) = lower(s.model)),
    s.created_at
  from public.equipment_catalog_submissions s
  where s.status = 'pending'
  order by s.kind, lower(s.manufacturer), lower(s.model), s.created_at desc;
end;
$$;

-- Schváliť (aj s opravou názvov a údajov): model do katalógu, všetky rovnaké čakajúce návrhy sa uzavrú.
create or replace function public.approve_catalog_entry(_submission_id uuid, _kind text, _manufacturer text, _model text, _attributes jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _source public.equipment_catalog_submissions;
  _catalog uuid;
  _maker text := trim(coalesce(_manufacturer, ''));
  _mod text := trim(coalesce(_model, ''));
begin
  if not public.is_developer() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if _maker = '' or _attributes is null or jsonb_typeof(_attributes) <> 'object' then
    raise exception 'Invalid entry' using errcode = '22023';
  end if;
  select * into _source from public.equipment_catalog_submissions where id = _submission_id;
  insert into public.equipment_catalog (kind, manufacturer, model, attributes)
  values (_kind, _maker, _mod, _attributes)
  on conflict (kind, lower(manufacturer), lower(model)) do update set attributes = excluded.attributes, manufacturer = excluded.manufacturer, model = excluded.model, updated_at = now()
  returning id into _catalog;
  update public.equipment_catalog_submissions s
  set status = 'approved', reviewed_at = now(), catalog_id = _catalog
  where s.status = 'pending' and (
    s.id = _submission_id
    or (s.kind = _kind and lower(s.manufacturer) = lower(_maker) and lower(s.model) = lower(_mod))
    or (_source.id is not null and s.kind = _source.kind and lower(s.manufacturer) = lower(_source.manufacturer) and lower(s.model) = lower(_source.model))
  );
  return _catalog;
end;
$$;

create or replace function public.reject_catalog_entry(_submission_id uuid, _note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _source public.equipment_catalog_submissions;
begin
  if not public.is_developer() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into _source from public.equipment_catalog_submissions where id = _submission_id;
  if _source.id is null then
    return;
  end if;
  update public.equipment_catalog_submissions s
  set status = 'rejected', reviewed_at = now(), review_note = left(coalesce(_note, ''), 300)
  where s.status = 'pending' and s.kind = _source.kind and lower(s.manufacturer) = lower(_source.manufacturer) and lower(s.model) = lower(_source.model);
end;
$$;

-- Úprava alebo zmazanie modelu v katalógu (vývojár).
create or replace function public.delete_catalog_entry(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_developer() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  delete from public.equipment_catalog where id = _id;
end;
$$;

revoke execute on function public.submit_catalog_entry(uuid, text, text, text, text, jsonb) from public, anon;
revoke execute on function public.catalog_review_queue() from public, anon;
revoke execute on function public.approve_catalog_entry(uuid, text, text, text, jsonb) from public, anon;
revoke execute on function public.reject_catalog_entry(uuid, text) from public, anon;
revoke execute on function public.delete_catalog_entry(uuid) from public, anon;
grant execute on function public.submit_catalog_entry(uuid, text, text, text, text, jsonb) to authenticated;
grant execute on function public.catalog_review_queue() to authenticated;
grant execute on function public.approve_catalog_entry(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.reject_catalog_entry(uuid, text) to authenticated;
grant execute on function public.delete_catalog_entry(uuid) to authenticated;

-- Základ katalógu: známe značky a ich bežné modely (len značka a model; technické údaje doplní overovanie).
insert into public.equipment_catalog (kind, manufacturer, model) values
  ('audio', 'JBL', 'VRX932LA-1'), ('audio', 'JBL', 'VRX918S'), ('audio', 'JBL', 'SRX835P'), ('audio', 'JBL', 'SRX828SP'), ('audio', 'JBL', 'PRX815W'), ('audio', 'JBL', 'EON715'),
  ('audio', 'L-Acoustics', 'K2'), ('audio', 'L-Acoustics', 'Kara II'), ('audio', 'L-Acoustics', 'KS28'), ('audio', 'L-Acoustics', 'X15 HiQ'), ('audio', 'L-Acoustics', 'LA12X'),
  ('audio', 'd&b audiotechnik', 'V8'), ('audio', 'd&b audiotechnik', 'Y10P'), ('audio', 'd&b audiotechnik', 'E12'), ('audio', 'd&b audiotechnik', 'M4'), ('audio', 'd&b audiotechnik', 'D80'),
  ('audio', 'RCF', 'HDL 30-A'), ('audio', 'RCF', 'ART 745-A'), ('audio', 'RCF', 'SUB 8006-AS'),
  ('audio', 'dB Technologies', 'Opera 15'), ('audio', 'dB Technologies', 'VIO L210'), ('audio', 'dB Technologies', 'VIO S318'),
  ('audio', 'Shure', 'SM58'), ('audio', 'Shure', 'SM57'), ('audio', 'Shure', 'Beta 58A'), ('audio', 'Shure', 'Beta 52A'), ('audio', 'Shure', 'Beta 91A'), ('audio', 'Shure', 'ULXD4'), ('audio', 'Shure', 'QLXD4'), ('audio', 'Shure', 'PSM 1000'),
  ('audio', 'Sennheiser', 'e 835'), ('audio', 'Sennheiser', 'e 935'), ('audio', 'Sennheiser', 'e 906'), ('audio', 'Sennheiser', 'MD 421-II'), ('audio', 'Sennheiser', 'EW-DX EM 2'), ('audio', 'Sennheiser', 'ew IEM G4'),
  ('audio', 'Audio-Technica', 'ATM650'), ('audio', 'Wisycom', 'MRK960'), ('audio', 'Wisycom', 'MTH410'),
  ('audio', 'Yamaha', 'CL5'), ('audio', 'Yamaha', 'QL5'), ('audio', 'Yamaha', 'TF5'), ('audio', 'Yamaha', 'DM7'),
  ('audio', 'Allen & Heath', 'SQ-5'), ('audio', 'Allen & Heath', 'SQ-6'), ('audio', 'Allen & Heath', 'dLive S5000'), ('audio', 'Allen & Heath', 'Avantis'),
  ('audio', 'DiGiCo', 'SD12'), ('audio', 'DiGiCo', 'Quantum 225'), ('audio', 'Midas', 'M32'), ('audio', 'Midas', 'PRO2'), ('audio', 'Behringer', 'X32'),
  ('audio', 'Powersoft', 'X8'), ('audio', 'Powersoft', 'Quattrocanali 4804 DSP+D'), ('audio', 'Lab.gruppen', 'PLM 20K44'),
  ('light', 'Robe', 'MegaPointe'), ('light', 'Robe', 'Spiider'), ('light', 'Robe', 'Esprite'), ('light', 'Robe', 'LEDBeam 150'), ('light', 'Robe', 'T1 Profile'),
  ('light', 'Martin', 'MAC Aura XB'), ('light', 'Martin', 'MAC Viper Performance'), ('light', 'Martin', 'MAC Encore Performance'),
  ('light', 'Clay Paky', 'Sharpy'), ('light', 'Clay Paky', 'Mythos 2'), ('light', 'Clay Paky', 'K20 B-EYE'), ('light', 'Clay Paky', 'K10 B-EYE'),
  ('light', 'Ayrton', 'Khamsin'), ('light', 'Ayrton', 'Diablo'), ('light', 'GLP', 'impression X5'), ('light', 'GLP', 'JDC1'),
  ('light', 'Elation', 'Proteus Maximus'), ('light', 'Chauvet Professional', 'Maverick Force 3 Profile'), ('light', 'Chauvet DJ', 'Intimidator Spot 360X'),
  ('light', 'ADJ', 'Focus Spot 4Z'), ('light', 'Showtec', 'Phantom 140 LED Spot'),
  ('light', 'ETC', 'Source Four'), ('light', 'Astera', 'AX1 PixelTube'), ('light', 'Astera', 'AX3 LightDrop'),
  ('light', 'MA Lighting', 'grandMA3 light'), ('light', 'MA Lighting', 'grandMA3 compact XT'), ('light', 'Avolites', 'Titan Mobile'), ('light', 'ChamSys', 'MagicQ MQ80'),
  ('dj', 'Pioneer DJ', 'CDJ-3000'), ('dj', 'Pioneer DJ', 'DJM-900NXS2'), ('dj', 'Pioneer DJ', 'DJM-A9'), ('dj', 'Pioneer DJ', 'DJM-V10'),
  ('dj', 'Technics', 'SL-1210MK7'), ('dj', 'Allen & Heath', 'Xone:96'),
  ('video', 'Novastar', 'VX1000'), ('video', 'Novastar', 'MCTRL4K'), ('video', 'Blackmagic Design', 'ATEM Mini Pro'), ('video', 'Barco', 'E2'),
  ('truss', 'Global Truss', 'F34'), ('truss', 'Global Truss', 'F44P'), ('truss', 'Prolyte', 'H30V'), ('truss', 'Prolyte', 'H40V'), ('truss', 'Eurotruss', 'FD34'),
  ('appliance', 'Showtec', 'Compact Hazer'), ('appliance', 'MDG', 'theONE'), ('appliance', 'Look Solutions', 'Unique 2.1')
on conflict do nothing;
