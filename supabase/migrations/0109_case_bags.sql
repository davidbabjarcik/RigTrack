-- RigTrack 4.9: pri cases aj taška (napr. taška na stojany) – vedľa case a racku.
alter table public.cases drop constraint if exists cases_kind_check;
alter table public.cases add constraint cases_kind_check check (kind in ('case', 'rack', 'bag'));
