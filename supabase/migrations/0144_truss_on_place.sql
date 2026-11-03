-- RigTrack 7.16: hliník nie je samostatný druh miesta – leží na bežnom Mieste spolu s cases. Miesto s hliníkom je
-- v rozložení hliníka (warehouses.truss_layout.spotId). Staré miesta druhu „truss“ sa zmenia na Miesto (zone) a prvé
-- z nich sa zapíše ako miesto hliníka. Druh „truss“ ostáva v kontrole hodnôt kvôli starším zálohám.

update public.warehouses w
set truss_layout = coalesce(w.truss_layout, '{}'::jsonb) || jsonb_build_object('spotId', s.id)
from (
  select distinct on (company_id) company_id, id from public.warehouse_spots where kind = 'truss' order by company_id, created_at
) s
where s.company_id = w.company_id and coalesce(w.truss_layout ->> 'spotId', '') = '';

update public.warehouse_spots set kind = 'zone' where kind = 'truss';

-- Demo: miesto „Hliník a cases“.
create or replace function public.seed_demo_v7(_company uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _rack_a uuid;
  _rack_b uuid;
  _pallet uuid;
  _bays jsonb := '[{"widthCm": 267, "levels": [{"heightCm": 150, "pallets": 3, "palletAlign": "left"}, {"heightCm": 120}, {"heightCm": 110}]},
                   {"widthCm": 267, "levels": [{"heightCm": 150, "pallets": 3, "palletAlign": "left"}, {"heightCm": 120}, {"heightCm": 110}]}]';
  _t3 uuid;
  _t2 uuid;
  _t1 uuid;
  _corner uuid;
  _base uuid;
  _case record;
  _i integer := 0;
begin
  -- Už doplnené (alebo má vlastný plán) – nič.
  if exists (select 1 from public.warehouse_spots where company_id = _company) then
    return;
  end if;

  insert into public.warehouses (company_id, length_cm, width_cm) values (_company, 1200, 1000)
  on conflict (company_id) do nothing;
  update public.warehouses set rack_types = jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Paletový 2 polia', 'depthCm', 110, 'bays', _bays))
  where company_id = _company;

  insert into public.warehouse_spots (company_id, name, kind, x, y, length, width, levels, bays) values (_company, 'Regál A', 'rack', 100, 80, 561, 110, 3, _bays) returning id into _rack_a;
  insert into public.warehouse_spots (company_id, name, kind, x, y, length, width, levels, bays) values (_company, 'Regál B', 'rack', 100, 320, 561, 110, 3, _bays) returning id into _rack_b;
  insert into public.warehouse_spots (company_id, name, kind, x, y, length, width, levels, material) values (_company, 'Paleta 1', 'pallet', 820, 100, 120, 80, 1, 'wood') returning id into _pallet;
  insert into public.warehouse_spots (company_id, name, kind, x, y, length, width, levels, material) values
    (_company, 'Paleta 2', 'pallet', 960, 100, 120, 80, 1, 'plastic'),
    (_company, 'Hliník a cases', 'zone', 780, 360, 380, 240, 1, null),
    (_company, 'Kancelária', 'room', 0, 700, 450, 300, 1, null),
    (_company, 'Brána', 'door', 550, 985, 300, 15, 1, null),
    (_company, 'Okno', 'window', 1185, 200, 15, 150, 1, null),
    (_company, 'Stĺp', 'column', 680, 640, 40, 40, 1, null);

  -- Cases na regáloch: štyri na palety dole v Regáli A, dva na druhú policu, jeden na paletu na zemi.
  for _case in select id from public.cases where company_id = _company and deleted_at is null order by name limit 7 loop
    _i := _i + 1;
    if _i <= 4 then
      update public.cases set spot_id = _rack_a, spot_bay = 1, spot_level = 1, spot_pallet = null where id = _case.id;
    elsif _i <= 6 then
      update public.cases set spot_id = _rack_a, spot_bay = 1, spot_level = 2, spot_pallet = null where id = _case.id;
    else
      update public.cases set spot_id = _pallet, spot_level = null, spot_bay = null where id = _case.id;
    end if;
  end loop;

  -- Hliník (truss F34) a jeho stohy v sklade.
  insert into public.equipment (company_id, name, kind, quantity, manufacturer, model, attributes) values (_company, 'F34 3 m', 'truss', 8, 'Ukážka', 'F34', '{"trussType": "point4", "trussShape": "straight", "lengthM": 3}') returning id into _t3;
  insert into public.equipment (company_id, name, kind, quantity, manufacturer, model, attributes) values (_company, 'F34 2 m', 'truss', 8, 'Ukážka', 'F34', '{"trussType": "point4", "trussShape": "straight", "lengthM": 2}') returning id into _t2;
  insert into public.equipment (company_id, name, kind, quantity, manufacturer, model, attributes) values (_company, 'F34 1 m', 'truss', 6, 'Ukážka', 'F34', '{"trussType": "point4", "trussShape": "straight", "lengthM": 1}') returning id into _t1;
  insert into public.equipment (company_id, name, kind, quantity, manufacturer, model, attributes) values (_company, 'Roh 2-way 90°', 'truss', 4, 'Ukážka', 'F34', '{"trussType": "point4", "trussShape": "corner"}') returning id into _corner;
  insert into public.equipment (company_id, name, kind, quantity, manufacturer, model, attributes) values (_company, 'Base plate 600×600', 'truss', 4, 'Ukážka', '', '{"trussType": "accessory"}') returning id into _base;
  update public.warehouses set truss_layout = jsonb_build_object('spotId', (select id from public.warehouse_spots where company_id = _company and name = 'Hliník a cases' limit 1), 'cellCm', 35, 'cols', 8, 'rows', 4, 'stacks', jsonb_build_array(
    jsonb_build_object('col', 0, 'row', 0, 'pieces', jsonb_build_array(_t3)),
    jsonb_build_object('col', 1, 'row', 0, 'pieces', jsonb_build_array(_t3)),
    jsonb_build_object('col', 2, 'row', 0, 'pieces', jsonb_build_array(_t2, _t1)),
    jsonb_build_object('col', 3, 'row', 0, 'pieces', jsonb_build_array(_t2)),
    jsonb_build_object('col', 0, 'row', 1, 'pieces', jsonb_build_array(_t1, _t1)),
    jsonb_build_object('col', 5, 'row', 2, 'pieces', jsonb_build_array(_base, _base, _corner, _corner))
  )) where company_id = _company;

  -- Bezdrôtový systém s dvoma druhmi vysielačov.
  insert into public.equipment (company_id, name, kind, quantity, manufacturer, model, attributes) values
    (_company, 'Ukážka RX4 – 2× HT1, BP2', 'audio', 1, 'Ukážka', 'RX4 + HT1 + BP2',
     '{"audioType": "wireless", "rfRange": "470–790 MHz", "wirelessRx": "RX4", "wirelessTxs": [{"kind": "handheld", "model": "HT1", "count": 2}, {"kind": "bodypack", "model": "BP2", "count": 2}]}');

  -- Činnosti pred / na / po evente; kontrola hliníka patrí skladníkom.
  insert into public.company_duty_types (company_id, name, sort, phase, owner_roles) values
    (_company, 'Nakladanie', 1, 'before', '{}'),
    (_company, 'Stavba pódia', 2, 'event', '{}'),
    (_company, 'Vykladanie', 3, 'after', '{}'),
    (_company, 'Kontrola a naskladnenie hliníka', 4, 'after', '{skladnik}'),
    (_company, 'Kontrola kabeláže', 5, 'after', '{skladnik}')
  on conflict do nothing;
end;
$$;
revoke execute on function public.seed_demo_v7(uuid) from public, anon, authenticated;
