-- RigTrack: nastavenie pódiového systému (napr. Nivtec) pre kalkulačku pódia.
-- Jeden záznam na firmu: z akých dielov sa pódium skladá (dosky 2×1 a 1×1 m, nohy podľa výšky,
-- plachty, štipce na plachtu, zábradlia a spojky) a ku ktorej technike v evidencii patria.
-- Obsah je JSON, overuje ho aplikácia; databáza stráži len prístup a rozumnú veľkosť.
-- Vidí ho každý člen; mení ten, kto spravuje zoznamy (lookups.manage).

create table public.stage_settings (
  company_id uuid primary key references public.companies (id) on delete cascade,
  config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(config) = 'object' and pg_column_size(config) <= 20000),
  updated_at timestamptz not null default now()
);

create trigger stage_settings_touch_updated_at
  before update on public.stage_settings
  for each row execute function public.touch_updated_at();

alter table public.stage_settings enable row level security;

create policy stage_settings_select on public.stage_settings for select to authenticated
  using (public.is_company_member(company_id));
create policy stage_settings_insert on public.stage_settings for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy stage_settings_update on public.stage_settings for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));

revoke all on public.stage_settings from anon, authenticated;
grant select, insert on public.stage_settings to authenticated;
grant update (config) on public.stage_settings to authenticated;
