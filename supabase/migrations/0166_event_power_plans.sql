-- 0166: elektrika eventu po miestach.
-- K eventu sa uloží plán: miesta (strecha, rampy, pódium, zvuk…) s technikou z eventu, ďalší odber
-- a elektrocentrály (aj požičané od inej firmy). Odporúčané prívody a dimmery sa rátajú v appke.
-- Čítajú tí, čo vidia eventy (aj posádka eventu), upravujú tí, čo eventy upravujú – ako plán pódia (0095).

create table if not exists public.event_power_plans (
  company_id uuid not null,
  event_id uuid primary key,
  plan jsonb not null check (jsonb_typeof(plan) = 'object' and char_length(plan::text) <= 60000),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists event_power_plans_company_idx on public.event_power_plans (company_id);

alter table public.event_power_plans enable row level security;
drop policy if exists event_power_plans_select on public.event_power_plans;
drop policy if exists event_power_plans_write on public.event_power_plans;
create policy event_power_plans_select on public.event_power_plans for select to authenticated
  using (public.can(company_id, 'events.view') or public.is_event_crew(event_id));
create policy event_power_plans_write on public.event_power_plans for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
revoke all on public.event_power_plans from anon, authenticated;
grant select, insert, delete on public.event_power_plans to authenticated;
-- Firma ani event sa úpravou nemenia, len plán; kto a kedy ho zmenil, zapíše databáza.
grant update (plan) on public.event_power_plans to authenticated;

create or replace function public.event_power_plans_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists event_power_plans_touch on public.event_power_plans;
create trigger event_power_plans_touch before insert or update on public.event_power_plans
  for each row execute function public.event_power_plans_touch();
