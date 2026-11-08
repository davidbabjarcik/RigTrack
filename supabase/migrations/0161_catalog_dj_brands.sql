-- 0161: DJ technika – Pioneer DJ, AlphaTheta, Denon DJ a Technics (prehrávače, all-in-one, mixy, kontroléry,
-- gramofóny, efekty, samplery, slúchadlá, štúdiové monitory) a PA boxy Pioneer XPRS. Len typ. Neoverené.

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Pioneer DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"CDJ-3000","attributes":{"djType":"player"}},{"model":"CDJ-2000NXS2","attributes":{"djType":"player"}},{"model":"CDJ-2000NXS","attributes":{"djType":"player"}},{"model":"CDJ-2000","attributes":{"djType":"player"}},{"model":"CDJ-1000MK3","attributes":{"djType":"player"}},{"model":"CDJ-1000MK2","attributes":{"djType":"player"}},{"model":"CDJ-1000","attributes":{"djType":"player"}},{"model":"CDJ-900NXS","attributes":{"djType":"player"}},{"model":"CDJ-900","attributes":{"djType":"player"}},{"model":"CDJ-850","attributes":{"djType":"player"}},{"model":"CDJ-800MK2","attributes":{"djType":"player"}},{"model":"CDJ-800","attributes":{"djType":"player"}},{"model":"CDJ-700","attributes":{"djType":"player"}},{"model":"CDJ-400","attributes":{"djType":"player"}},{"model":"CDJ-350","attributes":{"djType":"player"}},{"model":"CDJ-300","attributes":{"djType":"player"}},{"model":"CDJ-200","attributes":{"djType":"player"}},{"model":"CDJ-1000SRT","attributes":{"djType":"player"}},{"model":"CDJ-100S","attributes":{"djType":"player"}},{"model":"CDJ-100","attributes":{"djType":"player"}},{"model":"CDJ-500S","attributes":{"djType":"player"}},{"model":"CDJ-500II","attributes":{"djType":"player"}},{"model":"CDJ-500","attributes":{"djType":"player"}},{"model":"XDJ-1000MK2","attributes":{"djType":"player"}},{"model":"XDJ-1000","attributes":{"djType":"player"}},{"model":"XDJ-700","attributes":{"djType":"player"}},{"model":"XDJ-700-K","attributes":{"djType":"player"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Pioneer DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"XDJ-XZ","attributes":{"djType":"all_in_one"}},{"model":"XDJ-RX3","attributes":{"djType":"all_in_one"}},{"model":"XDJ-RX2","attributes":{"djType":"all_in_one"}},{"model":"XDJ-RX","attributes":{"djType":"all_in_one"}},{"model":"XDJ-RR","attributes":{"djType":"all_in_one"}},{"model":"XDJ-R1","attributes":{"djType":"all_in_one"}},{"model":"XDJ-AERO","attributes":{"djType":"all_in_one"}},{"model":"XDJ-AERO-W","attributes":{"djType":"all_in_one"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Pioneer DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"DJM-A9","attributes":{"djType":"mixer"}},{"model":"DJM-V10","attributes":{"djType":"mixer"}},{"model":"DJM-V10-LF","attributes":{"djType":"mixer"}},{"model":"DJM-900NXS2","attributes":{"djType":"mixer"}},{"model":"DJM-900NXS","attributes":{"djType":"mixer"}},{"model":"DJM-900","attributes":{"djType":"mixer"}},{"model":"DJM-850","attributes":{"djType":"mixer"}},{"model":"DJM-800","attributes":{"djType":"mixer"}},{"model":"DJM-750MK2","attributes":{"djType":"mixer"}},{"model":"DJM-750","attributes":{"djType":"mixer"}},{"model":"DJM-700","attributes":{"djType":"mixer"}},{"model":"DJM-600","attributes":{"djType":"mixer"}},{"model":"DJM-500","attributes":{"djType":"mixer"}},{"model":"DJM-450","attributes":{"djType":"mixer"}},{"model":"DJM-400","attributes":{"djType":"mixer"}},{"model":"DJM-350","attributes":{"djType":"mixer"}},{"model":"DJM-3000","attributes":{"djType":"mixer"}},{"model":"DJM-300","attributes":{"djType":"mixer"}},{"model":"DJM-250MK2","attributes":{"djType":"mixer"}},{"model":"DJM-250","attributes":{"djType":"mixer"}},{"model":"DJM-2000NXS","attributes":{"djType":"mixer"}},{"model":"DJM-2000","attributes":{"djType":"mixer"}},{"model":"DJM-S11","attributes":{"djType":"mixer"}},{"model":"DJM-S9","attributes":{"djType":"mixer"}},{"model":"DJM-S7","attributes":{"djType":"mixer"}},{"model":"DJM-S5","attributes":{"djType":"mixer"}},{"model":"DJM-S3","attributes":{"djType":"mixer"}},{"model":"DJM-REV7","attributes":{"djType":"mixer"}},{"model":"DJM-T1","attributes":{"djType":"mixer"}},{"model":"DJM-909","attributes":{"djType":"mixer"}},{"model":"DJM-707","attributes":{"djType":"mixer"}},{"model":"DJM-707S","attributes":{"djType":"mixer"}},{"model":"DJM-909S","attributes":{"djType":"mixer"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Pioneer DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"DDJ-FLX4","attributes":{"djType":"pc_controller"}},{"model":"DDJ-FLX6","attributes":{"djType":"pc_controller"}},{"model":"DDJ-FLX6-GT","attributes":{"djType":"pc_controller"}},{"model":"DDJ-FLX10","attributes":{"djType":"pc_controller"}},{"model":"DDJ-RX","attributes":{"djType":"pc_controller"}},{"model":"DDJ-RZ","attributes":{"djType":"pc_controller"}},{"model":"DDJ-SX","attributes":{"djType":"pc_controller"}},{"model":"DDJ-SX2","attributes":{"djType":"pc_controller"}},{"model":"DDJ-SX3","attributes":{"djType":"pc_controller"}},{"model":"DDJ-SR","attributes":{"djType":"pc_controller"}},{"model":"DDJ-SR2","attributes":{"djType":"pc_controller"}},{"model":"DDJ-SB","attributes":{"djType":"pc_controller"}},{"model":"DDJ-SB2","attributes":{"djType":"pc_controller"}},{"model":"DDJ-SB3","attributes":{"djType":"pc_controller"}},{"model":"DDJ-RB","attributes":{"djType":"pc_controller"}},{"model":"DDJ-1000","attributes":{"djType":"pc_controller"}},{"model":"DDJ-1000SRT","attributes":{"djType":"pc_controller"}},{"model":"DDJ-800","attributes":{"djType":"pc_controller"}},{"model":"DDJ-400","attributes":{"djType":"pc_controller"}},{"model":"DDJ-200","attributes":{"djType":"pc_controller"}},{"model":"DDJ-REV1","attributes":{"djType":"pc_controller"}},{"model":"DDJ-REV5","attributes":{"djType":"pc_controller"}},{"model":"DDJ-REV7","attributes":{"djType":"pc_controller"}},{"model":"DDJ-ERGO","attributes":{"djType":"pc_controller"}},{"model":"DDJ-ERGO-V","attributes":{"djType":"pc_controller"}},{"model":"DDJ-T1","attributes":{"djType":"pc_controller"}},{"model":"DDJ-S1","attributes":{"djType":"pc_controller"}},{"model":"DDJ-WeGO","attributes":{"djType":"pc_controller"}},{"model":"DDJ-WeGO2","attributes":{"djType":"pc_controller"}},{"model":"DDJ-WeGO3","attributes":{"djType":"pc_controller"}},{"model":"DDJ-WeGO4","attributes":{"djType":"pc_controller"}},{"model":"DDJ-XP1","attributes":{"djType":"pc_controller"}},{"model":"DDJ-XP2","attributes":{"djType":"pc_controller"}},{"model":"DDJ-SP1","attributes":{"djType":"pc_controller"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Pioneer DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"PLX-1000","attributes":{"djType":"turntable"}},{"model":"PLX-500","attributes":{"djType":"turntable"}},{"model":"PLX-500-W","attributes":{"djType":"turntable"}},{"model":"PLX-CRSS12","attributes":{"djType":"turntable"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Pioneer DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"RMX-1000","attributes":{"djType":"other"}},{"model":"RMX-500","attributes":{"djType":"other"}},{"model":"RMX-1","attributes":{"djType":"other"}},{"model":"DJS-1000","attributes":{"djType":"other"}},{"model":"DJS-1000-W","attributes":{"djType":"other"}},{"model":"TORAIZ SP-16","attributes":{"djType":"other"}},{"model":"TORAIZ AS-1","attributes":{"djType":"other"}},{"model":"TORAIZ SQUID","attributes":{"djType":"other"}},{"model":"HDJ-X10","attributes":{"djType":"other"}},{"model":"HDJ-X7","attributes":{"djType":"other"}},{"model":"HDJ-X5","attributes":{"djType":"other"}},{"model":"HDJ-X5BT","attributes":{"djType":"other"}},{"model":"HDJ-CUE1","attributes":{"djType":"other"}},{"model":"HDJ-CUE1BT","attributes":{"djType":"other"}},{"model":"HDJ-CX","attributes":{"djType":"other"}},{"model":"HDJ-2000","attributes":{"djType":"other"}},{"model":"HDJ-2000MK2","attributes":{"djType":"other"}},{"model":"HDJ-1500","attributes":{"djType":"other"}},{"model":"HDJ-1000","attributes":{"djType":"other"}},{"model":"HDJ-500","attributes":{"djType":"other"}},{"model":"HDJ-700","attributes":{"djType":"other"}},{"model":"DM-40","attributes":{"djType":"other"}},{"model":"DM-40D","attributes":{"djType":"other"}},{"model":"DM-40D-BT","attributes":{"djType":"other"}},{"model":"DM-50D","attributes":{"djType":"other"}},{"model":"DM-50D-BT","attributes":{"djType":"other"}},{"model":"DM-50D-W","attributes":{"djType":"other"}},{"model":"DM-50D-BT-W","attributes":{"djType":"other"}},{"model":"DM-40BT","attributes":{"djType":"other"}},{"model":"VM-50","attributes":{"djType":"other"}},{"model":"VM-70","attributes":{"djType":"other"}},{"model":"VM-80","attributes":{"djType":"other"}},{"model":"RM-05","attributes":{"djType":"other"}},{"model":"RM-07","attributes":{"djType":"other"}},{"model":"S-DJ50X","attributes":{"djType":"other"}},{"model":"S-DJ60X","attributes":{"djType":"other"}},{"model":"S-DJ80X","attributes":{"djType":"other"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'AlphaTheta', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"CDJ-3000X","attributes":{"djType":"player"}},{"model":"CDJ-1500X","attributes":{"djType":"player"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'AlphaTheta', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"XDJ-AZ","attributes":{"djType":"all_in_one"}},{"model":"XDJ-AN","attributes":{"djType":"all_in_one"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'AlphaTheta', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"DJM-V5","attributes":{"djType":"mixer"}},{"model":"Euphonia","attributes":{"djType":"mixer"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'AlphaTheta', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"DDJ-FLX2","attributes":{"djType":"pc_controller"}},{"model":"DDJ-GRV6","attributes":{"djType":"pc_controller"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'AlphaTheta', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"RMX-IGNITE","attributes":{"djType":"other"}},{"model":"SLAB","attributes":{"djType":"other"}},{"model":"TORAIZ Chordcat","attributes":{"djType":"other"}},{"model":"HDJ-F10","attributes":{"djType":"other"}},{"model":"HDJ-F9","attributes":{"djType":"other"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Denon DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"SC6000 Prime","attributes":{"djType":"player"}},{"model":"SC6000M Prime","attributes":{"djType":"player"}},{"model":"SC5000 Prime","attributes":{"djType":"player"}},{"model":"SC5000M Prime","attributes":{"djType":"player"}},{"model":"SC2900","attributes":{"djType":"player"}},{"model":"SC3900","attributes":{"djType":"player"}},{"model":"LC6000 Prime","attributes":{"djType":"player"}},{"model":"DN-S3700","attributes":{"djType":"player"}},{"model":"DN-S1200","attributes":{"djType":"player"}},{"model":"DN-S1000","attributes":{"djType":"player"}},{"model":"DN-S5000","attributes":{"djType":"player"}},{"model":"DN-S3500","attributes":{"djType":"player"}},{"model":"DN-S3000","attributes":{"djType":"player"}},{"model":"DN-S2000","attributes":{"djType":"player"}},{"model":"DN-S700","attributes":{"djType":"player"}},{"model":"DN-HC4500","attributes":{"djType":"player"}},{"model":"DN-HC5000","attributes":{"djType":"player"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Denon DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"Prime 4+","attributes":{"djType":"all_in_one"}},{"model":"Prime 4","attributes":{"djType":"all_in_one"}},{"model":"Prime Go+","attributes":{"djType":"all_in_one"}},{"model":"Prime Go","attributes":{"djType":"all_in_one"}},{"model":"Prime 2","attributes":{"djType":"all_in_one"}},{"model":"SC Live 4","attributes":{"djType":"all_in_one"}},{"model":"SC Live 2","attributes":{"djType":"all_in_one"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Denon DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"MCX8000","attributes":{"djType":"pc_controller"}},{"model":"MC7000","attributes":{"djType":"pc_controller"}},{"model":"MC6000MK2","attributes":{"djType":"pc_controller"}},{"model":"MC6000","attributes":{"djType":"pc_controller"}},{"model":"MC4000","attributes":{"djType":"pc_controller"}},{"model":"MC3000","attributes":{"djType":"pc_controller"}},{"model":"MC2000","attributes":{"djType":"pc_controller"}},{"model":"MCX6000","attributes":{"djType":"pc_controller"}},{"model":"MCX4000","attributes":{"djType":"pc_controller"}},{"model":"MCX3000","attributes":{"djType":"pc_controller"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Denon DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"X1850 Prime","attributes":{"djType":"mixer"}},{"model":"X1800 Prime","attributes":{"djType":"mixer"}},{"model":"DN-X1700","attributes":{"djType":"mixer"}},{"model":"DN-X1600","attributes":{"djType":"mixer"}},{"model":"DN-X1500","attributes":{"djType":"mixer"}},{"model":"DN-X900","attributes":{"djType":"mixer"}},{"model":"DN-X500","attributes":{"djType":"mixer"}},{"model":"DN-X400","attributes":{"djType":"mixer"}},{"model":"DN-X300","attributes":{"djType":"mixer"}},{"model":"DN-X100","attributes":{"djType":"mixer"}},{"model":"DN-X1100","attributes":{"djType":"mixer"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Denon DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"DS1","attributes":{"djType":"other"}},{"model":"HP600","attributes":{"djType":"other"}},{"model":"HP500","attributes":{"djType":"other"}},{"model":"DN-HP1000","attributes":{"djType":"other"}},{"model":"DN-HP700","attributes":{"djType":"other"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Technics', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"SL-1200","attributes":{"djType":"turntable"}},{"model":"SL-1200MK2","attributes":{"djType":"turntable"}},{"model":"SL-1210MK2","attributes":{"djType":"turntable"}},{"model":"SL-1200MK3","attributes":{"djType":"turntable"}},{"model":"SL-1210MK3","attributes":{"djType":"turntable"}},{"model":"SL-1200MK3D","attributes":{"djType":"turntable"}},{"model":"SL-1210MK3D","attributes":{"djType":"turntable"}},{"model":"SL-1200MK4","attributes":{"djType":"turntable"}},{"model":"SL-1200MK5","attributes":{"djType":"turntable"}},{"model":"SL-1210MK5","attributes":{"djType":"turntable"}},{"model":"SL-1200MK5G","attributes":{"djType":"turntable"}},{"model":"SL-1210MK5G","attributes":{"djType":"turntable"}},{"model":"SL-1200GLD","attributes":{"djType":"turntable"}},{"model":"SL-1200LTD","attributes":{"djType":"turntable"}},{"model":"SL-1200MK6","attributes":{"djType":"turntable"}},{"model":"SL-1200MK6K1","attributes":{"djType":"turntable"}},{"model":"SL-1200MK7","attributes":{"djType":"turntable"}},{"model":"SL-1210MK7","attributes":{"djType":"turntable"}},{"model":"SL-1200MK7L","attributes":{"djType":"turntable"}},{"model":"SL-1200GR","attributes":{"djType":"turntable"}},{"model":"SL-1200GR2","attributes":{"djType":"turntable"}},{"model":"SL-1210GR","attributes":{"djType":"turntable"}},{"model":"SL-1200G","attributes":{"djType":"turntable"}},{"model":"SL-1210G","attributes":{"djType":"turntable"}},{"model":"SL-1200GAE","attributes":{"djType":"turntable"}},{"model":"SL-1200M7L","attributes":{"djType":"turntable"}},{"model":"SL-1200MKX","attributes":{"djType":"turntable"}},{"model":"SL-1210MKX","attributes":{"djType":"turntable"}},{"model":"SP-10","attributes":{"djType":"turntable"}},{"model":"SP-10MK2","attributes":{"djType":"turntable"}},{"model":"SP-10MK3","attributes":{"djType":"turntable"}},{"model":"SP-10R","attributes":{"djType":"turntable"}},{"model":"SL-1100","attributes":{"djType":"turntable"}},{"model":"SL-1100A","attributes":{"djType":"turntable"}},{"model":"SL-120","attributes":{"djType":"turntable"}},{"model":"SL-1300","attributes":{"djType":"turntable"}},{"model":"SL-1300MK2","attributes":{"djType":"turntable"}},{"model":"SL-1500","attributes":{"djType":"turntable"}},{"model":"SL-1500MK2","attributes":{"djType":"turntable"}},{"model":"SL-1500C","attributes":{"djType":"turntable"}},{"model":"SL-1600","attributes":{"djType":"turntable"}},{"model":"SL-1600MK2","attributes":{"djType":"turntable"}},{"model":"SL-1700","attributes":{"djType":"turntable"}},{"model":"SL-1700MK2","attributes":{"djType":"turntable"}},{"model":"SL-1800","attributes":{"djType":"turntable"}},{"model":"SL-1800MK2","attributes":{"djType":"turntable"}},{"model":"SL-1900","attributes":{"djType":"turntable"}},{"model":"SL-2000","attributes":{"djType":"turntable"}},{"model":"SL-3000","attributes":{"djType":"turntable"}},{"model":"SL-1000R","attributes":{"djType":"turntable"}},{"model":"SL-1300G","attributes":{"djType":"turntable"}},{"model":"SL-1210GAE","attributes":{"djType":"turntable"}},{"model":"SL-1200MK7R","attributes":{"djType":"turntable"}},{"model":"SL-1210MK7R","attributes":{"djType":"turntable"}},{"model":"SL-1200M7B","attributes":{"djType":"turntable"}},{"model":"SL-1200 55th Anniversary","attributes":{"djType":"turntable"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Technics', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"SH-DJ1200","attributes":{"djType":"mixer"}},{"model":"SH-DJ1200K","attributes":{"djType":"mixer"}},{"model":"SH-EX1200","attributes":{"djType":"mixer"}},{"model":"SH-EX1800","attributes":{"djType":"mixer"}},{"model":"SH-DX1200","attributes":{"djType":"mixer"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Technics', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"SL-DZ1200","attributes":{"djType":"player"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Technics', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"RP-DJ1200","attributes":{"djType":"other"}},{"model":"RP-DJ1210","attributes":{"djType":"other"}},{"model":"RP-DH1200","attributes":{"djType":"other"}},{"model":"RP-DH1250","attributes":{"djType":"other"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Pioneer DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"XPRS10","attributes":{"audioType":"speaker","powered":"active"}},{"model":"XPRS12","attributes":{"audioType":"speaker","powered":"active"}},{"model":"XPRS15","attributes":{"audioType":"speaker","powered":"active"}},{"model":"XPRS115S","attributes":{"audioType":"subwoofer","powered":"active"}},{"model":"XPRS118S","attributes":{"audioType":"subwoofer","powered":"active"}},{"model":"XPRS122","attributes":{"audioType":"speaker","powered":"active"}},{"model":"XPRS152","attributes":{"audioType":"speaker","powered":"active"}},{"model":"XPRS215S","attributes":{"audioType":"subwoofer","powered":"active"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'AlphaTheta', row->>'model', row->'attributes'
from jsonb_array_elements($c161$[{"model":"WAVE-EIGHT","attributes":{"audioType":"speaker","powered":"active"}}]$c161$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();
