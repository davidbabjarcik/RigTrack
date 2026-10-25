-- RigTrack: cenové ponuky s vlastnými časťami (3.17).
-- Ponuka pre klienta: hlavička (pre koho, podujatie, miesto a termín dodania), časti A, B, C… (aj A1, A2) s popisom,
-- zoznamom techniky, čo cena zahŕňa a cenou, zhrnutie, celková (zvýhodnená) cena a poznámky. Môže byť naviazaná
-- na event. Časti sa dajú uložiť ako šablóny a použiť v ďalšej ponuke.
-- Vystavovatelia: jedna firma môže ponuky vystavovať za rôzne subjekty (napr. s.r.o. alebo živnosť); ponuka si
-- uloží kópiu údajov vystavovateľa, aby sa neskoršou zmenou nezmenila. Rozpočet: max. suma, do ktorej sa skladá
-- technika (cena z cenníka prenájmu), appka ukazuje, koľko ostáva.
-- Oprávnenia: offers.view (vidieť ponuky a ceny), offers.edit (vytvárať a upravovať), offers.delete (mazať);
-- predvolene skladník vidí a upravuje, admin a CEO vždy všetko. Vystavovateľov spravuje admin.

create or replace function public.permission_defaults()
returns table (permission text, roles public.app_role[])
language sql immutable set search_path = '' as $$
  values
    ('equipment.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('equipment.edit', array['skladnik', 'technik']::public.app_role[]),
    ('equipment.delete', array['skladnik']::public.app_role[]),
    ('lookups.manage', array['skladnik']::public.app_role[]),
    ('cases.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('cases.edit', array['skladnik', 'technik']::public.app_role[]),
    ('cases.delete', array['skladnik']::public.app_role[]),
    ('cases.check', array['skladnik', 'technik']::public.app_role[]),
    ('orders.view', array['skladnik']::public.app_role[]),
    ('orders.edit', array['skladnik']::public.app_role[]),
    ('orders.delete', array[]::public.app_role[]),
    ('vehicles.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('vehicles.log', array['skladnik', 'technik']::public.app_role[]),
    ('vehicles.edit', array['skladnik']::public.app_role[]),
    ('vehicles.delete', array[]::public.app_role[]),
    ('loans.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('loans.edit', array['skladnik', 'technik']::public.app_role[]),
    ('loans.delete', array['skladnik']::public.app_role[]),
    ('events.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('events.edit', array['skladnik', 'technik']::public.app_role[]),
    ('events.delete', array['skladnik']::public.app_role[]),
    ('service.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('service.edit', array['skladnik', 'technik']::public.app_role[]),
    ('service.delete', array['skladnik']::public.app_role[]),
    ('tasks.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('tasks.edit', array['skladnik', 'technik']::public.app_role[]),
    ('tasks.delete', array['skladnik']::public.app_role[]),
    ('shopping.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('shopping.edit', array['skladnik', 'technik']::public.app_role[]),
    ('shopping.delete', array['skladnik']::public.app_role[]),
    ('suggestions.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('suggestions.add', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('suggestions.manage', array['skladnik']::public.app_role[]),
    ('suggestions.delete', array[]::public.app_role[]),
    ('payouts.view_all', array[]::public.app_role[]),
    ('payouts.manage', array[]::public.app_role[]),
    ('audit.view', array[]::public.app_role[]),
    ('staff.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('staff.manage', array['skladnik']::public.app_role[]),
    ('report.view', array['skladnik', 'technik']::public.app_role[]),
    ('report.money', array[]::public.app_role[]),
    ('offers.view', array['skladnik']::public.app_role[]),
    ('offers.edit', array['skladnik']::public.app_role[]),
    ('offers.delete', array[]::public.app_role[])
$$;

create table if not exists public.quote_issuers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  address text not null default '' check (char_length(address) <= 300),
  ico text not null default '' check (char_length(ico) <= 20),
  dic text not null default '' check (char_length(dic) <= 20),
  ic_dph text not null default '' check (char_length(ic_dph) <= 20),
  contact text not null default '' check (char_length(contact) <= 300),
  vat_payer boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists quote_issuers_company_idx on public.quote_issuers (company_id, sort);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  event_id uuid,
  number text not null default '' check (char_length(number) <= 40),
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  client jsonb not null default '{}' check (jsonb_typeof(client) = 'object' and char_length(client::text) <= 2000),
  title text not null default '' check (char_length(title) <= 200),
  place text not null default '' check (char_length(place) <= 200),
  service_dates text not null default '' check (char_length(service_dates) <= 200),
  issued_on date not null default current_date,
  sections jsonb not null default '[]' check (jsonb_typeof(sections) = 'array' and char_length(sections::text) <= 100000),
  issuer_id uuid references public.quote_issuers (id) on delete set null,
  issuer jsonb not null default '{}' check (jsonb_typeof(issuer) = 'object' and char_length(issuer::text) <= 2000),
  budget numeric(12, 2) check (budget >= 0),
  vat_mode text not null default 'with' check (vat_mode in ('with', 'plus', 'none')),
  vat_pct numeric(5, 2) not null default 23 check (vat_pct between 0 and 100),
  total_override numeric(12, 2) check (total_override >= 0),
  notes text not null default '' check (char_length(notes) <= 3000),
  author_name text not null default '' check (char_length(author_name) <= 120),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete set null (event_id)
);
create index if not exists quotes_company_idx on public.quotes (company_id, issued_on desc);

create table if not exists public.quote_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  part jsonb not null check (jsonb_typeof(part) = 'object' and char_length(part::text) <= 20000),
  created_at timestamptz not null default now()
);
create index if not exists quote_templates_company_idx on public.quote_templates (company_id, title);

alter table public.quote_issuers enable row level security;
drop policy if exists quote_issuers_select on public.quote_issuers;
drop policy if exists quote_issuers_write on public.quote_issuers;
create policy quote_issuers_select on public.quote_issuers for select to authenticated using (public.can(company_id, 'offers.view'));
create policy quote_issuers_write on public.quote_issuers for all to authenticated using (public.has_role(company_id, 'admin')) with check (public.has_role(company_id, 'admin'));
revoke all on public.quote_issuers from anon, authenticated;
grant select, insert, update, delete on public.quote_issuers to authenticated;

alter table public.quotes enable row level security;
alter table public.quote_templates enable row level security;
drop policy if exists quotes_select on public.quotes;
drop policy if exists quotes_write on public.quotes;
drop policy if exists quote_templates_select on public.quote_templates;
drop policy if exists quote_templates_write on public.quote_templates;
drop policy if exists quotes_insert on public.quotes;
drop policy if exists quotes_update on public.quotes;
drop policy if exists quotes_delete on public.quotes;
create policy quotes_select on public.quotes for select to authenticated using (public.can(company_id, 'offers.view'));
create policy quotes_insert on public.quotes for insert to authenticated with check (public.can(company_id, 'offers.edit'));
create policy quotes_update on public.quotes for update to authenticated using (public.can(company_id, 'offers.edit')) with check (public.can(company_id, 'offers.edit'));
create policy quotes_delete on public.quotes for delete to authenticated using (public.can(company_id, 'offers.delete'));
create policy quote_templates_select on public.quote_templates for select to authenticated using (public.can(company_id, 'offers.view'));
create policy quote_templates_write on public.quote_templates for all to authenticated using (public.can(company_id, 'offers.edit')) with check (public.can(company_id, 'offers.edit'));
revoke all on public.quotes, public.quote_templates from anon, authenticated;
grant select, insert, update, delete on public.quotes, public.quote_templates to authenticated;
