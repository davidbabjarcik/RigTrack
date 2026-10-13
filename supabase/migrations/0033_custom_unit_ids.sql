-- RigTrack: vlastné čísla kusov.
-- Technika evidovaná po kusoch nemusí mať čísla 1..počet. Keď sa kus #2 vyradí, ostatným
-- čísla ostávajú (napr. 1, 4, 8), takže sedia so štítkami na technike aj s históriou.
-- Prázdny zoznam znamená doterajšie správanie: kusy 1..počet.

alter table public.equipment add column unit_ids integer[] not null default '{}';
grant update (unit_ids) on public.equipment to authenticated;

/** Platné čísla kusov: vlastný zoznam, alebo 1..počet, ak zoznam nie je. */
create function public.unit_ids_of(_quantity integer, _unit_ids integer[])
returns integer[] language sql immutable set search_path = '' as $$
  select case
    when cardinality(_unit_ids) > 0 then _unit_ids
    else array(select generate_series(1, greatest(_quantity, 1)))
  end;
$$;
revoke execute on function public.unit_ids_of(integer, integer[]) from public, anon;
grant execute on function public.unit_ids_of(integer, integer[]) to authenticated;

-- Zoznam čísel sa uprace (bez duplicít, vzostupne) a počet kusov sa mu prispôsobí.
-- Technika na počet žiadne čísla nemá.
create function public.normalize_unit_ids()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not new.track_units then
    new.unit_ids := '{}';
  elsif cardinality(new.unit_ids) > 0 then
    new.unit_ids := array(select distinct u from unnest(new.unit_ids) u order by u);
    if exists (select 1 from unnest(new.unit_ids) u where u is null or u < 1 or u > 100000) then
      raise exception 'Čísla kusov musia byť od 1 do 100000' using errcode = 'check_violation';
    end if;
    new.quantity := cardinality(new.unit_ids);
  end if;
  return new;
end;
$$;

create trigger equipment_normalize_unit_ids
  before insert or update of unit_ids, quantity, track_units on public.equipment
  for each row execute function public.normalize_unit_ids();
revoke execute on function public.normalize_unit_ids() from public, anon;

-- Servis: rovnaké pravidlá ako v 0023, len kus musí byť z platných čísel techniky.
create or replace function public.check_service_units()
returns trigger language plpgsql set search_path = '' as $$
declare
  _valid integer[];
  _missing integer;
  _taken integer;
begin
  if cardinality(new.unit_numbers) = 0 then
    return new;
  end if;

  new.unit_numbers := array(select distinct u from unnest(new.unit_numbers) u order by u);
  if exists (select 1 from unnest(new.unit_numbers) u where u is null or u < 1) then
    raise exception 'Neplatné číslo kusu' using errcode = 'check_violation';
  end if;

  if new.status <> 'done' then
    select public.unit_ids_of(e.quantity, e.unit_ids) into _valid from public.equipment e
    where e.id = new.equipment_id and e.company_id = new.company_id;
    select u into _missing from unnest(new.unit_numbers) u where u <> all (_valid) order by u limit 1;
    if found then
      raise exception 'Technika má % ks, kus #% neexistuje', cardinality(_valid), _missing using errcode = 'check_violation';
    end if;

    select u into _taken
    from public.service_records s, unnest(s.unit_numbers) u
    where s.equipment_id = new.equipment_id and s.id <> new.id and s.status <> 'done'
      and u = any (new.unit_numbers)
    limit 1;
    if found then
      raise exception 'Kus #% už je v servise v inom zázname', _taken using errcode = 'check_violation';
    end if;
  end if;

  new.quantity := cardinality(new.unit_numbers);
  return new;
end;
$$;

-- Výpožičky: rovnaká funkcia ako v 0028, len kus musí byť z platných čísel techniky.
create or replace function public.add_loan_items(_company_id uuid, _loan_id uuid, _items jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  _starts date;
  _ends date;
  _item jsonb;
  _equipment public.equipment;
  _qty integer;
  _busy integer;
  _units integer[];
  _taken integer;
begin
  select l.starts_on, l.ends_on into _starts, _ends from public.loans l
  where l.id = _loan_id and l.company_id = _company_id;
  if not found then
    raise exception 'Výpožička neexistuje' using errcode = 'no_data_found';
  end if;
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

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
      if not (_units <@ public.unit_ids_of(_equipment.quantity, _equipment.unit_ids)) then
        raise exception 'Technika „%“ má iba kusy %', _equipment.name,
          array_to_string(public.unit_ids_of(_equipment.quantity, _equipment.unit_ids), ', ')
          using errcode = 'check_violation';
      end if;
      _qty := cardinality(_units);

      select u into _taken
      from public.loan_items li
      join public.loans l on l.id = li.loan_id
      cross join unnest(li.unit_numbers) u
      where li.equipment_id = _equipment.id
        and l.id <> _loan_id
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
      and l.id <> _loan_id
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

    insert into public.loan_items (company_id, loan_id, equipment_id, quantity, case_id, unit_numbers, unit_price)
    values (
      _company_id, _loan_id, _equipment.id, _qty, nullif(_item ->> 'case_id', '')::uuid, _units,
      (_item ->> 'unit_price')::numeric
    );
  end loop;
end;
$$;
