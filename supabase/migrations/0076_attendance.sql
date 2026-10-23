-- RigTrack: stretávky a dochádzka podľa polohy (2.14).
-- Pri evente sa zadá čas a miesto stretávky (firma, akcia, hotel, iná adresa) so súradnicami.
-- Človek z posádky na mieste klikne „Som tu“ – čas príchodu dá server. Po „Končím“ sa dochádzka
-- sama zapíše do výkazu času eventu. Vedúci (events.edit) môže časy opraviť; výkaz sa opraví s nimi.
-- Prestávky a čakanie (napr. na niekoho) sa odpočítajú: člen ich zapína a vypína tlačidlom, čas dá server.
-- Poloha sa neukladá, len či bol príchod overený polohou a v akej vzdialenosti od miesta.

create table if not exists public.event_meetings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  meet_at timestamptz not null,
  place_kind text not null default 'event' check (place_kind in ('company', 'event', 'hotel', 'custom')),
  address text not null default '' check (char_length(address) <= 200),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  radius_m integer not null default 300 check (radius_m between 50 and 5000),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists event_meetings_event_idx on public.event_meetings (company_id, event_id, meet_at);

create table if not exists public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  meeting_id uuid references public.event_meetings (id) on delete set null,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- príchod overený polohou (v polomere stretávky) a vzdialenosť od miesta v metroch
  verified boolean not null default false,
  distance_m integer check (distance_m >= 0),
  -- prebiehajúca prestávka / čakanie a odpočítané minúty spolu
  paused_at timestamptz,
  pause_kind text check (pause_kind in ('break', 'wait')),
  break_minutes integer not null default 0 check (break_minutes between 0 and 1440),
  wait_minutes integer not null default 0 check (wait_minutes between 0 and 1440),
  work_log_id uuid references public.event_work_logs (id) on delete set null,
  edited_by_name text not null default '',
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
-- Jedna rozbehnutá dochádzka na človeka a event.
create unique index if not exists event_attendance_open_idx on public.event_attendance (event_id, user_id) where ended_at is null;
create index if not exists event_attendance_event_idx on public.event_attendance (company_id, event_id, started_at);

/** Je prihlásený v posádke eventu (a pozvánku neodmietol)? */
create or replace function public.is_event_crew(_event_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.event_crew c where c.event_id = _event_id and c.member_id = auth.uid() and c.response <> 'no')
$$;
revoke execute on function public.is_event_crew(uuid) from public, anon;
grant execute on function public.is_event_crew(uuid) to authenticated;

-- Príchod: kto a kedy rozhoduje server, nie mobil.
create or replace function public.stamp_attendance()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := auth.uid();
  new.started_at := now();
  new.ended_at := null;
  new.work_log_id := null;
  new.edited_by_name := '';
  new.paused_at := null;
  new.pause_kind := null;
  new.break_minutes := 0;
  new.wait_minutes := 0;
  return new;
end;
$$;

-- Prestávka, odchod a opravy: člen len zapína / vypína prestávku a končí (časy dá server),
-- vedúci (events.edit) môže zmeniť príchod, odchod aj odpočítané minúty.
-- Ukončená dochádzka sa zapíše (alebo opraví) vo výkaze času eventu.
create or replace function public.finish_attendance()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  zone constant text := 'Europe/Bratislava';
  editor boolean := public.can(old.company_id, 'events.edit');
  ending boolean := old.ended_at is null and new.ended_at is not null;
  paused integer;
begin
  new.company_id := old.company_id;
  new.event_id := old.event_id;
  new.user_id := old.user_id;
  new.meeting_id := old.meeting_id;
  new.verified := old.verified;
  new.distance_m := old.distance_m;
  new.work_log_id := old.work_log_id;
  if not editor then
    new.started_at := old.started_at;
    new.break_minutes := old.break_minutes;
    new.wait_minutes := old.wait_minutes;
    new.ended_at := case when ending then now() else old.ended_at end;
  end if;
  if editor and (
    new.started_at is distinct from old.started_at
    or (old.ended_at is not null and new.ended_at is distinct from old.ended_at)
    or new.break_minutes is distinct from old.break_minutes
    or new.wait_minutes is distinct from old.wait_minutes
  ) then
    new.edited_by_name := coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
  else
    new.edited_by_name := old.edited_by_name;
  end if;

  -- Prestávka: začiatok a koniec určuje server; pri odchode sa prebiehajúca ukončí.
  if old.paused_at is not null and (new.paused_at is null or ending) then
    paused := least(1440, ceil(extract(epoch from (now() - old.paused_at)) / 60)::integer);
    if old.pause_kind = 'wait' then
      new.wait_minutes := least(1440, new.wait_minutes + paused);
    else
      new.break_minutes := least(1440, new.break_minutes + paused);
    end if;
    new.paused_at := null;
    new.pause_kind := null;
  elsif old.paused_at is null and new.paused_at is not null and old.ended_at is null and not ending then
    new.paused_at := now();
    new.pause_kind := coalesce(new.pause_kind, 'break');
  else
    new.paused_at := old.paused_at;
    new.pause_kind := old.pause_kind;
  end if;

  if new.ended_at is not null then
    if new.work_log_id is null then
      insert into public.event_work_logs (company_id, event_id, user_id, work_date, starts_at, ends_at, break_minutes, note)
      values (
        new.company_id, new.event_id, new.user_id,
        (new.started_at at time zone zone)::date,
        (new.started_at at time zone zone)::time(0),
        (new.ended_at at time zone zone)::time(0),
        least(1440, new.break_minutes + new.wait_minutes),
        'Dochádzka' || case when new.wait_minutes > 0 then ' (čakanie ' || new.wait_minutes || ' min)' else '' end
      )
      returning id into new.work_log_id;
    else
      update public.event_work_logs
        set work_date = (new.started_at at time zone zone)::date,
            starts_at = (new.started_at at time zone zone)::time(0),
            ends_at = (new.ended_at at time zone zone)::time(0),
            break_minutes = least(1440, new.break_minutes + new.wait_minutes),
            note = 'Dochádzka' || case when new.wait_minutes > 0 then ' (čakanie ' || new.wait_minutes || ' min)' else '' end
        where id = new.work_log_id;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_attendance(), public.finish_attendance() from public, anon, authenticated;
drop trigger if exists event_attendance_stamp on public.event_attendance;
create trigger event_attendance_stamp before insert on public.event_attendance for each row execute function public.stamp_attendance();
drop trigger if exists event_attendance_finish on public.event_attendance;
create trigger event_attendance_finish before update on public.event_attendance for each row execute function public.finish_attendance();

alter table public.event_meetings enable row level security;
alter table public.event_attendance enable row level security;
drop policy if exists event_meetings_select on public.event_meetings;
drop policy if exists event_meetings_write on public.event_meetings;
drop policy if exists event_meetings_update on public.event_meetings;
drop policy if exists event_meetings_delete on public.event_meetings;
create policy event_meetings_select on public.event_meetings for select to authenticated
  using (public.can(company_id, 'events.view') or public.is_event_crew(event_id));
create policy event_meetings_write on public.event_meetings for insert to authenticated with check (public.can(company_id, 'events.edit'));
create policy event_meetings_update on public.event_meetings for update to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
create policy event_meetings_delete on public.event_meetings for delete to authenticated using (public.can(company_id, 'events.edit'));

drop policy if exists event_attendance_select on public.event_attendance;
drop policy if exists event_attendance_insert on public.event_attendance;
drop policy if exists event_attendance_update on public.event_attendance;
drop policy if exists event_attendance_delete on public.event_attendance;
create policy event_attendance_select on public.event_attendance for select to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'events.edit'));
create policy event_attendance_insert on public.event_attendance for insert to authenticated
  with check (public.is_company_member(company_id) and public.is_event_crew(event_id));
create policy event_attendance_update on public.event_attendance for update to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'events.edit'))
  with check ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'events.edit'));
create policy event_attendance_delete on public.event_attendance for delete to authenticated using (public.can(company_id, 'events.edit'));

revoke all on public.event_meetings, public.event_attendance from anon, authenticated;
grant select, insert, delete on public.event_meetings to authenticated;
grant update (meet_at, place_kind, address, lat, lon, radius_m, note) on public.event_meetings to authenticated;
grant select, delete on public.event_attendance to authenticated;
grant insert (company_id, event_id, meeting_id, verified, distance_m) on public.event_attendance to authenticated;
grant update (started_at, ended_at, paused_at, pause_kind, break_minutes, wait_minutes) on public.event_attendance to authenticated;
