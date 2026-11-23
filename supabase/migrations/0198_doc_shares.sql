-- 0198: Zdieľanie dokumentov akcie (rack, input / output list) s externými ľuďmi – len na čítanie.
--   doc_shares: odkaz pre konkrétneho príjemcu (meno / firma), platnosť do dátumu, zrušenie, počet zobrazení.
--   doc_share_views: záznam zobrazení (kedy a ktorú verziu príjemca videl).
--   Príjemca vidí poslednú uloženú verziu z doc_versions a zmeny oproti verzii, ktorú videl naposledy.
--   Odkaz vytvorí a zruší len ten, kto môže dokument upravovať; zoznam odkazov vidí, kto môže dokument čítať.

create table if not exists public.doc_shares (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  doc_type text not null check (doc_type in ('rack', 'iolist')),
  doc_id uuid not null,
  recipient text not null check (char_length(trim(recipient)) between 1 and 80),
  token text not null unique check (char_length(token) >= 40),
  expires_on date,
  revoked_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  last_viewed_version integer
);
create index if not exists doc_shares_doc_idx on public.doc_shares (company_id, doc_type, doc_id);
create index if not exists doc_shares_created_by_idx on public.doc_shares (created_by);

create table if not exists public.doc_share_views (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  share_id uuid not null references public.doc_shares (id) on delete cascade,
  version integer not null,
  viewed_at timestamptz not null default now()
);
create index if not exists doc_share_views_share_idx on public.doc_share_views (share_id, viewed_at desc);
create index if not exists doc_share_views_company_idx on public.doc_share_views (company_id);

-- Čítať môže, kto vidí daný druh dokumentu (racky / akcie). Zápis len cez funkcie nižšie.
create or replace function public.can_view_doc(_company uuid, _doc_type text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case _doc_type when 'rack' then public.can(_company, 'racks.view') when 'iolist' then public.can(_company, 'events.view') else false end
$$;
revoke execute on function public.can_view_doc(uuid, text) from public, anon;
grant execute on function public.can_view_doc(uuid, text) to authenticated;

alter table public.doc_shares enable row level security;
alter table public.doc_share_views enable row level security;
drop policy if exists doc_shares_select on public.doc_shares;
create policy doc_shares_select on public.doc_shares for select to authenticated using (public.can_view_doc(company_id, doc_type));
drop policy if exists doc_share_views_select on public.doc_share_views;
create policy doc_share_views_select on public.doc_share_views for select to authenticated
  using (exists (select 1 from public.doc_shares s where s.id = share_id and public.can_view_doc(s.company_id, s.doc_type)));
do $$
declare
  t text;
begin
  foreach t in array array['doc_shares', 'doc_share_views'] loop
    execute format('drop policy if exists mfa_required on public.%I', t);
    execute format('create policy mfa_required on public.%I as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()))', t);
  end loop;
end;
$$;
revoke all on public.doc_shares from anon, authenticated;
revoke all on public.doc_share_views from anon, authenticated;
grant select (id, company_id, doc_type, doc_id, recipient, token, expires_on, revoked_at, created_by, created_at, view_count, last_viewed_at, last_viewed_version) on public.doc_shares to authenticated;
grant select on public.doc_share_views to authenticated;

-- Firma dokumentu a právo ho upravovať (rack → racks.edit, input list akcie → events.edit).
create or replace function public.doc_company_for_edit(_doc_type text, _doc_id uuid)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare
  _company uuid;
begin
  if _doc_type = 'rack' then
    select company_id into _company from public.rack_designs where id = _doc_id;
    if _company is not null and public.can(_company, 'racks.edit') then return _company; end if;
  elsif _doc_type = 'iolist' then
    select company_id into _company from public.events where id = _doc_id;
    if _company is not null and public.can(_company, 'events.edit') then return _company; end if;
  end if;
  raise exception 'Dokument neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
end;
$$;
revoke execute on function public.doc_company_for_edit(text, uuid) from public, anon;
grant execute on function public.doc_company_for_edit(text, uuid) to authenticated;

-- Nový odkaz pre príjemcu; vráti token. Input list bez uloženej verzie sa najprv uloží ako verzia 1.
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
    else
      raise exception 'Najprv uložte osadenie racku' using errcode = 'check_violation';
    end if;
  end if;
  insert into public.doc_shares (company_id, doc_type, doc_id, recipient, token, expires_on)
  values (_company, _doc_type, _doc_id, trim(_recipient), _token, _expires_on);
  return _token;
end;
$$;
revoke execute on function public.create_doc_share(text, uuid, text, date) from public, anon;
grant execute on function public.create_doc_share(text, uuid, text, date) to authenticated;

create or replace function public.revoke_doc_share(_share_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s record;
begin
  select doc_type, doc_id into s from public.doc_shares where id = _share_id;
  if not found then
    raise exception 'Odkaz neexistuje' using errcode = 'insufficient_privilege';
  end if;
  perform public.doc_company_for_edit(s.doc_type, s.doc_id);
  update public.doc_shares set revoked_at = coalesce(revoked_at, now()) where id = _share_id;
end;
$$;
revoke execute on function public.revoke_doc_share(uuid) from public, anon;
grant execute on function public.revoke_doc_share(uuid) to authenticated;

-- Pre príjemcu (bez prihlásenia): firma, akcia, posledná verzia a verzia videná naposledy (na zvýraznenie zmien).
-- Z verzií sa posielajú len polia potrebné na zobrazenie; názvy techniky sa doplnia z evidencie.
create or replace function public.get_shared_doc(_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.doc_shares;
  v public.doc_versions;
  _previous jsonb;
  _event_id uuid;
  _title text := '';
  _ids uuid[];
  _result jsonb;
begin
  if _token is null or char_length(_token) < 40 then return null; end if;
  select * into s from public.doc_shares where token = _token;
  if not found or s.revoked_at is not null or (s.expires_on is not null and s.expires_on < current_date) then return null; end if;
  select * into v from public.doc_versions where doc_type = s.doc_type and doc_id = s.doc_id order by version desc limit 1;
  if not found then return null; end if;

  if s.last_viewed_version is not null and s.last_viewed_version < v.version then
    select data into _previous from public.doc_versions where doc_type = s.doc_type and doc_id = s.doc_id and version = s.last_viewed_version;
  end if;
  -- Zmazaný rack alebo akcia: odkaz už nič neukáže.
  if s.doc_type = 'rack' then
    select r.event_id, r.name into _event_id, _title from public.rack_designs r where r.id = s.doc_id and r.company_id = s.company_id;
    if not found then return null; end if;
  else
    if not exists (select 1 from public.events e where e.id = s.doc_id and e.company_id = s.company_id) then return null; end if;
    _event_id := s.doc_id;
  end if;
  select array_agg(distinct x::uuid) into _ids from (
    select jsonb_path_query(v.data, '$.**.equipment_id ? (@ != null)') #>> '{}' as x
    union all select jsonb_path_query(v.data, '$.**.catalog_id ? (@ != null)') #>> '{}'
    union all select jsonb_path_query(coalesce(_previous, '{}'::jsonb), '$.**.equipment_id ? (@ != null)') #>> '{}'
    union all select jsonb_path_query(coalesce(_previous, '{}'::jsonb), '$.**.catalog_id ? (@ != null)') #>> '{}'
  ) ids where x ~ '^[0-9a-f-]{36}$';

  select jsonb_build_object(
    'docType', s.doc_type, 'recipient', s.recipient, 'title', coalesce(_title, ''),
    'version', v.version, 'savedAt', v.created_at, 'previousVersion', case when _previous is null then null else s.last_viewed_version end,
    'data', public.shared_doc_data(s.doc_type, v.data), 'previous', case when _previous is null then null else public.shared_doc_data(s.doc_type, _previous) end,
    'names', coalesce((
      select jsonb_object_agg(id, label) from (
        select e.id, trim(e.name) as label from public.equipment e where e.company_id = s.company_id and e.id = any(coalesce(_ids, '{}'))
        union all select c.id, trim(c.manufacturer || ' ' || c.model) from public.equipment_catalog c where c.id = any(coalesce(_ids, '{}'))
      ) n
    ), '{}'::jsonb),
    'companyName', co.name, 'logoPath', co.logo_path, 'logoStyle', co.logo_style, 'contact', co.label_footer,
    'event', ev.name, 'startsOn', ev.starts_on, 'endsOn', ev.ends_on, 'venue', ev.venue
  ) into _result
  from public.companies co
  left join public.events ev on ev.company_id = co.id and ev.id = _event_id
  where co.id = s.company_id;

  -- Zobrazenie: počet a posledná verzia vždy, riadok do záznamu najviac raz za 10 minút.
  update public.doc_shares set view_count = view_count + 1, last_viewed_at = now(), last_viewed_version = v.version where id = s.id;
  if not exists (select 1 from public.doc_share_views w where w.share_id = s.id and w.viewed_at > now() - interval '10 minutes' and w.version = v.version) then
    insert into public.doc_share_views (company_id, share_id, version) values (s.company_id, s.id, v.version);
  end if;
  return _result;
end;
$$;

-- Len polia na zobrazenie (bez interných id používateľov, cases a pod.).
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
revoke execute on function public.shared_doc_data(text, jsonb) from public, anon;
grant execute on function public.shared_doc_data(text, jsonb) to authenticated;
revoke execute on function public.get_shared_doc(text) from public;
grant execute on function public.get_shared_doc(text) to anon, authenticated;

-- Logo firmy sa ukáže aj na stránke zdieľaného dokumentu.
create or replace function public.is_rating_logo(_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.companies c
    where c.logo_path <> '' and c.logo_path = _path
      and (
        exists (select 1 from public.event_ratings r where r.company_id = c.id)
        or exists (select 1 from public.events e where e.company_id = c.id and e.client_token is not null)
        or exists (select 1 from public.doc_shares s where s.company_id = c.id and s.revoked_at is null)
      )
  )
$$;
revoke execute on function public.is_rating_logo(text) from public;
grant execute on function public.is_rating_logo(text) to anon, authenticated;
