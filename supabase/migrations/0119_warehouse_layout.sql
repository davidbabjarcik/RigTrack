-- RigTrack 5.12: lepší plán skladu – stĺpy, steny, dvere a okná na pláne; pri regáli výška poschodia a poznámka
-- (appka z rozmerov cases vypočíta, koľko sa kde ešte zmestí).

do $$
begin
  alter table public.warehouse_spots drop constraint if exists warehouse_spots_kind_check;
  alter table public.warehouse_spots add constraint warehouse_spots_kind_check check (kind in ('rack', 'pallet', 'zone', 'column', 'wall', 'door', 'window'));
end;
$$;

alter table public.warehouse_spots add column if not exists level_height_cm integer check (level_height_cm between 5 and 1000);
alter table public.warehouse_spots add column if not exists note text not null default '' check (char_length(note) <= 300);

grant update (level_height_cm, note) on public.warehouse_spots to authenticated;
