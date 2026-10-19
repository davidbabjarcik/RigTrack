-- RigTrack: úprava výpožičky pred vydaním.
-- Rezerváciu možno upraviť, kým technika neodišla. Kontroly dostupnosti sú tie isté
-- ako pri vytvorení, preto sa zápis položiek vyčlenil do spoločnej funkcie.

grant update (starts_on, ends_on) on public.loans to authenticated;

-- Položky smie mazať ten, kto výpožičky vytvára, a len kým je výpožička rezerváciou.
grant delete on public.loan_items to authenticated;
create policy loan_items_delete on public.loan_items for delete to authenticated
  using (
    public.has_role(company_id, 'admin', 'skladnik', 'technik')
    and exists (select 1 from public.loans l where l.id = loan_id and l.status = 'reserved')
  );

-- Overí a zapíše položky výpožičky. Termín berie z výpožičky; jej vlastné položky
-- sa do obsadenosti nerátajú. Pri kolízii vyhodí chybu a volajúca transakcia sa zruší.
create function public.add_loan_items(_company_id uuid, _loan_id uuid, _items jsonb)
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
      if _units[1] < 1 or _units[cardinality(_units)] > _equipment.quantity then
        raise exception 'Technika „%“ má iba kusy #1 až #%', _equipment.name, _equipment.quantity using errcode = 'check_violation';
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

create or replace function public.create_loan(_company_id uuid, _loan jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _loan_id uuid;
begin
  -- Prázdny zoznam odmietneme skôr, než vznikne riadok výpožičky.
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, note)
  values (
    _company_id, trim(_loan ->> 'borrower'), coalesce(trim(_loan ->> 'contact'), ''),
    (_loan ->> 'starts_on')::date, (_loan ->> 'ends_on')::date, coalesce(trim(_loan ->> 'note'), '')
  )
  returning id into _loan_id;

  perform public.add_loan_items(_company_id, _loan_id, _items);
  return _loan_id;
end;
$$;

-- Prepíše rezerváciu novými údajmi a položkami. Vydanú alebo vrátenú výpožičku nemení.
create function public.update_loan(_loan_id uuid, _loan jsonb, _items jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  _company_id uuid;
begin
  update public.loans
  set
    borrower = trim(_loan ->> 'borrower'),
    contact = coalesce(trim(_loan ->> 'contact'), ''),
    starts_on = (_loan ->> 'starts_on')::date,
    ends_on = (_loan ->> 'ends_on')::date,
    note = coalesce(trim(_loan ->> 'note'), ''),
    borrower_ico = coalesce(trim(_loan ->> 'borrower_ico'), ''),
    borrower_address = coalesce(trim(_loan ->> 'borrower_address'), ''),
    billed_days = (_loan ->> 'billed_days')::integer,
    price = (_loan ->> 'price')::numeric,
    deposit = (_loan ->> 'deposit')::numeric
  where id = _loan_id and status = 'reserved'
  returning company_id into _company_id;
  if not found then
    raise exception 'Upraviť sa dá len rezervácia, ktorá ešte nebola vydaná' using errcode = 'check_violation';
  end if;

  delete from public.loan_items where loan_id = _loan_id;
  perform public.add_loan_items(_company_id, _loan_id, _items);
end;
$$;

revoke execute on function public.add_loan_items(uuid, uuid, jsonb), public.update_loan(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.add_loan_items(uuid, uuid, jsonb), public.update_loan(uuid, jsonb, jsonb) to authenticated;
