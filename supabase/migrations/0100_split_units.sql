-- RigTrack: pri rozdelení techniky do case zostanú čísla kusov (3.19.1).
-- Technika bez vlastných čísel má kusy 1..počet; doteraz odtrhnutá časť dostala znova #1, #2.
-- Výber konkrétnych čísel zapne sledovanie kusov (čísla sa ukladajú len pri sledovaných kusoch).

/** Rozdelí techniku podľa vybraných čísel kusov: tie idú do case, zvyšok ostane s pôvodnými číslami. */
create or replace function public.split_equipment_units(_equipment_id uuid, _case_id uuid, _unit_ids integer[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  e public.equipment%rowtype;
  _id uuid;
  _all integer[];
  _picked integer[];
  _rest integer[];
begin
  select * into e from public.equipment where id = _equipment_id and deleted_at is null;
  if e.id is null or not public.can(e.company_id, 'equipment.edit') then
    raise exception 'Túto techniku nemôžete meniť' using errcode = 'insufficient_privilege';
  end if;
  if _case_id is not null and not exists (select 1 from public.cases where id = _case_id and company_id = e.company_id and deleted_at is null) then
    raise exception 'Case nepatrí tejto firme' using errcode = 'insufficient_privilege';
  end if;
  _all := case when cardinality(coalesce(e.unit_ids, '{}')) > 0 then e.unit_ids else array(select generate_series(1, e.quantity)) end;
  _picked := array(select distinct u from unnest(coalesce(_unit_ids, '{}')) u where u = any (_all) order by u);
  if cardinality(_picked) = 0 then
    raise exception 'Vyberte aspoň jeden kus' using errcode = 'check_violation';
  end if;
  _rest := array(select u from unnest(_all) u where not (u = any (_picked)) order by u);
  if cardinality(_rest) = 0 then
    update public.equipment set case_id = _case_id, label_role = null, track_units = true, unit_ids = _all where id = e.id;
    return e.id;
  end if;

  _id := gen_random_uuid();
  insert into public.equipment
  select (jsonb_populate_record(null::public.equipment,
    to_jsonb(e) || jsonb_build_object(
      'id', _id,
      'case_id', _case_id,
      'label_role', null,
      'quantity', cardinality(_picked),
      'track_units', true,
      'inventory_number', '',
      'unit_ids', to_jsonb(_picked),
      'shared_from', null,
      'created_at', now(),
      'updated_at', now()
    ))).*;
  -- Čísla kusov priamo (jsonb_populate_record ich nie všade prevedie na pole).
  update public.equipment set track_units = true, unit_ids = _picked where id = _id;
  update public.equipment set track_units = true, unit_ids = _rest, quantity = cardinality(_rest) where id = e.id;
  return _id;
end;
$$;
revoke execute on function public.split_equipment_units(uuid, uuid, integer[]) from public, anon;
grant execute on function public.split_equipment_units(uuid, uuid, integer[]) to authenticated;

/** Rozdelenie podľa počtu: prvých N čísel kusov (aj pri technike bez vlastných čísel – 1..počet). */
create or replace function public.split_equipment_into_case(_equipment_id uuid, _case_id uuid, _count integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  e public.equipment%rowtype;
  _all integer[];
  _id uuid;
begin
  select * into e from public.equipment where id = _equipment_id and deleted_at is null;
  if e.id is null or not public.can(e.company_id, 'equipment.edit') then
    raise exception 'Túto techniku nemôžete meniť' using errcode = 'insufficient_privilege';
  end if;
  if _count is null or _count < 1 then
    raise exception 'Počet musí byť aspoň 1' using errcode = 'check_violation';
  end if;
  if _count >= e.quantity then
    if _case_id is not null and not exists (select 1 from public.cases where id = _case_id and company_id = e.company_id and deleted_at is null) then
      raise exception 'Case nepatrí tejto firme' using errcode = 'insufficient_privilege';
    end if;
    update public.equipment set case_id = _case_id, label_role = null where id = e.id;
    return e.id;
  end if;
  if e.track_units then
    _all := case when cardinality(coalesce(e.unit_ids, '{}')) > 0 then e.unit_ids else array(select generate_series(1, e.quantity)) end;
    return public.split_equipment_units(_equipment_id, _case_id, _all[1:_count]);
  end if;
  -- Kusy bez čísel (napr. káble): len počet.
  if _case_id is not null and not exists (select 1 from public.cases where id = _case_id and company_id = e.company_id and deleted_at is null) then
    raise exception 'Case nepatrí tejto firme' using errcode = 'insufficient_privilege';
  end if;
  _id := gen_random_uuid();
  insert into public.equipment
  select (jsonb_populate_record(null::public.equipment,
    to_jsonb(e) || jsonb_build_object('id', _id, 'case_id', _case_id, 'label_role', null, 'quantity', _count, 'inventory_number', '', 'shared_from', null, 'created_at', now(), 'updated_at', now())
  )).*;
  update public.equipment set quantity = e.quantity - _count where id = e.id;
  return _id;
end;
$$;
revoke execute on function public.split_equipment_into_case(uuid, uuid, integer) from public, anon;
grant execute on function public.split_equipment_into_case(uuid, uuid, integer) to authenticated;
