-- RigTrack: výpožičky rešpektujú techniku naplánovanú na eventy.
-- Rovnaká funkcia ako v 0014, navyše do obsadených kusov ráta aj techniku
-- na plánovaných a potvrdených eventoch v tom istom termíne.

create or replace function public.create_loan(_company_id uuid, _loan jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _loan_id uuid;
  _starts date := (_loan ->> 'starts_on')::date;
  _ends date := (_loan ->> 'ends_on')::date;
  _item jsonb;
  _equipment public.equipment;
  _qty integer;
  _busy integer;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, note)
  values (
    _company_id, trim(_loan ->> 'borrower'), coalesce(trim(_loan ->> 'contact'), ''),
    _starts, _ends, coalesce(trim(_loan ->> 'note'), '')
  )
  returning id into _loan_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    select * into _equipment from public.equipment e
    where e.company_id = _company_id and e.id = (_item ->> 'equipment_id')::uuid;
    if not found then
      raise exception 'Technika neexistuje' using errcode = 'no_data_found';
    end if;
    if _equipment.status = 'retired' then
      raise exception 'Technika „%“ je vyradená', _equipment.name using errcode = 'check_violation';
    end if;

    select coalesce(sum(li.quantity), 0) into _busy
    from public.loan_items li
    join public.loans l on l.id = li.loan_id
    where li.equipment_id = _equipment.id
      and l.status in ('reserved', 'issued')
      and l.starts_on <= _ends
      and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts;

    -- Technika naplánovaná na plánovaný alebo potvrdený event v tom istom termíne je tiež obsadená.
    select _busy + coalesce(sum(ee.quantity), 0) into _busy
    from public.event_equipment ee
    join public.events ev on ev.id = ee.event_id
    where ee.equipment_id = _equipment.id
      and ev.status in ('planned', 'confirmed')
      and ev.starts_on <= _ends
      and ev.ends_on >= _starts;

    if _busy + _qty > _equipment.quantity then
      raise exception 'Technika „%“ nie je v tomto termíne voľná (voľné % z % ks)',
        _equipment.name, greatest(_equipment.quantity - _busy, 0), _equipment.quantity
        using errcode = 'check_violation';
    end if;

    insert into public.loan_items (company_id, loan_id, equipment_id, quantity)
    values (_company_id, _loan_id, _equipment.id, _qty);
  end loop;

  return _loan_id;
end;
$$;
