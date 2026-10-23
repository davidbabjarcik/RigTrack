-- RigTrack: dochádzka mimo eventov – práca na firme alebo doma (2.18).
-- Každý si v Nastaveniach zadá adresu domov (vidí ju len on a kto spravuje tím). Na firme sa poloha porovná
-- s adresou skladu, doma s jeho adresou. Časy príchodu, prestávok a odchodu dáva server ako pri evente.

create table if not exists public.member_homes (
  company_id uuid not null,
  user_id uuid not null,
  address text not null default '' check (char_length(address) <= 200),
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  updated_at timestamptz not null default now(),
  primary key (company_id, user_id),
  foreign key (company_id, user_id) references public.company_members (company_id, user_id) on delete cascade
);
alter table public.member_homes enable row level security;
drop policy if exists member_homes_select on public.member_homes;
drop policy if exists member_homes_own on public.member_homes;
create policy member_homes_select on public.member_homes for select to authenticated
  using (user_id = auth.uid() or public.can(company_id, 'staff.manage'));
create policy member_homes_own on public.member_homes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_company_member(company_id));
revoke all on public.member_homes from anon, authenticated;
grant select, insert, delete on public.member_homes to authenticated;
grant update (address, lat, lon, updated_at) on public.member_homes to authenticated;

create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  place text not null check (place in ('company', 'home')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  verified boolean not null default false,
  distance_m integer check (distance_m >= 0),
  paused_at timestamptz,
  pause_kind text check (pause_kind in ('break', 'wait')),
  break_minutes integer not null default 0 check (break_minutes between 0 and 1440),
  wait_minutes integer not null default 0 check (wait_minutes between 0 and 1440),
  note text not null default '' check (char_length(note) <= 300),
  edited_by_name text not null default '',
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at)
);
-- Jedna rozbehnutá práca na človeka a firmu.
create unique index if not exists work_sessions_open_idx on public.work_sessions (company_id, user_id) where ended_at is null;
create index if not exists work_sessions_company_idx on public.work_sessions (company_id, started_at);

create or replace function public.stamp_work_session()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := auth.uid();
  new.started_at := now();
  new.ended_at := null;
  new.paused_at := null;
  new.pause_kind := null;
  new.break_minutes := 0;
  new.wait_minutes := 0;
  new.edited_by_name := '';
  return new;
end;
$$;

-- Člen len zapína / vypína prestávku a končí (časy dá server); kto spravuje tím, môže časy opraviť.
create or replace function public.finish_work_session()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  editor boolean := public.can(old.company_id, 'staff.manage');
  ending boolean := old.ended_at is null and new.ended_at is not null;
  paused integer;
begin
  new.company_id := old.company_id;
  new.user_id := old.user_id;
  new.place := old.place;
  new.verified := old.verified;
  new.distance_m := old.distance_m;
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
  return new;
end;
$$;
revoke execute on function public.stamp_work_session(), public.finish_work_session() from public, anon, authenticated;
drop trigger if exists work_sessions_stamp on public.work_sessions;
create trigger work_sessions_stamp before insert on public.work_sessions for each row execute function public.stamp_work_session();
drop trigger if exists work_sessions_finish on public.work_sessions;
create trigger work_sessions_finish before update on public.work_sessions for each row execute function public.finish_work_session();

alter table public.work_sessions enable row level security;
drop policy if exists work_sessions_select on public.work_sessions;
drop policy if exists work_sessions_insert on public.work_sessions;
drop policy if exists work_sessions_update on public.work_sessions;
drop policy if exists work_sessions_delete on public.work_sessions;
create policy work_sessions_select on public.work_sessions for select to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'staff.manage'));
create policy work_sessions_insert on public.work_sessions for insert to authenticated with check (public.is_company_member(company_id));
create policy work_sessions_update on public.work_sessions for update to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'staff.manage'))
  with check ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'staff.manage'));
create policy work_sessions_delete on public.work_sessions for delete to authenticated using (public.can(company_id, 'staff.manage'));
revoke all on public.work_sessions from anon, authenticated;
grant select, delete on public.work_sessions to authenticated;
grant insert (company_id, place, verified, distance_m, note) on public.work_sessions to authenticated;
grant update (started_at, ended_at, paused_at, pause_kind, break_minutes, wait_minutes, note) on public.work_sessions to authenticated;
