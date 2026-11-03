-- RigTrack 7.11: vlastné farby plánu skladu (regál, miesto, hliník, stĺp…) – Nastavenia → Sklad, napr. {"rack": "#1d4ed8"}.
-- Farba typu palety je v pallet_types (pole color).

alter table public.warehouses add column if not exists plan_colors jsonb not null default '{}'::jsonb;
do $$
begin
  alter table public.warehouses drop constraint if exists warehouses_plan_colors_check;
  alter table public.warehouses add constraint warehouses_plan_colors_check
    check (jsonb_typeof(plan_colors) = 'object' and pg_column_size(plan_colors) <= 2000);
end;
$$;
grant update (plan_colors) on public.warehouses to authenticated;
