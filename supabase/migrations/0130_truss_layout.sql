-- RigTrack 6.6: hliník v sklade – mriežka (pohľad zhora) a stohy trussov nastojato na políčkach, napr.
-- {"cellCm": 35, "cols": 10, "rows": 6, "stacks": [{"col": 0, "row": 0, "pieces": ["<id techniky>", …]}]} (zdola nahor).
-- Mení ten, kto smie spravovať sklad (warehouse.manage).

alter table public.warehouses add column if not exists truss_layout jsonb not null default '{}'::jsonb;
do $$
begin
  alter table public.warehouses drop constraint if exists warehouses_truss_layout_check;
  alter table public.warehouses add constraint warehouses_truss_layout_check
    check (jsonb_typeof(truss_layout) = 'object' and pg_column_size(truss_layout) <= 200000);
end;
$$;
grant update (truss_layout) on public.warehouses to authenticated;
