-- 0158: databáza techniky pre všetky druhy – pulty, mikrofóny, bezdrôty a in-ear, stageboxy, zosilňovače, procesory,
-- stojany, DI boxy (káble), DJ technika, video (kamery, gimbaly, statívy, objektívy, prepínače, LED procesory, projektory),
-- IT, spotrebiče a spotrebný materiál. Základné údaje (typ, pri pultoch počet kanálov…); existujúce údaje majú prednosť.
-- Všetko neoverené, kým neoverí vývojár.

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Allen & Heath', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Avantis","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":64}},{"model":"Avantis Solo","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":64}},{"model":"dLive S5000","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":128}},{"model":"dLive S7000","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":128}},{"model":"dLive C3500","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":128}},{"model":"SQ-5","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":48}},{"model":"SQ-6","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":48}},{"model":"SQ-7","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":48}},{"model":"Qu-16","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"Qu-24","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"Qu-32","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"CQ-12T","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"CQ-18T","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"CQ-20B","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"ZED-10FX","attributes":{"audioType":"mixer","mixerKind":"analog"}},{"model":"ZED-22FX","attributes":{"audioType":"mixer","mixerKind":"analog"}},{"model":"DX168","attributes":{"audioType":"stagebox"}},{"model":"DX32","attributes":{"audioType":"stagebox"}},{"model":"AR2412","attributes":{"audioType":"stagebox"}},{"model":"AB168","attributes":{"audioType":"stagebox"}},{"model":"DT168","attributes":{"audioType":"stagebox"}},{"model":"DT164-W","attributes":{"audioType":"stagebox"}},{"model":"GX4816","attributes":{"audioType":"stagebox"}},{"model":"CDM32","attributes":{"audioType":"stagebox"}},{"model":"DM64","attributes":{"audioType":"stagebox"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Behringer', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"X32","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":32}},{"model":"X32 Compact","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":32}},{"model":"X32 Producer","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":32}},{"model":"X32 Rack","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":32}},{"model":"Wing","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":48}},{"model":"XR18","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":18}},{"model":"Xenyx 1202","attributes":{"audioType":"mixer","mixerKind":"analog","mixerChannels":12}},{"model":"S16","attributes":{"audioType":"stagebox"}},{"model":"SD16","attributes":{"audioType":"stagebox"}},{"model":"S32","attributes":{"audioType":"stagebox"}},{"model":"SD8","attributes":{"audioType":"stagebox"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Midas', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"M32","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":40}},{"model":"M32 Live","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":40}},{"model":"M32R","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":40}},{"model":"M32R Live","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":40}},{"model":"MR18","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":18}},{"model":"PRO2","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":64}},{"model":"HD96-24","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"DL16","attributes":{"audioType":"stagebox"}},{"model":"DL32","attributes":{"audioType":"stagebox"}},{"model":"DL151","attributes":{"audioType":"stagebox"}},{"model":"DL153","attributes":{"audioType":"stagebox"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'DiGiCo', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"SD12","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"SD9","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"SD10","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"SD5","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"SD7","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"Quantum 225","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"Quantum 338","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"Quantum 7","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"SD-Rack","attributes":{"audioType":"stagebox"}},{"model":"SD-Mini Rack","attributes":{"audioType":"stagebox"}},{"model":"D2-Rack","attributes":{"audioType":"stagebox"}},{"model":"4REA4","attributes":{"audioType":"stagebox"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Yamaha', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"CL5","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":72}},{"model":"CL3","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":64}},{"model":"CL1","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":48}},{"model":"QL5","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":64}},{"model":"QL1","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":32}},{"model":"TF5","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":40}},{"model":"TF3","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":40}},{"model":"TF1","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":40}},{"model":"DM7","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":120}},{"model":"DM7 Compact","attributes":{"audioType":"mixer","mixerKind":"digital","mixerChannels":72}},{"model":"DM3","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"MG10XU","attributes":{"audioType":"mixer","mixerKind":"analog","mixerChannels":10}},{"model":"MG12XU","attributes":{"audioType":"mixer","mixerKind":"analog","mixerChannels":12}},{"model":"MG16XU","attributes":{"audioType":"mixer","mixerKind":"analog","mixerChannels":16}},{"model":"Rio3224-D2","attributes":{"audioType":"stagebox"}},{"model":"Rio1608-D2","attributes":{"audioType":"stagebox"}},{"model":"Tio1608-D","attributes":{"audioType":"stagebox"}},{"model":"Rio3224-D3","attributes":{"audioType":"stagebox"}},{"model":"Rio1608-D3","attributes":{"audioType":"stagebox"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Soundcraft', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Si Impact","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"Vi1000","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"Ui24R","attributes":{"audioType":"mixer","mixerKind":"digital"}},{"model":"EFX8","attributes":{"audioType":"mixer","mixerKind":"analog"}},{"model":"Signature 12","attributes":{"audioType":"mixer","mixerKind":"analog"}},{"model":"Signature 16","attributes":{"audioType":"mixer","mixerKind":"analog"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Shure', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"SM58","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"SM57","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"Beta 58A","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"Beta 57A","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"Beta 52A","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"Beta 56A","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"SM7B","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"PGA52","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"PGA56","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"Beta 91A","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"Beta 87A","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"Beta 98AMP","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"Beta 181","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"SM81","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"SM86","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"SM137","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"KSM9","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"KSM137","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"KSM32","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"AD4D","attributes":{"audioType":"wireless","wirelessRx":"AD4D"}},{"model":"AD4Q","attributes":{"audioType":"wireless","wirelessRx":"AD4Q"}},{"model":"ULXD4D","attributes":{"audioType":"wireless","wirelessRx":"ULXD4D"}},{"model":"ULXD4Q","attributes":{"audioType":"wireless","wirelessRx":"ULXD4Q"}},{"model":"SLXD4D","attributes":{"audioType":"wireless","wirelessRx":"SLXD4D"}},{"model":"AD2","attributes":{"audioType":"wireless"}},{"model":"AD1","attributes":{"audioType":"wireless"}},{"model":"ULXD2","attributes":{"audioType":"wireless"}},{"model":"ULXD1","attributes":{"audioType":"wireless"}},{"model":"SLXD2","attributes":{"audioType":"wireless"}},{"model":"SLXD1","attributes":{"audioType":"wireless"}},{"model":"PSM 1000","attributes":{"audioType":"iem"}},{"model":"PSM 900","attributes":{"audioType":"iem"}},{"model":"PSM 300","attributes":{"audioType":"iem"}},{"model":"P10T","attributes":{"audioType":"iem"}},{"model":"P9T","attributes":{"audioType":"iem"}},{"model":"P10R+","attributes":{"audioType":"iem"}},{"model":"P9RA+","attributes":{"audioType":"iem"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Sennheiser', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"e 835","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"e 845","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"e 935","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"e 945","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"e 906","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"e 904","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"e 902","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"e 604","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"e 609 Silver","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"MD 421-II","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"MD 441-U","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"e 865","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"e 965","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"e 914","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"e 614","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"e 901","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"MKE 600","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"MKH 416","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"EW-DX EM 2","attributes":{"audioType":"wireless","wirelessRx":"EW-DX EM 2"}},{"model":"EW-DX EM 4","attributes":{"audioType":"wireless","wirelessRx":"EW-DX EM 4"}},{"model":"EW-D EM","attributes":{"audioType":"wireless","wirelessRx":"EW-D EM"}},{"model":"EM 100 G4","attributes":{"audioType":"wireless","wirelessRx":"EM 100 G4"}},{"model":"EM 300-500 G4","attributes":{"audioType":"wireless","wirelessRx":"EM 300-500 G4"}},{"model":"EM 6000","attributes":{"audioType":"wireless","wirelessRx":"EM 6000"}},{"model":"SKM 100 G4","attributes":{"audioType":"wireless"}},{"model":"SK 100 G4","attributes":{"audioType":"wireless"}},{"model":"SKM-S EW-DX","attributes":{"audioType":"wireless"}},{"model":"SK EW-DX","attributes":{"audioType":"wireless"}},{"model":"ew IEM G4","attributes":{"audioType":"iem"}},{"model":"ew IEM G4-TWIN","attributes":{"audioType":"iem"}},{"model":"IEM 2000","attributes":{"audioType":"iem"}},{"model":"EW IEM G4 SR","attributes":{"audioType":"iem"}},{"model":"EK IEM G4","attributes":{"audioType":"iem"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Audio-Technica', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"ATM650","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"ATM250","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"ATM610a","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"ATM350","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"ATM450","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"AT4050","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"AT2020","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"AE5100","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"ATW-R3210","attributes":{"audioType":"wireless","wirelessRx":"ATW-R3210"}},{"model":"ATW-T3202","attributes":{"audioType":"wireless"}},{"model":"ATW-T3201","attributes":{"audioType":"wireless"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'AKG', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"D112 MKII","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"D5","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"D7","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"C414 XLS","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"C414 XLII","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"C451 B","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"C214","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"C411 PP","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Audix', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"D6","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"D2","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"D4","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"i5","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"OM7","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"OM5","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"ADX51","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"M1250B","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Neumann', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"KMS 105","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"KMS 104","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"KM 184","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"U 87 Ai","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"TLM 103","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Electro-Voice', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"RE20","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"ND96","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"ND76","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"ND44","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Beyerdynamic', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"M 88 TG","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"M 201 TG","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"TG D70","attributes":{"audioType":"microphone","micKind":"wired","micType":"dynamic"}},{"model":"TG I53c","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Røde', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"NT5","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"NT1","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"NT1-A","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"NTG3","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'DPA', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"d:facto 4018V","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"4099","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"4088","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"4066","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"4060","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}},{"model":"4061","attributes":{"audioType":"microphone","micKind":"wired","micType":"condenser"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Wisycom', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"MRK960","attributes":{"audioType":"wireless","wirelessRx":"MRK960"}},{"model":"MTH410","attributes":{"audioType":"wireless"}},{"model":"MTP41","attributes":{"audioType":"wireless"}},{"model":"MTP60","attributes":{"audioType":"wireless"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'd&b audiotechnik', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"D80","attributes":{"audioType":"amplifier","ampKind":"digital","ampW4":4000,"ampW8":2000,"connectors":"4 kanály"}},{"model":"D20","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"D40","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"30D","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"40D","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"V8","attributes":{"powered":"passive","audioType":"line_array"}},{"model":"V12","attributes":{"powered":"passive","audioType":"line_array"}},{"model":"Y8","attributes":{"powered":"passive","audioType":"line_array"}},{"model":"Y12","attributes":{"powered":"passive","audioType":"line_array"}},{"model":"KSL8","attributes":{"powered":"passive","audioType":"line_array"}},{"model":"KSL12","attributes":{"powered":"passive","audioType":"line_array"}},{"model":"GSL8","attributes":{"powered":"passive","audioType":"line_array"}},{"model":"Y10P","attributes":{"powered":"passive","audioType":"speaker"}},{"model":"E12","attributes":{"powered":"passive","audioType":"speaker"}},{"model":"E8","attributes":{"powered":"passive","audioType":"speaker"}},{"model":"Y7P","attributes":{"powered":"passive","audioType":"speaker"}},{"model":"M4","attributes":{"powered":"passive","audioType":"monitor"}},{"model":"M6","attributes":{"powered":"passive","audioType":"monitor"}},{"model":"MAX2","attributes":{"powered":"passive","audioType":"monitor"}},{"model":"V-SUB","attributes":{"powered":"passive","audioType":"subwoofer"}},{"model":"Y-SUB","attributes":{"powered":"passive","audioType":"subwoofer"}},{"model":"B22-SUB","attributes":{"powered":"passive","audioType":"subwoofer"}},{"model":"J-SUB","attributes":{"powered":"passive","audioType":"subwoofer"}},{"model":"SL-SUB","attributes":{"powered":"passive","audioType":"subwoofer"}},{"model":"E15X-SUB","attributes":{"powered":"passive","audioType":"subwoofer"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Powersoft', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"X8","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"8 kanálov"}},{"model":"X4","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"X4L","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"Quattrocanali 4804 DSP+D","attributes":{"audioType":"amplifier","ampKind":"digital","ampW4":1200,"connectors":"4 kanály, Dante"}},{"model":"Quattrocanali 2404 DSP+D","attributes":{"audioType":"amplifier","ampKind":"digital","ampW4":600,"connectors":"4 kanály, Dante"}},{"model":"T604","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"T904","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Lab.gruppen', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"PLM 20K44","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"PLM 12K44","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"D 20:4L","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"D 10:4L","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'QSC', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"PLD4.5","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"PLD4.3","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}},{"model":"PLD4.2","attributes":{"audioType":"amplifier","ampKind":"digital","connectors":"4 kanály"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'dbx', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"DriveRack PA2","attributes":{"audioType":"processor"}},{"model":"DriveRack VENU360","attributes":{"audioType":"processor"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Lake', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"LM 44","attributes":{"audioType":"processor"}},{"model":"LM 26","attributes":{"audioType":"processor"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'XTA', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"DP448","attributes":{"audioType":"processor"}},{"model":"DP548","attributes":{"audioType":"processor"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'Klark Teknik', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"DN9650","attributes":{"audioType":"processor"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'dB Technologies', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"VIO L210","attributes":{"powered":"active","audioType":"line_array"}},{"model":"VIO L212","attributes":{"powered":"active","audioType":"line_array"}},{"model":"VIO L208","attributes":{"powered":"active","audioType":"line_array"}},{"model":"VIO S318","attributes":{"powered":"active","audioType":"subwoofer"}},{"model":"VIO S118","attributes":{"powered":"active","audioType":"subwoofer"}},{"model":"SUB 618","attributes":{"powered":"active","audioType":"subwoofer"}},{"model":"Opera 15","attributes":{"powered":"active","audioType":"speaker"}},{"model":"Opera 12","attributes":{"powered":"active","audioType":"speaker"}},{"model":"Opera 10","attributes":{"powered":"active","audioType":"speaker"}},{"model":"VIO X12","attributes":{"powered":"active","audioType":"speaker"}},{"model":"VIO X15","attributes":{"powered":"active","audioType":"speaker"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'JBL', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"PRX815W","attributes":{"audioType":"speaker","powered":"active","woofer":"1× 15″"}},{"model":"SRX835P","attributes":{"audioType":"speaker","powered":"passive","woofer":"1× 15″"}},{"model":"SRX828SP","attributes":{"audioType":"subwoofer","powered":"active","woofer":"2× 18″"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'RCF', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"ART 745-A","attributes":{"audioType":"speaker","powered":"active","woofer":"1× 15″"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'audio', 'K&M', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"21436","attributes":{"audioType":"speaker_stand"}},{"model":"21460","attributes":{"audioType":"speaker_stand"}},{"model":"21459","attributes":{"audioType":"speaker_stand"}},{"model":"24624","attributes":{"audioType":"speaker_stand"}},{"model":"210/9","attributes":{"audioType":"mic_stand"}},{"model":"210/8","attributes":{"audioType":"mic_stand"}},{"model":"259","attributes":{"audioType":"mic_stand"}},{"model":"25900","attributes":{"audioType":"mic_stand"}},{"model":"23200","attributes":{"audioType":"mic_stand"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'cable', 'Radial', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"J48","attributes":{"cableType":"di","powered":"active"}},{"model":"J48 Stereo","attributes":{"cableType":"di","powered":"active"}},{"model":"ProDI","attributes":{"cableType":"di","powered":"passive"}},{"model":"ProD2","attributes":{"cableType":"di","powered":"passive"}},{"model":"JDI","attributes":{"cableType":"di","powered":"passive"}},{"model":"JDI Stereo","attributes":{"cableType":"di","powered":"passive"}},{"model":"JPC","attributes":{"cableType":"di","powered":"active"}},{"model":"ProAV2","attributes":{"cableType":"di","powered":"passive"}},{"model":"USB-Pro","attributes":{"cableType":"di","powered":"active"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'cable', 'BSS', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"AR-133","attributes":{"cableType":"di","powered":"active"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'cable', 'Klark Teknik', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"DN100","attributes":{"cableType":"di","powered":"active"}},{"model":"DN200","attributes":{"cableType":"di","powered":"active"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'cable', 'Palmer', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"PAN 01","attributes":{"cableType":"di","powered":"passive"}},{"model":"PAN 02","attributes":{"cableType":"di","powered":"active"}},{"model":"PAN 04","attributes":{"cableType":"di","powered":"passive"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'cable', 'Behringer', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"DI100","attributes":{"cableType":"di","powered":"active"}},{"model":"DI400P","attributes":{"cableType":"di","powered":"passive"}},{"model":"DI600P","attributes":{"cableType":"di","powered":"passive"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'cable', 'Countryman', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Type 85","attributes":{"cableType":"di","powered":"active"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Pioneer DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"CDJ-3000","attributes":{"djType":"player"}},{"model":"CDJ-2000NXS2","attributes":{"djType":"player"}},{"model":"CDJ-900NXS","attributes":{"djType":"player"}},{"model":"XDJ-1000MK2","attributes":{"djType":"player"}},{"model":"XDJ-700","attributes":{"djType":"player"}},{"model":"DJM-900NXS2","attributes":{"djType":"mixer"}},{"model":"DJM-A9","attributes":{"djType":"mixer"}},{"model":"DJM-V10","attributes":{"djType":"mixer"}},{"model":"DJM-V10-LF","attributes":{"djType":"mixer"}},{"model":"DJM-750MK2","attributes":{"djType":"mixer"}},{"model":"DJM-450","attributes":{"djType":"mixer"}},{"model":"DJM-250MK2","attributes":{"djType":"mixer"}},{"model":"DJM-S11","attributes":{"djType":"mixer"}},{"model":"DJM-S7","attributes":{"djType":"mixer"}},{"model":"DJM-S5","attributes":{"djType":"mixer"}},{"model":"XDJ-XZ","attributes":{"djType":"all_in_one"}},{"model":"XDJ-RX3","attributes":{"djType":"all_in_one"}},{"model":"XDJ-RR","attributes":{"djType":"all_in_one"}},{"model":"Opus-Quad","attributes":{"djType":"all_in_one"}},{"model":"Omnis-Duo","attributes":{"djType":"all_in_one"}},{"model":"DDJ-FLX10","attributes":{"djType":"pc_controller"}},{"model":"DDJ-1000","attributes":{"djType":"pc_controller"}},{"model":"DDJ-REV7","attributes":{"djType":"pc_controller"}},{"model":"DDJ-FLX6","attributes":{"djType":"pc_controller"}},{"model":"DDJ-FLX4","attributes":{"djType":"pc_controller"}},{"model":"DDJ-800","attributes":{"djType":"pc_controller"}},{"model":"PLX-1000","attributes":{"djType":"turntable"}},{"model":"PLX-CRSS12","attributes":{"djType":"turntable"}},{"model":"PLX-500","attributes":{"djType":"turntable"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'AlphaTheta', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"CDJ-3000X","attributes":{"djType":"player"}},{"model":"Euphonia","attributes":{"djType":"mixer"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Allen & Heath', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Xone:96","attributes":{"djType":"mixer"}},{"model":"Xone:92","attributes":{"djType":"mixer"}},{"model":"Xone:PX5","attributes":{"djType":"mixer"}},{"model":"Xone:43","attributes":{"djType":"mixer"}},{"model":"Xone:23","attributes":{"djType":"mixer"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Technics', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"SL-1210MK7","attributes":{"djType":"turntable"}},{"model":"SL-1200MK7","attributes":{"djType":"turntable"}},{"model":"SL-1210GR","attributes":{"djType":"turntable"}},{"model":"SL-1200GR","attributes":{"djType":"turntable"}},{"model":"SL-1210M5G","attributes":{"djType":"turntable"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Denon DJ', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"SC6000 Prime","attributes":{"djType":"player"}},{"model":"SC6000M Prime","attributes":{"djType":"player"}},{"model":"SC Live 4","attributes":{"djType":"player"}},{"model":"X1850 Prime","attributes":{"djType":"mixer"}},{"model":"X1800 Prime","attributes":{"djType":"mixer"}},{"model":"Prime 4","attributes":{"djType":"all_in_one"}},{"model":"Prime 4+","attributes":{"djType":"all_in_one"}},{"model":"Prime 2","attributes":{"djType":"all_in_one"}},{"model":"Prime Go","attributes":{"djType":"all_in_one"}},{"model":"Prime Go+","attributes":{"djType":"all_in_one"}},{"model":"LC6000 Prime","attributes":{"djType":"pc_controller"}},{"model":"MC7000","attributes":{"djType":"pc_controller"}},{"model":"SC Live 2","attributes":{"djType":"pc_controller"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Rane', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Seventy-Two MKII","attributes":{"djType":"mixer"}},{"model":"Seventy","attributes":{"djType":"mixer"}},{"model":"Seventy-Two","attributes":{"djType":"mixer"}},{"model":"Twelve MKII","attributes":{"djType":"pc_controller"}},{"model":"Performer","attributes":{"djType":"pc_controller"}},{"model":"One","attributes":{"djType":"pc_controller"}},{"model":"Four","attributes":{"djType":"pc_controller"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'PLAYdifferently', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Model 1","attributes":{"djType":"mixer"}},{"model":"Model 1.4","attributes":{"djType":"mixer"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Native Instruments', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Traktor Kontrol S4 MK3","attributes":{"djType":"pc_controller"}},{"model":"Traktor Kontrol S3","attributes":{"djType":"pc_controller"}},{"model":"Traktor Kontrol S2 MK3","attributes":{"djType":"pc_controller"}},{"model":"Traktor Kontrol Z2","attributes":{"djType":"pc_controller"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Reloop', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"RP-7000 MK2","attributes":{"djType":"turntable"}},{"model":"RP-8000 MK2","attributes":{"djType":"turntable"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'dj', 'Numark', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Mixtrack Pro FX","attributes":{"djType":"pc_controller"}},{"model":"NS4FX","attributes":{"djType":"pc_controller"}},{"model":"Mixstream Pro+","attributes":{"djType":"pc_controller"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Sony', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"FX3","attributes":{"videoType":"camera","cameraSensor":"full_frame","hdmiOut":true}},{"model":"FX6","attributes":{"videoType":"camera","cameraSensor":"full_frame","hdmiOut":true}},{"model":"FX30","attributes":{"videoType":"camera","cameraSensor":"aps_c","hdmiOut":true}},{"model":"Alpha 7S III","attributes":{"videoType":"camera","cameraSensor":"full_frame","hdmiOut":true}},{"model":"Alpha 7 IV","attributes":{"videoType":"camera","cameraSensor":"full_frame","hdmiOut":true}},{"model":"PXW-Z190","attributes":{"videoType":"camera","cameraSensor":"other","hdmiOut":true}},{"model":"FE 24-70mm F2.8 GM II","attributes":{"videoType":"lens"}},{"model":"FE 70-200mm F2.8 GM OSS II","attributes":{"videoType":"lens"}},{"model":"FE 16-35mm F2.8 GM","attributes":{"videoType":"lens"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Canon', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"EOS C70","attributes":{"videoType":"camera","cameraSensor":"aps_c","hdmiOut":true}},{"model":"EOS R5","attributes":{"videoType":"camera","cameraSensor":"full_frame","hdmiOut":true}},{"model":"EOS R6 Mark II","attributes":{"videoType":"camera","cameraSensor":"full_frame","hdmiOut":true}},{"model":"XF605","attributes":{"videoType":"camera","cameraSensor":"other","hdmiOut":true}},{"model":"RF 24-70mm F2.8L IS USM","attributes":{"videoType":"lens"}},{"model":"RF 70-200mm F2.8L IS USM","attributes":{"videoType":"lens"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Blackmagic Design', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Pocket Cinema Camera 6K Pro","attributes":{"videoType":"camera","cameraSensor":"aps_c","hdmiOut":true}},{"model":"Pocket Cinema Camera 4K","attributes":{"videoType":"camera","cameraSensor":"other","hdmiOut":true}},{"model":"Cinema Camera 6K","attributes":{"videoType":"camera","cameraSensor":"full_frame","hdmiOut":true}},{"model":"Studio Camera 4K Plus","attributes":{"videoType":"camera","cameraSensor":"other","hdmiOut":true}},{"model":"Studio Camera 4K Pro","attributes":{"videoType":"camera","cameraSensor":"other","hdmiOut":true}},{"model":"ATEM Mini","attributes":{"videoType":"other"}},{"model":"ATEM Mini Pro","attributes":{"videoType":"other"}},{"model":"ATEM Mini Pro ISO","attributes":{"videoType":"other"}},{"model":"ATEM Mini Extreme","attributes":{"videoType":"other"}},{"model":"ATEM Mini Extreme ISO","attributes":{"videoType":"other"}},{"model":"ATEM Television Studio HD8","attributes":{"videoType":"other"}},{"model":"ATEM Television Studio HD8 ISO","attributes":{"videoType":"other"}},{"model":"ATEM 1 M/E Constellation HD","attributes":{"videoType":"other"}},{"model":"HyperDeck Studio HD Mini","attributes":{"videoType":"other"}},{"model":"Web Presenter HD","attributes":{"videoType":"other"}},{"model":"Micro Converter SDI to HDMI 3G","attributes":{"videoType":"other"}},{"model":"Micro Converter HDMI to SDI 3G","attributes":{"videoType":"other"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Panasonic', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Lumix GH6","attributes":{"videoType":"camera","cameraSensor":"other","hdmiOut":true}},{"model":"Lumix S5 II","attributes":{"videoType":"camera","cameraSensor":"full_frame","hdmiOut":true}},{"model":"AG-CX350","attributes":{"videoType":"camera","cameraSensor":"other","hdmiOut":true}},{"model":"PT-RZ120","attributes":{"display":{"type":"projector","resW":1920,"resH":1200,"lumens":12000}}},{"model":"PT-RZ21K","attributes":{"display":{"type":"projector","resW":1920,"resH":1200,"lumens":20000}}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'GoPro', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"HERO12 Black","attributes":{"videoType":"camera","cameraSensor":"action"}},{"model":"HERO13 Black","attributes":{"videoType":"camera","cameraSensor":"action"}},{"model":"HERO11 Black","attributes":{"videoType":"camera","cameraSensor":"action"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'DJI', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Osmo Action 4","attributes":{"videoType":"camera","cameraSensor":"action"}},{"model":"Osmo Action 5 Pro","attributes":{"videoType":"camera","cameraSensor":"action"}},{"model":"Osmo Pocket 3","attributes":{"videoType":"camera","cameraSensor":"action"}},{"model":"RS 3","attributes":{"videoType":"gimbal"}},{"model":"RS 3 Pro","attributes":{"videoType":"gimbal"}},{"model":"RS 4","attributes":{"videoType":"gimbal"}},{"model":"RS 4 Pro","attributes":{"videoType":"gimbal"}},{"model":"RS 3 Mini","attributes":{"videoType":"gimbal"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Insta360', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"X4","attributes":{"videoType":"camera","cameraSensor":"action"}},{"model":"Ace Pro","attributes":{"videoType":"camera","cameraSensor":"action"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Zhiyun', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Crane 4","attributes":{"videoType":"gimbal"}},{"model":"Weebill 3S","attributes":{"videoType":"gimbal"}},{"model":"Weebill 3","attributes":{"videoType":"gimbal"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Manfrotto', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"504X","attributes":{"videoType":"tripod"}},{"model":"190X","attributes":{"videoType":"tripod"}},{"model":"055","attributes":{"videoType":"tripod"}},{"model":"MVK502AM","attributes":{"videoType":"tripod"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Sachtler', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Ace XL","attributes":{"videoType":"tripod"}},{"model":"Ace M","attributes":{"videoType":"tripod"}},{"model":"aktiv8","attributes":{"videoType":"tripod"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Sigma', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"18-35mm F1.8 DC HSM Art","attributes":{"videoType":"lens"}},{"model":"24-70mm F2.8 DG DN Art","attributes":{"videoType":"lens"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Roland', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"V-8HD","attributes":{"videoType":"other"}},{"model":"V-1HD","attributes":{"videoType":"other"}},{"model":"V-160HD","attributes":{"videoType":"other"}},{"model":"V-60HD","attributes":{"videoType":"other"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Barco', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"E2","attributes":{"videoType":"other"}},{"model":"S3-4K","attributes":{"videoType":"other"}},{"model":"EventMaster EX","attributes":{"videoType":"other"}},{"model":"UDX-4K32","attributes":{"display":{"type":"projector","resW":3840,"resH":2160,"lumens":31000}}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Novastar', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"VX400","attributes":{"ledProcessor":{"outputs":4,"pixelsPerOutput":650000,"inputs":1,"inputW":1920,"inputH":1080}}},{"model":"VX600","attributes":{"ledProcessor":{"outputs":6,"pixelsPerOutput":650000,"inputs":1,"inputW":1920,"inputH":1080}}},{"model":"VX1000","attributes":{"ledProcessor":{"outputs":10,"pixelsPerOutput":650000,"inputs":1,"inputW":3840,"inputH":2160}}},{"model":"VX16s","attributes":{"ledProcessor":{"outputs":16,"pixelsPerOutput":650000,"inputs":1,"inputW":3840,"inputH":2160}}},{"model":"MCTRL300","attributes":{"ledProcessor":{"outputs":2,"pixelsPerOutput":650000,"inputs":1,"inputW":1920,"inputH":1080}}},{"model":"MCTRL660 PRO","attributes":{"ledProcessor":{"outputs":6,"pixelsPerOutput":650000,"inputs":1,"inputW":1920,"inputH":1080}}},{"model":"MCTRL4K","attributes":{"ledProcessor":{"outputs":16,"pixelsPerOutput":650000,"inputs":1,"inputW":3840,"inputH":2160}}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'video', 'Epson', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"EB-L1755U","attributes":{"display":{"type":"projector","resW":1920,"resH":1200,"lumens":15000}}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Apple', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"iPhone 15","attributes":{"itType":"phone"}},{"model":"iPhone 15 Pro","attributes":{"itType":"phone"}},{"model":"iPhone 16","attributes":{"itType":"phone"}},{"model":"iPhone 16 Pro","attributes":{"itType":"phone"}},{"model":"iPhone 17","attributes":{"itType":"phone"}},{"model":"iPhone 17 Pro","attributes":{"itType":"phone"}},{"model":"iPad (10. generácia)","attributes":{"itType":"tablet"}},{"model":"iPad (A16)","attributes":{"itType":"tablet"}},{"model":"iPad Air 11″ (M2)","attributes":{"itType":"tablet"}},{"model":"iPad Air 13″ (M2)","attributes":{"itType":"tablet"}},{"model":"iPad Pro 11″ (M4)","attributes":{"itType":"tablet"}},{"model":"iPad Pro 13″ (M4)","attributes":{"itType":"tablet"}},{"model":"iPad mini (A17 Pro)","attributes":{"itType":"tablet"}},{"model":"MacBook Air 13″ (M3)","attributes":{"itType":"laptop"}},{"model":"MacBook Air 15″ (M3)","attributes":{"itType":"laptop"}},{"model":"MacBook Air 13″ (M4)","attributes":{"itType":"laptop"}},{"model":"MacBook Pro 14″ (M4)","attributes":{"itType":"laptop"}},{"model":"MacBook Pro 16″ (M4 Pro)","attributes":{"itType":"laptop"}},{"model":"MacBook Pro 14″ (M3)","attributes":{"itType":"laptop"}},{"model":"Mac mini (M4)","attributes":{"itType":"computer"}},{"model":"Mac mini (M2)","attributes":{"itType":"computer"}},{"model":"Mac Studio","attributes":{"itType":"computer"}},{"model":"iMac 24″","attributes":{"itType":"computer"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Samsung', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Galaxy S24","attributes":{"itType":"phone"}},{"model":"Galaxy S24 Ultra","attributes":{"itType":"phone"}},{"model":"Galaxy S25","attributes":{"itType":"phone"}},{"model":"Galaxy A55","attributes":{"itType":"phone"}},{"model":"Galaxy Tab S9","attributes":{"itType":"tablet"}},{"model":"Galaxy Tab S9 FE","attributes":{"itType":"tablet"}},{"model":"Galaxy Tab A9+","attributes":{"itType":"tablet"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Microsoft', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Surface Pro 11","attributes":{"itType":"tablet"}},{"model":"Surface Pro 9","attributes":{"itType":"tablet"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Lenovo', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"ThinkPad T14","attributes":{"itType":"laptop"}},{"model":"ThinkPad X1 Carbon","attributes":{"itType":"laptop"}},{"model":"ThinkPad E14","attributes":{"itType":"laptop"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Dell', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"XPS 13","attributes":{"itType":"laptop"}},{"model":"XPS 15","attributes":{"itType":"laptop"}},{"model":"Latitude 5440","attributes":{"itType":"laptop"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'HP', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"EliteBook 840","attributes":{"itType":"laptop"}},{"model":"ProBook 450","attributes":{"itType":"laptop"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Ubiquiti', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"UniFi Dream Machine Pro","attributes":{"itType":"network"}},{"model":"UniFi Cloud Gateway Ultra","attributes":{"itType":"network"}},{"model":"UniFi U6 Pro","attributes":{"itType":"network"}},{"model":"UniFi U6+","attributes":{"itType":"network"}},{"model":"UniFi U7 Pro","attributes":{"itType":"network"}},{"model":"UniFi Switch Lite 8 PoE","attributes":{"itType":"network"}},{"model":"UniFi Switch 24 PoE","attributes":{"itType":"network"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'MikroTik', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"hAP ax3","attributes":{"itType":"network"}},{"model":"hAP ac2","attributes":{"itType":"network"}},{"model":"CRS326-24G-2S+","attributes":{"itType":"network"}},{"model":"RB5009","attributes":{"itType":"network"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'TP-Link', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Archer AX55","attributes":{"itType":"network"}},{"model":"TL-SG108","attributes":{"itType":"network"}},{"model":"TL-SG108PE","attributes":{"itType":"network"}},{"model":"Deco X50","attributes":{"itType":"network"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Netgear', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"GS108","attributes":{"itType":"network"}},{"model":"GS308","attributes":{"itType":"network"}},{"model":"M4250-10G2F-PoE+","attributes":{"itType":"network"}},{"model":"M4250-26G4F-PoE+","attributes":{"itType":"network"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Luminex', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"GigaCore 10","attributes":{"itType":"network"}},{"model":"GigaCore 14R","attributes":{"itType":"network"}},{"model":"GigaCore 16Xt","attributes":{"itType":"network"}},{"model":"GigaCore 26i","attributes":{"itType":"network"}},{"model":"GigaCore 30i","attributes":{"itType":"network"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'it', 'Teltonika', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"RUT950","attributes":{"itType":"network"}},{"model":"RUTX11","attributes":{"itType":"network"}},{"model":"RUTX50","attributes":{"itType":"network"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'appliance', 'Nespresso', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Vertuo Next","attributes":{"applianceType":"coffee"}},{"model":"Vertuo Pop","attributes":{"applianceType":"coffee"}},{"model":"Essenza Mini","attributes":{"applianceType":"coffee"}},{"model":"Inissia","attributes":{"applianceType":"coffee"}},{"model":"Zenius","attributes":{"applianceType":"coffee"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'appliance', 'De''Longhi', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Magnifica S","attributes":{"applianceType":"coffee"}},{"model":"Magnifica Evo","attributes":{"applianceType":"coffee"}},{"model":"Dinamica","attributes":{"applianceType":"coffee"}},{"model":"Dedica EC685","attributes":{"applianceType":"coffee"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'appliance', 'Jura', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"E8","attributes":{"applianceType":"coffee"}},{"model":"ENA 8","attributes":{"applianceType":"coffee"}},{"model":"WE8","attributes":{"applianceType":"coffee"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'appliance', 'Philips', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Series 2200 EP2220","attributes":{"applianceType":"coffee"}},{"model":"Series 3200 EP3246","attributes":{"applianceType":"coffee"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'appliance', 'Liebherr', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"FKv 503","attributes":{"applianceType":"fridge"}},{"model":"FKv 2640","attributes":{"applianceType":"fridge"}},{"model":"FKUv 1610","attributes":{"applianceType":"fridge"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'appliance', 'Master', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"B 15 EPB","attributes":{"applianceType":"heater","powerW":15000}},{"model":"B 9 EPB","attributes":{"applianceType":"heater","powerW":9000}},{"model":"B 3,3 EPB","attributes":{"applianceType":"heater","powerW":3300}},{"model":"B 5 EPB","attributes":{"applianceType":"heater","powerW":5000}},{"model":"B 22 EPB","attributes":{"applianceType":"heater","powerW":22000}},{"model":"BV 77 E","attributes":{"applianceType":"heater"}},{"model":"BV 110 E","attributes":{"applianceType":"heater"}},{"model":"B 35 CED","attributes":{"applianceType":"heater"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'consumable', 'Duracell', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Procell AA","attributes":{}},{"model":"Procell AAA","attributes":{}},{"model":"Procell 9V","attributes":{}},{"model":"Procell Constant AA","attributes":{}},{"model":"Procell Constant AAA","attributes":{}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'consumable', 'Energizer', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Industrial AA","attributes":{}},{"model":"Industrial AAA","attributes":{}},{"model":"Industrial 9V","attributes":{}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'consumable', 'Varta', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Industrial Pro AA","attributes":{}},{"model":"Industrial Pro AAA","attributes":{}},{"model":"Industrial Pro 9V","attributes":{}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'consumable', 'Le Mark', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Pro Gaff 50 mm","attributes":{}},{"model":"Pro Gaff 25 mm","attributes":{}},{"model":"Spike Tape 12 mm","attributes":{}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'consumable', 'Advance', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"AT202 Gaffer 50 mm","attributes":{}},{"model":"AT202 Gaffer 25 mm","attributes":{}},{"model":"AT7 PVC 50 mm","attributes":{}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'consumable', 'Rosco', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Fog Fluid","attributes":{}},{"model":"Clear Fog Fluid","attributes":{}},{"model":"Haze Fluid","attributes":{}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'consumable', 'Look Solutions', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"Slow Fog fluid","attributes":{}},{"model":"Tiny-Fluid","attributes":{}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'consumable', 'Antari', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"FLR-5 Fog Liquid","attributes":{}},{"model":"HZL-5 Haze Liquid","attributes":{}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'truss', 'Prolyte', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"H30V","attributes":{"trussType":"point3"}},{"model":"H40V","attributes":{"trussType":"point4"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'truss', 'Eurotruss', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"FD34","attributes":{"trussType":"point4"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
select 'truss', 'Global Truss', row->>'model', row->'attributes'
from jsonb_array_elements($c158$[{"model":"F34","attributes":{"trussType":"point4"}},{"model":"F44P","attributes":{"trussType":"point4"}}]$c158$::jsonb) as row
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = excluded.attributes || public.equipment_catalog.attributes, updated_at = now();
