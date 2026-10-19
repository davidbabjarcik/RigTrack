-- RigTrack: miesto a elektrina pri evente.
-- Interiér / exteriér, aká elektrická prípojka je na mieste (napr. CEE 32 A päťpól), koľko ich je
-- a poznámka; pri exteriéri miesto pre predpoveď počasia (ak sa líši od miesta konania).

alter table public.events
  add column setting text not null default '' check (setting in ('', 'indoor', 'outdoor', 'mixed')),
  add column power text not null default ''
    check (power in ('', 'schuko16', 'cee16', 'cee32', 'cee63', 'cee125', 'generator', 'none')),
  add column power_count integer check (power_count between 1 and 50),
  add column power_note text not null default '' check (char_length(power_note) <= 200),
  add column weather_place text not null default '' check (char_length(weather_place) <= 120);

grant update (setting, power, power_count, power_note, weather_place) on public.events to authenticated;
