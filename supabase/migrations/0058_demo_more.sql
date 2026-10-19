-- RigTrack: bohatšia demo firma.
-- Doplní k pôvodnej ukážke (0041): zamestnancov s pozíciou, kontaktom, narodeninami, meninami a vodičákom,
-- kto kedy nemôže, kartu majiteľa dema, jeho zariadenia (MAC, Wi-Fi), Wi-Fi siete s routerom, servisných technikov,
-- servisný záznam, odmeny, príjmy z akcie, vlastnú techniku zamestnanca, farby kategórií a rozmery subu.
-- Pôvodné funkcie create/reset demo firmy zostávajú, len create volá aj túto.

create function public.seed_demo_extras(_company uuid, _owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _peter uuid;
  _jana uuid;
  _marek uuid;
  _mixer uuid;
  _sharpy uuid;
  _sub uuid;
  _event_next uuid;
  _event_past uuid;
  _garage uuid;
  _av uuid;
begin
  -- Farby kategórií
  update public.equipment_categories set color = case name when 'Svetlá' then 'green' when 'Zvuk' then 'pink' when 'Pódium' then 'yellow' when 'Káble' then 'blue' end
  where company_id = _company;

  select id into _mixer from public.equipment where company_id = _company and name = 'Mixpult X32 Rack';
  select id into _sharpy from public.equipment where company_id = _company and name = 'Sharpy';
  select id into _sub from public.equipment where company_id = _company and name = 'Subwoofer KS118';
  select id into _event_next from public.events where company_id = _company and name = 'Letný festival';
  select id into _event_past from public.events where company_id = _company and name = 'Firemný večierok';

  update public.equipment set attributes = attributes || '{"ipPrefix": 24}' where id = _mixer;
  update public.equipment set attributes = attributes || '{"boxWidthCm": 56, "boxDepthCm": 70, "boxHeightCm": 60, "subDelayMs": 0}' where id = _sub;

  -- Zamestnanci (brigádnici bez účtu)
  insert into public.staff (company_id, name, position, phone, email, skills, birth_date, licences)
  values (_company, 'Peter Zvukár', 'Zvukár', '+421 900 111 222', 'peter@demo.sk', 'X32, dLive, Smaart', (current_date + 1) - interval '31 years', '{B}')
  returning id into _peter;
  insert into public.staff (company_id, name, position, phone, email, skills, name_day, licences)
  values (_company, 'Jana Svetlárka', 'Osvetľovačka', '+421 900 333 444', 'jana@demo.sk', 'GrandMA3, Avolites', to_char(current_date, 'MM-DD'), '{B}')
  returning id into _jana;
  insert into public.staff (company_id, name, position, phone, skills, licences)
  values (_company, 'Marek Stagehand', 'Stagehand, vodič', '+421 900 555 666', 'Práca vo výškach, Nivtec', '{B,C,CE}')
  returning id into _marek;
  insert into public.staff (company_id, name, position, phone, licences)
  values (_company, 'Lucia Produkčná', 'Produkcia', '+421 900 777 888', '{B}');
  insert into public.staff_unavailability (company_id, staff_id, starts_on, ends_on, note)
  values (_company, _marek, current_date + 9, current_date + 12, 'Dovolenka');

  -- Karta majiteľa dema (založí ju trigger pri pridaní do firmy)
  update public.staff set position = 'Majiteľ, technik', phone = '+421 900 000 001', onboarded = true, licences = '{B}'
  where company_id = _company and member_id = _owner;

  -- Zariadenia majiteľa; tablet má výnimku, aby nesvietilo červené upozornenie
  insert into public.member_devices (company_id, user_id, kind, name, mac, networks) values
    (_company, _owner, 'phone', 'Môj mobil', 'A4:83:E7:00:00:01', '[{"ssid": "DEMO-FOH", "ip": "", "mac": "DA:A1:19:00:00:01", "dhcp": true}]'),
    (_company, _owner, 'laptop', 'Notebook (FOH)', 'A4:83:E7:00:00:02', '[{"ssid": "DEMO-FOH", "ip": "192.168.1.50", "mac": ""}]');
  insert into public.device_exemptions (company_id, user_id, kind) values (_company, _owner, 'tablet');

  -- Wi-Fi siete
  insert into public.wifi_networks (company_id, ssid, password, security, subnet, router_ip, router_model, dhcp, dhcp_start, dhcp_end, equipment_id, place, note)
  values (_company, 'DEMO-FOH', 'demo-heslo-123', 'WPA', '192.168.1.0/24', '192.168.1.1', 'Ubiquiti UniFi U6 Lite', true, '192.168.1.100', '192.168.1.199', _mixer, 'FOH rack',
    'Router k mixu X32; tablet na mix cez Wi-Fi.');
  insert into public.wifi_networks (company_id, ssid, password, security, subnet, router_ip, router_model, dhcp, place)
  values (_company, 'DEMO-Kancelária', 'kancelaria-2026', 'WPA', '10.0.0.0/24', '10.0.0.1', 'TP-Link Archer AX55', true, 'Sklad / kancelária');

  -- Servisní technici a servis
  insert into public.service_technicians (company_id, name, firm, phone, email, address, scope, specialization)
  values (_company, 'Tomáš Opravár', 'AV Servis Košice', '+421 905 123 456', 'servis@avservis.demo', 'Košice', 'equipment', 'Clay Paky, Robe, Behringer')
  returning id into _av;
  insert into public.service_technicians (company_id, name, firm, phone, address, scope, specialization)
  values (_company, 'Ján Mechanik', 'Autoservis Stropkov', '+421 905 654 321', 'Stropkov', 'vehicles', 'Ford Transit, pneuservis')
  returning id into _garage;
  update public.vehicles set technician_id = _garage where company_id = _company;
  insert into public.service_records (company_id, equipment_id, kind, status, problem, technician, technician_id, unit_numbers)
  values (_company, _sharpy, 'repair', 'in_progress', 'Kus #2 nesvieti – asi lampa.', 'Tomáš Opravár', _av, '{2}');

  -- Posádka: majiteľ na festivale (čaká na potvrdenie)
  insert into public.event_crew (company_id, event_id, member_id, role) values (_company, _event_next, _owner, 'Produkcia');

  -- Odmeny majiteľa a príjem z minulej akcie
  insert into public.member_payments (company_id, member_id, amount, kind, happened_on, event_id, note, paid_at)
  values (_company, _owner, 120, 'reward', current_date - 20, _event_past, 'Firemný večierok', now() - interval '15 days');
  insert into public.member_payments (company_id, member_id, amount, kind, happened_on, note)
  values (_company, _owner, 50, 'advance', current_date - 3, 'Záloha na festival');
  insert into public.event_payments (company_id, event_id, amount, method, vat, received_on, note, created_by_name)
  values (_company, _event_past, 900, 'invoice', 'without', current_date - 15, 'Faktúra hotelu', 'Demo');

  -- Vlastná technika zamestnanca
  insert into public.equipment (company_id, name, kind, quantity, manufacturer, model, owner_staff_id, attributes)
  values (_company, 'Mikrofón Beta 58A (Petrov)', 'audio', 1, 'Shure', 'Beta 58A', _peter, '{"audioType": "microphone"}');
end;
$$;

revoke execute on function public.seed_demo_extras(uuid, uuid) from public, anon, authenticated;

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
  return _id;
end;
$$;
