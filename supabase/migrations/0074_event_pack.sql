-- RigTrack: pack list eventu (2.11).
-- Pri nakladaní a pri návrate sa technika a cases odškrtávajú; kto a kedy, zapíše server.

create table public.event_pack_checks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  -- odškrtnutá položka: technika alebo celý case
  equipment_id uuid references public.equipment (id) on delete cascade,
  case_id uuid references public.cases (id) on delete cascade,
  phase text not null check (phase in ('out', 'back')),
  checked_by uuid default auth.uid() references public.profiles (id) on delete set null,
  checked_by_name text not null default '',
  checked_at timestamptz not null default now(),
  check ((equipment_id is null) <> (case_id is null)),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create unique index event_pack_checks_item_idx on public.event_pack_checks (event_id, phase, coalesce(equipment_id, case_id));

create or replace function public.stamp_pack_check()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.checked_by := auth.uid();
  new.checked_at := now();
  new.checked_by_name := coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
  return new;
end;
$$;
revoke execute on function public.stamp_pack_check() from public, anon, authenticated;
create trigger event_pack_checks_stamp before insert on public.event_pack_checks
  for each row execute function public.stamp_pack_check();

alter table public.event_pack_checks enable row level security;
create policy event_pack_checks_select on public.event_pack_checks for select to authenticated using (public.can(company_id, 'events.view'));
-- Odškrtávať smie, kto upravuje eventy, alebo kto je v posádke eventu.
create policy event_pack_checks_insert on public.event_pack_checks for insert to authenticated
  with check (
    public.can(company_id, 'events.edit')
    or exists (select 1 from public.event_crew c where c.event_id = event_pack_checks.event_id and c.member_id = auth.uid())
  );
create policy event_pack_checks_delete on public.event_pack_checks for delete to authenticated
  using (
    public.can(company_id, 'events.edit')
    or exists (select 1 from public.event_crew c where c.event_id = event_pack_checks.event_id and c.member_id = auth.uid())
  );
revoke all on public.event_pack_checks from anon, authenticated;
grant select, delete on public.event_pack_checks to authenticated;
grant insert (company_id, event_id, equipment_id, case_id, phase) on public.event_pack_checks to authenticated;
