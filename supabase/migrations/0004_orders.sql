-- RigTrack: objednávky (nákupy) a ich prepojenie na techniku.
-- Ceny vidí a objednávky zapisuje iba admin a skladník; maže iba admin.

-- Technika na množstvo (háky, káble): jedna položka s počtom kusov.
alter table public.equipment
  add column quantity integer not null default 1 check (quantity between 1 and 100000),
  add unique (company_id, id);
grant update (quantity) on public.equipment to authenticated;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  supplier text not null check (char_length(trim(supplier)) between 1 and 120),
  order_number text not null default '' check (char_length(order_number) <= 80),
  ordered_at date not null default current_date,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  note text not null default '' check (char_length(note) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create index orders_company_idx on public.orders (company_id, ordered_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  order_id uuid not null,
  position integer not null default 0,
  name text not null check (char_length(trim(name)) between 1 and 200),
  quantity integer not null check (quantity between 1 and 100000),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  unique (company_id, id),
  foreign key (company_id, order_id) references public.orders (company_id, id) on delete cascade
);
create index order_items_order_idx on public.order_items (order_id, position);

-- Ktorá technika vznikla (alebo bola doplnená) z ktorého riadku objednávky.
-- 4 svetlá evidované samostatne = 4 riadky po 1 ks; 16 hákov v jednej položke = 1 riadok so 16 ks.
create table public.order_item_equipment (
  company_id uuid not null,
  order_item_id uuid not null,
  equipment_id uuid not null,
  quantity integer not null check (quantity >= 1),
  primary key (order_item_id, equipment_id),
  foreign key (company_id, order_item_id) references public.order_items (company_id, id) on delete cascade,
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade
);
create index order_item_equipment_equipment_idx on public.order_item_equipment (equipment_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_equipment enable row level security;

create policy orders_select on public.orders for select to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));
create policy orders_insert on public.orders for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy orders_update on public.orders for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'))
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy orders_delete on public.orders for delete to authenticated
  using (public.has_role(company_id, 'admin'));

create policy order_items_select on public.order_items for select to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));
create policy order_items_insert on public.order_items for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik'));

create policy order_item_equipment_select on public.order_item_equipment for select to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));
create policy order_item_equipment_insert on public.order_item_equipment for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.orders, public.order_items, public.order_item_equipment from anon, authenticated;
grant select, insert, delete on public.orders to authenticated;
grant update (supplier, order_number, ordered_at, note) on public.orders to authenticated;
-- Riadky objednávky sa po vytvorení nemenia; mažú sa iba kaskádou s objednávkou.
grant select, insert on public.order_items, public.order_item_equipment to authenticated;

-- ---------------------------------------------------------------------------
-- Pohľady (security_invoker: platia RLS pravidlá volajúceho)
-- ---------------------------------------------------------------------------

create view public.orders_overview with (security_invoker = true) as
select
  o.id, o.company_id, o.supplier, o.order_number, o.ordered_at, o.currency, o.note,
  count(i.id)::integer as item_count,
  coalesce(sum(i.quantity * i.unit_price), 0)::numeric(14, 2) as total
from public.orders o
left join public.order_items i on i.order_id = o.id
group by o.id;

create view public.equipment_purchases with (security_invoker = true) as
select
  l.company_id, l.equipment_id, l.order_item_id, l.quantity,
  i.name as item_name, i.unit_price,
  o.id as order_id, o.supplier, o.order_number, o.ordered_at, o.currency
from public.order_item_equipment l
join public.order_items i on i.id = l.order_item_id
join public.orders o on o.id = i.order_id;

revoke all on public.orders_overview, public.equipment_purchases from anon, authenticated;
grant select on public.orders_overview, public.equipment_purchases to authenticated;

-- ---------------------------------------------------------------------------
-- Vytvorenie objednávky v jednej transakcii. SECURITY INVOKER: všetko prechádza
-- cez RLS volajúceho. Režim riadku (mode):
--   none     – do techniky sa nepridáva (doprava, spotrebný materiál)
--   separate – každý kus ako samostatná položka techniky
--   bulk     – jedna nová položka techniky s počtom kusov
--   existing – pripočíta kusy k existujúcej položke (equipment_id)
-- ---------------------------------------------------------------------------

create function public.create_order(_company_id uuid, _order jsonb, _items jsonb)
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

    insert into public.order_items (company_id, order_id, position, name, quantity, unit_price)
    values (_company_id, _order_id, _position, trim(_item ->> 'name'), _qty, coalesce((_item ->> 'unit_price')::numeric, 0))
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

revoke execute on function public.create_order(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_order(uuid, jsonb, jsonb) to authenticated;
