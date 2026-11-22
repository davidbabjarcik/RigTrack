-- RigTrack 11.7: demo firma doplnená o novinky 8.x–11.x – programy a licencie, certifikácia človeka, šablóna eventu,
-- DJ hranie, náklady eventu, hodnotenie od klienta, faktúry (zálohová a konečná), rozloženie v case, kontrola case po
-- položkách a kto vyrobil káble. Vymyslené údaje; spustí sa raz na firmu (podľa šablóny „Ukážková svadba“).

create or replace function public.seed_demo_v11(_company uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _today date := (now() at time zone 'Europe/Bratislava')::date;
  _past record;
  _issuer uuid;
  _laptop uuid;
  _staff uuid;
  _case uuid;
  _items jsonb;
  _first record;
  _second record;
  _cable uuid;
begin
  if exists (select 1 from public.event_templates where company_id = _company and name = 'Ukážková svadba') then
    return;
  end if;

  -- Šablóna eventu.
  insert into public.event_templates (company_id, name, data, created_by)
  values (_company, 'Ukážková svadba', jsonb_build_object('kind', 'event', 'venue', 'Ukážková sála', 'setting', 'indoor',
    'note', 'Ozvučenie obradu aj večera, 2 bezdrôtové mikrofóny, svetlá na parket.', 'getInTime', '12:00', 'showTime', '16:00',
    'equipment', '[]'::jsonb, 'crew', '[]'::jsonb), null)
  on conflict (company_id, name) do nothing;

  -- DJ hranie o týždeň.
  insert into public.events (company_id, name, client, venue, starts_on, ends_on, status, kind)
  values (_company, 'Ukážkový DJ večer', 'Ukážkový klub', 'Ukážkový klub', _today + 6, _today + 6, 'confirmed', 'dj');

  -- Programy a licencie (jeden na notebooku, ak v deme nejaký je) a certifikácia prvého človeka z tímu.
  select id into _laptop from public.equipment where company_id = _company and kind = 'it' and deleted_at is null order by name limit 1;
  insert into public.software_licenses (company_id, name, edition, seats, account, purchased_on, expires_on, price, equipment_id, note) values
    (_company, 'Ukážkový program na mix', 'Pro', 2, 'technik@example.com', _today - 400, null, 199, _laptop, 'Trvalá licencia'),
    (_company, 'Ukážková vizualizácia svetiel', '', 1, '', _today - 340, _today + 20, 89, null, 'Predplatné na rok');
  select id into _staff from public.staff where company_id = _company and active order by name limit 1;
  if _staff is not null then
    insert into public.staff_certificates (company_id, staff_id, name, issuer, number, issued_on, valid_until)
    values (_company, _staff, 'Práca vo výškach', 'Ukážkové školiace stredisko', 'UK-123', _today - 300, _today + 430);
  end if;

  -- Posledný odohraný event: náklad, hodnotenie od klienta a faktúry.
  select id, name, client, starts_on, ends_on into _past from public.events
  where company_id = _company and ends_on < _today and status <> 'cancelled' order by ends_on desc limit 1;
  if _past.id is not null then
    insert into public.event_costs (company_id, event_id, kind, amount, note) values (_company, _past.id, 'rental', 150, 'Požičané 2 subwoofery');
    insert into public.event_ratings (company_id, event_id, stars, comment, rated_at, created_by)
    values (_company, _past.id, 5, 'Všetko klapalo, zvuk bol výborný. Ďakujeme!', now() - interval '1 day', null)
    on conflict (company_id, event_id) do nothing;

    select id into _issuer from public.quote_issuers where company_id = _company order by sort limit 1;
    if _issuer is null then
      insert into public.quote_issuers (company_id, name, address, ico, dic, contact, vat_payer)
      values (_company, 'Ukážková s.r.o.', 'Ukážková 1, 000 00 Ukážkovo', '12345678', '2020202020', 'info@example.com', false)
      returning id into _issuer;
    end if;
    update public.quote_issuers set iban = 'SK00 0000 0000 0000 0000 0000', register_note = 'Zapísaná v Ukážkovom registri, vložka č. 0000/X'
    where id = _issuer and iban = '';

    insert into public.invoices (company_id, kind, event_id, issuer, client, lines, issued_on, delivered_on, due_on, total_net, total_vat, total, created_by)
    select _company, 'advance', _past.id,
      jsonb_build_object('name', q.name, 'address', q.address, 'ico', q.ico, 'dic', q.dic, 'icDph', q.ic_dph, 'contact', q.contact, 'vatPayer', false, 'iban', q.iban, 'registerNote', q.register_note),
      jsonb_build_object('name', coalesce(nullif(_past.client, ''), 'Ukážkový klient'), 'address', 'Ukážková 2, 000 00 Ukážkovo', 'ico', '', 'dic', '', 'icDph', ''),
      jsonb_build_array(jsonb_build_object('label', 'Záloha – ' || _past.name, 'quantity', 1, 'unit', 'ks', 'unitPrice', 300, 'vatRate', 0)),
      _past.starts_on - 20, _past.starts_on - 20, _past.starts_on - 6, 300, 0, 300, null
    from public.quote_issuers q where q.id = _issuer;
    -- Zaplatenie sa pri vystavení vždy vynuluje (trigger) – záloha je zaplatená až potom.
    update public.invoices set paid_on = _past.starts_on - 10 where company_id = _company and event_id = _past.id and kind = 'advance';
    insert into public.invoices (company_id, kind, event_id, issuer, client, lines, issued_on, delivered_on, due_on, total_net, total_vat, total, created_by)
    select _company, 'final', _past.id,
      jsonb_build_object('name', q.name, 'address', q.address, 'ico', q.ico, 'dic', q.dic, 'icDph', q.ic_dph, 'contact', q.contact, 'vatPayer', false, 'iban', q.iban, 'registerNote', q.register_note),
      jsonb_build_object('name', coalesce(nullif(_past.client, ''), 'Ukážkový klient'), 'address', 'Ukážková 2, 000 00 Ukážkovo', 'ico', '', 'dic', '', 'icDph', ''),
      jsonb_build_array(
        jsonb_build_object('label', 'Ozvučenie a svetlá – ' || _past.name, 'quantity', 1, 'unit', 'ks', 'unitPrice', 900, 'vatRate', 0),
        jsonb_build_object('label', 'Odpočet zálohy', 'quantity', 1, 'unit', 'ks', 'unitPrice', -300, 'vatRate', 0)),
      _past.ends_on, _past.ends_on, greatest(_past.ends_on + 14, _today + 3), 600, 0, 600, null
    from public.quote_issuers q where q.id = _issuer;
  end if;

  -- Rozloženie v case: prvý case s aspoň dvoma druhmi techniky – priehradky na polovicu a kontrola po položkách.
  select c.id into _case from public.cases c
  where c.company_id = _company and c.deleted_at is null
    and (select count(*) from public.equipment e where e.case_id = c.id and e.deleted_at is null) >= 2
  order by c.name limit 1;
  if _case is not null then
    select id, quantity into _first from public.equipment where case_id = _case and deleted_at is null order by name limit 1;
    select id, quantity into _second from public.equipment where case_id = _case and deleted_at is null and id <> _first.id order by name limit 1;
    update public.cases set layout = jsonb_build_object('sections', jsonb_build_array(jsonb_build_object(
      'name', 'Priehradky', 'rows', 1, 'cols', 2, 'cells', jsonb_build_array(
        jsonb_build_object('items', jsonb_build_array(jsonb_build_object('equipmentId', _first.id, 'unit', null, 'count', _first.quantity)), 'note', 'vľavo'),
        jsonb_build_object('items', jsonb_build_array(jsonb_build_object('equipmentId', _second.id, 'unit', null, 'count', _second.quantity)), 'note', 'vpravo')))))
    where id = _case and (layout is null or layout = '{}'::jsonb);
    _items := jsonb_build_array(
      jsonb_build_object('equipmentId', _first.id, 'unit', null, 'expected', _first.quantity, 'found', _first.quantity),
      jsonb_build_object('equipmentId', _second.id, 'unit', null, 'expected', _second.quantity, 'found', greatest(_second.quantity - 1, 0)));
    insert into public.case_checks (company_id, case_id, checked_at, checked_by, checked_by_name, note, items)
    values (_company, _case, now() - interval '2 days', null, 'Ukážkový technik', 'Chýbal 1 kus, doplnené zo skladu.', _items);
  end if;

  -- Kto vyrobil káble (štatistika „najviac káblov spravil“).
  select id into _cable from public.equipment where company_id = _company and kind = 'cable' and deleted_at is null and not (attributes ? 'makers') order by quantity desc limit 1;
  if _cable is not null then
    update public.equipment set attributes = attributes || jsonb_build_object('makers', jsonb_build_array(jsonb_build_object('name', 'Ukážkový technik', 'count', greatest(quantity, 1))))
    where id = _cable;
  end if;
end;
$$;
revoke execute on function public.seed_demo_v11(uuid) from public, anon, authenticated;

create or replace function public.create_demo_company()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select id into _id from public.companies where demo_owner = auth.uid();
  if _id is not null then
    return _id;
  end if;
  insert into public.companies (name, created_by, demo_owner) values ('DEMO – Ukážková firma', auth.uid(), auth.uid()) returning id into _id;
  insert into public.company_members (company_id, user_id, role) values (_id, auth.uid(), 'admin');
  perform public.seed_demo_company(_id);
  perform public.seed_demo_extras(_id, auth.uid());
  perform public.seed_demo_v4(_id, auth.uid());
  perform public.seed_demo_v46(_id);
  perform public.seed_demo_v7(_id);
  perform public.seed_demo_v11(_id);
  return _id;
end;
$$;

-- Existujúce demo firmy doplniť.
do $$
declare
  c record;
begin
  for c in select id from public.companies where demo_owner is not null loop
    begin
      perform public.seed_demo_v11(c.id);
    exception when others then
      raise notice 'Demo % sa nepodarilo doplniť: %', c.id, sqlerrm;
    end;
  end loop;
end;
$$;
