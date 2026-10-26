-- RigTrack 4.4: šablóny patch listov (zvuk aj DMX) a DMX patch list pri evente.

-- Šablóna = pomenovaný zoznam riadkov (napr. „Kapela – základ“), ktorý sa pri evente načíta jedným klikom.
create table if not exists public.patch_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('sound', 'dmx')),
  name text not null check (char_length(trim(name)) between 1 and 80),
  note text not null default '' check (char_length(note) <= 300),
  lines jsonb not null default '[]' check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) <= 512),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists patch_templates_company_idx on public.patch_templates (company_id, kind, name);
alter table public.patch_templates enable row level security;
drop policy if exists patch_templates_select on public.patch_templates;
drop policy if exists patch_templates_write on public.patch_templates;
create policy patch_templates_select on public.patch_templates for select to authenticated using (public.can(company_id, 'events.view'));
create policy patch_templates_write on public.patch_templates for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
revoke all on public.patch_templates from anon, authenticated;
grant select, insert, delete on public.patch_templates to authenticated;
grant update (name, note, lines, updated_at) on public.patch_templates to authenticated;

-- DMX patch list eventu: jedno svetlo (alebo kus) na riadok – linka, adresa, počet kanálov, mód.
create table if not exists public.event_dmx_patch (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  universe text not null default '' check (char_length(universe) <= 20),
  address integer check (address between 1 and 512),
  channels integer not null default 1 check (channels between 1 and 512),
  name text not null default '' check (char_length(name) <= 80),
  equipment_id uuid references public.equipment (id) on delete set null,
  unit integer check (unit between 1 and 100000),
  mode text not null default '' check (char_length(mode) <= 40),
  note text not null default '' check (char_length(note) <= 200),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists event_dmx_patch_event_idx on public.event_dmx_patch (event_id, universe, address);
alter table public.event_dmx_patch enable row level security;
drop policy if exists event_dmx_patch_select on public.event_dmx_patch;
drop policy if exists event_dmx_patch_write on public.event_dmx_patch;
create policy event_dmx_patch_select on public.event_dmx_patch for select to authenticated using (public.can(company_id, 'events.view'));
create policy event_dmx_patch_write on public.event_dmx_patch for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
revoke all on public.event_dmx_patch from anon, authenticated;
grant select, insert, delete on public.event_dmx_patch to authenticated;
grant update (universe, address, channels, name, equipment_id, unit, mode, note) on public.event_dmx_patch to authenticated;
