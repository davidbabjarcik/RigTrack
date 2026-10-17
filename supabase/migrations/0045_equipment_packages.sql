-- RigTrack: balíky techniky.
-- Vopred poskladaná sada (napr. „Malý zvukový balík“, „Veľký svetelný balík“): technika s počtami
-- a celé cases. Na event alebo do výpožičky sa pridá jedným klikom.
-- Obsah je JSON (overuje ho aplikácia); zmazaná technika sa pri pridávaní preskočí.
-- Vidí ich každý člen; spravuje ten, kto spravuje zoznamy (lookups.manage).

create table public.equipment_packages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  category text not null default '' check (char_length(category) <= 60),
  note text not null default '' check (char_length(note) <= 500),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and pg_column_size(items) <= 30000),
  cases jsonb not null default '[]'::jsonb check (jsonb_typeof(cases) = 'array' and pg_column_size(cases) <= 10000),
  created_at timestamptz not null default now()
);
create unique index equipment_packages_name_idx on public.equipment_packages (company_id, lower(name));

alter table public.equipment_packages enable row level security;

create policy equipment_packages_select on public.equipment_packages for select to authenticated
  using (public.is_company_member(company_id));
create policy equipment_packages_insert on public.equipment_packages for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy equipment_packages_update on public.equipment_packages for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));
create policy equipment_packages_delete on public.equipment_packages for delete to authenticated
  using (public.can(company_id, 'lookups.manage'));

revoke all on public.equipment_packages from anon, authenticated;
grant select, insert, delete on public.equipment_packages to authenticated;
grant update (name, category, note, items, cases) on public.equipment_packages to authenticated;
