-- 0205: Verzie a zdieľanie harmonogramu akcie. Položky sa upravujú priebežne; „Uložiť verziu“ urobí číslovanú snímku
-- (doc_versions, typ 'schedule'). Príjemca odkazu vidí poslednú uloženú verziu a zmeny od svojho posledného zobrazenia.

create or replace function public.save_schedule_version(_event_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _next integer;
begin
  select company_id into _company from public.events where id = _event_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Akcia neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  select coalesce(max(version), 0) + 1 into _next from public.doc_versions where doc_type = 'schedule' and doc_id = _event_id;
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  values (_company, 'schedule', _event_id, _next, jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'day', s.day, 'starts_at', to_char(s.starts_at, 'HH24:MI'), 'ends_at', to_char(s.ends_at, 'HH24:MI'),
        'stage', s.stage, 'kind', s.kind, 'title', s.title, 'note', s.note) order by s.day, s.starts_at, s.stage)
      from public.event_schedule_items s where s.company_id = _company and s.event_id = _event_id
    ), '[]'::jsonb)));
  return _next;
end;
$$;
revoke execute on function public.save_schedule_version(uuid) from public, anon;
grant execute on function public.save_schedule_version(uuid) to authenticated;

-- Verzie a zdieľanie aj pre harmonogram (práva ako pri akcii).
alter table public.doc_versions drop constraint if exists doc_versions_doc_type_check;
alter table public.doc_versions add constraint doc_versions_doc_type_check check (doc_type in ('rack', 'iolist', 'stageplot', 'synoptic', 'rfplan', 'siteplan', 'schedule'));
alter table public.doc_shares drop constraint if exists doc_shares_doc_type_check;
alter table public.doc_shares add constraint doc_shares_doc_type_check check (doc_type in ('rack', 'iolist', 'stageplot', 'synoptic', 'rfplan', 'siteplan', 'schedule'));

create or replace function public.can_view_doc(_company uuid, _doc_type text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when _doc_type = 'rack' then public.can(_company, 'racks.view') when _doc_type in ('iolist', 'stageplot', 'synoptic', 'rfplan', 'siteplan', 'schedule') then public.can(_company, 'events.view') else false end
$$;

create or replace function public.doc_company_for_edit(_doc_type text, _doc_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  _company uuid;
begin
  if _doc_type = 'rack' then
    select company_id into _company from public.rack_designs where id = _doc_id;
    if _company is not null and public.can(_company, 'racks.edit') then return _company; end if;
  elsif _doc_type in ('iolist', 'stageplot', 'synoptic', 'rfplan', 'siteplan', 'schedule') then
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
    elsif _doc_type = 'schedule' then
      perform public.save_schedule_version(_doc_id);
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
    when 'schedule' then jsonb_build_object(
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', x -> 'id', 'day', x -> 'day', 'starts_at', x -> 'starts_at', 'ends_at', x -> 'ends_at', 'stage', x -> 'stage',
          'kind', x -> 'kind', 'title', x -> 'title', 'note', x -> 'note'))
        from jsonb_array_elements(coalesce(_data -> 'items', '[]'::jsonb)) x
      ), '[]'::jsonb))
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
