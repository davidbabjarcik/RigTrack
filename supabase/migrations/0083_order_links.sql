-- RigTrack: faktúry ku kusom techniky (3.3).
-- Položku objednávky (faktúry) sa dá prepojiť s technikou, ktorú už máte v evidencii – bez pripočítania kusov –
-- a pri technike evidovanej po kusoch aj s konkrétnymi kusmi (napr. #1–4 majú faktúru, #5–8 ešte nie).
-- Prepojiť sa dá pri novej objednávke (režim „link“) aj dodatočne pri existujúcej položke.

alter table public.order_item_equipment add column if not exists unit_numbers integer[] not null default '{}'
  check (cardinality(unit_numbers) <= 500);

alter table public.order_items drop constraint if exists order_items_mode_check;
alter table public.order_items add constraint order_items_mode_check check (mode in ('none', 'separate', 'bulk', 'existing', 'link'));

-- Nákupy techniky: navyše ktoré kusy a či k nákupu je faktúra.
create or replace view public.equipment_purchases with (security_invoker = true) as
select
  l.company_id, l.equipment_id, l.order_item_id, l.quantity,
  i.name as item_name, i.unit_price,
  o.id as order_id, o.supplier, o.order_number, o.ordered_at, o.currency,
  i.article_number,
  o.source, o.seller,
  l.unit_numbers, o.has_invoice
from public.order_item_equipment l
join public.order_items i on i.id = l.order_item_id
join public.orders o on o.id = i.order_id;

create or replace function public.create_order(_company_id uuid, _order jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _order_id uuid;
  _item jsonb;
  _item_id uuid;
  _equipment_id uuid;
  _equipment_name text;
  _category_id uuid;
  _kind text;
  _attributes jsonb;
  _qty integer;
  _mode text;
  _units integer[];
  _position integer := 0;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Objednávka musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.orders (company_id, supplier, order_number, ordered_at, currency, note, source, seller)
  values (
    _company_id,
    trim(_order ->> 'supplier'),
    coalesce(trim(_order ->> 'order_number'), ''),
    coalesce((_order ->> 'ordered_at')::date, current_date),
    coalesce(_order ->> 'currency', 'EUR'),
    coalesce(trim(_order ->> 'note'), ''),
    coalesce(nullif(_order ->> 'source', ''), 'shop'),
    coalesce(trim(_order ->> 'seller'), '')
  )
  returning id into _order_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    _mode := coalesce(_item ->> 'mode', 'none');
    _category_id := nullif(_item ->> 'category_id', '')::uuid;
    _kind := coalesce(nullif(_item ->> 'kind', ''), 'general');
    _attributes := coalesce(_item -> 'attributes', '{}'::jsonb);

    insert into public.order_items (company_id, order_id, position, name, quantity, unit_price, article_number, mode, category_id)
    values (
      _company_id, _order_id, _position, trim(_item ->> 'name'), _qty,
      coalesce((_item ->> 'unit_price')::numeric, 0),
      coalesce(trim(_item ->> 'article_number'), ''),
      _mode, _category_id
    )
    returning id into _item_id;
    _position := _position + 1;

    _equipment_name := left(coalesce(nullif(trim(_item ->> 'equipment_name'), ''), trim(_item ->> 'name')), 120);

    if _mode = 'separate' then
      if _qty > 200 then
        raise exception 'Samostatne možno naraz založiť najviac 200 kusov' using errcode = 'check_violation';
      end if;
      for _n in 1 .. _qty loop
        insert into public.equipment (company_id, name, category_id, kind, attributes)
        values (_company_id, _equipment_name, _category_id, _kind, _attributes)
        returning id into _equipment_id;
        insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
        values (_company_id, _item_id, _equipment_id, 1);
      end loop;
    elsif _mode = 'bulk' then
      insert into public.equipment (company_id, name, category_id, kind, attributes, quantity)
      values (_company_id, _equipment_name, _category_id, _kind, _attributes, _qty)
      returning id into _equipment_id;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode = 'existing' then
      update public.equipment set quantity = quantity + _qty
      where company_id = _company_id and id = (_item ->> 'equipment_id')::uuid
      returning id into _equipment_id;
      if _equipment_id is null then
        raise exception 'Technika na doplnenie neexistuje' using errcode = 'no_data_found';
      end if;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode = 'link' then
      -- Technika už je v evidencii: len prepojenie (počet kusov sa nemení), prípadne s číslami kusov.
      select id into _equipment_id from public.equipment where company_id = _company_id and id = (_item ->> 'equipment_id')::uuid;
      if _equipment_id is null then
        raise exception 'Technika na prepojenie neexistuje' using errcode = 'no_data_found';
      end if;
      _units := coalesce((select array_agg(distinct value::integer order by value::integer) from jsonb_array_elements_text(coalesce(_item -> 'unit_numbers', '[]'::jsonb))), '{}');
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity, unit_numbers)
      values (_company_id, _item_id, _equipment_id, _qty, _units);
    elsif _mode <> 'none' then
      raise exception 'Neznámy režim položky: %', _mode using errcode = 'check_violation';
    end if;
  end loop;

  return _order_id;
end;
$$;

/**
 * Dodatočné prepojenie položky objednávky s technikou, ktorú už máte (počet kusov sa nemení).
 * Prázdne _units = celá položka bez čísel kusov. Opätovné volanie prepojenie s tou technikou prepíše.
 */
create or replace function public.link_order_item(_item_id uuid, _equipment_id uuid, _units integer[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _qty integer;
begin
  select i.company_id, i.quantity into _company, _qty from public.order_items i where i.id = _item_id;
  if _company is null or not public.can(_company, 'orders.edit') then
    raise exception 'Na prepojenie nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.equipment e where e.id = _equipment_id and e.company_id = _company) then
    raise exception 'Technika na prepojenie neexistuje' using errcode = 'no_data_found';
  end if;
  _units := coalesce((select array_agg(distinct u order by u) from unnest(_units) u where u > 0), '{}');
  delete from public.order_item_equipment where order_item_id = _item_id and equipment_id = _equipment_id;
  insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity, unit_numbers)
  values (_company, _item_id, _equipment_id, greatest(1, coalesce(nullif(cardinality(_units), 0), _qty)), _units);
  update public.order_items set mode = 'link' where id = _item_id and mode = 'none';
end;
$$;

/** Zruší prepojenie položky s technikou (technika aj objednávka ostanú). Len pri prepojení bez pripočítania. */
create or replace function public.unlink_order_item(_item_id uuid, _equipment_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _mode text;
begin
  select i.company_id, i.mode into _company, _mode from public.order_items i where i.id = _item_id;
  if _company is null or not public.can(_company, 'orders.edit') then
    raise exception 'Na zmenu nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _mode <> 'link' then
    raise exception 'Zrušiť sa dá len prepojenie s existujúcou technikou' using errcode = 'check_violation';
  end if;
  delete from public.order_item_equipment where order_item_id = _item_id and equipment_id = _equipment_id;
  if not exists (select 1 from public.order_item_equipment where order_item_id = _item_id) then
    update public.order_items set mode = 'none' where id = _item_id;
  end if;
end;
$$;
revoke execute on function public.link_order_item(uuid, uuid, integer[]), public.unlink_order_item(uuid, uuid) from public, anon;
grant execute on function public.link_order_item(uuid, uuid, integer[]), public.unlink_order_item(uuid, uuid) to authenticated;
