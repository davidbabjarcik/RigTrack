-- RigTrack 6.3: case na konkrétnej palete police (1 = prvá zľava). Prázdne = appka ho poskladá na palety sama.

alter table public.cases add column if not exists spot_pallet integer check (spot_pallet between 1 and 20);
grant update (spot_pallet) on public.cases to authenticated;
