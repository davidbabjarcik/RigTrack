-- RigTrack 6.4: palety na zemi v pláne skladu – materiál (drevo / plast). Rozmer je dĺžka × šírka miesta.

alter table public.warehouse_spots add column if not exists material text check (material in ('wood', 'plastic'));
grant update (material) on public.warehouse_spots to authenticated;
