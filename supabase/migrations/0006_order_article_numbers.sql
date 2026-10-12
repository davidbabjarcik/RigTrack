-- RigTrack: kód tovaru dodávateľa na riadku objednávky.
-- Pri ďalšom importe faktúry sa podľa neho nájde technika, ku ktorej sa má
-- rovnaký tovar pripočítať (napr. opakovane objednávané háky).

alter table public.order_items
  add column article_number text not null default '' check (char_length(article_number) <= 60);
create index order_items_article_idx on public.order_items (company_id, article_number) where article_number <> '';

-- Nový stĺpec je na konci, preto stačí create or replace.
create or replace view public.equipment_purchases with (security_invoker = true) as
select
  l.company_id, l.equipment_id, l.order_item_id, l.quantity,
  i.name as item_name, i.unit_price,
  o.id as order_id, o.supplier, o.order_number, o.ordered_at, o.currency,
  i.article_number
from public.order_item_equipment l
join public.order_items i on i.id = l.order_item_id
join public.orders o on o.id = i.order_id;

-- Rovnaká funkcia ako v 0004, navyše ukladá article_number.
create or replace function public.create_order(_company_id uuid, _order jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _order_id uuid;
  _item jsonb;
  _item_id uuid;
  _equipment_id uuid;
  _equipment_name text;
  _category_id uuid;
  _qty integer;
  _mode text;
  _position integer := 0;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Objednávka musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.orders (company_id, supplier, order_number, ordered_at, currency, note)
  values (
    _company_id,
    trim(_order ->> 'supplier'),
    coalesce(trim(_order ->> 'order_number'), ''),
    coalesce((_order ->> 'ordered_at')::date, current_date),
    coalesce(_order ->> 'currency', 'EUR'),
    coalesce(trim(_order ->> 'note'), '')
  )
  returning id into _order_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    _mode := coalesce(_item ->> 'mode', 'none');

    insert into public.order_items (company_id, order_id, position, name, quantity, unit_price, article_number)
    values (
      _company_id, _order_id, _position, trim(_item ->> 'name'), _qty,
      coalesce((_item ->> 'unit_price')::numeric, 0),
      coalesce(trim(_item ->> 'article_number'), '')
    )
    returning id into _item_id;
    _position := _position + 1;

    _equipment_name := left(coalesce(nullif(trim(_item ->> 'equipment_name'), ''), trim(_item ->> 'name')), 120);
    _category_id := nullif(_item ->> 'category_id', '')::uuid;

    if _mode = 'separate' then
      if _qty > 200 then
        raise exception 'Samostatne možno naraz založiť najviac 200 kusov' using errcode = 'check_violation';
      end if;
      for _n in 1 .. _qty loop
        insert into public.equipment (company_id, name, category_id)
        values (_company_id, _equipment_name, _category_id)
        returning id into _equipment_id;
        insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
        values (_company_id, _item_id, _equipment_id, 1);
      end loop;
    elsif _mode = 'bulk' then
      insert into public.equipment (company_id, name, category_id, quantity)
      values (_company_id, _equipment_name, _category_id, _qty)
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
    elsif _mode <> 'none' then
      raise exception 'Neznámy režim položky: %', _mode using errcode = 'check_violation';
    end if;
  end loop;

  return _order_id;
end;
$$;
