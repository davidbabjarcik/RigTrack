-- RigTrack: hodinové sadzby a mesačný výkaz dochádzky (3.12).
-- Admin zadá človeku sadzbu za hodinu na firme, doma a na evente; z dochádzky za mesiac appka navrhne odmenu
-- a zapíše ju do Odmien. Sadzbu vidí admin a každý len svoju.

create table if not exists public.member_rates (
  company_id uuid not null references public.companies (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  company_rate numeric(8, 2) check (company_rate >= 0),
  home_rate numeric(8, 2) check (home_rate >= 0),
  event_rate numeric(8, 2) check (event_rate >= 0),
  updated_at timestamptz not null default now(),
  primary key (company_id, member_id)
);

alter table public.member_rates enable row level security;
drop policy if exists member_rates_select on public.member_rates;
drop policy if exists member_rates_write on public.member_rates;
create policy member_rates_select on public.member_rates for select to authenticated
  using (public.has_role(company_id, 'admin') or (member_id = auth.uid() and public.is_company_member(company_id)));
create policy member_rates_write on public.member_rates for all to authenticated
  using (public.has_role(company_id, 'admin')) with check (public.has_role(company_id, 'admin') and public.is_member_of(company_id, member_id));
revoke all on public.member_rates from anon, authenticated;
grant select, insert, update, delete on public.member_rates to authenticated;
