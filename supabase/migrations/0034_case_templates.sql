-- RigTrack: šablóny cases.
-- Typ case (napr. „Thon case 120“) s rozmermi a hmotnosťou sa zadá raz; nový case sa potom
-- založí výberom šablóny a rozmery sa doplnia samy. Šablóna je len predloha: neskoršia
-- zmena šablóny už existujúce cases nemení.
-- Vidí ich každý člen; spravuje ten, kto spravuje zoznamy (lookups.manage).

create table public.case_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  label_category text not null default '' check (char_length(label_category) <= 40),
  weight_kg numeric(7, 2) check (weight_kg > 0),
  width_cm numeric(7, 1) check (width_cm > 0),
  length_cm numeric(7, 1) check (length_cm > 0),
  depth_cm numeric(7, 1) check (depth_cm > 0),
  created_at timestamptz not null default now()
);
create unique index case_templates_name_idx on public.case_templates (company_id, lower(name));

alter table public.case_templates enable row level security;

create policy case_templates_select on public.case_templates for select to authenticated
  using (public.is_company_member(company_id));
create policy case_templates_insert on public.case_templates for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy case_templates_update on public.case_templates for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));
create policy case_templates_delete on public.case_templates for delete to authenticated
  using (public.can(company_id, 'lookups.manage'));

revoke all on public.case_templates from anon, authenticated;
grant select, insert, delete on public.case_templates to authenticated;
grant update (name, label_category, weight_kg, width_cm, length_cm, depth_cm) on public.case_templates to authenticated;
