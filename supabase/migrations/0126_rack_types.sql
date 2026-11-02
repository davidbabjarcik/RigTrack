-- RigTrack 6.1: typy regálov, ktoré firma používa (Nastavenia → Sklad) – názov, hĺbka a polia s policami,
-- napr. [{"id": "…", "name": "Paletový 267", "depthCm": 110, "bays": [{"widthCm": 267, "levels": [{"heightCm": 160, "pallets": 3}]}]}].
-- V editore plánu sa z nich pridávajú regály.

alter table public.warehouses add column if not exists rack_types jsonb not null default '[]'::jsonb;
do $$
begin
  alter table public.warehouses drop constraint if exists warehouses_rack_types_check;
  alter table public.warehouses add constraint warehouses_rack_types_check
    check (jsonb_typeof(rack_types) = 'array' and jsonb_array_length(rack_types) <= 30 and pg_column_size(rack_types) <= 40000);
end;
$$;
grant update (rack_types) on public.warehouses to authenticated;

-- QR štítky miest v sklade (regál, paleta, zóna) aj do tlačovej fronty.
do $$
begin
  alter table public.print_queue drop constraint if exists print_queue_kind_check;
  alter table public.print_queue add constraint print_queue_kind_check check (kind in ('equipment', 'case', 'spot'));
  alter table public.printed_labels drop constraint if exists printed_labels_kind_check;
  alter table public.printed_labels add constraint printed_labels_kind_check check (kind in ('equipment', 'case', 'spot'));
end;
$$;
