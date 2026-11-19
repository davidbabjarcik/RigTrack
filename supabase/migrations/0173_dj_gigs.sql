-- 0173: DJ hrania.
-- Event môže byť bežná akcia (technika, posádka) alebo DJ hranie člena firmy. Kto hrá, je v posádke
-- s úlohou „DJ“. Oprávnenia sa nemenia – platia tie isté pravidlá ako pre eventy (RLS z 0018).

alter table public.events
  add column if not exists kind text not null default 'event'
  constraint events_kind_check check (kind in ('event', 'dj'));

grant update (kind) on public.events to authenticated;
