-- 0203: Harmonogram akcie, festivalový režim a turné.
--   event_schedule_items: podrobný harmonogram (get-in, soundcheck, otvorenie, vystúpenia, prestavby, curfew…) po dňoch,
--     voliteľne po pódiách (festival – viac pódií v jeden deň).
--   tours + events.tour_id: turné = séria akcií; copy_show_docs skopíruje podklady (input / output list, stage plán,
--     synoptika, HF plán, harmonogram ako vzor) z jednej akcie do inej.

create table if not exists public.event_schedule_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  day date not null,
  starts_at time not null,
  ends_at time,
  stage text not null default '' check (char_length(stage) <= 40),
  kind text not null default 'other' check (kind in ('get_in', 'build', 'soundcheck', 'doors', 'act', 'changeover', 'break', 'curfew', 'teardown', 'other')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  note text not null default '' check (char_length(note) <= 300),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists event_schedule_items_event_idx on public.event_schedule_items (company_id, event_id, day, starts_at);

create table if not exists public.tours (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create index if not exists tours_company_idx on public.tours (company_id);

alter table public.events add column if not exists tour_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_tour_fk') then
    alter table public.events add constraint events_tour_fk foreign key (company_id, tour_id) references public.tours (company_id, id) on delete set null (tour_id);
  end if;
end;
$$;
create index if not exists events_tour_idx on public.events (company_id, tour_id) where tour_id is not null;
grant update (tour_id) on public.events to authenticated;

alter table public.event_schedule_items enable row level security;
alter table public.tours enable row level security;
drop policy if exists event_schedule_items_select on public.event_schedule_items;
create policy event_schedule_items_select on public.event_schedule_items for select to authenticated using (public.can(company_id, 'events.view'));
drop policy if exists event_schedule_items_insert on public.event_schedule_items;
create policy event_schedule_items_insert on public.event_schedule_items for insert to authenticated with check (public.can(company_id, 'events.edit'));
drop policy if exists event_schedule_items_update on public.event_schedule_items;
create policy event_schedule_items_update on public.event_schedule_items for update to authenticated using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
drop policy if exists event_schedule_items_delete on public.event_schedule_items;
create policy event_schedule_items_delete on public.event_schedule_items for delete to authenticated using (public.can(company_id, 'events.edit'));
drop policy if exists tours_select on public.tours;
create policy tours_select on public.tours for select to authenticated using (public.can(company_id, 'events.view'));
drop policy if exists tours_insert on public.tours;
create policy tours_insert on public.tours for insert to authenticated with check (public.can(company_id, 'events.edit'));
drop policy if exists tours_update on public.tours;
create policy tours_update on public.tours for update to authenticated using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
drop policy if exists tours_delete on public.tours;
create policy tours_delete on public.tours for delete to authenticated using (public.can(company_id, 'events.edit'));
do $$
declare
  t text;
begin
  foreach t in array array['event_schedule_items', 'tours'] loop
    execute format('drop policy if exists mfa_required on public.%I', t);
    execute format('create policy mfa_required on public.%I as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()))', t);
  end loop;
end;
$$;
revoke all on public.event_schedule_items from anon, authenticated;
revoke all on public.tours from anon, authenticated;
grant select, insert, delete on public.event_schedule_items to authenticated;
grant update (day, starts_at, ends_at, stage, kind, title, note) on public.event_schedule_items to authenticated;
grant select, insert, delete on public.tours to authenticated;
grant update (name, note) on public.tours to authenticated;

-- Podklady z jednej akcie do druhej (rovnaká firma, právo upravovať obe). Cieľové podklady sa nahradia.
-- _what: 'iolist' (vstupy aj výstupy), 'stageplot', 'synoptic', 'rfplan' (frekvencie sa nekopírujú – miesto je iné),
-- 'schedule' (časy a názvy, dni sa posunú podľa začiatku akcie). Vráti počet skopírovaných druhov.
create or replace function public.copy_show_docs(_from_event uuid, _to_event uuid, _what text[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _target uuid;
  _shift integer;
  _count integer := 0;
begin
  select company_id into _company from public.events where id = _from_event;
  select company_id into _target from public.events where id = _to_event;
  if _company is null or _target is distinct from _company or _from_event = _to_event
     or not public.can(_company, 'events.view') or not public.can(_company, 'events.edit') then
    raise exception 'Akcia neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if 'iolist' = any(_what) then
    delete from public.event_patch where company_id = _company and event_id = _to_event;
    insert into public.event_patch (company_id, event_id, channel, name, stagebox, stagebox_input, source, equipment_id, capsule_id, connector, stand, phantom, note, insert_note, color)
    select company_id, _to_event, channel, name, stagebox, stagebox_input, source, equipment_id, capsule_id, connector, stand, phantom, note, insert_note, color
    from public.event_patch where company_id = _company and event_id = _from_event;
    delete from public.event_outputs where company_id = _company and event_id = _to_event;
    insert into public.event_outputs (company_id, event_id, number, name, kind, mix, destination, equipment_id, stereo, note)
    select company_id, _to_event, number, name, kind, mix, destination, equipment_id, stereo, note
    from public.event_outputs where company_id = _company and event_id = _from_event;
    _count := _count + 1;
  end if;
  if 'stageplot' = any(_what) and exists (select 1 from public.stage_plots where event_id = _from_event) then
    insert into public.stage_plots (event_id, company_id, width_m, depth_m, items, note, version, updated_at, updated_by)
    select _to_event, company_id, width_m, depth_m, items, note, 0, now(), auth.uid() from public.stage_plots where event_id = _from_event
    on conflict (event_id) do update set width_m = excluded.width_m, depth_m = excluded.depth_m, items = excluded.items, note = excluded.note, version = public.stage_plots.version + 1, updated_at = now(), updated_by = auth.uid();
    _count := _count + 1;
  end if;
  if 'synoptic' = any(_what) and exists (select 1 from public.event_synoptics where event_id = _from_event) then
    insert into public.event_synoptics (event_id, company_id, nodes, links, note, version, updated_at, updated_by)
    select _to_event, company_id, nodes, links, note, 0, now(), auth.uid() from public.event_synoptics where event_id = _from_event
    on conflict (event_id) do update set nodes = excluded.nodes, links = excluded.links, note = excluded.note, version = public.event_synoptics.version + 1, updated_at = now(), updated_by = auth.uid();
    _count := _count + 1;
  end if;
  if 'rfplan' = any(_what) and exists (select 1 from public.event_rf_plans where event_id = _from_event) then
    insert into public.event_rf_plans (event_id, company_id, channels, settings, excluded_tv, place, note, version, updated_at, updated_by)
    select _to_event, company_id,
      coalesce((select jsonb_agg(c || jsonb_build_object('freq_mhz', null, 'locked', false)) from jsonb_array_elements(channels) c), '[]'::jsonb),
      settings, '[]'::jsonb, '', note, 0, now(), auth.uid()
    from public.event_rf_plans where event_id = _from_event
    on conflict (event_id) do update set channels = excluded.channels, settings = excluded.settings, excluded_tv = excluded.excluded_tv, place = excluded.place,
      note = excluded.note, version = public.event_rf_plans.version + 1, updated_at = now(), updated_by = auth.uid();
    _count := _count + 1;
  end if;
  if 'schedule' = any(_what) then
    select (t.starts_on - f.starts_on) into _shift from public.events f, public.events t where f.id = _from_event and t.id = _to_event;
    delete from public.event_schedule_items where company_id = _company and event_id = _to_event;
    insert into public.event_schedule_items (company_id, event_id, day, starts_at, ends_at, stage, kind, title, note)
    select company_id, _to_event, day + _shift, starts_at, ends_at, stage, kind, title, note
    from public.event_schedule_items where company_id = _company and event_id = _from_event;
    _count := _count + 1;
  end if;
  return _count;
end;
$$;
revoke execute on function public.copy_show_docs(uuid, uuid, text[]) from public, anon;
grant execute on function public.copy_show_docs(uuid, uuid, text[]) to authenticated;
