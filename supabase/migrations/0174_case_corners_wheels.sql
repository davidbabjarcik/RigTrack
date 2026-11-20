-- 0174: rozmery case jasnejšie – či sú zmerané vrátane guľových rohov a kde má case kolieska.
-- Pri skladaní do dodávky treba vedieť skutočný vonkajší rozmer. Oprávnenia sa nemenia (RLS cases).

alter table public.cases add column if not exists corners_included boolean;
alter table public.cases add column if not exists wheels text not null default 'none'
  constraint cases_wheels_check check (wheels in ('none', 'bottom', 'back', 'side'));

grant update (corners_included, wheels) on public.cases to authenticated;
