-- 0200: Synoptika akcie – blokové zapojenie signálu: uzly (pult, stagebox, rack, zosilňovač, reproduktor…, voliteľne
-- s väzbou na techniku alebo rack) a prepojenia (signál, kábel, dĺžka). Verzie v doc_versions, zdieľanie odkazom.

create table if not exists public.event_synoptics (
  event_id uuid primary key,
  company_id uuid not null,
  nodes jsonb not null default '[]'::jsonb check (jsonb_typeof(nodes) = 'array' and jsonb_array_length(nodes) <= 200 and pg_column_size(nodes) <= 150000),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 400 and pg_column_size(links) <= 150000),
  note text not null default '' check (char_length(note) <= 500),
  version integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  unique (company_id, event_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists event_synoptics_updated_by_idx on public.event_synoptics (updated_by);
alter table public.event_synoptics enable row level security;
drop policy if exists event_synoptics_select on public.event_synoptics;
create policy event_synoptics_select on public.event_synoptics for select to authenticated using (public.can(company_id, 'events.view'));
drop policy if exists mfa_required on public.event_synoptics;
create policy mfa_required on public.event_synoptics as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
revoke all on public.event_synoptics from anon, authenticated;
grant select on public.event_synoptics to authenticated;

-- Uzly a prepojenia: len známe polia s obmedzenými hodnotami.
create or replace function public.clean_synoptic_nodes(_nodes jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', left(coalesce(x ->> 'id', ''), 40),
    'kind', case when x ->> 'kind' in ('console', 'stagebox', 'rack', 'amp', 'speaker', 'processor', 'source', 'network', 'power', 'video', 'light', 'other') then x ->> 'kind' else 'other' end,
    'label', left(coalesce(x ->> 'label', ''), 60),
    'detail', left(coalesce(x ->> 'detail', ''), 80),
    'x', greatest(0, least(4000, coalesce((x ->> 'x')::numeric, 0))),
    'y', greatest(0, least(3000, coalesce((x ->> 'y')::numeric, 0))),
    'equipment_id', case when (x ->> 'equipment_id') ~ '^[0-9a-f-]{36}$' then x ->> 'equipment_id' end,
    'rack_id', case when (x ->> 'rack_id') ~ '^[0-9a-f-]{36}$' then x ->> 'rack_id' end
  )), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(_nodes) = 'array' then _nodes else '[]'::jsonb end) x
  where jsonb_typeof(x) = 'object'
$$;

create or replace function public.clean_synoptic_links(_links jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', left(coalesce(x ->> 'id', ''), 40),
    'from', left(coalesce(x ->> 'from', ''), 40),
    'to', left(coalesce(x ->> 'to', ''), 40),
    'signal', case when x ->> 'signal' in ('analog', 'aes50', 'dante', 'madi', 'aes', 'ethernet', 'fiber', 'dmx', 'video', 'power', 'other') then x ->> 'signal' else 'other' end,
    'cable', left(coalesce(x ->> 'cable', ''), 40),
    'length_m', case when (x ->> 'length_m') ~ '^\d{1,4}(\.\d+)?$' and (x ->> 'length_m')::numeric <= 5000 then round((x ->> 'length_m')::numeric, 1) end,
    'count', greatest(1, least(99, coalesce(case when (x ->> 'count') ~ '^\d{1,2}$' then (x ->> 'count')::integer end, 1))),
    'label', left(coalesce(x ->> 'label', ''), 60)
  )), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(_links) = 'array' then _links else '[]'::jsonb end) x
  where jsonb_typeof(x) = 'object'
$$;
revoke execute on function public.clean_synoptic_nodes(jsonb) from public, anon;
revoke execute on function public.clean_synoptic_links(jsonb) from public, anon;
grant execute on function public.clean_synoptic_nodes(jsonb) to authenticated;
grant execute on function public.clean_synoptic_links(jsonb) to authenticated;

create or replace function public.save_synoptic(_event_id uuid, _expected_version integer, _nodes jsonb, _links jsonb, _note text default '')
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _current integer;
  _next integer;
  _clean_nodes jsonb := public.clean_synoptic_nodes(_nodes);
  _clean_links jsonb := public.clean_synoptic_links(_links);
begin
  select company_id into _company from public.events where id = _event_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Akcia neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  select version into _current from public.event_synoptics where event_id = _event_id for update;
  if coalesce(_current, 0) <> coalesce(_expected_version, 0) then
    raise exception 'Synoptiku medzitým uložil niekto iný (verzia %). Obnovte stránku.', coalesce(_current, 0) using errcode = 'serialization_failure';
  end if;
  _next := coalesce(_current, 0) + 1;
  insert into public.event_synoptics (event_id, company_id, nodes, links, note, version, updated_at, updated_by)
  values (_event_id, _company, _clean_nodes, _clean_links, left(coalesce(_note, ''), 500), _next, now(), auth.uid())
  on conflict (event_id) do update set nodes = excluded.nodes, links = excluded.links, note = excluded.note, version = excluded.version, updated_at = now(), updated_by = auth.uid();
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  values (_company, 'synoptic', _event_id, _next, jsonb_build_object('nodes', _clean_nodes, 'links', _clean_links, 'note', left(coalesce(_note, ''), 500)));
  return _next;
end;
$$;
revoke execute on function public.save_synoptic(uuid, integer, jsonb, jsonb, text) from public, anon;
grant execute on function public.save_synoptic(uuid, integer, jsonb, jsonb, text) to authenticated;

-- (not valid: pri opakovanom behu update-all.sql už môžu existovať novšie typy; plnú kontrolu robí 0205.)
-- Verzie a zdieľanie aj pre synoptiku (práva ako pri akcii).
alter table public.doc_versions drop constraint if exists doc_versions_doc_type_check;
alter table public.doc_versions add constraint doc_versions_doc_type_check check (doc_type in ('rack', 'iolist', 'stageplot', 'synoptic')) not valid;
alter table public.doc_shares drop constraint if exists doc_shares_doc_type_check;
alter table public.doc_shares add constraint doc_shares_doc_type_check check (doc_type in ('rack', 'iolist', 'stageplot', 'synoptic')) not valid;

create or replace function public.can_view_doc(_company uuid, _doc_type text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case when _doc_type = 'rack' then public.can(_company, 'racks.view') when _doc_type in ('iolist', 'stageplot', 'synoptic') then public.can(_company, 'events.view') else false end
$$;

create or replace function public.doc_company_for_edit(_doc_type text, _doc_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  _company uuid;
begin
  if _doc_type = 'rack' then
    select company_id into _company from public.rack_designs where id = _doc_id;
    if _company is not null and public.can(_company, 'racks.edit') then return _company; end if;
  elsif _doc_type in ('iolist', 'stageplot', 'synoptic') then
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
