-- 0199: Stage plán akcie – pohľad zhora v mierke (rozmer pódia v metroch, položky: bicie, aparáty, mikrofóny,
-- monitory, DI, stagebox, elektrina…), väzba na kanály input listu, verzie v doc_versions a zdieľanie odkazom.
--   stage_plots: jeden plán na akciu; ukladá sa len cez save_stage_plot (kontrola verzie + snímka do doc_versions).

create table if not exists public.stage_plots (
  event_id uuid primary key,
  company_id uuid not null,
  width_m numeric(4, 1) not null default 10 check (width_m between 2 and 40),
  depth_m numeric(4, 1) not null default 6 check (depth_m between 2 and 30),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 300 and pg_column_size(items) <= 200000),
  note text not null default '' check (char_length(note) <= 500),
  version integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  unique (company_id, event_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists stage_plots_updated_by_idx on public.stage_plots (updated_by);
alter table public.stage_plots enable row level security;
drop policy if exists stage_plots_select on public.stage_plots;
create policy stage_plots_select on public.stage_plots for select to authenticated using (public.can(company_id, 'events.view'));
drop policy if exists mfa_required on public.stage_plots;
create policy mfa_required on public.stage_plots as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
revoke all on public.stage_plots from anon, authenticated;
grant select on public.stage_plots to authenticated;

-- Položka plánu: len známe polia s obmedzenými hodnotami (nič iné sa neuloží).
create or replace function public.clean_stage_items(_items jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', left(coalesce(x ->> 'id', ''), 40),
    'kind', case when x ->> 'kind' in ('drums', 'riser', 'amp_guitar', 'amp_bass', 'keys', 'vocal', 'mic', 'wedge', 'sidefill', 'iem', 'di', 'stagebox', 'power', 'person', 'dj', 'label') then x ->> 'kind' else 'label' end,
    'x', greatest(-5, least(45, coalesce((x ->> 'x')::numeric, 0))),
    'y', greatest(-5, least(35, coalesce((x ->> 'y')::numeric, 0))),
    'rot', mod(coalesce((x ->> 'rot')::integer, 0) + 360, 360),
    'w', greatest(0.1, least(20, coalesce((x ->> 'w')::numeric, 0.5))),
    'd', greatest(0.1, least(20, coalesce((x ->> 'd')::numeric, 0.5))),
    'label', left(coalesce(x ->> 'label', ''), 40),
    'channel', case when (x ->> 'channel') ~ '^\d{1,3}$' and (x ->> 'channel')::integer between 1 and 512 then (x ->> 'channel')::integer end
  )), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(_items) = 'array' then _items else '[]'::jsonb end) x
  where jsonb_typeof(x) = 'object'
$$;
revoke execute on function public.clean_stage_items(jsonb) from public, anon;
grant execute on function public.clean_stage_items(jsonb) to authenticated;

-- Uloží plán (ak ho medzitým nikto iný neuložil) a jeho verziu; vráti nové číslo verzie.
create or replace function public.save_stage_plot(_event_id uuid, _expected_version integer, _width numeric, _depth numeric, _items jsonb, _note text default '')
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _current integer;
  _next integer;
  _clean jsonb := public.clean_stage_items(_items);
begin
  select company_id into _company from public.events where id = _event_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Akcia neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  select version into _current from public.stage_plots where event_id = _event_id for update;
  if coalesce(_current, 0) <> coalesce(_expected_version, 0) then
    raise exception 'Stage plán medzitým uložil niekto iný (verzia %). Obnovte stránku.', coalesce(_current, 0) using errcode = 'serialization_failure';
  end if;
  _next := coalesce(_current, 0) + 1;
  insert into public.stage_plots (event_id, company_id, width_m, depth_m, items, note, version, updated_at, updated_by)
  values (_event_id, _company, _width, _depth, _clean, left(coalesce(_note, ''), 500), _next, now(), auth.uid())
  on conflict (event_id) do update set width_m = excluded.width_m, depth_m = excluded.depth_m, items = excluded.items, note = excluded.note,
    version = excluded.version, updated_at = now(), updated_by = auth.uid();
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  values (_company, 'stageplot', _event_id, _next, jsonb_build_object(
    'plot', jsonb_build_object('width_m', _width, 'depth_m', _depth, 'note', left(coalesce(_note, ''), 500)),
    'items', _clean,
    'inputs', coalesce((select jsonb_agg(jsonb_build_object('channel', p.channel, 'name', p.name) order by p.channel) from public.event_patch p where p.company_id = _company and p.event_id = _event_id), '[]'::jsonb)));
  return _next;
end;
$$;
revoke execute on function public.save_stage_plot(uuid, integer, numeric, numeric, jsonb, text) from public, anon;
grant execute on function public.save_stage_plot(uuid, integer, numeric, numeric, jsonb, text) to authenticated;

-- (not valid: pri opakovanom behu update-all.sql už môžu existovať novšie typy; plnú kontrolu robí 0205.)
-- Verzie a zdieľanie aj pre stage plán (práva ako pri akcii).
alter table public.doc_versions drop constraint if exists doc_versions_doc_type_check;
alter table public.doc_versions add constraint doc_versions_doc_type_check check (doc_type in ('rack', 'iolist', 'stageplot')) not valid;
alter table public.doc_shares drop constraint if exists doc_shares_doc_type_check;
alter table public.doc_shares add constraint doc_shares_doc_type_check check (doc_type in ('rack', 'iolist', 'stageplot')) not valid;

create or replace function public.can_view_doc(_company uuid, _doc_type text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case _doc_type when 'rack' then public.can(_company, 'racks.view') when 'iolist' then public.can(_company, 'events.view') when 'stageplot' then public.can(_company, 'events.view') else false end
$$;

create or replace function public.doc_company_for_edit(_doc_type text, _doc_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  _company uuid;
begin
  if _doc_type = 'rack' then
    select company_id into _company from public.rack_designs where id = _doc_id;
    if _company is not null and public.can(_company, 'racks.edit') then return _company; end if;
  elsif _doc_type in ('iolist', 'stageplot') then
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
    else
      raise exception 'Najprv uložte osadenie racku' using errcode = 'check_violation';
    end if;
  end if;
  insert into public.doc_shares (company_id, doc_type, doc_id, recipient, token, expires_on)
  values (_company, _doc_type, _doc_id, trim(_recipient), _token, _expires_on);
  return _token;
end;
$$;

-- Stage plán v zdieľaní: rozmer, poznámka, položky a kanály input listu (číslo a názov).
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
