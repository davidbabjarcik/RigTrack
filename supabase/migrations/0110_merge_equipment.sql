-- RigTrack 4.11: spojenie rozdelenej techniky späť (napr. omylom 2 ks do case a potom von → 2 + 8 = 10 ks).
-- Odkazy na zlúčenú časť (eventy, výpožičky, servis, hodiny…) sa presunú na tú, do ktorej sa spája.

/** Spojí časť `_from` do `_into` (tá istá technika, obe mimo case alebo v tom istom case). */
create or replace function public.merge_equipment(_from uuid, _into uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  a public.equipment%rowtype;
  b public.equipment%rowtype;
  fk record;
begin
  select * into a from public.equipment where id = _from and deleted_at is null;
  select * into b from public.equipment where id = _into and deleted_at is null;
  if a.id is null or b.id is null or a.id = b.id or a.company_id <> b.company_id or not public.can(a.company_id, 'equipment.edit') then
    raise exception 'Túto techniku nemôžete spojiť' using errcode = 'insufficient_privilege';
  end if;
  if lower(trim(a.name)) <> lower(trim(b.name)) or a.kind <> b.kind or a.case_id is distinct from b.case_id then
    raise exception 'Spojiť sa dá len tá istá technika na tom istom mieste (obe mimo case alebo v tom istom case)' using errcode = 'check_violation';
  end if;

  -- Všetky odkazy na zlučovanú časť presunúť (okrem odkazov techniky na seba, napr. kópia / zdieľanie).
  for fk in
    -- Aj zložené odkazy (company_id, equipment_id): berie sa stĺpec, ktorý ukazuje na equipment.id.
    select distinct cl.relname as tbl, att.attname as col
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace ns on ns.oid = cl.relnamespace
    cross join lateral unnest(con.conkey, con.confkey) as k(own, ref)
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.own
    join pg_attribute target on target.attrelid = con.confrelid and target.attnum = k.ref and target.attname = 'id'
    where con.contype = 'f' and con.confrelid = 'public.equipment'::regclass and ns.nspname = 'public'
      and cl.relname not in ('equipment', 'equipment_addresses')
  loop
    begin
      execute format('update public.%I set %I = $1 where %I = $2', fk.tbl, fk.col, fk.col) using _into, _from;
    exception when unique_violation then
      raise exception 'Obe časti sú na tom istom evente alebo výpožičke (%) – najprv ju tam upravte.', fk.tbl using errcode = 'check_violation';
    end;
  end loop;

  -- Kusy a čísla kusov.
  if b.track_units or a.track_units then
    update public.equipment
      set track_units = true,
          unit_ids = array(
            select distinct u from unnest(
              (case when cardinality(b.unit_ids) > 0 then b.unit_ids else array(select generate_series(1, b.quantity)) end)
              || (case when cardinality(a.unit_ids) > 0 then a.unit_ids else array(select generate_series(1, a.quantity)) end)
            ) u order by u),
          quantity = b.quantity + a.quantity,
          unit_info = coalesce(b.unit_info, '{}'::jsonb) || coalesce(a.unit_info, '{}'::jsonb)
      where id = b.id;
  else
    update public.equipment set quantity = b.quantity + a.quantity where id = b.id;
  end if;
  delete from public.equipment where id = a.id;
  return b.id;
end;
$$;
revoke execute on function public.merge_equipment(uuid, uuid) from public, anon;
grant execute on function public.merge_equipment(uuid, uuid) to authenticated;

/**
 * Vybrať z case: technika ide von z case a ak je tá istá technika už mimo case, spojí sa s ňou.
 * Vráti id výsledného riadku.
 */
create or replace function public.take_out_of_case(_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  e public.equipment%rowtype;
  _sibling uuid;
begin
  select * into e from public.equipment where id = _id and deleted_at is null;
  if e.id is null or not public.can(e.company_id, 'equipment.edit') then
    raise exception 'Túto techniku nemôžete meniť' using errcode = 'insufficient_privilege';
  end if;
  update public.equipment set case_id = null, label_role = null where id = e.id;
  select id into _sibling from public.equipment
    where company_id = e.company_id and id <> e.id and deleted_at is null and case_id is null
      and lower(trim(name)) = lower(trim(e.name)) and kind = e.kind
      and coalesce(manufacturer, '') = coalesce(e.manufacturer, '') and coalesce(model, '') = coalesce(e.model, '')
      and owner_staff_id is not distinct from e.owner_staff_id
    order by quantity desc
    limit 1;
  if _sibling is null then
    return e.id;
  end if;
  begin
    return public.merge_equipment(e.id, _sibling);
  exception when check_violation then
    -- Nedá sa spojiť (napr. obe na tom istom evente) – ostane samostatne mimo case.
    return e.id;
  end;
end;
$$;
revoke execute on function public.take_out_of_case(uuid) from public, anon;
grant execute on function public.take_out_of_case(uuid) to authenticated;
