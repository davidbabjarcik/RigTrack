-- RigTrack 10.8: šablóny eventov. Event (technika, posádka, časy, miesto a elektrina) sa uloží ako šablóna, napr.
-- „Svadba – základ“, a nový event sa z nej vytvorí jedným ťuknutím. Šablóny vidí, kto vidí eventy; ukladá, mení
-- a maže ich, kto upravuje eventy. Obsah je len zoznam (jsonb s obmedzenou veľkosťou), technika sa pri použití
-- pridáva bežnou cestou, takže platia všetky pravidlá eventov (predaná / archívna technika, RLS).

create table if not exists public.event_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 60000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);
create index if not exists event_templates_created_by_idx on public.event_templates (created_by);
alter table public.event_templates enable row level security;

drop policy if exists event_templates_select on public.event_templates;
create policy event_templates_select on public.event_templates for select to authenticated using (public.can(company_id, 'events.view'));
drop policy if exists event_templates_insert on public.event_templates;
create policy event_templates_insert on public.event_templates for insert to authenticated with check (public.can(company_id, 'events.edit'));
drop policy if exists event_templates_update on public.event_templates;
create policy event_templates_update on public.event_templates for update to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
drop policy if exists event_templates_delete on public.event_templates;
create policy event_templates_delete on public.event_templates for delete to authenticated using (public.can(company_id, 'events.edit'));

revoke all on public.event_templates from anon, authenticated;
grant select, delete on public.event_templates to authenticated;
grant insert (company_id, name, data) on public.event_templates to authenticated;
grant update (name, data, updated_at) on public.event_templates to authenticated;
