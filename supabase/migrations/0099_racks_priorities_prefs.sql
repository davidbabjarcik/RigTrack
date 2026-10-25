-- RigTrack: case alebo rack (s počtom U), úlohy bez priority, osobné nastavenia účtu (3.19).

-- 1) Case alebo rack; rack má výšku v U (napr. 12U).
alter table public.cases add column if not exists kind text not null default 'case' check (kind in ('case', 'rack'));
alter table public.cases add column if not exists rack_units smallint check (rack_units between 1 and 60);
grant update (kind, rack_units) on public.cases to authenticated;

-- 2) Úloha môže byť bez priority (sivá); nové úlohy sú predvolene bez priority.
alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks add constraint tasks_priority_check check (priority in ('none', 'low', 'normal', 'high'));
alter table public.tasks alter column priority set default 'none';

-- 3) Osobné nastavenia účtu (farby priorít, bloky na Prehľade) – rovnaké na každom zariadení.
create table if not exists public.user_prefs (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb check (pg_column_size(prefs) <= 16000),
  updated_at timestamptz not null default now()
);
alter table public.user_prefs enable row level security;
drop policy if exists user_prefs_own on public.user_prefs;
create policy user_prefs_own on public.user_prefs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.user_prefs from anon, authenticated;
grant select, insert, update on public.user_prefs to authenticated;
