-- RigTrack: moja fotka a moja technika priamo z „Vyberte firmu“ (3.7).
-- 1) Fotku do svojej karty zamestnanca si nahrá každý člen firmy (aj pomocník alebo divák) – len pod
--    názvom „staff-<id mojej karty>-…“ v priečinku firmy.
-- 2) Vlastnú techniku a vlastný case / rack si člen založí sám vo zvolenej firme; vlastníkom je jeho karta.

drop policy if exists equipment_photos_own_staff_insert on storage.objects;
create policy equipment_photos_own_staff_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'equipment-photos'
    and exists (
      select 1 from public.staff s
      where s.company_id::text = (storage.foldername(objects.name))[1]
        and s.member_id = auth.uid()
        and storage.filename(objects.name) like 'staff-' || s.id::text || '-%'
    )
  );
drop policy if exists equipment_photos_own_staff_delete on storage.objects;
create policy equipment_photos_own_staff_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'equipment-photos'
    and exists (
      select 1 from public.staff s
      where s.company_id::text = (storage.foldername(objects.name))[1]
        and s.member_id = auth.uid()
        and storage.filename(objects.name) like 'staff-' || s.id::text || '-%'
    )
  );

/** Moja karta zamestnanca vo firme; ak ešte nie je, založí sa. */
create or replace function public.my_staff_card(_company_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _card uuid;
begin
  if not public.is_company_member(_company_id) then
    raise exception 'Nie ste členom tejto firmy' using errcode = 'insufficient_privilege';
  end if;
  select id into _card from public.staff where company_id = _company_id and member_id = auth.uid();
  if _card is null then
    insert into public.staff (company_id, member_id, name) values (_company_id, auth.uid(), '') returning id into _card;
  end if;
  return _card;
end;
$$;

/** Založí moju vlastnú techniku vo firme (vlastník = moja karta). */
create or replace function public.create_own_equipment(_company_id uuid, _name text, _kind text, _quantity integer, _manufacturer text default '', _model text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _id uuid;
begin
  insert into public.equipment (company_id, name, kind, quantity, manufacturer, model, owner_staff_id)
  values (_company_id, trim(_name), _kind, greatest(1, coalesce(_quantity, 1)), coalesce(trim(_manufacturer), ''), coalesce(trim(_model), ''), public.my_staff_card(_company_id))
  returning id into _id;
  return _id;
end;
$$;

/** Založí môj vlastný case / rack vo firme (vlastník = moja karta). */
create or replace function public.create_own_case(_company_id uuid, _name text, _note text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _id uuid;
begin
  insert into public.cases (company_id, name, note, owner_staff_id)
  values (_company_id, trim(_name), coalesce(trim(_note), ''), public.my_staff_card(_company_id))
  returning id into _id;
  return _id;
end;
$$;

revoke execute on function public.my_staff_card(uuid), public.create_own_equipment(uuid, text, text, integer, text, text), public.create_own_case(uuid, text, text) from public, anon;
grant execute on function public.my_staff_card(uuid), public.create_own_equipment(uuid, text, text, integer, text, text), public.create_own_case(uuid, text, text) to authenticated;

-- 3) Zariadenia hostí (napr. hosťujúci zvukár): meno, kontakt, zariadenie, MAC, prípadne pevná IP a sieť.
--    V IP tabuľke ich vidí a zapisuje, kto upravuje techniku (kontakt je osobný údaj).
create table if not exists public.guest_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  person_name text not null check (char_length(trim(person_name)) between 1 and 120),
  contact text not null default '' check (char_length(contact) <= 120),
  device_name text not null default '' check (char_length(device_name) <= 80),
  mac text not null default '' check (mac = '' or mac ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'),
  ip text not null default '' check (char_length(ip) <= 45),
  network_id uuid references public.wifi_networks (id) on delete set null,
  note text not null default '' check (char_length(note) <= 300),
  valid_until date,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (mac <> '' or ip <> '')
);
create index if not exists guest_devices_company_idx on public.guest_devices (company_id);

alter table public.guest_devices enable row level security;
drop policy if exists guest_devices_select on public.guest_devices;
drop policy if exists guest_devices_write on public.guest_devices;
create policy guest_devices_select on public.guest_devices for select to authenticated using (public.can(company_id, 'equipment.edit'));
create policy guest_devices_write on public.guest_devices for all to authenticated
  using (public.can(company_id, 'equipment.edit')) with check (public.can(company_id, 'equipment.edit'));
revoke all on public.guest_devices from anon, authenticated;
grant select, insert, update, delete on public.guest_devices to authenticated;

-- 4) Časť kusov do case: zo 16 svetiel dám 2 do case – vznikne nová položka s 2 ks v case, pôvodná má 14.
--    Pri technike s očíslovanými kusmi idú do case prvé čísla. Inventárne číslo ostáva pôvodnej položke.
create or replace function public.split_equipment_into_case(_equipment_id uuid, _case_id uuid, _count integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  e public.equipment%rowtype;
  _id uuid;
  _units integer[];
begin
  select * into e from public.equipment where id = _equipment_id and deleted_at is null;
  if e.id is null or not public.can(e.company_id, 'equipment.edit') then
    raise exception 'Túto techniku nemôžete meniť' using errcode = 'insufficient_privilege';
  end if;
  if _case_id is not null and not exists (select 1 from public.cases where id = _case_id and company_id = e.company_id and deleted_at is null) then
    raise exception 'Case nepatrí tejto firme' using errcode = 'insufficient_privilege';
  end if;
  if _count is null or _count < 1 then
    raise exception 'Počet musí byť aspoň 1' using errcode = 'check_violation';
  end if;
  if _count >= e.quantity then
    update public.equipment set case_id = _case_id, label_role = null where id = e.id;
    return e.id;
  end if;

  _units := coalesce(e.unit_ids, '{}');
  _id := gen_random_uuid();
  insert into public.equipment
  select (jsonb_populate_record(null::public.equipment,
    to_jsonb(e) || jsonb_build_object(
      'id', _id,
      'case_id', _case_id,
      'label_role', null,
      'quantity', _count,
      'inventory_number', '',
      'unit_ids', case when cardinality(_units) > 0 then to_jsonb(_units[1:_count]) else to_jsonb(_units) end,
      'shared_from', null,
      'created_at', now(),
      'updated_at', now()
    ))).*;
  update public.equipment
    set quantity = e.quantity - _count,
        unit_ids = case when cardinality(_units) > 0 then _units[_count + 1:] else unit_ids end
    where id = e.id;
  return _id;
end;
$$;

-- 5) Viac case naraz: „Case svetlo 1“ až „Case svetlo 8“, voliteľne podľa šablóny a s rovnomerne
--    rozdelenou technikou (napr. 16 svetiel → 2 do každého).
create or replace function public.create_cases_bulk(
  _company_id uuid, _base_name text, _count integer, _start integer default 1, _template_id uuid default null,
  _equipment_id uuid default null, _per_case integer default null
)
returns uuid[] language plpgsql security definer set search_path = '' as $$
declare
  t public.case_templates%rowtype;
  _ids uuid[] := '{}';
  _case uuid;
  _available integer;
  i integer;
begin
  if not public.can(_company_id, 'cases.edit') then
    raise exception 'Nemôžete pridávať case' using errcode = 'insufficient_privilege';
  end if;
  if _count is null or _count < 1 or _count > 100 then
    raise exception 'Počet case musí byť 1 až 100' using errcode = 'check_violation';
  end if;
  if _template_id is not null then
    select * into t from public.case_templates where id = _template_id and company_id = _company_id;
  end if;
  if _equipment_id is not null then
    if not public.can(_company_id, 'equipment.edit') then
      raise exception 'Techniku nemôžete meniť' using errcode = 'insufficient_privilege';
    end if;
    select quantity into _available from public.equipment where id = _equipment_id and company_id = _company_id and deleted_at is null;
    if _available is null or coalesce(_per_case, 0) < 1 or _available < _count * _per_case then
      raise exception 'Nie je dosť kusov: treba %, je %', _count * coalesce(_per_case, 0), coalesce(_available, 0) using errcode = 'check_violation';
    end if;
  end if;

  for i in 0 .. _count - 1 loop
    insert into public.cases (company_id, name, label_number, label_category, weight_kg, width_cm, length_cm, depth_cm)
    values (_company_id, trim(_base_name) || ' ' || (coalesce(_start, 1) + i), (coalesce(_start, 1) + i)::text,
            coalesce(t.label_category, ''), t.weight_kg, t.width_cm, t.length_cm, t.depth_cm)
    returning id into _case;
    _ids := _ids || _case;
    if _equipment_id is not null then
      perform public.split_equipment_into_case(_equipment_id, _case, _per_case);
    end if;
  end loop;
  return _ids;
end;
$$;

revoke execute on function public.split_equipment_into_case(uuid, uuid, integer), public.create_cases_bulk(uuid, text, integer, integer, uuid, uuid, integer) from public, anon;
grant execute on function public.split_equipment_into_case(uuid, uuid, integer), public.create_cases_bulk(uuid, text, integer, integer, uuid, uuid, integer) to authenticated;

-- 6) Profil → karty zamestnanca (telefón, e-mail, narodeniny, meniny, vodičák, sociálne siete): funkcie aj
--    spúšťače nanovo (ak by v databáze chýbali alebo boli staršie) a jednorazové dorovnanie všetkých kariet.
create or replace function public.apply_personal_profile(_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.personal_profiles%rowtype;
begin
  select * into p from public.personal_profiles where user_id = _user_id;
  if not found then return; end if;
  update public.staff s
    set phone = p.phone, email = p.email, birth_date = p.birth_date, name_day = p.name_day, licences = p.licences,
        socials = case when p.socials = '{}'::jsonb then s.socials else p.socials end
    where s.member_id = _user_id and s.sync_profile;
  if p.home_address <> '' then
    insert into public.member_homes (company_id, user_id, address, lat, lon, updated_at)
      select m.company_id, _user_id, p.home_address, p.home_lat, p.home_lon, now()
      from public.company_members m where m.user_id = _user_id
    on conflict (company_id, user_id) do update set address = excluded.address, lat = excluded.lat, lon = excluded.lon, updated_at = now();
  end if;
end;
$$;
revoke execute on function public.apply_personal_profile(uuid) from public, anon, authenticated;

create or replace function public.fill_staff_from_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  p public.personal_profiles%rowtype;
begin
  if new.member_id is null or not new.sync_profile then return new; end if;
  if tg_op = 'UPDATE' and old.sync_profile then return new; end if;
  select * into p from public.personal_profiles where user_id = new.member_id;
  if found then
    new.phone := p.phone;
    new.email := p.email;
    new.birth_date := p.birth_date;
    new.name_day := p.name_day;
    new.licences := p.licences;
    if p.socials <> '{}'::jsonb then new.socials := p.socials; end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.fill_staff_from_profile() from public, anon, authenticated;

create or replace function public.personal_profile_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.apply_personal_profile(new.user_id);
  return new;
end;
$$;
revoke execute on function public.personal_profile_changed() from public, anon, authenticated;
drop trigger if exists personal_profiles_apply on public.personal_profiles;
create trigger personal_profiles_apply after insert or update on public.personal_profiles
  for each row execute function public.personal_profile_changed();
drop trigger if exists staff_fill_from_profile on public.staff;
create trigger staff_fill_from_profile before insert or update of sync_profile on public.staff
  for each row execute function public.fill_staff_from_profile();

select public.apply_personal_profile(user_id) from public.personal_profiles;
