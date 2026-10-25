-- RigTrack: odkaz pri úlohe (3.19).
-- Kľúčové slovo @todo v ľubovoľnom políčku vytvorí úlohu „Doplniť: Váha – LED Par“ s odkazom na stránku,
-- odkiaľ prišla (napr. úprava techniky); v Úlohách je pri nej tlačidlo „Otvoriť“.
alter table public.tasks add column if not exists link text not null default '' check (char_length(link) <= 300);
grant update (link) on public.tasks to authenticated;
