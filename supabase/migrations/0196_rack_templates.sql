-- 0196: Racky – šablóny a väzba na akciu.
--   copy_rack: kópia racku s osadením (uloženie ako šablóna, vloženie šablóny do akcie). Pri vložení do akcie sa
--   kusy hneď pridajú do techniky akcie (pack list) – tým sú v termíne akcie rezervované.
--   rack_to_event: kusy z racku do techniky jeho akcie (počet podľa osadenia, najviac koľko kusov firma má).

create or replace function public.rack_to_event(_rack_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r public.rack_designs%rowtype;
  _count integer := 0;
begin
  select * into r from public.rack_designs where id = _rack_id;
  if not found or not public.can(r.company_id, 'racks.view') or not public.can(r.company_id, 'events.edit') then
    raise exception 'Rack neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if r.event_id is null then
    raise exception 'Rack nie je priradený k akcii' using errcode = 'check_violation';
  end if;
  insert into public.event_equipment (company_id, event_id, equipment_id, quantity)
  select r.company_id, r.event_id, s.equipment_id, least(count(*)::integer, max(e.quantity))
  from public.rack_slots s
  join public.equipment e on e.company_id = s.company_id and e.id = s.equipment_id
  where s.company_id = r.company_id and s.rack_id = r.id and s.equipment_id is not null and e.quantity > 0
  group by s.equipment_id
  on conflict (event_id, equipment_id) do update set quantity = greatest(public.event_equipment.quantity, excluded.quantity);
  get diagnostics _count = row_count;
  return _count;
end;
$$;
revoke execute on function public.rack_to_event(uuid) from public, anon;
grant execute on function public.rack_to_event(uuid) to authenticated;

create or replace function public.copy_rack(_rack_id uuid, _name text, _as_template boolean, _event_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  r public.rack_designs%rowtype;
  _id uuid;
begin
  select * into r from public.rack_designs where id = _rack_id;
  if not found or not public.can(r.company_id, 'racks.edit') then
    raise exception 'Rack neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _event_id is not null and not exists (select 1 from public.events e where e.company_id = r.company_id and e.id = _event_id) then
    raise exception 'Akcia neexistuje' using errcode = 'check_violation';
  end if;
  insert into public.rack_designs (company_id, name, rack_type, units, depth_mm, rails, max_load_kg, own_weight_kg, note, case_id, event_id, is_template, created_by, updated_by)
  values (r.company_id, left(coalesce(nullif(btrim(_name), ''), r.name), 120), r.rack_type, r.units, r.depth_mm, r.rails, r.max_load_kg, r.own_weight_kg, r.note,
    case when _as_template then null else r.case_id end, case when _as_template then null else _event_id end, _as_template, auth.uid(), auth.uid())
  returning id into _id;
  insert into public.rack_slots (company_id, rack_id, side, bottom_u, height_u, width, col, equipment_id, unit, catalog_id, accessory, label, depth_mm, weight_kg, power_w, rear_support, sort)
  select company_id, _id, side, bottom_u, height_u, width, col, equipment_id, unit, catalog_id, accessory, label, depth_mm, weight_kg, power_w, rear_support, sort
  from public.rack_slots where company_id = r.company_id and rack_id = r.id;
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  select r.company_id, 'rack', _id, 1, jsonb_build_object(
    'rack', (select to_jsonb(d) - 'company_id' from public.rack_designs d where d.id = _id),
    'slots', coalesce((select jsonb_agg(to_jsonb(s) - 'company_id' - 'rack_id' order by s.sort) from public.rack_slots s where s.company_id = r.company_id and s.rack_id = _id), '[]'::jsonb),
    'copiedFrom', r.id);
  -- Vložené do akcie: kusy do techniky akcie (rezervácia), ak to človek smie.
  if not _as_template and _event_id is not null and public.can(r.company_id, 'events.edit') then
    perform public.rack_to_event(_id);
  end if;
  return _id;
end;
$$;
revoke execute on function public.copy_rack(uuid, text, boolean, uuid) from public, anon;
grant execute on function public.copy_rack(uuid, text, boolean, uuid) to authenticated;
