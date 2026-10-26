-- RigTrack 4.0: demo firma s novinkami – sada cases s číslami, rack v U, svetlá po kusoch v cases,
-- digitálny zosilňovač s ID a presetmi, XLR v dĺžkach, úlohy s prioritami a úloha „Doplniť“.
-- Nové demo ich dostane hneď; existujúce demo firmy sa doplnia raz (ak ešte nemajú „Svetlá case“).

create or replace function public.seed_demo_v4(_company uuid, _owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _light uuid;
  _sound uuid;
  _cables uuid;
  _rack uuid;
  _cable_case uuid;
  _case uuid;
  _amp uuid;
  _speaker uuid;
  _n integer;
begin
  if exists (select 1 from public.cases where company_id = _company and name = 'Svetlá case' and deleted_at is null) then
    return;
  end if;
  select id into _light from public.equipment_categories where company_id = _company and name = 'Svetlá';
  select id into _sound from public.equipment_categories where company_id = _company and name = 'Zvuk';
  select id into _cables from public.equipment_categories where company_id = _company and name = 'Káble';

  -- Sada 4 rovnakých cases (Case #1…#4), v každom 2 hlavy s číslami kusov
  for _n in 1..4 loop
    insert into public.cases (company_id, name, label_number, label_category, weight_kg, width_cm, length_cm, depth_cm)
    values (_company, 'Svetlá case', _n::text, 'Light', 38, 80, 60, 70)
    returning id into _case;
    insert into public.equipment (company_id, name, kind, category_id, manufacturer, quantity, track_units, unit_ids, case_id, attributes)
    values (_company, 'Beam 230', 'light', _light, 'Demo Light', 2, true, array[_n * 2 - 1, _n * 2], _case,
      '{"lightType": "moving", "lightSource": "discharge", "powerW": 250, "trackHours": true, "hoursPriority": "normal"}');
  end loop;
  -- Ďalšie 2 hlavy zatiaľ mimo case (#9, #10)
  insert into public.equipment (company_id, name, kind, category_id, manufacturer, quantity, track_units, unit_ids, attributes)
  values (_company, 'Beam 230', 'light', _light, 'Demo Light', 2, true, '{9,10}',
    '{"lightType": "moving", "lightSource": "discharge", "powerW": 250, "trackHours": true, "hoursPriority": "normal"}');

  -- Rack 12U s digitálnym zosilňovačom (ID v sieti, presety prepojené s reproboxom)
  insert into public.cases (company_id, name, label_category, kind, rack_units, weight_kg)
  values (_company, 'Rack zosilňovače', 'Sound', 'rack', 12, 45)
  returning id into _rack;
  select id into _speaker from public.equipment where company_id = _company and kind = 'audio' and attributes ->> 'audioType' in ('speaker', 'line_array', 'subwoofer') order by name limit 1;
  insert into public.equipment (company_id, name, kind, category_id, manufacturer, model, quantity, case_id, attributes)
  values (_company, 'Zosilňovač DSP 4×3500', 'audio', _sound, 'Demo Audio', '4x3500 DSP', 1, _rack,
    jsonb_build_object('audioType', 'amplifier', 'ampKind', 'digital', 'ampDeviceId', '101', 'ampPresetSlots', 50,
      'ampW4', 3500, 'ampW8', 2100,
      'ampPresets', jsonb_build_array(
        jsonb_build_object('slot', 1, 'name', 'Factory default', 'note', 'výrobný – nedá sa prepísať', 'locked', true),
        case when _speaker is null then jsonb_build_object('slot', 2, 'name', 'Top – hlavný')
             else jsonb_build_object('slot', 2, 'name', 'Top – hlavný', 'speakerId', _speaker) end)))
  returning id into _amp;

  -- XLR v troch dĺžkach v káblovke
  insert into public.cases (company_id, name, label_category) values (_company, 'Káblovka XLR', 'Cables') returning id into _cable_case;
  insert into public.equipment (company_id, name, kind, category_id, quantity, case_id, attributes) values
    (_company, 'XLR 3 m', 'cable', _cables, 20, _cable_case, '{"connector": "XLR", "lengthM": 3}'),
    (_company, 'XLR 5 m', 'cable', _cables, 15, _cable_case, '{"connector": "XLR", "lengthM": 5}'),
    (_company, 'XLR 10 m', 'cable', _cables, 10, _cable_case, '{"connector": "XLR", "lengthM": 10}');

  -- Prázdny case (upozornenie „prázdny“) a technika, ktorá do case nepatrí
  insert into public.cases (company_id, name, label_number, label_category) values (_company, 'Svetlá case', '5', 'Light');
  insert into public.equipment (company_id, name, kind, quantity, attributes) values (_company, 'Stojan na reprobox', 'general', 4, '{"noCase": true}');

  -- Úlohy s prioritami, kategóriami a jedna „Doplniť“ z políčka
  insert into public.tasks (company_id, title, priority, category, status, assignee_id, assignee_ids, due_on) values
    (_company, 'Vymeniť lampu v Beam 230 #3', 'high', 'Servis', 'open', _owner, array[_owner], current_date + 2),
    (_company, 'Objednať náhradné poistky', 'normal', 'Nákup', 'in_progress', _owner, array[_owner], current_date + 7),
    (_company, 'Upratať regál s káblami', 'low', 'Sklad', 'open', _owner, array[_owner], null),
    (_company, 'Nafotiť nové cases na web', 'none', 'Web', 'open', _owner, array[_owner], null);
  insert into public.tasks (company_id, title, priority, category, status, assignee_id, assignee_ids, link)
  values (_company, 'Doplniť: Hmotnosť – Zosilňovač DSP 4×3500', 'none', 'Doplniť', 'open', _owner, array[_owner], '/equipment/' || _amp || '/edit');
end;
$$;
revoke execute on function public.seed_demo_v4(uuid, uuid) from public, anon, authenticated;

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
  return _id;
end;
$$;

-- Existujúce demo firmy: doplniť novinky raz.
do $$
declare
  c record;
begin
  for c in select id, demo_owner from public.companies where demo_owner is not null loop
    begin
      perform public.seed_demo_v4(c.id, c.demo_owner);
    exception when others then
      raise notice 'Demo % sa nepodarilo doplniť: %', c.id, sqlerrm;
    end;
  end loop;
end;
$$;
