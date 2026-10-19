-- RigTrack: nové druhy techniky – IT (mobil, tablet, notebook…) a spotrebiče (kávovar, chladnička…) (2.8).

alter table public.equipment
  drop constraint equipment_kind_check,
  add constraint equipment_kind_check check (kind in ('general', 'cable', 'light', 'audio', 'video', 'dj', 'it', 'appliance', 'truss', 'stage', 'consumable'));
