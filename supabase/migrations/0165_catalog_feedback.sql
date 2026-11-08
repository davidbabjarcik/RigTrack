-- 0165: spätná väzba firiem k databáze techniky.
-- • „Údaje sú správne“ – firma pri modeli z databázy potvrdí, že údaje sedia (návrh na overenie).
-- • „Navrhovaná zmena“ – firma pri modeli z databázy zmenila alebo doplnila údaje; vývojár zmenu prijme do databázy
--   alebo zamietne. V návrhu sú len zmenené / doplnené technické údaje.
-- • Koľko firiem a kusov model používa – vývojár vidí, čo overovať najskôr (len počty, nikdy názvy firiem).
-- Všetko čítajú a vybavujú len vývojári cez funkcie; firma vidí len svoje návrhy (RLS z 0146).

alter table public.equipment_catalog_submissions
  add column if not exists type text not null default 'new';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'equipment_catalog_submissions_type_check') then
    alter table public.equipment_catalog_submissions
      add constraint equipment_catalog_submissions_type_check check (type in ('new', 'confirm', 'correction'));
  end if;
end;
$$;
create index if not exists equipment_catalog_submissions_feedback_idx
  on public.equipment_catalog_submissions (catalog_id, type) where status = 'pending' and type <> 'new';

-- Nový model mimo databázy (ako v 0146) – len typ „new“.
create or replace function public.submit_catalog_entry(_company_id uuid, _kind text, _manufacturer text, _model text, _name text, _attributes jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _id uuid;
  _maker text := trim(coalesce(_manufacturer, ''));
  _mod text := trim(coalesce(_model, ''));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.can(_company_id, 'equipment.edit') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if _maker = '' or char_length(_maker) > 80 or char_length(_mod) > 80 or _attributes is null or jsonb_typeof(_attributes) <> 'object' then
    raise exception 'Invalid entry' using errcode = '22023';
  end if;
  if exists (select 1 from public.equipment_catalog c where c.kind = _kind and lower(c.manufacturer) = lower(_maker) and lower(c.model) = lower(_mod)) then
    return null;
  end if;
  select id into _id from public.equipment_catalog_submissions s
  where s.company_id = _company_id and s.status = 'pending' and s.type = 'new' and s.kind = _kind and lower(s.manufacturer) = lower(_maker) and lower(s.model) = lower(_mod);
  if _id is not null then
    update public.equipment_catalog_submissions set attributes = _attributes, name = left(coalesce(_name, ''), 200) where id = _id;
    return _id;
  end if;
  if (select count(*) from public.equipment_catalog_submissions s where s.company_id = _company_id and s.status = 'pending') >= 300 then
    raise exception 'Too many pending entries' using errcode = '54000';
  end if;
  insert into public.equipment_catalog_submissions (company_id, kind, manufacturer, model, name, attributes)
  values (_company_id, _kind, _maker, _mod, left(coalesce(_name, ''), 200), _attributes)
  returning id into _id;
  return _id;
end;
$$;

-- Potvrdenie alebo zmena k modelu v databáze. Overený model sa nepotvrdzuje; rovnaký návrh firmy sa len aktualizuje.
create or replace function public.submit_catalog_feedback(_company_id uuid, _catalog_id uuid, _type text, _attributes jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _id uuid;
  _entry public.equipment_catalog;
  _data jsonb := coalesce(_attributes, '{}'::jsonb);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.can(_company_id, 'equipment.edit') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if _type not in ('confirm', 'correction') or jsonb_typeof(_data) <> 'object' or pg_column_size(_data) > 8000 then
    raise exception 'Invalid entry' using errcode = '22023';
  end if;
  select * into _entry from public.equipment_catalog where id = _catalog_id;
  if _entry.id is null then
    raise exception 'Invalid entry' using errcode = '22023';
  end if;
  if _type = 'confirm' then
    if _entry.verified then
      return null;
    end if;
    _data := '{}'::jsonb;
  elsif _data = '{}'::jsonb then
    return null;
  end if;
  select id into _id from public.equipment_catalog_submissions s
  where s.company_id = _company_id and s.status = 'pending' and s.type = _type and s.catalog_id = _catalog_id;
  if _id is not null then
    update public.equipment_catalog_submissions set attributes = _data, created_at = now() where id = _id;
    return _id;
  end if;
  if (select count(*) from public.equipment_catalog_submissions s where s.company_id = _company_id and s.status = 'pending') >= 300 then
    raise exception 'Too many pending entries' using errcode = '54000';
  end if;
  insert into public.equipment_catalog_submissions (company_id, kind, manufacturer, model, attributes, type, catalog_id)
  values (_company_id, _entry.kind, _entry.manufacturer, _entry.model, _data, _type, _catalog_id)
  returning id into _id;
  return _id;
end;
$$;

-- Fronta nových modelov (0146) – bez potvrdení a zmien.
create or replace function public.catalog_review_queue()
returns table (id uuid, kind text, manufacturer text, model text, name text, attributes jsonb, companies bigint, submitted_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_developer() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
  select distinct on (s.kind, lower(s.manufacturer), lower(s.model))
    s.id, s.kind, s.manufacturer, s.model, s.name, s.attributes,
    (select count(distinct o.company_id) from public.equipment_catalog_submissions o
      where o.status = 'pending' and o.type = 'new' and o.kind = s.kind and lower(o.manufacturer) = lower(s.manufacturer) and lower(o.model) = lower(s.model)),
    s.created_at
  from public.equipment_catalog_submissions s
  where s.status = 'pending' and s.type = 'new'
  order by s.kind, lower(s.manufacturer), lower(s.model), s.created_at desc;
end;
$$;

-- Potvrdenia a zmeny pre vývojára: jeden riadok na model a typ (zmeny jednotlivo, každá firma môže navrhnúť inú).
create or replace function public.catalog_feedback_queue()
returns table (id uuid, catalog_id uuid, type text, attributes jsonb, companies bigint, submitted_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_developer() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
  select s.id, s.catalog_id, s.type, s.attributes,
    case when s.type = 'confirm' then
      (select count(distinct o.company_id) from public.equipment_catalog_submissions o
        where o.status = 'pending' and o.type = 'confirm' and o.catalog_id = s.catalog_id)
    else 1::bigint end,
    s.created_at
  from public.equipment_catalog_submissions s
  where s.status = 'pending' and s.type <> 'new' and s.catalog_id is not null
    and (s.type = 'correction' or s.id = (
      select o.id from public.equipment_catalog_submissions o
      where o.status = 'pending' and o.type = 'confirm' and o.catalog_id = s.catalog_id
      order by o.created_at desc limit 1))
  order by s.created_at desc
  limit 500;
end;
$$;

-- Vybaviť: potvrdenie = model overený; zmena = údaje (upravené vývojárom) sa zlúčia do modelu a model je overený.
-- Zamietnutie len uzavrie návrh. Potvrdenia sa uzavrú všetky naraz.
create or replace function public.resolve_catalog_feedback(_submission_id uuid, _accept boolean, _attributes jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _source public.equipment_catalog_submissions;
  _data jsonb;
begin
  if not public.is_developer() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into _source from public.equipment_catalog_submissions where id = _submission_id and type <> 'new';
  if _source.id is null or _accept is null then
    raise exception 'Invalid entry' using errcode = '22023';
  end if;
  if _accept and _source.catalog_id is not null then
    _data := coalesce(_attributes, _source.attributes, '{}'::jsonb);
    if jsonb_typeof(_data) <> 'object' then
      raise exception 'Invalid entry' using errcode = '22023';
    end if;
    update public.equipment_catalog
    set attributes = case when _source.type = 'correction' then attributes || _data else attributes end,
        verified = true, verified_at = now(), verified_by = (select auth.uid()), updated_at = now()
    where id = _source.catalog_id;
  end if;
  update public.equipment_catalog_submissions s
  set status = case when _accept then 'approved' else 'rejected' end, reviewed_at = now()
  where s.status = 'pending' and (s.id = _submission_id or (_source.type = 'confirm' and s.type = 'confirm' and s.catalog_id = _source.catalog_id));
end;
$$;

-- Koľko firiem a kusov používa model z databázy (podľa výrobcu a modelu techniky). Len počty.
create or replace function public.catalog_usage()
returns table (catalog_id uuid, companies bigint, pieces bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_developer() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
  select c.id, count(distinct e.company_id), coalesce(sum(e.quantity), 0)::bigint
  from public.equipment_catalog c
  join public.equipment e
    on e.kind = c.kind and lower(trim(e.manufacturer)) = lower(c.manufacturer) and lower(trim(e.model)) = lower(c.model)
  where e.deleted_at is null and trim(e.manufacturer) <> ''
  group by c.id;
end;
$$;

revoke execute on function public.submit_catalog_feedback(uuid, uuid, text, jsonb), public.catalog_feedback_queue(),
  public.resolve_catalog_feedback(uuid, boolean, jsonb), public.catalog_usage() from public, anon;
grant execute on function public.submit_catalog_feedback(uuid, uuid, text, jsonb), public.catalog_feedback_queue(),
  public.resolve_catalog_feedback(uuid, boolean, jsonb), public.catalog_usage() to authenticated;
