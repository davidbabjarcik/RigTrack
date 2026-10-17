-- RigTrack: pripomienky pri eventoch.
-- Pravidlá „keď je na evente X, pripomeň Y“ (napr. pasívne repro → kabeláž NL4, svetlá → case s hákmi).
-- Jeden záznam na firmu so zoznamom pravidiel v JSON; obsah overuje aplikácia.
-- Vidí ich každý člen; mení ten, kto spravuje zoznamy (lookups.manage).

create table public.event_rules (
  company_id uuid primary key references public.companies (id) on delete cascade,
  rules jsonb not null default '[]'::jsonb
    check (jsonb_typeof(rules) = 'array' and pg_column_size(rules) <= 50000),
  updated_at timestamptz not null default now()
);

create trigger event_rules_touch_updated_at
  before update on public.event_rules
  for each row execute function public.touch_updated_at();

alter table public.event_rules enable row level security;

create policy event_rules_select on public.event_rules for select to authenticated
  using (public.is_company_member(company_id));
create policy event_rules_insert on public.event_rules for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy event_rules_update on public.event_rules for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));

revoke all on public.event_rules from anon, authenticated;
grant select, insert on public.event_rules to authenticated;
grant update (rules) on public.event_rules to authenticated;
