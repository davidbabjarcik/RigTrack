-- RigTrack: vlastná technika vo viacerých firmách (3.6).
-- Kto má techniku vedenú ako svoju (vlastník = jeho karta zamestnanca), môže ju jedným klikom pridať aj do
-- ďalšej svojej firmy. V nej vznikne kópia s tým istým vlastníkom (jeho kartou v tej firme) a odkazom na
-- pôvodnú položku (shared_from) – dá sa dať na event ako ostatná technika. Zmeny z pôvodnej položky sa
-- do kópií prenesú tlačidlom; kópiu môže majiteľ z firmy aj odobrať.

alter table public.equipment add column if not exists shared_from uuid references public.equipment (id) on delete set null;
create index if not exists equipment_shared_from_idx on public.equipment (shared_from) where shared_from is not null;

/** Patrí položka prihlásenému (vlastník je jeho karta zamestnanca v tej istej firme)? */
create or replace function public.owns_equipment(_equipment_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.equipment e
    join public.staff s on s.id = e.owner_staff_id and s.company_id = e.company_id
    where e.id = _equipment_id and s.member_id = auth.uid()
  )
$$;
revoke execute on function public.owns_equipment(uuid) from public, anon;
grant execute on function public.owns_equipment(uuid) to authenticated;

/** Pridá moju techniku do ďalšej mojej firmy (alebo vráti už existujúcu kópiu). */
create or replace function public.share_own_equipment(_equipment_id uuid, _company_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  e public.equipment%rowtype;
  _card uuid;
  _copy uuid;
begin
  if not public.owns_equipment(_equipment_id) then
    raise exception 'Táto technika vám nepatrí' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_company_member(_company_id) then
    raise exception 'Nie ste členom tejto firmy' using errcode = 'insufficient_privilege';
  end if;
  select * into e from public.equipment where id = _equipment_id;
  if e.company_id = _company_id then return e.id; end if;
  select id into _copy from public.equipment where company_id = _company_id and shared_from = _equipment_id and deleted_at is null limit 1;
  if _copy is not null then return _copy; end if;

  select id into _card from public.staff where company_id = _company_id and member_id = auth.uid();
  if _card is null then
    insert into public.staff (company_id, member_id, name) values (_company_id, auth.uid(), '') returning id into _card;
  end if;
  insert into public.equipment (company_id, name, kind, attributes, manufacturer, model, serial_number, quantity, track_units, unit_ids, note, owner_staff_id, shared_from)
  values (_company_id, e.name, e.kind, e.attributes, e.manufacturer, e.model, e.serial_number, e.quantity, e.track_units, e.unit_ids, e.note, _card, e.id)
  returning id into _copy;
  return _copy;
end;
$$;

/** Prenesie názov, počet a parametre z pôvodnej položky do všetkých jej kópií v iných firmách. */
create or replace function public.sync_own_equipment(_equipment_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  e public.equipment%rowtype;
  _count integer;
begin
  if not public.owns_equipment(_equipment_id) then
    raise exception 'Táto technika vám nepatrí' using errcode = 'insufficient_privilege';
  end if;
  select * into e from public.equipment where id = _equipment_id;
  update public.equipment c
    set name = e.name, kind = e.kind, attributes = e.attributes, manufacturer = e.manufacturer, model = e.model,
        serial_number = e.serial_number, quantity = e.quantity, track_units = e.track_units, unit_ids = e.unit_ids, note = e.note
    where c.shared_from = _equipment_id;
  get diagnostics _count = row_count;
  return _count;
end;
$$;

/** Odoberie kópiu mojej techniky z firmy (pôvodná položka ostáva). */
create or replace function public.unshare_own_equipment(_copy_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.owns_equipment(_copy_id) or not exists (select 1 from public.equipment where id = _copy_id and shared_from is not null) then
    raise exception 'Odobrať sa dá len kópia vašej techniky' using errcode = 'insufficient_privilege';
  end if;
  delete from public.equipment where id = _copy_id;
end;
$$;
revoke execute on function public.share_own_equipment(uuid, uuid), public.sync_own_equipment(uuid), public.unshare_own_equipment(uuid) from public, anon;
grant execute on function public.share_own_equipment(uuid, uuid), public.sync_own_equipment(uuid), public.unshare_own_equipment(uuid) to authenticated;
