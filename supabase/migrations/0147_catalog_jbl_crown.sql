-- 0147: technické údaje do spoločnej databázy techniky z výrobných listov (JBL VRX / SRX / VERTEC, Crown I-Tech).
-- Len údaje modelu z listu výrobcu – nič o firme ani kusoch. Existujúci model sa doplní, chýbajúci pribudne.

insert into public.equipment_catalog (kind, manufacturer, model, attributes)
values
  ('audio', 'JBL', 'VRX932LA-1', jsonb_build_object(
    'audioType', 'line_array', 'powered', 'passive', 'rmsW', 800, 'programW', 1600, 'peakW', 3200,
    'woofer', '1× 12″ JBL 2262H', 'hfDriver', '3× JBL 2408J, 1,5″', 'maxSplPeakDb', 130, 'sensitivityDb', 95,
    'impedanceOhm', 8, 'freqRange', '57 Hz – 20 kHz', 'freqResponse', '75 Hz – 20 kHz', 'coverage', '100° × 15°',
    'crossover', '1,2 kHz', 'biamp', true, 'connectors', 'speakON NL4 (2×)', 'poleMount', true, 'weightKg', 21,
    'boxWidthCm', 59.7, 'boxDepthCm', 38.1, 'boxHeightCm', 34.9)),
  ('audio', 'JBL', 'VRX928LA', jsonb_build_object(
    'audioType', 'line_array', 'powered', 'passive', 'rmsW', 400, 'programW', 800, 'peakW', 1600,
    'woofer', '1× 8″ JBL 2168H-1', 'hfDriver', '2× JBL 2414H, 1″', 'maxSplPeakDb', 122, 'sensitivityDb', 90,
    'impedanceOhm', 18, 'freqRange', '70 Hz – 20 kHz', 'freqResponse', '87 Hz – 19 kHz', 'coverage', '100° × 15°',
    'crossover', '2 kHz', 'biamp', true, 'connectors', 'speakON NL4 (2×)', 'poleMount', true, 'weightKg', 12.7,
    'boxWidthCm', 41.9, 'boxDepthCm', 26.7, 'boxHeightCm', 23)),
  ('audio', 'JBL', 'VRX915M', jsonb_build_object(
    'audioType', 'monitor', 'powered', 'passive', 'rmsW', 800, 'programW', 1600, 'peakW', 3200,
    'woofer', '1× 15″ JBL 2265H', 'hfDriver', 'JBL 2452H, 1,5″ výstup', 'maxSplDb', 127, 'maxSplPeakDb', 133,
    'sensitivityDb', 98, 'impedanceOhm', 8, 'freqRange', '60 Hz – 20 kHz', 'freqResponse', '70 Hz – 20 kHz',
    'coverage', '50° × 90°', 'crossover', '1,1 kHz', 'biamp', true, 'connectors', 'speakON NL4 (2×)', 'weightKg', 21,
    'boxWidthCm', 43.2, 'boxDepthCm', 32.4, 'boxHeightCm', 62.9)),
  ('audio', 'JBL', 'SRX712M', jsonb_build_object(
    'audioType', 'monitor', 'powered', 'passive', 'rmsW', 800, 'programW', 1600, 'peakW', 3200,
    'woofer', '1× 12″ JBL 2262H', 'hfDriver', 'JBL 2431H, 3″ cievka', 'maxSplPeakDb', 131, 'sensitivityDb', 96,
    'impedanceOhm', 8, 'freqRange', '70 Hz – 20 kHz', 'freqResponse', '83 Hz – 18 kHz', 'coverage', '50° × 90°',
    'crossover', '1,2 kHz', 'biamp', true, 'connectors', 'speakON NL4 (2×)', 'poleMount', true, 'weightKg', 15,
    'boxWidthCm', 54.6, 'boxDepthCm', 26, 'boxHeightCm', 34.9)),
  ('audio', 'JBL', 'VT4880', jsonb_build_object(
    'audioType', 'subwoofer', 'powered', 'passive', 'subDesign', 'direct', 'rmsW', 2000, 'peakW', 8000,
    'woofer', '2× 18″ JBL 2258H', 'maxSplPeakDb', 137, 'sensitivityDb', 98, 'impedanceOhm', 8,
    'freqRange', '26 Hz – 160 Hz', 'freqResponse', '29 Hz – 120 Hz', 'connectors', 'speakON NL4 (2×), meniče zvlášť',
    'weightKg', 71, 'boxWidthCm', 122.9, 'boxDepthCm', 86, 'boxHeightCm', 49.3)),
  ('audio', 'Crown', 'I-Tech 4000', jsonb_build_object(
    'audioType', 'amplifier', 'ampKind', 'digital', 'ampW2', 1800, 'ampW4', 2000, 'ampW8', 1250,
    'ampBridge4', 3600, 'ampBridge8', 4000, 'connectors', 'speakON NL4 (2×), XLR, AES/EBU, Ethernet', 'weightKg', 12.7)),
  ('audio', 'Crown', 'I-Tech 6000', jsonb_build_object(
    'audioType', 'amplifier', 'ampKind', 'digital', 'ampW2', 2500, 'ampW4', 3000, 'ampW8', 1500,
    'ampBridge4', 5000, 'ampBridge8', 6000, 'connectors', 'speakON NL4 (2×), XLR, AES/EBU, Ethernet', 'weightKg', 12.7)),
  ('audio', 'Crown', 'I-Tech 8000', jsonb_build_object(
    'audioType', 'amplifier', 'ampKind', 'digital', 'ampW2', 3500, 'ampW4', 4000, 'ampW8', 2100,
    'ampBridge4', 7000, 'ampBridge8', 8000, 'connectors', 'speakON NL4 (2×), XLR, AES/EBU, Ethernet', 'weightKg', 12.7))
on conflict (kind, lower(manufacturer), lower(model))
do update set attributes = public.equipment_catalog.attributes || excluded.attributes, updated_at = now();
