-- 0201: HF frekvenčný plán akcie – bezdrôtové kanály (mikrofóny, IEM) s pásmom a frekvenciou, nastavenia kontroly
-- (odstup, okno intermodulácií 3. a 5. rádu, krok), TV kanály vysielané v mieste akcie (UHF 21–48), miesto a poznámka.
-- Výpočty robí aplikácia; databáza ukladá len očistené hodnoty, verzie v doc_versions, zdieľanie odkazom.

create table if not exists public.event_rf_plans (
  event_id uuid primary key,
  company_id uuid not null,
  channels jsonb not null default '[]'::jsonb check (jsonb_typeof(channels) = 'array' and jsonb_array_length(channels) <= 128 and pg_column_size(channels) <= 100000),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object' and pg_column_size(settings) <= 2000),
  excluded_tv jsonb not null default '[]'::jsonb check (jsonb_typeof(excluded_tv) = 'array' and jsonb_array_length(excluded_tv) <= 50),
  place text not null default '' check (char_length(place) <= 120),
  note text not null default '' check (char_length(note) <= 500),
  version integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  unique (company_id, event_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists event_rf_plans_updated_by_idx on public.event_rf_plans (updated_by);
alter table public.event_rf_plans enable row level security;
drop policy if exists event_rf_plans_select on public.event_rf_plans;
create policy event_rf_plans_select on public.event_rf_plans for select to authenticated using (public.can(company_id, 'events.view'));
drop policy if exists mfa_required on public.event_rf_plans;
create policy mfa_required on public.event_rf_plans as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
revoke all on public.event_rf_plans from anon, authenticated;
grant select on public.event_rf_plans to authenticated;

-- Kanály, nastavenia a TV kanály: len známe polia s obmedzenými hodnotami.
create or replace function public.clean_rf_channels(_channels jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', left(coalesce(x ->> 'id', ''), 40),
    'name', left(coalesce(x ->> 'name', ''), 60),
    'kind', case when x ->> 'kind' in ('mic', 'iem', 'other') then x ->> 'kind' else 'other' end,
    'equipment_id', case when (x ->> 'equipment_id') ~ '^[0-9a-f-]{36}$' then x ->> 'equipment_id' end,
    'min_mhz', greatest(25, least(6000, coalesce(case when (x ->> 'min_mhz') ~ '^\d{1,4}(\.\d+)?$' then round((x ->> 'min_mhz')::numeric, 3) end, 470))),
    'max_mhz', greatest(25, least(6000, coalesce(case when (x ->> 'max_mhz') ~ '^\d{1,4}(\.\d+)?$' then round((x ->> 'max_mhz')::numeric, 3) end, 694))),
    'freq_mhz', case when (x ->> 'freq_mhz') ~ '^\d{1,4}(\.\d+)?$' and (x ->> 'freq_mhz')::numeric between 25 and 6000 then round((x ->> 'freq_mhz')::numeric, 3) end,
    'locked', coalesce((x ->> 'locked') = 'true', false)
  )), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(_channels) = 'array' then _channels else '[]'::jsonb end) x
  where jsonb_typeof(x) = 'object'
$$;

create or replace function public.clean_rf_settings(_settings jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'spacing_khz', greatest(25, least(5000, coalesce(case when (s ->> 'spacing_khz') ~ '^\d{1,4}$' then (s ->> 'spacing_khz')::integer end, 350))),
    'imd3_khz', greatest(0, least(1000, coalesce(case when (s ->> 'imd3_khz') ~ '^\d{1,4}$' then (s ->> 'imd3_khz')::integer end, 100))),
    'imd5_khz', greatest(0, least(1000, coalesce(case when (s ->> 'imd5_khz') ~ '^\d{1,4}$' then (s ->> 'imd5_khz')::integer end, 50))),
    'fifth', coalesce((s ->> 'fifth') = 'true', false),
    'step_khz', greatest(5, least(1000, coalesce(case when (s ->> 'step_khz') ~ '^\d{1,4}$' then (s ->> 'step_khz')::integer end, 25))))
  from (select case when jsonb_typeof(_settings) = 'object' then _settings else '{}'::jsonb end as s) v
$$;

create or replace function public.clean_rf_tv(_tv jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(distinct (x #>> '{}')::integer), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(_tv) = 'array' then _tv else '[]'::jsonb end) x
  where (x #>> '{}') ~ '^\d{2}$' and (x #>> '{}')::integer between 21 and 69
$$;
revoke execute on function public.clean_rf_channels(jsonb) from public, anon;
revoke execute on function public.clean_rf_settings(jsonb) from public, anon;
revoke execute on function public.clean_rf_tv(jsonb) from public, anon;
grant execute on function public.clean_rf_channels(jsonb) to authenticated;
grant execute on function public.clean_rf_settings(jsonb) to authenticated;
grant execute on function public.clean_rf_tv(jsonb) to authenticated;

create or replace function public.save_rf_plan(_event_id uuid, _expected_version integer, _channels jsonb, _settings jsonb, _excluded_tv jsonb, _place text default '', _note text default '')
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _current integer;
  _next integer;
  _c jsonb := public.clean_rf_channels(_channels);
  _s jsonb := public.clean_rf_settings(_settings);
  _t jsonb := public.clean_rf_tv(_excluded_tv);
begin
  select company_id into _company from public.events where id = _event_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Akcia neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  select version into _current from public.event_rf_plans where event_id = _event_id for update;
  if coalesce(_current, 0) <> coalesce(_expected_version, 0) then
    raise exception 'HF plán medzitým uložil niekto iný (verzia %). Obnovte stránku.', coalesce(_current, 0) using errcode = 'serialization_failure';
  end if;
  _next := coalesce(_current, 0) + 1;
  insert into public.event_rf_plans (event_id, company_id, channels, settings, excluded_tv, place, note, version, updated_at, updated_by)
  values (_event_id, _company, _c, _s, _t, left(coalesce(_place, ''), 120), left(coalesce(_note, ''), 500), _next, now(), auth.uid())
  on conflict (event_id) do update set channels = excluded.channels, settings = excluded.settings, excluded_tv = excluded.excluded_tv, place = excluded.place,
    note = excluded.note, version = excluded.version, updated_at = now(), updated_by = auth.uid();
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  values (_company, 'rfplan', _event_id, _next, jsonb_build_object('channels', _c, 'settings', _s, 'excluded_tv', _t, 'place', left(coalesce(_place, ''), 120), 'note', left(coalesce(_note, ''), 500)));
  return _next;
end;
$$;
revoke execute on function public.save_rf_plan(uuid, integer, jsonb, jsonb, jsonb, text, text) from public, anon;
grant execute on function public.save_rf_plan(uuid, integer, jsonb, jsonb, jsonb, text, text) to authenticated;

-- Verzie a zdieľanie aj pre HF plán (práva ako pri akcii).
alter table public.doc_versions drop constraint if exists doc_versions_doc_type_check;
alter table public.doc_versions add constraint doc_versions_doc_type_check check (doc_type in ('rack', 'iolist', 'stageplot', 'synoptic', 'rfplan'));
alter table public.doc_shares drop constraint if exists doc_shares_doc_type_check;
alter table public.doc_shares add constraint doc_shares_doc_type_check check (doc_type in ('rack', 'iolist', 'stageplot', 'synoptic', 'rfplan'));

create or replace function public.can_view_doc(_company uuid, _doc_type text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when _doc_type = 'rack' then public.can(_company, 'racks.view') when _doc_type in ('iolist', 'stageplot', 'synoptic', 'rfplan') then public.can(_company, 'events.view') else false end
$$;

create or replace function public.doc_company_for_edit(_doc_type text, _doc_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  _company uuid;
begin
  if _doc_type = 'rack' then
    select company_id into _company from public.rack_designs where id = _doc_id;
    if _company is not null and public.can(_company, 'racks.edit') then return _company; end if;
  elsif _doc_type in ('iolist', 'stageplot', 'synoptic', 'rfplan') then
    select company_id into _company from public.events where id = _doc_id;
    if _company is not null and public.can(_company, 'events.edit') then return _company; end if;
  end if;
  raise exception 'Dokument neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
end;
$$;

create or replace function public.create_doc_share(_doc_type text, _doc_id uuid, _recipient text, _expires_on date default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  _company uuid := public.doc_company_for_edit(_doc_type, _doc_id);
  _token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if char_length(trim(coalesce(_recipient, ''))) not between 1 and 80 then
    raise exception 'Zadajte príjemcu (max 80 znakov)' using errcode = 'check_violation';
  end if;
  if _expires_on is not null and _expires_on < current_date then
    raise exception 'Platnosť musí byť dnes alebo neskôr' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.doc_versions where doc_type = _doc_type and doc_id = _doc_id) then
    if _doc_type = 'iolist' then
      perform public.save_iolist_version(_doc_id);
    elsif _doc_type = 'stageplot' then
      raise exception 'Najprv uložte stage plán' using errcode = 'check_violation';
    elsif _doc_type = 'synoptic' then
      raise exception 'Najprv uložte synoptiku' using errcode = 'check_violation';
    elsif _doc_type = 'rfplan' then
      raise exception 'Najprv uložte HF plán' using errcode = 'check_violation';
    else
      raise exception 'Najprv uložte osadenie racku' using errcode = 'check_violation';
    end if;
  end if;
  insert into public.doc_shares (company_id, doc_type, doc_id, recipient, token, expires_on)
  values (_company, _doc_type, _doc_id, trim(_recipient), _token, _expires_on);
  return _token;
end;
$$;

create or replace function public.shared_doc_data(_doc_type text, _data jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select case _doc_type
    when 'rack' then jsonb_build_object(
      'rack', jsonb_build_object(
        'name', _data #> '{rack,name}', 'rack_type', _data #> '{rack,rack_type}', 'units', _data #> '{rack,units}',
        'depth_mm', _data #> '{rack,depth_mm}', 'rails', _data #> '{rack,rails}', 'note', _data #> '{rack,note}'),
      'slots', coalesce((
        select jsonb_agg(jsonb_build_object(
          'side', x -> 'side', 'bottom_u', x -> 'bottom_u', 'height_u', x -> 'height_u', 'width', x -> 'width', 'col', x -> 'col',
          'equipment_id', x -> 'equipment_id', 'catalog_id', x -> 'catalog_id', 'accessory', x -> 'accessory', 'label', x -> 'label',
          'weight_kg', x -> 'weight_kg', 'power_w', x -> 'power_w'))
        from jsonb_array_elements(coalesce(_data -> 'slots', '[]'::jsonb)) x
      ), '[]'::jsonb))
    when 'stageplot' then jsonb_build_object(
      'plot', jsonb_build_object('width_m', _data #> '{plot,width_m}', 'depth_m', _data #> '{plot,depth_m}', 'note', _data #> '{plot,note}'),
      'items', public.clean_stage_items(coalesce(_data -> 'items', '[]'::jsonb)),
      'inputs', coalesce((
        select jsonb_agg(jsonb_build_object('channel', x -> 'channel', 'name', x -> 'name'))
        from jsonb_array_elements(coalesce(_data -> 'inputs', '[]'::jsonb)) x
      ), '[]'::jsonb))
    when 'synoptic' then jsonb_build_object(
      'nodes', public.clean_synoptic_nodes(coalesce(_data -> 'nodes', '[]'::jsonb)) ,
      'links', public.clean_synoptic_links(coalesce(_data -> 'links', '[]'::jsonb)),
      'note', coalesce(_data -> 'note', '""'::jsonb))
    when 'rfplan' then jsonb_build_object(
      'channels', public.clean_rf_channels(coalesce(_data -> 'channels', '[]'::jsonb)),
      'settings', public.clean_rf_settings(coalesce(_data -> 'settings', '{}'::jsonb)),
      'excluded_tv', public.clean_rf_tv(coalesce(_data -> 'excluded_tv', '[]'::jsonb)),
      'place', coalesce(_data -> 'place', '""'::jsonb),
      'note', coalesce(_data -> 'note', '""'::jsonb))
    else jsonb_build_object(
      'inputs', coalesce((
        select jsonb_agg(jsonb_build_object(
          'channel', x -> 'channel', 'name', x -> 'name', 'source', x -> 'source', 'equipment_id', x -> 'equipment_id',
          'stagebox', x -> 'stagebox', 'stagebox_input', x -> 'stagebox_input', 'phantom', x -> 'phantom', 'stand', x -> 'stand',
          'insert_note', x -> 'insert_note', 'color', x -> 'color', 'note', x -> 'note'))
        from jsonb_array_elements(coalesce(_data -> 'inputs', '[]'::jsonb)) x
      ), '[]'::jsonb),
      'outputs', coalesce((
        select jsonb_agg(jsonb_build_object(
          'number', x -> 'number', 'name', x -> 'name', 'kind', x -> 'kind', 'mix', x -> 'mix', 'destination', x -> 'destination',
          'equipment_id', x -> 'equipment_id', 'stereo', x -> 'stereo', 'note', x -> 'note'))
        from jsonb_array_elements(coalesce(_data -> 'outputs', '[]'::jsonb)) x
      ), '[]'::jsonb))
  end
$$;
