-- RigTrack: patch list zvuku pri evente (2.1).
-- Každý riadok je jeden kanál: čo na ňom ide, do ktorého stageboxu a vstupu, a zdroj – mikrofón z techniky,
-- bezdrôtový mikrofón s kapsulou, DI, alebo port (madona / jack). Tlačí sa do PDF.

create table public.event_patch (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  channel integer not null check (channel between 1 and 512),
  name text not null default '' check (char_length(name) <= 80),
  stagebox text not null default '' check (char_length(stagebox) <= 40),
  stagebox_input integer check (stagebox_input between 1 and 512),
  source text not null default 'mic' check (source in ('mic', 'wireless', 'di', 'port', 'other')),
  equipment_id uuid references public.equipment (id) on delete set null,
  capsule_id uuid references public.mic_capsules (id) on delete set null,
  connector text not null default '' check (connector in ('', 'xlr', 'jack', 'other')),
  stand text not null default '' check (stand in ('', 'short', 'tall', 'clamp', 'none')),
  phantom boolean not null default false,
  note text not null default '' check (char_length(note) <= 200),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index event_patch_event_idx on public.event_patch (event_id, channel);
alter table public.event_patch enable row level security;
create policy event_patch_select on public.event_patch for select to authenticated using (public.can(company_id, 'events.view'));
create policy event_patch_write on public.event_patch for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
revoke all on public.event_patch from anon, authenticated;
grant select, insert, delete on public.event_patch to authenticated;
grant update (channel, name, stagebox, stagebox_input, source, equipment_id, capsule_id, connector, stand, phantom, note) on public.event_patch to authenticated;
