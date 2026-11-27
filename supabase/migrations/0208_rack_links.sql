-- RigTrack 12.14: prepojenia a káble medzi prístrojmi v racku. Ukladajú sa pri racku (links) spolu s osadením cez
-- save_rack – v jednej verzii a s ochranou pred prepísaním. Prepojenie odkazuje na poradie slotu v osadení (sort)
-- a na port (napr. out-1, power). Priamo sa stĺpec meniť nedá (update na rack_designs je len na vybrané stĺpce).

alter table public.rack_designs add column if not exists links jsonb not null default '[]'::jsonb;
alter table public.rack_designs drop constraint if exists rack_designs_links_check;
alter table public.rack_designs add constraint rack_designs_links_check check (jsonb_typeof(links) = 'array' and pg_column_size(links) <= 200000);

-- Prepojenia očistené: len známe polia, platné poradie slotov (1..počet), krátke texty, známy typ kábla.
create or replace function public.rack_clean_links(_links jsonb, _slot_count integer)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'from', (l ->> 'from')::integer,
      'fromPort', left(l ->> 'fromPort', 40),
      'to', (l ->> 'to')::integer,
      'toPort', left(l ->> 'toPort', 40),
      'cable', l ->> 'cable',
      'lengthM', case when (l ->> 'lengthM') ~ '^[0-9]{1,4}(\.[0-9]{1,2})?$' then least((l ->> 'lengthM')::numeric, 1000) end,
      'label', left(coalesce(l ->> 'label', ''), 80)
    ) order by n), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(_links) = 'array' then _links else '[]'::jsonb end) with ordinality as x(l, n)
  where n <= 800
    and jsonb_typeof(l) = 'object'
    -- Prevod na číslo až po kontrole tvaru (poradie podmienok v AND nie je zaručené).
    and case when (l ->> 'from') ~ '^[0-9]{1,4}$' and (l ->> 'to') ~ '^[0-9]{1,4}$'
      then (l ->> 'from')::integer between 1 and _slot_count and (l ->> 'to')::integer between 1 and _slot_count and (l ->> 'from') <> (l ->> 'to')
      else false end
    and coalesce(l ->> 'fromPort', '') <> '' and coalesce(l ->> 'toPort', '') <> ''
    and l ->> 'cable' in ('XLR', 'NL4', 'power', 'CAT', 'BNC', 'DMX', 'video', 'other');
$$;
revoke execute on function public.rack_clean_links(jsonb, integer) from public, anon;

-- save_rack s prepojeniami. Bez _links (staršia aplikácia) ostanú prepojenia, aké boli.
drop function if exists public.save_rack(uuid, integer, jsonb);
create or replace function public.save_rack(_rack_id uuid, _expected_version integer, _slots jsonb, _links jsonb default null)
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
  if _links is not null and (jsonb_typeof(_links) <> 'array' or jsonb_array_length(_links) > 800) then
    raise exception 'Neplatné prepojenia' using errcode = 'check_violation';
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
  update public.rack_designs set version = _next, updated_at = now(), updated_by = auth.uid(),
    links = case when _links is null then links else public.rack_clean_links(_links, jsonb_array_length(_slots)) end
  where id = r.id;
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  select r.company_id, 'rack', r.id, _next, jsonb_build_object(
    'rack', (select to_jsonb(d) - 'company_id' from public.rack_designs d where d.id = r.id),
    'slots', coalesce((select jsonb_agg(to_jsonb(s) - 'company_id' - 'rack_id' order by s.sort) from public.rack_slots s where s.company_id = r.company_id and s.rack_id = r.id), '[]'::jsonb));
  return _next;
end;
$$;
revoke execute on function public.save_rack(uuid, integer, jsonb, jsonb) from public, anon;
grant execute on function public.save_rack(uuid, integer, jsonb, jsonb) to authenticated;

-- Kópia racku (šablóna / do akcie) aj s prepojeniami.
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
  update public.rack_designs set links = r.links where id = _id;
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
