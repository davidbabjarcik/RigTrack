-- 0171: zisk z eventu.
-- Ďalšie náklady eventu (prenájom od partnerov, subdodávka, auto, iné) a nastavenie výpočtu
-- (sadzba za km, koľko dní v roku sa technika používa – na opotrebenie).
-- Vidí a mení len ten, kto spravuje peniaze firmy (payouts.manage), ako príjmy z akcie (0042).

create table if not exists public.event_costs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  kind text not null default 'other' check (kind in ('rental', 'subcontract', 'vehicle', 'other')),
  partner_id uuid,
  amount numeric(10, 2) not null check (amount > 0 and amount < 1000000),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade,
  foreign key (company_id, partner_id) references public.partners (company_id, id) on delete set null (partner_id)
);
create index if not exists event_costs_event_idx on public.event_costs (company_id, event_id);
create index if not exists event_costs_partner_idx on public.event_costs (company_id, partner_id);

alter table public.event_costs enable row level security;
drop policy if exists event_costs_select on public.event_costs;
drop policy if exists event_costs_insert on public.event_costs;
drop policy if exists event_costs_delete on public.event_costs;
create policy event_costs_select on public.event_costs for select to authenticated
  using (public.can(company_id, 'payouts.manage'));
create policy event_costs_insert on public.event_costs for insert to authenticated
  with check (public.can(company_id, 'payouts.manage'));
create policy event_costs_delete on public.event_costs for delete to authenticated
  using (public.can(company_id, 'payouts.manage'));
revoke all on public.event_costs from anon, authenticated;
grant select, insert, delete on public.event_costs to authenticated;

create table if not exists public.profit_settings (
  company_id uuid primary key references public.companies (id) on delete cascade,
  -- náklad na 1 km auta (opotrebenie, nafta – ak sa nafta nezapisuje do výdavkov)
  km_rate numeric(6, 3) not null default 0 check (km_rate >= 0 and km_rate <= 100),
  -- koľko dní v roku je technika na akciách; ročný odpis sa delí týmito dňami
  gear_use_days smallint not null default 60 check (gear_use_days between 1 and 366)
);

alter table public.profit_settings enable row level security;
drop policy if exists profit_settings_select on public.profit_settings;
drop policy if exists profit_settings_insert on public.profit_settings;
drop policy if exists profit_settings_update on public.profit_settings;
create policy profit_settings_select on public.profit_settings for select to authenticated
  using (public.can(company_id, 'payouts.manage'));
create policy profit_settings_insert on public.profit_settings for insert to authenticated
  with check (public.can(company_id, 'payouts.manage'));
create policy profit_settings_update on public.profit_settings for update to authenticated
  using (public.can(company_id, 'payouts.manage')) with check (public.can(company_id, 'payouts.manage'));
revoke all on public.profit_settings from anon, authenticated;
grant select, insert on public.profit_settings to authenticated;
grant update (km_rate, gear_use_days) on public.profit_settings to authenticated;
