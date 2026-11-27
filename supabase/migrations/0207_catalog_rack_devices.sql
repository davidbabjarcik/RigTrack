-- RigTrack 12.12: údaje do racku pri bežných modeloch v databáze techniky – výška v U, šírka (celá / polovica),
-- hmotnosť, príkon pri bežnej prevádzke, hĺbka a kategória v knižnici racku (antény, nabíjačky, napájanie, sieť).
-- Podľa údajov výrobcov, neoverené. Údaje, ktoré model už má, ostávajú (doplnia sa len chýbajúce).

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Powersoft', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "X8", "attributes": {"audioType": "amplifier", "rackU": 1, "weightKg": 12.8, "powerW": 1100, "depthMm": 455, "rearSupport": true}}, {"model": "X4", "attributes": {"audioType": "amplifier", "rackU": 1, "weightKg": 11.2, "powerW": 800, "depthMm": 455, "rearSupport": true}}, {"model": "X4L", "attributes": {"audioType": "amplifier", "rackU": 1, "weightKg": 12, "powerW": 1000, "depthMm": 455, "rearSupport": true}}, {"model": "Quattrocanali 2404 DSP+D", "attributes": {"audioType": "amplifier", "rackU": 1, "weightKg": 6, "powerW": 300, "depthMm": 455}}, {"model": "Quattrocanali 4804 DSP+D", "attributes": {"audioType": "amplifier", "rackU": 1, "weightKg": 6.2, "powerW": 500, "depthMm": 455}}, {"model": "K10", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13, "powerW": 900, "depthMm": 435, "rearSupport": true}}, {"model": "K20", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13.6, "powerW": 1300, "depthMm": 435, "rearSupport": true}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Lab.gruppen', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "PLM 20000Q", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12.4, "powerW": 1100, "depthMm": 468, "rearSupport": true}}, {"model": "PLM 10000Q", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12.4, "powerW": 700, "depthMm": 468, "rearSupport": true}}, {"model": "PLM 20K44", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13.1, "powerW": 1200, "depthMm": 468, "rearSupport": true}}, {"model": "PLM 12K44", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12.5, "powerW": 900, "depthMm": 468, "rearSupport": true}}, {"model": "PLM 8K44", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12, "powerW": 700, "depthMm": 468, "rearSupport": true}}, {"model": "PLM 5K44", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 11.8, "powerW": 500, "depthMm": 468, "rearSupport": true}}, {"model": "D 200:4L", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 15, "powerW": 1400, "depthMm": 468, "rearSupport": true}}, {"model": "D 120:4L", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13, "powerW": 1000, "depthMm": 468, "rearSupport": true}}, {"model": "D 80:4L", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12.2, "powerW": 800, "depthMm": 468, "rearSupport": true}}, {"model": "D 40:4L", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 11, "powerW": 500, "depthMm": 468, "rearSupport": true}}, {"model": "D 20:4L", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10, "powerW": 400, "depthMm": 468, "rearSupport": true}}, {"model": "D 10:4L", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10, "powerW": 300, "depthMm": 468, "rearSupport": true}}, {"model": "FP 10000Q", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12.4, "powerW": 900, "depthMm": 468, "rearSupport": true}}, {"model": "FP 6000Q", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 11.8, "powerW": 600, "depthMm": 468, "rearSupport": true}}, {"model": "FP 14000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13, "powerW": 1000, "depthMm": 468, "rearSupport": true}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'd&b audiotechnik', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "D80", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 19, "powerW": 1000, "depthMm": 464, "rearSupport": true}}, {"model": "D20", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10.8, "powerW": 600, "depthMm": 464, "rearSupport": true}}, {"model": "D40", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13.8, "powerW": 800, "depthMm": 464, "rearSupport": true}}, {"model": "D12", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 19, "powerW": 600, "depthMm": 464, "rearSupport": true}}, {"model": "D6", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9.6, "powerW": 300, "depthMm": 464}}, {"model": "10D", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10.7, "powerW": 300, "depthMm": 464, "rearSupport": true}}, {"model": "30D", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10.7, "powerW": 500, "depthMm": 464, "rearSupport": true}}, {"model": "40D", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 11, "powerW": 800, "depthMm": 464, "rearSupport": true}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'L-Acoustics', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "LA12X", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 15, "powerW": 1100, "depthMm": 452, "rearSupport": true}}, {"model": "LA4X", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12, "powerW": 700, "depthMm": 452, "rearSupport": true}}, {"model": "LA8", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 15, "powerW": 900, "depthMm": 452, "rearSupport": true}}, {"model": "LA4", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 14, "powerW": 600, "depthMm": 452, "rearSupport": true}}, {"model": "LA7.16", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 16.5, "powerW": 1400, "depthMm": 452, "rearSupport": true}}, {"model": "LA7.16i", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 16.5, "powerW": 1400, "depthMm": 452, "rearSupport": true}}, {"model": "LA2Xi", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10, "powerW": 300, "depthMm": 452, "rearSupport": true}}, {"model": "LA1.16i", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13.5, "powerW": 600, "depthMm": 452, "rearSupport": true}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Crown', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "I-Tech 4x3500HD", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13.2, "powerW": 900, "depthMm": 406, "rearSupport": true}}, {"model": "I-Tech 12000HD", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13, "powerW": 1200, "depthMm": 406, "rearSupport": true}}, {"model": "I-Tech 9000HD", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12.7, "powerW": 900, "depthMm": 406, "rearSupport": true}}, {"model": "I-Tech 6000HD", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12.7, "powerW": 700, "depthMm": 406, "rearSupport": true}}, {"model": "I-Tech 5000HD", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12.7, "powerW": 600, "depthMm": 406, "rearSupport": true}}, {"model": "I-Tech 4000HD", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12.7, "powerW": 500, "depthMm": 406, "rearSupport": true}}, {"model": "XTi 1002", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 8, "powerW": 300, "depthMm": 406}}, {"model": "XTi 2002", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 8.5, "powerW": 400, "depthMm": 406}}, {"model": "XTi 4002", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9.5, "powerW": 600, "depthMm": 406}}, {"model": "XTi 6002", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10, "powerW": 800, "depthMm": 406, "rearSupport": true}}, {"model": "XLS 1002", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 4.9, "powerW": 250, "depthMm": 406}}, {"model": "XLS 1502", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 5, "powerW": 300, "depthMm": 406}}, {"model": "XLS 2002", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 5.4, "powerW": 400, "depthMm": 406}}, {"model": "XLS 2502", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 5.7, "powerW": 500, "depthMm": 406}}, {"model": "CDi 1000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9, "powerW": 300, "depthMm": 406}}, {"model": "CDi 2000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9.5, "powerW": 400, "depthMm": 406}}, {"model": "CDi 4000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10, "powerW": 600, "depthMm": 406, "rearSupport": true}}, {"model": "CDi 6000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10, "powerW": 800, "depthMm": 406, "rearSupport": true}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'QSC', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "PLD4.2", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10.5, "powerW": 500, "depthMm": 400, "rearSupport": true}}, {"model": "PLD4.3", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10.5, "powerW": 600, "depthMm": 400, "rearSupport": true}}, {"model": "PLD4.5", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 11, "powerW": 800, "depthMm": 400, "rearSupport": true}}, {"model": "CXD4.2", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10, "powerW": 500, "depthMm": 400, "rearSupport": true}}, {"model": "CXD4.3", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10, "powerW": 600, "depthMm": 400, "rearSupport": true}}, {"model": "CXD4.5", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10.5, "powerW": 800, "depthMm": 400, "rearSupport": true}}, {"model": "GXD4", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 8, "powerW": 400, "depthMm": 400}}, {"model": "GXD8", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9, "powerW": 600, "depthMm": 400}}, {"model": "PLX 1104", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9, "powerW": 300, "depthMm": 400}}, {"model": "PLX 1804", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9.5, "powerW": 400, "depthMm": 400}}, {"model": "PLX 2502", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9.5, "powerW": 450, "depthMm": 400}}, {"model": "PLX 3102", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9.8, "powerW": 500, "depthMm": 400}}, {"model": "PLX 3602", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10, "powerW": 600, "depthMm": 400, "rearSupport": true}}, {"model": "RMX 850", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 15.9, "powerW": 400, "depthMm": 400, "rearSupport": true}}, {"model": "RMX 1450", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 17.7, "powerW": 500, "depthMm": 400, "rearSupport": true}}, {"model": "RMX 1850HD", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 18.6, "powerW": 600, "depthMm": 400, "rearSupport": true}}, {"model": "RMX 2450", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 20.5, "powerW": 700, "depthMm": 400, "rearSupport": true}}, {"model": "DPA 2K4", "attributes": {"audioType": "amplifier", "rackU": 1, "weightKg": 7, "powerW": 300, "depthMm": 400}}, {"model": "DPA 4K4", "attributes": {"audioType": "amplifier", "rackU": 1, "weightKg": 8, "powerW": 500, "depthMm": 400}}, {"model": "DPA 8K4", "attributes": {"audioType": "amplifier", "rackU": 1, "weightKg": 9, "powerW": 800, "depthMm": 400}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Yamaha', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "PX10", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 7.4, "powerW": 450, "depthMm": 422}}, {"model": "PX8", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 7.2, "powerW": 400, "depthMm": 422}}, {"model": "PX5", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 6.9, "powerW": 300, "depthMm": 422}}, {"model": "PX3", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 6.9, "powerW": 200, "depthMm": 422}}, {"model": "XP7000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 21, "powerW": 900, "depthMm": 422, "rearSupport": true}}, {"model": "XP5000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 18.5, "powerW": 800, "depthMm": 422, "rearSupport": true}}, {"model": "XP3500", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 17, "powerW": 600, "depthMm": 422, "rearSupport": true}}, {"model": "XP2500", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 15.5, "powerW": 500, "depthMm": 422, "rearSupport": true}}, {"model": "XP1000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12, "powerW": 300, "depthMm": 422, "rearSupport": true}}, {"model": "P7000S", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 21.5, "powerW": 900, "depthMm": 422, "rearSupport": true}}, {"model": "P5000S", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 19, "powerW": 800, "depthMm": 422, "rearSupport": true}}, {"model": "P3500S", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 18, "powerW": 600, "depthMm": 422, "rearSupport": true}}, {"model": "P2500S", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 17, "powerW": 500, "depthMm": 422, "rearSupport": true}}, {"model": "P1000S", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12, "powerW": 300, "depthMm": 422, "rearSupport": true}}, {"model": "PC412-D", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13, "powerW": 900, "depthMm": 422, "rearSupport": true}}, {"model": "PC406-D", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12, "powerW": 600, "depthMm": 422, "rearSupport": true}}, {"model": "TX6n", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12, "powerW": 800, "depthMm": 422, "rearSupport": true}}, {"model": "TX5n", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12, "powerW": 600, "depthMm": 422, "rearSupport": true}}, {"model": "TX4n", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 11, "powerW": 500, "depthMm": 422, "rearSupport": true}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Electro-Voice', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "CP4000S", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13, "powerW": 600, "depthMm": 400, "rearSupport": true}}, {"model": "CP3000S", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12.5, "powerW": 500, "depthMm": 400, "rearSupport": true}}, {"model": "CP2200", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 14, "powerW": 400, "depthMm": 400, "rearSupport": true}}, {"model": "TG7", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 15, "powerW": 800, "depthMm": 400, "rearSupport": true}}, {"model": "TG5", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 14, "powerW": 600, "depthMm": 400, "rearSupport": true}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Linea Research', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "44M20", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 11, "powerW": 1000, "depthMm": 420, "rearSupport": true}}, {"model": "44M10", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10, "powerW": 600, "depthMm": 420, "rearSupport": true}}, {"model": "44M06", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9.5, "powerW": 400, "depthMm": 420}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'MC² Audio', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "T2000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 15, "powerW": 800, "depthMm": 450, "rearSupport": true}}, {"model": "T1500", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 14, "powerW": 600, "depthMm": 450, "rearSupport": true}}, {"model": "T1000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 13, "powerW": 400, "depthMm": 450, "rearSupport": true}}, {"model": "E4-75", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 10, "powerW": 300, "depthMm": 450, "rearSupport": true}}, {"model": "E4-150", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 12, "powerW": 500, "depthMm": 450, "rearSupport": true}}, {"model": "E4-250", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 14, "powerW": 700, "depthMm": 450, "rearSupport": true}}, {"model": "E8-200", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 14, "powerW": 800, "depthMm": 450, "rearSupport": true}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Behringer', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "EP4000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9.5, "powerW": 500, "depthMm": 380}}, {"model": "EP2000", "attributes": {"audioType": "amplifier", "rackU": 2, "weightKg": 9, "powerW": 400, "depthMm": 380}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Shure', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "ULXD4", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 1.4, "powerW": 15, "depthMm": 200}}, {"model": "SLXD4", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 0.9, "powerW": 10, "depthMm": 200}}, {"model": "QLXD4", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 1.1, "powerW": 12, "depthMm": 200}}, {"model": "BLX4R", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 0.9, "powerW": 8, "depthMm": 200}}, {"model": "ULXD4D", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 3, "powerW": 30, "depthMm": 300}}, {"model": "ULXD4Q", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 3.4, "powerW": 45, "depthMm": 300}}, {"model": "AD4D", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 3.9, "powerW": 30, "depthMm": 300}}, {"model": "AD4DE", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 3.9, "powerW": 30, "depthMm": 300}}, {"model": "AD4Q", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 4.5, "powerW": 50, "depthMm": 300}}, {"model": "AD4QE", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 4.5, "powerW": 50, "depthMm": 300}}, {"model": "SLXD4D", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 1.8, "powerW": 20, "depthMm": 300}}, {"model": "BLX88", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 1.8, "powerW": 12, "depthMm": 300}}, {"model": "GLXD4R+", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 1.8, "powerW": 15, "depthMm": 300}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Sennheiser', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "EM 100 G3", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 1, "powerW": 10, "depthMm": 190}}, {"model": "EM 100 G4", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 1, "powerW": 10, "depthMm": 190}}, {"model": "EM 300 G3", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 1, "powerW": 10, "depthMm": 190}}, {"model": "EM 300-500 G4", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 1, "powerW": 10, "depthMm": 190}}, {"model": "EM 500 G3", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 1, "powerW": 10, "depthMm": 190}}, {"model": "EW-D EM", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 1.1, "powerW": 10, "depthMm": 190}}, {"model": "EW-DX EM 2", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 3, "powerW": 20, "depthMm": 300}}, {"model": "EW-DX EM 2 Dante", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 3, "powerW": 20, "depthMm": 300}}, {"model": "EW-DX EM 4", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 3.6, "powerW": 30, "depthMm": 300}}, {"model": "EW-DX EM 4 Dante", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 3.6, "powerW": 30, "depthMm": 300}}, {"model": "EM 6000", "attributes": {"audioType": "wireless", "rackU": 1, "weightKg": 4.4, "powerW": 50, "depthMm": 300}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Audio-Technica', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "ATW-R3210", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 1.1, "powerW": 10, "depthMm": 200}}, {"model": "ATW-R5220", "attributes": {"audioType": "wireless", "rackU": 1, "rackWidth": "half", "weightKg": 1.3, "powerW": 12, "depthMm": 200}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Shure', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "P9T", "attributes": {"audioType": "iem", "rackU": 1, "rackWidth": "half", "weightKg": 1.9, "powerW": 15, "depthMm": 240}}, {"model": "P3T", "attributes": {"audioType": "iem", "rackU": 1, "rackWidth": "half", "weightKg": 1, "powerW": 8, "depthMm": 240}}, {"model": "P10T", "attributes": {"audioType": "iem", "rackU": 1, "weightKg": 4, "powerW": 25, "depthMm": 300}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Sennheiser', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "SR IEM G4", "attributes": {"audioType": "iem", "rackU": 1, "rackWidth": "half", "weightKg": 1.4, "powerW": 10, "depthMm": 190}}, {"model": "SR 2050 IEM", "attributes": {"audioType": "iem", "rackU": 1, "weightKg": 3, "powerW": 25, "depthMm": 300}}, {"model": "SR 2000 IEM", "attributes": {"audioType": "iem", "rackU": 1, "weightKg": 2.9, "powerW": 25, "depthMm": 300}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Midas', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "DL16", "attributes": {"audioType": "stagebox", "rackU": 3, "weightKg": 6.5, "powerW": 40, "depthMm": 280}}, {"model": "DL32", "attributes": {"audioType": "stagebox", "rackU": 3, "weightKg": 7.5, "powerW": 55, "depthMm": 280}}, {"model": "DL251", "attributes": {"audioType": "stagebox", "rackU": 3, "weightKg": 8, "powerW": 60, "depthMm": 280}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Behringer', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "S16", "attributes": {"audioType": "stagebox", "rackU": 3, "weightKg": 6.5, "powerW": 40, "depthMm": 280}}, {"model": "S32", "attributes": {"audioType": "stagebox", "rackU": 3, "weightKg": 7.5, "powerW": 55, "depthMm": 280}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Yamaha', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "Ri8-D", "attributes": {"audioType": "stagebox", "rackU": 1, "weightKg": 3.5, "powerW": 30, "depthMm": 300}}, {"model": "Ro8-D", "attributes": {"audioType": "stagebox", "rackU": 1, "weightKg": 3.5, "powerW": 30, "depthMm": 300}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'dbx', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "DriveRack PA2", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 2.3, "powerW": 22, "depthMm": 200}}, {"model": "DriveRack 260", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 2.3, "powerW": 22, "depthMm": 200}}, {"model": "DriveRack VENU360", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 2.7, "powerW": 22, "depthMm": 200}}, {"model": "166xs", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 2.2, "powerW": 15, "depthMm": 200}}, {"model": "266xs", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 2.2, "powerW": 15, "depthMm": 200}}, {"model": "223xs", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 2.2, "powerW": 15, "depthMm": 200}}, {"model": "234xs", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 2.3, "powerW": 15, "depthMm": 200}}, {"model": "1066", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 3, "powerW": 20, "depthMm": 200}}, {"model": "1046", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 3, "powerW": 20, "depthMm": 200}}, {"model": "iEQ-15", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 2.6, "powerW": 15, "depthMm": 200}}, {"model": "AFS2", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 2, "powerW": 10, "depthMm": 200}}, {"model": "231s", "attributes": {"audioType": "processor", "rackU": 2, "weightKg": 3.6, "powerW": 25, "depthMm": 200}}, {"model": "iEQ-31", "attributes": {"audioType": "processor", "rackU": 2, "weightKg": 3.2, "powerW": 20, "depthMm": 200}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Klark Teknik', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "DN360", "attributes": {"audioType": "processor", "rackU": 2, "weightKg": 4.5, "powerW": 30, "depthMm": 250}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'XTA', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "DP448", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 4.5, "powerW": 30, "depthMm": 300}}, {"model": "DP548", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 4.5, "powerW": 30, "depthMm": 300}}, {"model": "DP444", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 4.5, "powerW": 30, "depthMm": 300}}, {"model": "DP446", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 4.5, "powerW": 30, "depthMm": 300}}, {"model": "DP426", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 4.5, "powerW": 30, "depthMm": 300}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Lake', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "LM 26", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 4.4, "powerW": 50, "depthMm": 300}}, {"model": "LM 44", "attributes": {"audioType": "processor", "rackU": 1, "weightKg": 4.4, "powerW": 50, "depthMm": 300}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'RCF', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "DX 1616", "attributes": {"audioType": "processor", "rackU": 1}}, {"model": "DX 4008", "attributes": {"audioType": "processor", "rackU": 1}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Behringer', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "X32 Rack", "attributes": {"audioType": "mixer", "rackU": 3, "weightKg": 7.6, "powerW": 90, "depthMm": 370}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Midas', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "M32C", "attributes": {"audioType": "mixer", "rackU": 3, "weightKg": 7.4, "powerW": 90, "depthMm": 370}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Shure', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "UA845UWB", "attributes": {"audioType": "other", "rackRole": "antenna", "rackU": 1, "weightKg": 3.4, "powerW": 20, "depthMm": 300}}, {"model": "PA821B", "attributes": {"audioType": "other", "rackRole": "antenna", "rackU": 1, "weightKg": 3, "powerW": 20, "depthMm": 300}}, {"model": "UA844+SWB", "attributes": {"audioType": "other", "rackRole": "antenna", "rackU": 1, "rackWidth": "half", "weightKg": 1.4, "powerW": 10, "depthMm": 200}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Sennheiser', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "ASA 214", "attributes": {"audioType": "other", "rackRole": "antenna", "rackU": 1, "weightKg": 2.8, "powerW": 15, "depthMm": 300}}, {"model": "AC 3", "attributes": {"audioType": "other", "rackRole": "antenna", "rackU": 1, "weightKg": 2.5, "powerW": 15, "depthMm": 300}}, {"model": "ASA 1", "attributes": {"audioType": "other", "rackRole": "antenna", "rackU": 1, "rackWidth": "half", "weightKg": 1.2, "powerW": 8, "depthMm": 190}}, {"model": "L 6000", "attributes": {"audioType": "other", "rackRole": "charger", "rackU": 1, "weightKg": 2.4, "powerW": 70, "depthMm": 250}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'appliance', 'Furman', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "M-8x2", "attributes": {"rackRole": "power", "rackU": 1, "weightKg": 2.7, "depthMm": 190}}, {"model": "PL-8 CE", "attributes": {"rackRole": "power", "rackU": 1, "weightKg": 4.5, "depthMm": 190}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'appliance', 'Unknown', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "Rozvádzač 19\" 1U – 8× zásuvka", "attributes": {"rackRole": "power", "rackU": 1, "weightKg": 1.5, "depthMm": 120}}, {"model": "Rozvádzač 19\" 1U – CEE 16 A, 6× powerCON", "attributes": {"rackRole": "power", "rackU": 1, "weightKg": 3, "depthMm": 120}}, {"model": "Rozvádzač 19\" 2U – CEE 32 A, 6× 16 A s ističmi", "attributes": {"rackRole": "power", "rackU": 2, "weightKg": 6, "depthMm": 250}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Luminex', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "GigaCore 16Xt", "attributes": {"itType": "network", "rackRole": "network", "rackU": 1, "weightKg": 3.7, "powerW": 60, "depthMm": 300}}, {"model": "GigaCore 26i", "attributes": {"itType": "network", "rackRole": "network", "rackU": 1, "weightKg": 4.2, "powerW": 90, "depthMm": 300}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Netgear', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "M4250-26G4F-PoE+", "attributes": {"itType": "network", "rackRole": "network", "rackU": 1, "weightKg": 4.9, "powerW": 60, "depthMm": 300}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Cisco', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "SG350-28", "attributes": {"itType": "network", "rackRole": "network", "rackU": 1, "weightKg": 3.4, "powerW": 30, "depthMm": 250}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Ubiquiti', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "USW-24-PoE", "attributes": {"itType": "network", "rackRole": "network", "rackU": 1, "weightKg": 3.6, "powerW": 40, "depthMm": 285}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'Luminex', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "LumiNode 12", "attributes": {"rackRole": "light", "rackU": 1, "weightKg": 3, "powerW": 40, "depthMm": 250}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'Swisson', row->>'model', row->'attributes'
from jsonb_array_elements($r$[{"model": "XSP-5R-5", "attributes": {"rackRole": "light", "rackU": 1, "weightKg": 2.5, "powerW": 20, "depthMm": 200}}]$r$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();
