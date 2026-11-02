-- RigTrack 5.14: tlačová fronta (štítky na tlač naraz) a nastavenia firmy pre tlač a kľúčové slová @todo / @toprint.

-- Nastavenia firmy (JSON): kam sa tlačí QR (A4 / Brother), veľkosť QR na A4 a komu sa priraďujú úlohy z @todo a @toprint.
create table if not exists public.company_prefs (
  company_id uuid primary key references public.companies (id) on delete cascade,
  prefs jsonb not null default '{}' check (jsonb_typeof(prefs) = 'object' and pg_column_size(prefs) <= 16000),
  updated_at timestamptz not null default now()
);
alter table public.company_prefs enable row level security;
revoke all on public.company_prefs from anon, authenticated;
grant select, insert on public.company_prefs to authenticated;
grant update (prefs, updated_at) on public.company_prefs to authenticated;

drop policy if exists company_prefs_select on public.company_prefs;
create policy company_prefs_select on public.company_prefs for select to authenticated using (public.is_company_member(company_id));
drop policy if exists company_prefs_insert on public.company_prefs;
create policy company_prefs_insert on public.company_prefs for insert to authenticated with check (public.can(company_id, 'lookups.manage'));
drop policy if exists company_prefs_update on public.company_prefs;
create policy company_prefs_update on public.company_prefs for update to authenticated
  using (public.can(company_id, 'lookups.manage')) with check (public.can(company_id, 'lookups.manage'));

-- Tlačová fronta: QR štítok techniky (aj kusu) alebo case, alebo štítok na pásku; vytlačí sa naraz.
create table if not exists public.print_queue (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('equipment', 'case')),
  target_id uuid not null,
  label text not null default 'qr' check (label in ('qr', 'tape')),
  note text not null default '' check (char_length(note) <= 200),
  added_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, kind, target_id, label)
);
create index if not exists print_queue_company_idx on public.print_queue (company_id, created_at);
alter table public.print_queue enable row level security;
revoke all on public.print_queue from anon, authenticated;
grant select, delete on public.print_queue to authenticated;
grant insert (company_id, kind, target_id, label, note) on public.print_queue to authenticated;

drop policy if exists print_queue_select on public.print_queue;
create policy print_queue_select on public.print_queue for select to authenticated using (public.is_company_member(company_id));
-- Pridať a vyprázdniť môže každý člen firmy, ktorý vidí techniku alebo cases.
drop policy if exists print_queue_insert on public.print_queue;
create policy print_queue_insert on public.print_queue for insert to authenticated
  with check (public.is_company_member(company_id) and (public.can(company_id, 'equipment.view') or public.can(company_id, 'cases.view')));
drop policy if exists print_queue_delete on public.print_queue;
create policy print_queue_delete on public.print_queue for delete to authenticated using (public.is_company_member(company_id));
