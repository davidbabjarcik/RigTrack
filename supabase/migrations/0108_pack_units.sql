-- RigTrack 4.8: pack list – naskenované jednotlivé kusy (QR kusu „Beam 7R #7“). Keď sú naskenované všetky kusy
-- položky, appka položku odškrtne. Kto smie odškrtávať, smie aj skenovať kusy (rovnako ako event_pack_checks).

create table if not exists public.event_pack_units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  unit integer not null check (unit between 1 and 100000),
  phase text not null check (phase in ('out', 'back')),
  checked_by uuid default auth.uid() references public.profiles (id) on delete set null,
  checked_at timestamptz not null default now(),
  unique (event_id, equipment_id, unit, phase),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
alter table public.event_pack_units enable row level security;
drop policy if exists event_pack_units_select on public.event_pack_units;
drop policy if exists event_pack_units_write on public.event_pack_units;
create policy event_pack_units_select on public.event_pack_units for select to authenticated using (public.can(company_id, 'events.view'));
create policy event_pack_units_write on public.event_pack_units for all to authenticated
  using (
    public.can(company_id, 'events.edit')
    or exists (select 1 from public.event_crew c where c.event_id = event_pack_units.event_id and c.member_id = auth.uid())
  )
  with check (
    public.can(company_id, 'events.edit')
    or exists (select 1 from public.event_crew c where c.event_id = event_pack_units.event_id and c.member_id = auth.uid())
  );
revoke all on public.event_pack_units from anon, authenticated;
grant select, insert, delete on public.event_pack_units to authenticated;
