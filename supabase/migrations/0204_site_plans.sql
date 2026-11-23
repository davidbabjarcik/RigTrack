-- 0204: Site plán akcie na mape (OpenStreetMap): výrez mapy (stred, priblíženie), značky (pódium, FOH, elektrina,
-- kamión, vstup, generátor…) a trasy káblov (body na mape, druh, kábel z techniky, rezerva). Dĺžky počíta aplikácia.
-- Verzie v doc_versions, zdieľanie odkazom.

create table if not exists public.event_site_plans (
  event_id uuid primary key,
  company_id uuid not null,
  view jsonb not null default '{}'::jsonb check (jsonb_typeof(view) = 'object' and pg_column_size(view) <= 500),
  markers jsonb not null default '[]'::jsonb check (jsonb_typeof(markers) = 'array' and jsonb_array_length(markers) <= 300 and pg_column_size(markers) <= 100000),
  routes jsonb not null default '[]'::jsonb check (jsonb_typeof(routes) = 'array' and jsonb_array_length(routes) <= 200 and pg_column_size(routes) <= 200000),
  note text not null default '' check (char_length(note) <= 500),
  version integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  unique (company_id, event_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists event_site_plans_updated_by_idx on public.event_site_plans (updated_by);
alter table public.event_site_plans enable row level security;
drop policy if exists event_site_plans_select on public.event_site_plans;
create policy event_site_plans_select on public.event_site_plans for select to authenticated using (public.can(company_id, 'events.view'));
drop policy if exists mfa_required on public.event_site_plans;
create policy mfa_required on public.event_site_plans as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
revoke all on public.event_site_plans from anon, authenticated;
grant select on public.event_site_plans to authenticated;

-- Súradnica: číslo v rozsahu (inak null).
create or replace function public.clean_coord(_value jsonb, _limit numeric)
returns numeric language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(_value) = 'number' and abs((_value #>> '{}')::numeric) <= _limit then round((_value #>> '{}')::numeric, 7) end
$$;

create or replace function public.clean_site_view(_view jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'lat', coalesce(public.clean_coord(v -> 'lat', 85), 48.1486),
    'lon', coalesce(public.clean_coord(v -> 'lon', 180), 17.1077),
    'zoom', greatest(3, least(19, coalesce(case when jsonb_typeof(v -> 'zoom') = 'number' then round((v ->> 'zoom')::numeric)::integer end, 17))))
  from (select case when jsonb_typeof(_view) = 'object' then _view else '{}'::jsonb end as v) s
$$;

create or replace function public.clean_site_markers(_markers jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', left(coalesce(x ->> 'id', ''), 40),
    'kind', case when x ->> 'kind' in ('stage', 'foh', 'power', 'generator', 'truck', 'gate', 'tent', 'toilet', 'bar', 'first_aid', 'tower', 'label') then x ->> 'kind' else 'label' end,
    'lat', public.clean_coord(x -> 'lat', 85),
    'lon', public.clean_coord(x -> 'lon', 180),
    'label', left(coalesce(x ->> 'label', ''), 60)
  )), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(_markers) = 'array' then _markers else '[]'::jsonb end) x
  where jsonb_typeof(x) = 'object' and public.clean_coord(x -> 'lat', 85) is not null and public.clean_coord(x -> 'lon', 180) is not null
$$;

create or replace function public.clean_site_routes(_routes jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', left(coalesce(x ->> 'id', ''), 40),
    'kind', case when x ->> 'kind' in ('power', 'signal', 'network', 'dmx', 'water', 'other') then x ->> 'kind' else 'other' end,
    'label', left(coalesce(x ->> 'label', ''), 60),
    'equipment_id', case when (x ->> 'equipment_id') ~ '^[0-9a-f-]{36}$' then x ->> 'equipment_id' end,
    'slack_pct', greatest(0, least(100, coalesce(case when jsonb_typeof(x -> 'slack_pct') = 'number' then round((x ->> 'slack_pct')::numeric)::integer end, 10))),
    'points', coalesce((
      select jsonb_agg(jsonb_build_array(public.clean_coord(p -> 0, 85), public.clean_coord(p -> 1, 180)))
      from (select p from jsonb_array_elements(case when jsonb_typeof(x -> 'points') = 'array' then x -> 'points' else '[]'::jsonb end) p limit 200) pts
      where jsonb_typeof(p) = 'array' and public.clean_coord(p -> 0, 85) is not null and public.clean_coord(p -> 1, 180) is not null
    ), '[]'::jsonb)
  )), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(_routes) = 'array' then _routes else '[]'::jsonb end) x
  where jsonb_typeof(x) = 'object'
$$;
revoke execute on function public.clean_coord(jsonb, numeric) from public, anon;
revoke execute on function public.clean_site_view(jsonb) from public, anon;
revoke execute on function public.clean_site_markers(jsonb) from public, anon;
revoke execute on function public.clean_site_routes(jsonb) from public, anon;
grant execute on function public.clean_coord(jsonb, numeric) to authenticated;
grant execute on function public.clean_site_view(jsonb) to authenticated;
grant execute on function public.clean_site_markers(jsonb) to authenticated;
grant execute on function public.clean_site_routes(jsonb) to authenticated;

create or replace function public.save_site_plan(_event_id uuid, _expected_version integer, _view jsonb, _markers jsonb, _routes jsonb, _note text default '')
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _current integer;
  _next integer;
  _v jsonb := public.clean_site_view(_view);
  _m jsonb := public.clean_site_markers(_markers);
  _r jsonb := public.clean_site_routes(_routes);
begin
  select company_id into _company from public.events where id = _event_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Akcia neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  select version into _current from public.event_site_plans where event_id = _event_id for update;
  if coalesce(_current, 0) <> coalesce(_expected_version, 0) then
    raise exception 'Site plán medzitým uložil niekto iný (verzia %). Obnovte stránku.', coalesce(_current, 0) using errcode = 'serialization_failure';
  end if;
  _next := coalesce(_current, 0) + 1;
  insert into public.event_site_plans (event_id, company_id, view, markers, routes, note, version, updated_at, updated_by)
  values (_event_id, _company, _v, _m, _r, left(coalesce(_note, ''), 500), _next, now(), auth.uid())
  on conflict (event_id) do update set view = excluded.view, markers = excluded.markers, routes = excluded.routes, note = excluded.note,
    version = excluded.version, updated_at = now(), updated_by = auth.uid();
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  values (_company, 'siteplan', _event_id, _next, jsonb_build_object('view', _v, 'markers', _m, 'routes', _r, 'note', left(coalesce(_note, ''), 500)));
  return _next;
end;
$$;
revoke execute on function public.save_site_plan(uuid, integer, jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.save_site_plan(uuid, integer, jsonb, jsonb, jsonb, text) to authenticated;

-- (not valid: pri opakovanom behu update-all.sql už môžu existovať novšie typy; plnú kontrolu robí 0205.)
-- Verzie a zdieľanie aj pre site plán (práva ako pri akcii).
alter table public.doc_versions drop constraint if exists doc_versions_doc_type_check;
alter table public.doc_versions add constraint doc_versions_doc_type_check check (doc_type in ('rack', 'iolist', 'stageplot', 'synoptic', 'rfplan', 'siteplan')) not valid;
alter table public.doc_shares drop constraint if exists doc_shares_doc_type_check;
alter table public.doc_shares add constraint doc_shares_doc_type_check check (doc_type in ('rack', 'iolist', 'stageplot', 'synoptic', 'rfplan', 'siteplan')) not valid;

create or replace function public.can_view_doc(_company uuid, _doc_type text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when _doc_type = 'rack' then public.can(_company, 'racks.view') when _doc_type in ('iolist', 'stageplot', 'synoptic', 'rfplan', 'siteplan') then public.can(_company, 'events.view') else false end
$$;

create or replace function public.doc_company_for_edit(_doc_type text, _doc_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  _company uuid;
begin
  if _doc_type = 'rack' then
    select company_id into _company from public.rack_designs where id = _doc_id;
    if _company is not null and public.can(_company, 'racks.edit') then return _company; end if;
  elsif _doc_type in ('iolist', 'stageplot', 'synoptic', 'rfplan', 'siteplan') then
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
    elsif _doc_type = 'siteplan' then
      raise exception 'Najprv uložte site plán' using errcode = 'check_violation';
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
    when 'siteplan' then jsonb_build_object(
      'view', public.clean_site_view(coalesce(_data -> 'view', '{}'::jsonb)),
      'markers', public.clean_site_markers(coalesce(_data -> 'markers', '[]'::jsonb)),
      'routes', public.clean_site_routes(coalesce(_data -> 'routes', '[]'::jsonb)),
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
