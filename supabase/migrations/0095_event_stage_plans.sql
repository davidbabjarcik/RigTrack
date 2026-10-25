-- RigTrack: plán pódia Nivtec uložený k eventu (3.15).
-- Kalkulačka uloží zadanie (rozmery, výška, schody, plachta, molo, rizery…) k eventu; pri otvorení z eventu
-- sa plán načíta a v detaile eventu je súhrn s odkazom na nákres a tlač.

create table if not exists public.event_stage_plans (
  company_id uuid not null,
  event_id uuid primary key,
  request jsonb not null check (jsonb_typeof(request) = 'object' and char_length(request::text) <= 20000),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);

alter table public.event_stage_plans enable row level security;
drop policy if exists event_stage_plans_select on public.event_stage_plans;
drop policy if exists event_stage_plans_write on public.event_stage_plans;
create policy event_stage_plans_select on public.event_stage_plans for select to authenticated
  using (public.can(company_id, 'events.view') or public.is_event_crew(event_id));
create policy event_stage_plans_write on public.event_stage_plans for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
revoke all on public.event_stage_plans from anon, authenticated;
grant select, insert, update, delete on public.event_stage_plans to authenticated;
