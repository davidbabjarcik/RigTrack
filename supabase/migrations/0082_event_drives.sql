-- RigTrack: kto šoféroval pri evente (3.2).
-- Ku každému dňu eventu sa zapíše, kto viedol ktoré auto, kam (tam, späť alebo oboje) a koľko km.
-- Štatistiky z toho rátajú jazdy a kilometre po ľuďoch; na karte zamestnanca vidno, kde šoféroval.

create table if not exists public.event_drives (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  drive_date date not null,
  vehicle_id uuid,
  member_id uuid references public.profiles (id) on delete cascade,
  driver_name text not null default '' check (char_length(driver_name) <= 80),
  direction text not null default 'both' check (direction in ('there', 'back', 'both')),
  route text not null default '' check (char_length(route) <= 200),
  km numeric(8, 1) check (km >= 0 and km < 100000),
  created_at timestamptz not null default now(),
  check ((member_id is null) <> (trim(driver_name) = '')),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade,
  foreign key (company_id, vehicle_id) references public.vehicles (company_id, id) on delete set null (vehicle_id)
);
create index if not exists event_drives_event_idx on public.event_drives (company_id, event_id, drive_date);
create index if not exists event_drives_member_idx on public.event_drives (company_id, member_id);

alter table public.event_drives enable row level security;
drop policy if exists event_drives_select on public.event_drives;
drop policy if exists event_drives_insert on public.event_drives;
drop policy if exists event_drives_delete on public.event_drives;
create policy event_drives_select on public.event_drives for select to authenticated
  using (public.can(company_id, 'events.view') or public.is_event_crew(event_id));
-- Zapisuje, kto upravuje eventy; šofér z posádky môže zapísať (a zmazať) sám seba.
create policy event_drives_insert on public.event_drives for insert to authenticated
  with check (
    public.can(company_id, 'events.edit')
    or (member_id = auth.uid() and public.is_company_member(company_id) and public.is_event_crew(event_id))
  );
create policy event_drives_delete on public.event_drives for delete to authenticated
  using (public.can(company_id, 'events.edit') or (member_id = auth.uid() and public.is_company_member(company_id)));
revoke all on public.event_drives from anon, authenticated;
grant select, insert, delete on public.event_drives to authenticated;
