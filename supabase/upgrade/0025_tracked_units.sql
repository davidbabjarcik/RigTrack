-- RigTrack: technika evidovaná po kusoch.
-- Pri technike s track_units má každý kus číslo (1..quantity) a vlastnú históriu:
-- výpožička aj servis hovoria, ktorých kusov sa týkajú. Ostatná technika (háky, gurtne)
-- sa ďalej ráta len na počet.
-- Poškodenie pri vrátení už neoznačí celú techniku ako poškodenú; poškodeným kusom
-- sa otvorí servisný záznam.

alter table public.equipment add column track_units boolean not null default false;
grant update (track_units) on public.equipment to authenticated;

-- Technika, pri ktorej sa už čísla kusov používajú v servise.
update public.equipment e set track_units = true
where e.quantity > 1
  and exists (select 1 from public.service_records s where s.equipment_id = e.id and cardinality(s.unit_numbers) > 0);

alter table public.loan_items
  add column unit_numbers integer[] not null default '{}',
  add column damaged_units integer[] not null default '{}',
  add column damaged_quantity integer not null default 0 check (damaged_quantity >= 0);
update public.loan_items set damaged_quantity = quantity where damaged;
grant update (damaged_units, damaged_quantity) on public.loan_items to authenticated;

-- Rovnaká funkcia ako v 0024, navyše pri technike evidovanej po kusoch zapisuje čísla
-- kusov a stráži, aby ten istý kus nebol v jednom termíne na dvoch výpožičkách.
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
  _units integer[];
  _taken integer;
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

    _units := '{}';
    if _equipment.track_units then
      if jsonb_typeof(_item -> 'unit_numbers') = 'array' then
        _units := array(select distinct u::integer from jsonb_array_elements_text(_item -> 'unit_numbers') u order by 1);
      end if;
      if cardinality(_units) = 0 then
        raise exception 'Pri technike „%“ vyberte konkrétne kusy', _equipment.name using errcode = 'check_violation';
      end if;
      if _units[1] < 1 or _units[cardinality(_units)] > _equipment.quantity then
        raise exception 'Technika „%“ má iba kusy #1 až #%', _equipment.name, _equipment.quantity using errcode = 'check_violation';
      end if;
      _qty := cardinality(_units);

      select u into _taken
      from public.loan_items li
      join public.loans l on l.id = li.loan_id
      cross join unnest(li.unit_numbers) u
      where li.equipment_id = _equipment.id
        and l.status in ('reserved', 'issued')
        and l.starts_on <= _ends
        and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts
        and u = any (_units)
      limit 1;
      if found then
        raise exception 'Kus #% techniky „%“ je v tomto termíne už na inej výpožičke', _taken, _equipment.name
          using errcode = 'check_violation';
      end if;
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

    insert into public.loan_items (company_id, loan_id, equipment_id, quantity, case_id, unit_numbers)
    values (_company_id, _loan_id, _equipment.id, _qty, nullif(_item ->> 'case_id', '')::uuid, _units);
  end loop;

  return _loan_id;
end;
$$;

-- Vrátenie. _damaged je pole { equipment_id, units: [čísla kusov], quantity: počet }:
-- pri technike evidovanej po kusoch platia čísla, pri ostatnej počet (bez neho všetky kusy).
-- Poškodeným kusom sa otvorí servisný záznam; technika ako celok ostáva dostupná,
-- kým nie sú v servise všetky jej kusy (to rieši trigger servisu).
drop function public.return_loan(uuid, uuid[]);

create function public.return_loan(_loan_id uuid, _damaged jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  _loan public.loans;
  _row record;
  _units integer[];
  _count integer;
  _any boolean := false;
begin
  update public.loans set status = 'returned', returned_at = now()
  where id = _loan_id and status = 'issued'
  returning * into _loan;
  if not found then
    raise exception 'Výpožičku nemožno vrátiť' using errcode = 'check_violation';
  end if;

  update public.loan_items set damaged = false, damaged_units = '{}', damaged_quantity = 0 where loan_id = _loan_id;

  update public.equipment e set status = 'available'
  from public.loan_items li
  where li.loan_id = _loan_id and li.equipment_id = e.id and e.status = 'loaned';

  for _row in
    select li.equipment_id, li.quantity, li.unit_numbers, d.value as entry
    from jsonb_array_elements(case when jsonb_typeof(_damaged) = 'array' then _damaged else '[]'::jsonb end) d
    join public.loan_items li on li.loan_id = _loan_id and li.equipment_id = (d.value ->> 'equipment_id')::uuid
  loop
    if cardinality(_row.unit_numbers) > 0 then
      _units := '{}';
      if jsonb_typeof(_row.entry -> 'units') = 'array' then
        _units := array(
          select distinct u::integer from jsonb_array_elements_text(_row.entry -> 'units') u
          where u::integer = any (_row.unit_numbers) order by 1
        );
      end if;
      _count := cardinality(_units);
    else
      _units := '{}';
      _count := least(greatest(coalesce((_row.entry ->> 'quantity')::integer, _row.quantity), 0), _row.quantity);
    end if;
    continue when _count = 0;

    update public.loan_items set damaged = true, damaged_units = _units, damaged_quantity = _count
    where loan_id = _loan_id and equipment_id = _row.equipment_id;
    _any := true;

    -- Kusy, ktoré už v servise sú, nový záznam nedostanú.
    begin
      insert into public.service_records (company_id, equipment_id, kind, status, problem, unit_numbers, quantity)
      values (
        _loan.company_id, _row.equipment_id, 'repair', 'open',
        left('Vrátené poškodené z výpožičky: ' || _loan.borrower, 2000), _units, _count
      );
    exception when check_violation then
      null;
    end;
  end loop;

  if _any then
    update public.loans set status = 'damaged' where id = _loan_id;
  end if;
end;
$$;

revoke execute on function public.return_loan(uuid, jsonb) from public, anon;
grant execute on function public.return_loan(uuid, jsonb) to authenticated;
