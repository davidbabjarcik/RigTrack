-- RigTrack: zapamätané názvy techniky z cudzích zoznamov (napr. Equipment Report z Capture).
-- Keď sa pri importe na event raz potvrdí, že „Clay Paky Sharpy“ je naša technika X,
-- pri ďalšom importe sa to priradí samo. Alias je normalizovaný názov (malé písmená, bez diakritiky).
-- Vidí ich každý člen; mení ten, kto smie upravovať eventy.

create table public.equipment_aliases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 200),
  equipment_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade,
  unique (company_id, alias)
);

alter table public.equipment_aliases enable row level security;

create policy equipment_aliases_select on public.equipment_aliases for select to authenticated
  using (public.is_company_member(company_id));
create policy equipment_aliases_insert on public.equipment_aliases for insert to authenticated
  with check (public.can(company_id, 'events.edit'));
create policy equipment_aliases_delete on public.equipment_aliases for delete to authenticated
  using (public.can(company_id, 'events.edit'));

revoke all on public.equipment_aliases from anon, authenticated;
grant select, insert, delete on public.equipment_aliases to authenticated;
