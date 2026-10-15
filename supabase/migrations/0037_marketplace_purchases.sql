-- RigTrack: nákupy z bazárov a inzerátov (Bazoš, Kleinanzeigen, Willhaben, eBay…) a fotka nákupu.
-- Objednávka má zdroj: obchod, alebo bazár/inzerát. Pri bazári je dodávateľ portál
-- (napr. Bazoš.sk) a k tomu meno predajcu. Každý nákup môže mať nepovinnú fotku.
--
-- Dá sa spustiť aj po staršej verzii tejto migrácie (s odkazom na inzerát): odkaz zmaže.

-- Pohľady sa skladajú nanovo, lebo staršia verzia mala v orders_overview odkaz na inzerát.
drop view if exists public.orders_overview;
drop view if exists public.equipment_purchases;
drop view if exists public.order_lines;

alter table public.orders
  add column if not exists source text not null default 'shop' check (source in ('shop', 'marketplace')),
  add column if not exists seller text not null default '' check (char_length(seller) <= 120),
  add column if not exists photo_path text not null default '' check (char_length(photo_path) <= 300),
  drop column if exists listing_url;
grant update (photo_path) on public.orders to authenticated;

create view public.orders_overview with (security_invoker = true) as
select
  o.id, o.company_id, o.supplier, o.order_number, o.ordered_at, o.currency, o.note,
  count(i.id)::integer as item_count,
  coalesce(sum(i.quantity * i.unit_price), 0)::numeric(14, 2) as total,
  o.source, o.seller, o.photo_path
from public.orders o
left join public.order_items i on i.order_id = o.id
group by o.id;

create view public.equipment_purchases with (security_invoker = true) as
select
  l.company_id, l.equipment_id, l.order_item_id, l.quantity,
  i.name as item_name, i.unit_price,
  o.id as order_id, o.supplier, o.order_number, o.ordered_at, o.currency,
  i.article_number,
  o.source, o.seller
from public.order_item_equipment l
join public.order_items i on i.id = l.order_item_id
join public.orders o on o.id = i.order_id;

create view public.order_lines with (security_invoker = true) as
select
  i.id, i.company_id, i.order_id, i.name, i.article_number, i.quantity, i.unit_price, i.mode, i.category_id,
  o.supplier, o.order_number, o.ordered_at, o.currency,
  o.source
from public.order_items i
join public.orders o on o.id = i.order_id;

revoke all on public.orders_overview, public.equipment_purchases, public.order_lines from anon, authenticated;
grant select on public.orders_overview, public.equipment_purchases, public.order_lines to authenticated;

-- Rovnaká funkcia ako v 0007; navyše ukladá zdroj a predajcu.
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
    elsif _mode <> 'none' then
      raise exception 'Neznámy režim položky: %', _mode using errcode = 'check_violation';
    end if;
  end loop;

  return _order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fotka nákupu ide pri odstránení do koša ako ostatné fotky (funkcie z 0036).
-- ---------------------------------------------------------------------------

alter table public.trashed_photos drop constraint if exists trashed_photos_owner_table_check;
alter table public.trashed_photos
  add constraint trashed_photos_owner_table_check check (owner_table in ('equipment', 'vehicles', 'cases', 'orders'));

create or replace function public.trash_photo(_owner_table text, _owner_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _path text;
  _label text;
begin
  if _owner_table = 'equipment' then
    select company_id, photo_path, name into _company, _path, _label from public.equipment
    where id = _owner_id and deleted_at is null and public.can(company_id, 'equipment.edit');
  elsif _owner_table = 'vehicles' then
    select company_id, photo_path, plate into _company, _path, _label from public.vehicles
    where id = _owner_id and public.can(company_id, 'vehicles.edit');
  elsif _owner_table = 'cases' then
    select company_id, label_photo_path, name into _company, _path, _label from public.cases
    where id = _owner_id and deleted_at is null and public.can(company_id, 'cases.edit');
  elsif _owner_table = 'orders' then
    select company_id, photo_path, supplier into _company, _path, _label from public.orders
    where id = _owner_id and public.can(company_id, 'orders.edit');
  end if;
  if _company is null or coalesce(_path, '') = '' then
    raise exception 'Fotku sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;

  insert into public.trashed_photos (company_id, owner_table, owner_id, path, label, deleted_by_name)
  values (_company, _owner_table, _owner_id, _path, _label, public.actor_name());
  if _owner_table = 'equipment' then
    update public.equipment set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'vehicles' then
    update public.vehicles set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'orders' then
    update public.orders set photo_path = '' where id = _owner_id;
  else
    update public.cases set label_photo_path = '' where id = _owner_id;
  end if;
end;
$$;

create or replace function public.recycle_bin_items(_company_id uuid)
returns table (kind text, id uuid, label text, detail text, deleted_at timestamptz, deleted_by_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kôš môže otvoriť iba admin' using errcode = 'insufficient_privilege';
  end if;
  return query
    select case when e.kind = 'consumable' then 'consumable' else 'equipment' end, e.id, e.name,
      concat_ws(' · ', nullif(trim(e.manufacturer || ' ' || e.model), ''), nullif(e.inventory_number, ''), e.quantity || ' ks'),
      e.deleted_at, e.deleted_by_name
    from public.equipment e where e.company_id = _company_id and e.deleted_at is not null
    union all
    select 'case', c.id, c.name,
      concat_ws(' · ', nullif(c.inventory_number, ''), 'položiek v obsahu: ' || cardinality(c.trashed_content)),
      c.deleted_at, c.deleted_by_name
    from public.cases c where c.company_id = _company_id and c.deleted_at is not null
    union all
    select 'event_document', d.id, d.name, 'dokument eventu: ' || coalesce(ev.name, ''), d.deleted_at, d.deleted_by_name
    from public.event_documents d left join public.events ev on ev.id = d.event_id
    where d.company_id = _company_id and d.deleted_at is not null
    union all
    select 'attachment', a.id, a.name, case a.entity_type when 'service' then 'príloha servisného záznamu' else 'príloha vozidla' end,
      a.deleted_at, a.deleted_by_name
    from public.attachments a where a.company_id = _company_id and a.deleted_at is not null
    union all
    select 'photo', p.id, p.label,
      case p.owner_table when 'equipment' then 'fotka techniky' when 'vehicles' then 'fotka vozidla'
        when 'orders' then 'fotka nákupu' else 'fotka na štítku case' end,
      p.deleted_at, p.deleted_by_name
    from public.trashed_photos p where p.company_id = _company_id
    order by 5 desc;
end;
$$;

create or replace function public.restore_bin_item(_company_id uuid, _kind text, _id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _photo public.trashed_photos;
  _restored integer;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Z koša môže obnovovať iba admin' using errcode = 'insufficient_privilege';
  end if;

  if _kind in ('equipment', 'consumable') then
    update public.equipment set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'case' then
    update public.cases set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
    get diagnostics _restored = row_count;
    -- Obsah sa vráti, pokiaľ ho medzitým niekto nedal do iného case.
    update public.equipment e set case_id = _id
    from public.cases c
    where c.id = _id and _restored = 1 and e.id = any (c.trashed_content) and e.case_id is null and e.company_id = _company_id;
    update public.cases set trashed_content = '{}' where id = _id and _restored = 1;
    if _restored = 0 then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    return;
  elsif _kind = 'event_document' then
    update public.event_documents set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'attachment' then
    update public.attachments set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'photo' then
    select * into _photo from public.trashed_photos where id = _id and company_id = _company_id;
    if not found then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    -- Fotka sa vráti len na prázdne miesto; novšiu fotku neprepíše.
    if _photo.owner_table = 'equipment' then
      update public.equipment set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'vehicles' then
      update public.vehicles set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'orders' then
      update public.orders set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    else
      update public.cases set label_photo_path = _photo.path where id = _photo.owner_id and label_photo_path = '';
    end if;
    if not found then
      raise exception 'Fotku nemožno obnoviť: záznam už má inú fotku alebo neexistuje' using errcode = 'check_violation';
    end if;
    delete from public.trashed_photos where id = _id;
    return;
  else
    raise exception 'Neznámy druh položky' using errcode = 'check_violation';
  end if;

  if not found then
    raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
  end if;
end;
$$;
