-- Doprava: v jeden deň viac záznamov (napr. jedno auto sa vrátilo domov, druhé ostalo na akcii)
-- a krátky popis auta / šoféra.
alter table public.event_travel add column if not exists label text not null default '';
do $$ begin
  alter table public.event_travel add constraint event_travel_label_check check (char_length(label) <= 60);
exception when duplicate_object then null;
end $$;

alter table public.event_travel drop constraint if exists event_travel_event_id_travel_date_key;
create index if not exists event_travel_event_date_idx on public.event_travel (event_id, travel_date);

grant update (label) on public.event_travel to authenticated;
