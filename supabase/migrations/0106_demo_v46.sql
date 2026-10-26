-- RigTrack 4.6: demo firma s novinkami od 4.0 – DMX adresy kusov (linka, adresa, mód), príkon a váha svetiel,
-- zvukový aj DMX patch list na festivale, šablóny patch listov, občianske združenie medzi firmami, „Našli ste…“.
-- Nové demo ich dostane hneď; existujúce demo firmy sa doplnia raz (ak ešte nemajú šablónu „Kapela – základ“).

create or replace function public.seed_demo_v46(_company uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _event uuid;
  e record;
  _info jsonb;
  _unit integer;
begin
  if exists (select 1 from public.patch_templates where company_id = _company and name = 'Kapela – základ') then
    return;
  end if;
  select id into _event from public.events where company_id = _company and name = 'Letný festival';

  -- Svetlá Beam 230: DMX módy, príkon, váha a pri každom kuse linka 1, adresy za sebou po 16 kanáloch
  for e in select id, unit_ids from public.equipment where company_id = _company and name = 'Beam 230' and deleted_at is null loop
    _info := '{}'::jsonb;
    foreach _unit in array e.unit_ids loop
      _info := _info || jsonb_build_object(_unit::text, jsonb_build_object('dmxLine', '1', 'dmxAddress', (_unit - 1) * 16 + 1, 'dmxMode', 'Basic'));
    end loop;
    update public.equipment
      set unit_info = _info,
          attributes = attributes || '{"dmxModes": [{"name": "Basic", "channels": 16}, {"name": "Extended", "channels": 24}], "powerW": 330, "weightKg": 18}'
      where id = e.id;
  end loop;

  -- Šablóny patch listov
  insert into public.patch_templates (company_id, kind, name, note, lines) values
    (_company, 'sound', 'Kapela – základ', 'bicie, basa, 2 gitary, klávesy, 2 spevy', '[
      {"channel": 1, "name": "Kick", "stagebox": "SB1", "stageboxInput": 1, "source": "mic", "equipmentId": null, "capsuleId": null, "connector": "", "stand": "short", "phantom": false, "note": ""},
      {"channel": 2, "name": "Snare", "stagebox": "SB1", "stageboxInput": 2, "source": "mic", "equipmentId": null, "capsuleId": null, "connector": "", "stand": "clamp", "phantom": false, "note": ""},
      {"channel": 3, "name": "Overhead L", "stagebox": "SB1", "stageboxInput": 3, "source": "mic", "equipmentId": null, "capsuleId": null, "connector": "", "stand": "tall", "phantom": true, "note": ""},
      {"channel": 4, "name": "Overhead R", "stagebox": "SB1", "stageboxInput": 4, "source": "mic", "equipmentId": null, "capsuleId": null, "connector": "", "stand": "tall", "phantom": true, "note": ""},
      {"channel": 5, "name": "Basa DI", "stagebox": "SB1", "stageboxInput": 5, "source": "di", "equipmentId": null, "capsuleId": null, "connector": "", "stand": "", "phantom": true, "note": ""},
      {"channel": 6, "name": "Gitara 1", "stagebox": "SB1", "stageboxInput": 6, "source": "mic", "equipmentId": null, "capsuleId": null, "connector": "", "stand": "short", "phantom": false, "note": ""},
      {"channel": 7, "name": "Gitara 2", "stagebox": "SB1", "stageboxInput": 7, "source": "mic", "equipmentId": null, "capsuleId": null, "connector": "", "stand": "short", "phantom": false, "note": ""},
      {"channel": 8, "name": "Klávesy L", "stagebox": "SB1", "stageboxInput": 8, "source": "di", "equipmentId": null, "capsuleId": null, "connector": "", "stand": "", "phantom": true, "note": ""},
      {"channel": 9, "name": "Klávesy R", "stagebox": "SB1", "stageboxInput": 9, "source": "di", "equipmentId": null, "capsuleId": null, "connector": "", "stand": "", "phantom": true, "note": ""},
      {"channel": 10, "name": "Spev 1", "stagebox": "SB1", "stageboxInput": 10, "source": "wireless", "equipmentId": null, "capsuleId": null, "connector": "", "stand": "tall", "phantom": false, "note": ""},
      {"channel": 11, "name": "Spev 2", "stagebox": "SB1", "stageboxInput": 11, "source": "mic", "equipmentId": null, "capsuleId": null, "connector": "", "stand": "tall", "phantom": false, "note": ""}
    ]'::jsonb),
    (_company, 'dmx', 'Stage – 8 beamov', 'linka 1, Basic 16 ch', (
      select jsonb_agg(jsonb_build_object('universe', '1', 'address', (n - 1) * 16 + 1, 'channels', 16, 'name', 'Beam 230 #' || n, 'equipmentId', null, 'unit', n, 'mode', 'Basic', 'note', '') order by n)
      from generate_series(1, 8) n
    ));

  -- Patch listy na festivale: zvuk zo šablóny a DMX z beamov
  if _event is not null then
    insert into public.event_patch (company_id, event_id, channel, name, stagebox, stagebox_input, source, stand, phantom)
    select _company, _event, (l ->> 'channel')::int, l ->> 'name', l ->> 'stagebox', (l ->> 'stageboxInput')::int, l ->> 'source', l ->> 'stand', (l ->> 'phantom')::boolean
    from public.patch_templates t, jsonb_array_elements(t.lines) l
    where t.company_id = _company and t.name = 'Kapela – základ'
    on conflict do nothing;
    insert into public.event_dmx_patch (company_id, event_id, universe, address, channels, name, mode)
    select _company, _event, '1', (n - 1) * 16 + 1, 16, 'Beam 230 #' || n, 'Basic' from generate_series(1, 8) n;
  end if;

  -- Občianske združenie medzi firmami a kontaktmi
  insert into public.partners (company_id, name, legal_name, ico, address, ceo, legal_form, note)
  values (_company, 'OZ Kultúra mesta', 'Občianske združenie Kultúra mesta', '12345678', 'Hlavná 1, Mesto', 'Mária Predsedová', 'oz', 'Organizátor letných podujatí');

  -- „Našli ste…“ pri QR štítkoch zapnuté (ukážka)
  insert into public.company_profile (company_id, phone, email, public_scan)
  values (_company, '+421 900 000 001', 'demo@rigtrack.sk', true)
  on conflict (company_id) do update set public_scan = true;
end;
$$;
revoke execute on function public.seed_demo_v46(uuid) from public, anon, authenticated;

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
  return _id;
end;
$$;

do $$
declare
  c record;
begin
  for c in select id from public.companies where demo_owner is not null loop
    begin
      perform public.seed_demo_v46(c.id);
    exception when others then
      raise notice 'Demo % sa nepodarilo doplniť: %', c.id, sqlerrm;
    end;
  end loop;
end;
$$;
