-- RigTrack: nákladný priestor vozidla.
-- Nosnosť, vnútorné rozmery a miesta, kam sa nakladať nedá (podbehy kolies, prepážka…).
-- Z týchto údajov a z rozmerov cases aplikácia navrhuje nakladanie na event.
-- Prekážka je kváder na podlahe: x = vzdialenosť od kabíny, y = od ľavej steny (cm).

alter table public.vehicles
  add column payload_kg integer check (payload_kg between 1 and 100000),
  add column cargo_length_cm integer check (cargo_length_cm between 1 and 2000),
  add column cargo_width_cm integer check (cargo_width_cm between 1 and 500),
  add column cargo_height_cm integer check (cargo_height_cm between 1 and 500),
  add column cargo_obstacles jsonb not null default '[]'
    check (jsonb_typeof(cargo_obstacles) = 'array' and jsonb_array_length(cargo_obstacles) <= 20);

grant update (payload_kg, cargo_length_cm, cargo_width_cm, cargo_height_cm, cargo_obstacles) on public.vehicles to authenticated;
