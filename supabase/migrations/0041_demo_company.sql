-- RigTrack: demo firma pre každého používateľa.
-- Každý si môže založiť vlastnú ukážkovú firmu s vymyslenou technikou, cases, eventmi,
-- výpožičkou, vozidlom a úlohami, skúšať na nej čokoľvek a v nastaveniach ju vrátiť
-- do pôvodného stavu (reset) alebo zmazať. Ostatné firmy to nijako neovplyvní.

alter table public.companies
  add column demo_owner uuid references public.profiles (id) on delete cascade;
create unique index companies_demo_owner_idx on public.companies (demo_owner) where demo_owner is not null;

-- Naplnenie demo firmy. Interná funkcia: volajú ju len funkcie nižšie.
create function public.seed_demo_company(_company uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _light uuid;
  _audio uuid;
  _cables uuid;
  _stage uuid;
  _store uuid;
  _van uuid;
  _case_audio uuid;
  _case_light uuid;
  _case_cables uuid;
  _mixer uuid;
  _sharpy uuid;
  _par uuid;
  _speaker uuid;
  _sub uuid;
  _mic uuid;
  _di uuid;
  _xlr10 uuid;
  _xlr5 uuid;
  _dmx uuid;
  _deck uuid;
  _event_next uuid;
  _event_past uuid;
  _loan uuid;
begin
  insert into public.equipment_categories (company_id, name) values (_company, 'Svetlá') returning id into _light;
  insert into public.equipment_categories (company_id, name) values (_company, 'Zvuk') returning id into _audio;
  insert into public.equipment_categories (company_id, name) values (_company, 'Káble') returning id into _cables;
  insert into public.equipment_categories (company_id, name) values (_company, 'Pódium') returning id into _stage;
  insert into public.locations (company_id, name) values (_company, 'Sklad – regál A') returning id into _store;
  insert into public.locations (company_id, name) values (_company, 'Dodávka') returning id into _van;

  insert into public.cases (company_id, name, inventory_number, location_id) values (_company, 'Audio case 1', 'C-01', _store) returning id into _case_audio;
  insert into public.cases (company_id, name, inventory_number, location_id) values (_company, 'Sharpy case', 'C-02', _store) returning id into _case_light;
  insert into public.cases (company_id, name, inventory_number, location_id) values (_company, 'Káble XLR', 'C-03', _store) returning id into _case_cables;

  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, ip_address, attributes)
  values (_company, 'Mixpult X32 Rack', 'audio', _audio, _case_audio, 1, 'Behringer', 'X32 Rack', 60, '192.168.1.10', '{"audioType": "mixer"}')
  returning id into _mixer;
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, ip_address, attributes)
  values (_company, 'Stagebox S16', 'audio', _audio, _case_audio, 1, 'Behringer', 'S16', 25, '192.168.1.11', '{"audioType": "stagebox"}');
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, attributes)
  values (_company, 'DI box', 'audio', _audio, _case_audio, 4, 'Palmer', 'PAN 01', 3, '{"audioType": "di"}') returning id into _di;
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, attributes)
  values (_company, 'Mikrofón SM58', 'audio', _audio, _case_audio, 6, 'Shure', 'SM58', 4, '{"audioType": "microphone"}') returning id into _mic;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, attributes, track_units)
  values (_company, 'Reprobox K12.2', 'audio', _audio, _store, 4, 'QSC', 'K12.2', 35, '{"audioType": "speaker", "powerW": 2000}', true)
  returning id into _speaker;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, attributes, track_units)
  values (_company, 'Subwoofer KS118', 'audio', _audio, _store, 2, 'QSC', 'KS118', 45, '{"audioType": "subwoofer", "powerW": 3600}', true)
  returning id into _sub;

  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, track_units, attributes)
  values (_company, 'Sharpy', 'light', _light, _case_light, 4, 'Clay Paky', 'Sharpy', 40, true,
    '{"powerW": 350, "lightSource": "discharge", "dmxModes": [{"name": "Standard", "channels": 16}, {"name": "Vector", "channels": 24}]}')
  returning id into _sharpy;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, track_units, attributes)
  values (_company, 'LED Par 18x10W', 'light', _light, _store, 12, 'Stairville', 'LED Par 18x10', 8, true,
    '{"powerW": 180, "lightSource": "led", "dmxModes": [{"name": "Basic", "channels": 3}, {"name": "Full", "channels": 8}]}')
  returning id into _par;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, attributes)
  values (_company, 'Hazer', 'light', _light, _store, 1, 'Smoke Factory', 'Tour-Hazer II', 30, '{"powerW": 1500}');

  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, rental_price, attributes)
  values (_company, 'XLR kábel 10 m', 'cable', _cables, _case_cables, 12, 1, '{"connector": "XLR", "lengthM": 10}') returning id into _xlr10;
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, rental_price, attributes)
  values (_company, 'XLR kábel 5 m', 'cable', _cables, _case_cables, 10, 1, '{"connector": "XLR", "lengthM": 5}') returning id into _xlr5;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, rental_price, attributes)
  values (_company, 'DMX kábel 10 m', 'cable', _cables, _store, 8, 1, '{"connector": "DMX 3-pin", "lengthM": 10}') returning id into _dmx;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price)
  values (_company, 'Pódiová doska 2×1 m', 'general', _stage, _store, 24, 'Nivtec', 'Deck 2x1', 15) returning id into _deck;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, rental_price)
  values (_company, 'Noha pódia 60 cm', 'general', _stage, _store, 96, 'Nivtec', 1);

  insert into public.case_checks (company_id, case_id, checked_at, checked_by_name, note)
  values (_company, _case_audio, now() - interval '40 days', 'Demo', 'Všetko na mieste');

  insert into public.events (company_id, name, client, venue, starts_on, ends_on, status, organizer, organizer_phone, description, get_in_time, show_time, show_end_time)
  values (_company, 'Letný festival', 'Mesto Ukážkovo', 'Amfiteáter Ukážkovo', current_date + 10, current_date + 11, 'confirmed',
    'Mesto Ukážkovo', '+421 900 000 000', 'Open air, dve kapely a DJ. Prípojka 32 A pri pódiu.', '12:00', '18:00', '23:30')
  returning id into _event_next;
  insert into public.event_equipment (company_id, event_id, equipment_id, quantity, case_id) values
    (_company, _event_next, _mixer, 1, _case_audio),
    (_company, _event_next, _di, 4, _case_audio),
    (_company, _event_next, _mic, 6, _case_audio);
  insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values
    (_company, _event_next, _speaker, 4),
    (_company, _event_next, _sub, 2),
    (_company, _event_next, _par, 8);
  insert into public.event_crew (company_id, event_id, name, role) values
    (_company, _event_next, 'Peter Zvukár', 'FOH'),
    (_company, _event_next, 'Jana Svetlárka', 'Svetlá');

  insert into public.events (company_id, name, venue, starts_on, ends_on, status)
  values (_company, 'Firemný večierok', 'Hotel Demo', current_date - 20, current_date - 20, 'done')
  returning id into _event_past;
  insert into public.event_equipment (company_id, event_id, equipment_id, quantity, case_id) values
    (_company, _event_past, _mixer, 1, _case_audio),
    (_company, _event_past, _di, 4, _case_audio),
    (_company, _event_past, _mic, 6, _case_audio);

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, status, note)
  values (_company, 'Kapela Ukážka', '+421 911 111 111', current_date + 3, current_date + 5, 'reserved', 'Skúška v klube')
  returning id into _loan;
  insert into public.loan_items (company_id, loan_id, equipment_id, quantity, unit_price) values
    (_company, _loan, _xlr5, 6, 1),
    (_company, _loan, _dmx, 2, 1);

  insert into public.vehicles (company_id, plate, model, status, odometer_km, stk_until, vignette_until)
  values (_company, 'DEMO 001', 'Ford Transit', 'active', 182000, current_date + 25, current_date + 120);

  insert into public.tasks (company_id, title, priority, due_on) values
    (_company, 'Skontrolovať káble XLR po festivale', 'normal', current_date + 12),
    (_company, 'Objednať náhradné lampy do Sharpy', 'high', current_date + 5);
end;
$$;

create function public.my_demo_company()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.companies where demo_owner = auth.uid()
$$;

/** Založí demo firmu volajúceho (ak ju už má, vráti ju). */
create function public.create_demo_company()
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
  return _id;
end;
$$;

/** Zmaže demo firmu volajúceho so všetkým, čo v nej je. */
create function public.delete_demo_company()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  delete from public.companies where demo_owner = auth.uid();
end;
$$;

/** Vráti demo firmu do pôvodného stavu: zmaže ju a založí nanovo. Vráti nové id. */
create function public.reset_demo_company()
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.delete_demo_company();
  return public.create_demo_company();
end;
$$;

revoke execute on function public.seed_demo_company(uuid) from public, anon, authenticated;
revoke execute on function public.my_demo_company(), public.create_demo_company(), public.delete_demo_company(), public.reset_demo_company()
  from public, anon;
grant execute on function public.my_demo_company(), public.create_demo_company(), public.delete_demo_company(), public.reset_demo_company()
  to authenticated;
