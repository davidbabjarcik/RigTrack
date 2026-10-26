-- RigTrack 4.3: právna forma pri firmách a kontaktoch (s.r.o., a.s., živnosť, občianske združenie, nadácia, obec…).
alter table public.partners add column if not exists legal_form text not null default ''
  check (legal_form in ('', 'sro', 'as', 'zivnost', 'oz', 'nadacia', 'obec', 'ine'));
grant update (legal_form) on public.partners to authenticated;
