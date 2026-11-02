-- RigTrack 5.19: regál po poliach (pohľad spredu). Každé pole má vlastnú šírku a vlastné police – každá polica inú výšku
-- a voliteľne počet paliet, napr. [{"widthCm": 267, "levels": [{"heightCm": 160, "pallets": 3}, {"heightCm": 120}]}].
-- Police sú zdola nahor. Case si pamätá pole (spot_bay) a policu v ňom (spot_level).

alter table public.warehouse_spots add column if not exists bays jsonb not null default '[]'::jsonb;
do $$
begin
  alter table public.warehouse_spots drop constraint if exists warehouse_spots_bays_check;
  alter table public.warehouse_spots add constraint warehouse_spots_bays_check
    check (jsonb_typeof(bays) = 'array' and jsonb_array_length(bays) <= 30 and pg_column_size(bays) <= 20000);
end;
$$;
grant update (bays) on public.warehouse_spots to authenticated;

alter table public.cases add column if not exists spot_bay integer check (spot_bay between 1 and 30);
grant update (spot_bay) on public.cases to authenticated;
