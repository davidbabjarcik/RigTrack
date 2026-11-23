-- RigTrack 12.8: demo firma doplnená o podklady akcie 11.14–12.7 – rack k akcii, input / output list s insertami
-- a farbami, stage plán, synoptika, HF plán, site plán, harmonogram festivalu s dvoma pódiami, turné a dopyt na
-- prenájom s odpoveďou. Vymyslené údaje; spustí sa raz na firmu (podľa turné „Ukážkové turné“).

create or replace function public.seed_demo_v12(_company uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _event record;
  _next record;
  _tour uuid;
  _cable uuid;
  _rack uuid;
  _request uuid;
  _supplier uuid;
  _led uuid;
  _sub uuid;
  _stage jsonb;
  _synoptic jsonb;
  _rf jsonb;
  _site jsonb;
begin
  if exists (select 1 from public.tours where company_id = _company and name = 'Ukážkové turné') then
    return;
  end if;
  -- Akcia s patch listom (festival z dema), inak najbližšia akcia.
  select e.id, e.starts_on, e.ends_on into _event from public.events e
  where e.company_id = _company and e.kind = 'event' and exists (select 1 from public.event_patch p where p.event_id = e.id)
  order by e.starts_on desc limit 1;
  if _event.id is null then
    select e.id, e.starts_on, e.ends_on into _event from public.events e where e.company_id = _company and e.kind = 'event' order by e.starts_on desc limit 1;
  end if;
  if _event.id is null then
    return;
  end if;

  -- Input list: insert a farby kanálov; výstupy (monitory, PA, nahrávanie); verzia 1.
  update public.event_patch set color = case when channel <= 4 then 'red' when channel <= 7 then 'green' when channel <= 9 then 'blue' else 'yellow' end,
    insert_note = case when channel in (1, 2) then 'Gate' when channel >= 10 then 'Comp' else insert_note end
  where company_id = _company and event_id = _event.id;
  insert into public.event_outputs (company_id, event_id, number, name, kind, mix, destination, stereo) values
    (_company, _event.id, 1, 'Wedge spev', 'wedge', 'Mix 1', 'SB1 OUT 1', false),
    (_company, _event.id, 2, 'Wedge gitara', 'wedge', 'Mix 2', 'SB1 OUT 2', false),
    (_company, _event.id, 3, 'IEM bicie', 'iem', 'Mix 3', 'SB1 OUT 3', true),
    (_company, _event.id, 4, 'PA', 'pa', 'Main LR', 'SB1 OUT 7', true),
    (_company, _event.id, 5, 'Nahrávanie', 'rec', 'Matrix 1', 'USB', true);
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  values (_company, 'iolist', _event.id, 1, jsonb_build_object(
    'inputs', coalesce((select jsonb_agg(to_jsonb(p) - 'company_id' - 'event_id' order by p.channel) from public.event_patch p where p.company_id = _company and p.event_id = _event.id), '[]'::jsonb),
    'outputs', coalesce((select jsonb_agg(to_jsonb(o) - 'company_id' - 'event_id' order by o.number) from public.event_outputs o where o.company_id = _company and o.event_id = _event.id), '[]'::jsonb)))
  on conflict (doc_type, doc_id, version) do nothing;

  -- Stage plán 10 × 6 m s kanálmi z input listu.
  _stage := public.clean_stage_items(jsonb_build_array(
    jsonb_build_object('id', 'd1', 'kind', 'riser', 'x', 5, 'y', 1.4, 'rot', 0, 'w', 3, 'd', 2, 'label', '', 'channel', null),
    jsonb_build_object('id', 'd2', 'kind', 'drums', 'x', 5, 'y', 1.4, 'rot', 0, 'w', 2, 'd', 1.8, 'label', 'Bicie', 'channel', 1),
    jsonb_build_object('id', 'd3', 'kind', 'amp_bass', 'x', 2.2, 'y', 1.8, 'rot', 0, 'w', 0.8, 'd', 0.5, 'label', '', 'channel', 5),
    jsonb_build_object('id', 'd4', 'kind', 'amp_guitar', 'x', 7.8, 'y', 1.8, 'rot', 0, 'w', 0.7, 'd', 0.35, 'label', '', 'channel', 6),
    jsonb_build_object('id', 'd5', 'kind', 'keys', 'x', 8.2, 'y', 3.6, 'rot', 345, 'w', 1.4, 'd', 0.6, 'label', '', 'channel', 8),
    jsonb_build_object('id', 'd6', 'kind', 'vocal', 'x', 5, 'y', 4.6, 'rot', 0, 'w', 0.45, 'd', 0.45, 'label', '', 'channel', 10),
    jsonb_build_object('id', 'd7', 'kind', 'vocal', 'x', 3, 'y', 4.4, 'rot', 0, 'w', 0.45, 'd', 0.45, 'label', '', 'channel', 11),
    jsonb_build_object('id', 'd8', 'kind', 'wedge', 'x', 5, 'y', 5.4, 'rot', 180, 'w', 0.6, 'd', 0.45, 'label', 'Mix 1', 'channel', null),
    jsonb_build_object('id', 'd9', 'kind', 'wedge', 'x', 3, 'y', 5.3, 'rot', 180, 'w', 0.6, 'd', 0.45, 'label', 'Mix 2', 'channel', null),
    jsonb_build_object('id', 'd10', 'kind', 'stagebox', 'x', 9.2, 'y', 0.6, 'rot', 0, 'w', 0.6, 'd', 0.4, 'label', 'SB1', 'channel', null),
    jsonb_build_object('id', 'd11', 'kind', 'power', 'x', 0.6, 'y', 0.4, 'rot', 0, 'w', 0.35, 'd', 0.25, 'label', '', 'channel', null)));
  insert into public.stage_plots (event_id, company_id, width_m, depth_m, items, note, version, updated_by)
  values (_event.id, _company, 10, 6, _stage, 'Elektrina 230 V vľavo vzadu, stagebox vpravo vzadu.', 1, null)
  on conflict (event_id) do nothing;
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  values (_company, 'stageplot', _event.id, 1, jsonb_build_object('plot', jsonb_build_object('width_m', 10, 'depth_m', 6, 'note', 'Elektrina 230 V vľavo vzadu, stagebox vpravo vzadu.'), 'items', _stage,
    'inputs', coalesce((select jsonb_agg(jsonb_build_object('channel', p.channel, 'name', p.name) order by p.channel) from public.event_patch p where p.company_id = _company and p.event_id = _event.id), '[]'::jsonb)))
  on conflict (doc_type, doc_id, version) do nothing;

  -- Synoptika: FOH pult – stagebox – amp rack – PA.
  _synoptic := jsonb_build_object(
    'nodes', public.clean_synoptic_nodes(jsonb_build_array(
      jsonb_build_object('id', 'n1', 'kind', 'console', 'label', 'FOH pult', 'detail', 'réžia 40 m od pódia', 'x', 40, 'y', 120),
      jsonb_build_object('id', 'n2', 'kind', 'stagebox', 'label', 'Stagebox SB1', 'detail', 'pódium vpravo', 'x', 400, 'y', 120),
      jsonb_build_object('id', 'n3', 'kind', 'rack', 'label', 'Amp rack', 'detail', '6 U', 'x', 400, 'y', 300),
      jsonb_build_object('id', 'n4', 'kind', 'speaker', 'label', 'PA vľavo', 'detail', '', 'x', 760, 'y', 220),
      jsonb_build_object('id', 'n5', 'kind', 'speaker', 'label', 'PA vpravo', 'detail', '', 'x', 760, 'y', 380),
      jsonb_build_object('id', 'n6', 'kind', 'power', 'label', 'Rozvádzač', 'detail', '32 A', 'x', 40, 'y', 300))),
    'links', public.clean_synoptic_links(jsonb_build_array(
      jsonb_build_object('id', 'l1', 'from', 'n1', 'to', 'n2', 'signal', 'aes50', 'cable', 'CAT6', 'length_m', 50, 'count', 2, 'label', ''),
      jsonb_build_object('id', 'l2', 'from', 'n2', 'to', 'n3', 'signal', 'analog', 'cable', 'Multipár 8', 'length_m', 5, 'count', 1, 'label', ''),
      jsonb_build_object('id', 'l3', 'from', 'n3', 'to', 'n4', 'signal', 'analog', 'cable', 'NL4', 'length_m', 15, 'count', 1, 'label', ''),
      jsonb_build_object('id', 'l4', 'from', 'n3', 'to', 'n5', 'signal', 'analog', 'cable', 'NL4', 'length_m', 15, 'count', 1, 'label', ''),
      jsonb_build_object('id', 'l5', 'from', 'n6', 'to', 'n3', 'signal', 'power', 'cable', 'CEE 32 A', 'length_m', 25, 'count', 1, 'label', ''))),
    'note', 'Dva káble CAT6 – hlavný a záložný.');
  insert into public.event_synoptics (event_id, company_id, nodes, links, note, version, updated_by)
  values (_event.id, _company, _synoptic -> 'nodes', _synoptic -> 'links', _synoptic ->> 'note', 1, null)
  on conflict (event_id) do nothing;
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  values (_company, 'synoptic', _event.id, 1, _synoptic) on conflict (doc_type, doc_id, version) do nothing;

  -- HF plán: štyri kanály bez kolízií, vylúčený TV kanál 38.
  _rf := jsonb_build_object(
    'channels', public.clean_rf_channels(jsonb_build_array(
      jsonb_build_object('id', 'c1', 'name', 'Spev 1', 'kind', 'mic', 'min_mhz', 606, 'max_mhz', 630, 'freq_mhz', 614.125, 'locked', true),
      jsonb_build_object('id', 'c2', 'name', 'Spev 2', 'kind', 'mic', 'min_mhz', 606, 'max_mhz', 630, 'freq_mhz', 614.875, 'locked', false),
      jsonb_build_object('id', 'c3', 'name', 'IEM bicie', 'kind', 'iem', 'min_mhz', 606, 'max_mhz', 630, 'freq_mhz', 616.375, 'locked', false),
      jsonb_build_object('id', 'c4', 'name', 'IEM gitara', 'kind', 'iem', 'min_mhz', 606, 'max_mhz', 630, 'freq_mhz', 619.625, 'locked', false))),
    'settings', public.clean_rf_settings('{}'::jsonb),
    'excluded_tv', '[38]'::jsonb, 'place', 'Ukážkové námestie', 'note', 'Pred akciou overiť skenom.');
  insert into public.event_rf_plans (event_id, company_id, channels, settings, excluded_tv, place, note, version, updated_by)
  values (_event.id, _company, _rf -> 'channels', _rf -> 'settings', _rf -> 'excluded_tv', _rf ->> 'place', _rf ->> 'note', 1, null)
  on conflict (event_id) do nothing;
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  values (_company, 'rfplan', _event.id, 1, _rf) on conflict (doc_type, doc_id, version) do nothing;

  -- Site plán: pódium, FOH, rozvádzač a trasa elektriny (kábel z techniky, ak má dĺžku).
  select id into _cable from public.equipment where company_id = _company and kind = 'cable' and deleted_at is null and (attributes ->> 'lengthM') is not null order by (attributes ->> 'lengthM')::numeric desc limit 1;
  _site := jsonb_build_object(
    'view', public.clean_site_view(jsonb_build_object('lat', 48.14395, 'lon', 17.10885, 'zoom', 18)),
    'markers', public.clean_site_markers(jsonb_build_array(
      jsonb_build_object('id', 'm1', 'kind', 'stage', 'lat', 48.14420, 'lon', 17.10885, 'label', 'Pódium'),
      jsonb_build_object('id', 'm2', 'kind', 'foh', 'lat', 48.14370, 'lon', 17.10885, 'label', 'FOH'),
      jsonb_build_object('id', 'm3', 'kind', 'power', 'lat', 48.14425, 'lon', 17.10820, 'label', 'Rozvádzač'),
      jsonb_build_object('id', 'm4', 'kind', 'truck', 'lat', 48.14440, 'lon', 17.10950, 'label', 'Vykládka'))),
    'routes', public.clean_site_routes(jsonb_build_array(
      jsonb_build_object('id', 'r1', 'kind', 'power', 'label', 'Rozvádzač → pódium', 'equipment_id', _cable, 'slack_pct', 10,
        'points', jsonb_build_array(jsonb_build_array(48.14425, 17.10820), jsonb_build_array(48.14425, 17.10870), jsonb_build_array(48.14420, 17.10885))),
      jsonb_build_object('id', 'r2', 'kind', 'network', 'label', 'Pódium → FOH', 'equipment_id', null, 'slack_pct', 15,
        'points', jsonb_build_array(jsonb_build_array(48.14420, 17.10885), jsonb_build_array(48.14370, 17.10885))))),
    'note', 'Vjazd pre kamión zo zadnej strany.');
  insert into public.event_site_plans (event_id, company_id, view, markers, routes, note, version, updated_by)
  values (_event.id, _company, _site -> 'view', _site -> 'markers', _site -> 'routes', _site ->> 'note', 1, null)
  on conflict (event_id) do nothing;
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  values (_company, 'siteplan', _event.id, 1, _site) on conflict (doc_type, doc_id, version) do nothing;

  -- Harmonogram festivalu s dvoma pódiami (prvý deň akcie).
  insert into public.event_schedule_items (company_id, event_id, day, starts_at, ends_at, stage, kind, title) values
    (_company, _event.id, _event.starts_on, '10:00', '14:00', 'Hlavné', 'build', 'Stavba a zvuk'),
    (_company, _event.id, _event.starts_on, '15:00', '16:30', 'Hlavné', 'soundcheck', 'Soundcheck – Ukážková kapela'),
    (_company, _event.id, _event.starts_on, '17:00', null, 'Hlavné', 'doors', 'Otvorenie brán'),
    (_company, _event.id, _event.starts_on, '18:00', '19:00', 'Hlavné', 'act', 'Ukážková predkapela'),
    (_company, _event.id, _event.starts_on, '19:00', '19:30', 'Hlavné', 'changeover', 'Prestavba'),
    (_company, _event.id, _event.starts_on, '19:30', '21:00', 'Hlavné', 'act', 'Ukážková kapela'),
    (_company, _event.id, _event.starts_on, '18:30', '20:30', 'Malé', 'act', 'Ukážkový DJ'),
    (_company, _event.id, _event.starts_on, '23:00', null, 'Hlavné', 'curfew', 'Koniec programu');

  -- Rack k akcii: 6 U so záslepkou a zariadením zo zvuku.
  insert into public.rack_designs (company_id, name, rack_type, units, depth_mm, rails, event_id, note, created_by, updated_by)
  values (_company, 'Ukážkový FOH rack', 'shock', 6, 450, 'both', _event.id, 'Stagebox a napájanie pre FOH.', null, null) returning id into _rack;
  insert into public.rack_slots (company_id, rack_id, side, bottom_u, height_u, width, col, equipment_id, accessory, label, sort)
  select _company, _rack, 'front', 5, 2, 'full', 0, e.id, null, '', 0 from public.equipment e
  where e.company_id = _company and e.kind = 'audio' and e.deleted_at is null order by e.name limit 1;
  insert into public.rack_slots (company_id, rack_id, side, bottom_u, height_u, width, col, accessory, label, sort) values
    (_company, _rack, 'front', 4, 1, 'full', 0, 'vent', '', 1),
    (_company, _rack, 'front', 1, 1, 'full', 0, 'pdu', 'Napájanie 230 V', 2),
    (_company, _rack, 'rear', 1, 1, 'full', 0, 'patch', 'Patch XLR', 3);
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  select _company, 'rack', _rack, 1, jsonb_build_object(
    'rack', (select to_jsonb(d) - 'company_id' from public.rack_designs d where d.id = _rack),
    'slots', coalesce((select jsonb_agg(to_jsonb(s) - 'company_id' - 'rack_id' order by s.sort) from public.rack_slots s where s.rack_id = _rack), '[]'::jsonb))
  on conflict (doc_type, doc_id, version) do nothing;

  -- Turné: akcia s podkladmi a ďalšia zastávka o dva týždne.
  insert into public.tours (company_id, name, note) values (_company, 'Ukážkové turné', 'Tri mestá, rovnaká kapela a technika.') returning id into _tour;
  update public.events set tour_id = _tour where id = _event.id;
  insert into public.events (company_id, name, client, venue, starts_on, ends_on, status, tour_id)
  values (_company, 'Ukážkové turné – mesto 2', 'Ukážková kapela', 'Ukážková hala', _event.starts_on + 14, _event.starts_on + 14, 'planned', _tour)
  returning id, starts_on into _next;

  -- Dopyt na prenájom s dvoma požičovňami, jedna odpovedala.
  insert into public.rental_requests (company_id, event_id, title, note, needed_from, needed_to, created_by)
  values (_company, _event.id, 'LED stena a suby navyše', 'Dovoz a odvoz zabezpečíme.', _event.starts_on, _event.ends_on, null) returning id into _request;
  insert into public.rental_request_items (company_id, request_id, name, quantity, sort) values (_company, _request, 'Ukážkový LED panel 50 × 50', 24, 0) returning id into _led;
  insert into public.rental_request_items (company_id, request_id, name, quantity, sort) values (_company, _request, 'Ukážkový subwoofer 18"', 4, 1) returning id into _sub;
  insert into public.rental_request_suppliers (company_id, request_id, supplier_name, email, token, viewed_at, responded_at, message)
  values (_company, _request, 'Ukážková požičovňa A', '', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), now() - interval '2 days', now() - interval '1 day', 'Suby máme len dva.')
  returning id into _supplier;
  insert into public.rental_quotes (company_id, supplier_id, item_id, available, unit_price, note) values
    (_company, _supplier, _led, 24, 18, ''), (_company, _supplier, _sub, 2, 45, 'len 2 ks');
  insert into public.rental_request_suppliers (company_id, request_id, supplier_name, email, token)
  values (_company, _request, 'Ukážková požičovňa B', '', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
end;
$$;
revoke execute on function public.seed_demo_v12(uuid) from public, anon, authenticated;

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
  perform public.seed_demo_v12(_id);
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
      perform public.seed_demo_v12(c.id);
    exception when others then
      raise notice 'Demo % sa nepodarilo doplniť: %', c.id, sqlerrm;
    end;
  end loop;
end;
$$;
