-- RigTrack: druhy techniky s vlastnými údajmi, sieťové údaje, servisný interval,
-- spotrebný materiál a zapamätanie rozhodnutia pri riadkoch objednávok.

-- ---------------------------------------------------------------------------
-- Technika
-- ---------------------------------------------------------------------------

alter table public.equipment
  -- Druh určuje, ktoré polia formulár ponúka (kábel: dĺžka a konektor; svetlo: výkon a zdroj…).
  add column kind text not null default 'general' check (kind in ('general', 'cable', 'light', 'audio')),
  -- Údaje špecifické pre druh; ich tvar stráži aplikácia, databáza len rozumnú veľkosť.
  add column attributes jsonb not null default '{}'
    check (jsonb_typeof(attributes) = 'object' and char_length(attributes::text) <= 2000),
  add column mac_address text not null default ''
    check (mac_address = '' or mac_address ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'),
  add column ip_address text not null default ''
    check (ip_address = '' or ip_address ~ '^(\d{1,3}\.){3}\d{1,3}$'),
  add column service_interval_months integer check (service_interval_months between 1 and 120),
  add column last_service_on date;

grant update (kind, attributes, mac_address, ip_address, service_interval_months, last_service_on)
  on public.equipment to authenticated;

-- Spotrebný materiál (viazačky, konektory…): eviduje sa iba v objednávkach, nie v technike.
alter table public.equipment_categories add column consumable boolean not null default false;
grant update (consumable) on public.equipment_categories to authenticated;

-- ---------------------------------------------------------------------------
-- Riadky objednávok: kategória a to, čo sa s riadkom stalo v technike.
-- Podľa toho sa pri ďalšom importe toho istého tovaru predvolí rovnaké rozhodnutie.
-- ---------------------------------------------------------------------------

alter table public.order_items
  add column mode text not null default 'none' check (mode in ('none', 'separate', 'bulk', 'existing')),
  add column category_id uuid,
  add foreign key (company_id, category_id) references public.equipment_categories (company_id, id)
    on delete set null (category_id);

-- Všetky riadky objednávok s údajmi objednávky: história cien a hľadanie v položkách.
create view public.order_lines with (security_invoker = true) as
select
  i.id, i.company_id, i.order_id, i.name, i.article_number, i.quantity, i.unit_price, i.mode, i.category_id,
  o.supplier, o.order_number, o.ordered_at, o.currency
from public.order_items i
join public.orders o on o.id = i.order_id;

revoke all on public.order_lines from anon, authenticated;
grant select on public.order_lines to authenticated;

-- Rovnaká funkcia ako v 0006; navyše ukladá mode a kategóriu riadku
-- a novej technike nastaví druh a jeho údaje.
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
    elsif _mode <> 'none' then
      raise exception 'Neznámy režim položky: %', _mode using errcode = 'check_violation';
    end if;
  end loop;

  return _order_id;
end;
$$;
