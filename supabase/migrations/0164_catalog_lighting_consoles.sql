-- 0164: pulty na svetlá (MA Lighting, Avolites, ChamSys, ETC, High End Systems, Obsidian, Martin, Zero 88, LightShark,
-- LSC, Strand, Jands, ADJ, ENTTEC) a svetelný softvér. Typ „Pult na svetlá“ / „Licencia“. Neoverené.

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'MA Lighting', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"grandMA3 full-size","attributes":{"lightType":"acc_console"}},{"model":"grandMA3 light","attributes":{"lightType":"acc_console"}},{"model":"grandMA3 compact XT","attributes":{"lightType":"acc_console"}},{"model":"grandMA3 compact","attributes":{"lightType":"acc_console"}},{"model":"grandMA3 onPC command wing XT","attributes":{"lightType":"acc_console"}},{"model":"grandMA3 onPC command wing","attributes":{"lightType":"acc_console"}},{"model":"grandMA3 onPC fader wing","attributes":{"lightType":"acc_console"}},{"model":"grandMA3 processing unit","attributes":{"lightType":"acc_console"}},{"model":"grandMA2 full-size","attributes":{"lightType":"acc_console"}},{"model":"grandMA2 light","attributes":{"lightType":"acc_console"}},{"model":"grandMA2 ultra-light","attributes":{"lightType":"acc_console"}},{"model":"grandMA2 onPC command wing","attributes":{"lightType":"acc_console"}},{"model":"grandMA2 onPC fader wing","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'Avolites', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"Diamond 9-330","attributes":{"lightType":"acc_console"}},{"model":"Diamond 9-215","attributes":{"lightType":"acc_console"}},{"model":"Diamond 7-330","attributes":{"lightType":"acc_console"}},{"model":"Diamond 7-215","attributes":{"lightType":"acc_console"}},{"model":"D3-110","attributes":{"lightType":"acc_console"}},{"model":"D3-010","attributes":{"lightType":"acc_console"}},{"model":"Sapphire Touch","attributes":{"lightType":"acc_console"}},{"model":"Arena","attributes":{"lightType":"acc_console"}},{"model":"Tiger Touch II","attributes":{"lightType":"acc_console"}},{"model":"Tiger Touch III","attributes":{"lightType":"acc_console"}},{"model":"Tiger Touch","attributes":{"lightType":"acc_console"}},{"model":"Pearl Expert","attributes":{"lightType":"acc_console"}},{"model":"Quartz","attributes":{"lightType":"acc_console"}},{"model":"Titan Mobile","attributes":{"lightType":"acc_console"}},{"model":"T3","attributes":{"lightType":"acc_console"}},{"model":"T2","attributes":{"lightType":"acc_console"}},{"model":"Titan One","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'ChamSys', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"MagicQ MQ500M+","attributes":{"lightType":"acc_console"}},{"model":"MagicQ MQ500M Stadium","attributes":{"lightType":"acc_console"}},{"model":"MagicQ MQ250M","attributes":{"lightType":"acc_console"}},{"model":"MagicQ MQ100","attributes":{"lightType":"acc_console"}},{"model":"MagicQ MQ80","attributes":{"lightType":"acc_console"}},{"model":"MagicQ MQ70","attributes":{"lightType":"acc_console"}},{"model":"MagicQ MQ50","attributes":{"lightType":"acc_console"}},{"model":"MagicQ Compact Connect","attributes":{"lightType":"acc_console"}},{"model":"MagicQ Compact Mini Connect","attributes":{"lightType":"acc_console"}},{"model":"MagicQ Stadium Connect","attributes":{"lightType":"acc_console"}},{"model":"MagicQ Pro","attributes":{"lightType":"acc_console"}},{"model":"MagicQ PC Wing","attributes":{"lightType":"acc_console"}},{"model":"MagicQ Extra Wing","attributes":{"lightType":"acc_console"}},{"model":"QuickQ 10","attributes":{"lightType":"acc_console"}},{"model":"QuickQ 20","attributes":{"lightType":"acc_console"}},{"model":"QuickQ 30","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'ETC', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"Eos Apex 20","attributes":{"lightType":"acc_console"}},{"model":"Eos Apex 10","attributes":{"lightType":"acc_console"}},{"model":"Eos Apex 5","attributes":{"lightType":"acc_console"}},{"model":"Eos Apex FP","attributes":{"lightType":"acc_console"}},{"model":"Gio","attributes":{"lightType":"acc_console"}},{"model":"Gio @5","attributes":{"lightType":"acc_console"}},{"model":"Ion Xe","attributes":{"lightType":"acc_console"}},{"model":"Ion Xe 20","attributes":{"lightType":"acc_console"}},{"model":"Ion","attributes":{"lightType":"acc_console"}},{"model":"Element 2","attributes":{"lightType":"acc_console"}},{"model":"ColorSource 20","attributes":{"lightType":"acc_console"}},{"model":"ColorSource 40","attributes":{"lightType":"acc_console"}},{"model":"Eos Ti","attributes":{"lightType":"acc_console"}},{"model":"Eos Programming Wing","attributes":{"lightType":"acc_console"}},{"model":"Nomad","attributes":{"lightType":"acc_console"}},{"model":"Nomad Puck","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'High End Systems', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"Hog 5","attributes":{"lightType":"acc_console"}},{"model":"Tour Hog","attributes":{"lightType":"acc_console"}},{"model":"Stage Hog","attributes":{"lightType":"acc_console"}},{"model":"Flex Hog","attributes":{"lightType":"acc_console"}},{"model":"Gig Hog","attributes":{"lightType":"acc_console"}},{"model":"Hog 4","attributes":{"lightType":"acc_console"}},{"model":"Full Boar 4","attributes":{"lightType":"acc_console"}},{"model":"Road Hog 4","attributes":{"lightType":"acc_console"}},{"model":"HedgeHog 4","attributes":{"lightType":"acc_console"}},{"model":"Nano Hog 4","attributes":{"lightType":"acc_console"}},{"model":"Hoglet 4","attributes":{"lightType":"acc_console"}},{"model":"Hog Playback Wing","attributes":{"lightType":"acc_console"}},{"model":"Hog Expansion Wing","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'Obsidian Control Systems', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"NX4","attributes":{"lightType":"acc_console"}},{"model":"NX3","attributes":{"lightType":"acc_console"}},{"model":"NX2","attributes":{"lightType":"acc_console"}},{"model":"NX1","attributes":{"lightType":"acc_console"}},{"model":"NXK","attributes":{"lightType":"acc_console"}},{"model":"NXP","attributes":{"lightType":"acc_console"}},{"model":"NX Touch","attributes":{"lightType":"acc_console"}},{"model":"ONYX PC","attributes":{"lightType":"acc_console"}},{"model":"ONYX NX Wing","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'Martin', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"M6","attributes":{"lightType":"acc_console"}},{"model":"M2PC","attributes":{"lightType":"acc_console"}},{"model":"M1","attributes":{"lightType":"acc_console"}},{"model":"M1PC","attributes":{"lightType":"acc_console"}},{"model":"M-PC","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'Zero 88', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"FLX S24","attributes":{"lightType":"acc_console"}},{"model":"FLX S48","attributes":{"lightType":"acc_console"}},{"model":"FLX","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'LightShark', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"LS-1","attributes":{"lightType":"acc_console"}},{"model":"LS-Core","attributes":{"lightType":"acc_console"}},{"model":"LS-Core iO","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'LSC', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"Mantra Lite","attributes":{"lightType":"acc_console"}},{"model":"Mantra","attributes":{"lightType":"acc_console"}},{"model":"Clarity LX","attributes":{"lightType":"acc_console"}},{"model":"Minim","attributes":{"lightType":"acc_console"}},{"model":"GenVI","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'Strand', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"Neo","attributes":{"lightType":"acc_console"}},{"model":"500","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'Jands', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"Vista S1","attributes":{"lightType":"acc_console"}},{"model":"Vista S3","attributes":{"lightType":"acc_console"}},{"model":"Vista EX","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'ADJ', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"LINK","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'ENTTEC', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"EMU","attributes":{"lightType":"acc_console"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'MADRIX', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"MADRIX 5","attributes":{"lightType":"acc_license"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'Nicolaudie', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"Sunlite Suite","attributes":{"lightType":"acc_license"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'Daslight', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"DVC Gold","attributes":{"lightType":"acc_license"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'Luminair', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"Luminair","attributes":{"lightType":"acc_license"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'light', 'DMXControl', row->>'model', row->'attributes'
from jsonb_array_elements($c164$[{"model":"DMXControl","attributes":{"lightType":"acc_license"}}]$c164$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();
