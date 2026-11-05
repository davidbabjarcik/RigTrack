-- 0153: overovanie spoločnej databázy techniky. Každý model je overený alebo neoverený; overuje len vývojár.
-- Všetko, čo v databáze doteraz je (aj prevzaté z katalógov výrobcov a z Open Fixture Library), je neoverené.

alter table public.equipment_catalog
  add column if not exists verified boolean not null default false,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid;

update public.equipment_catalog set verified = false, verified_at = null, verified_by = null;

-- Schválenie návrhu od firmy = model overený vývojárom.
create or replace function public.approve_catalog_entry(_submission_id uuid, _kind text, _manufacturer text, _model text, _attributes jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _source public.equipment_catalog_submissions;
  _catalog uuid;
  _maker text := trim(coalesce(_manufacturer, ''));
  _mod text := trim(coalesce(_model, ''));
begin
  if not public.is_developer() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if _maker = '' or _attributes is null or jsonb_typeof(_attributes) <> 'object' then
    raise exception 'Invalid entry' using errcode = '22023';
  end if;
  select * into _source from public.equipment_catalog_submissions where id = _submission_id;
  insert into public.equipment_catalog (kind, manufacturer, model, attributes, verified, verified_at, verified_by)
  values (_kind, _maker, _mod, _attributes, true, now(), (select auth.uid()))
  on conflict (kind, lower(manufacturer), lower(model)) do update
    set attributes = excluded.attributes, manufacturer = excluded.manufacturer, model = excluded.model, updated_at = now(),
        verified = true, verified_at = now(), verified_by = (select auth.uid())
  returning id into _catalog;
  update public.equipment_catalog_submissions s
  set status = 'approved', reviewed_at = now(), catalog_id = _catalog
  where s.status = 'pending' and (
    s.id = _submission_id
    or (s.kind = _kind and lower(s.manufacturer) = lower(_maker) and lower(s.model) = lower(_mod))
    or (_source.id is not null and s.kind = _source.kind and lower(s.manufacturer) = lower(_source.manufacturer) and lower(s.model) = lower(_source.model))
  );
  return _catalog;
end;
$$;

-- Overiť (alebo zrušiť overenie) jednému alebo viacerým modelom naraz. Vráti počet zmenených.
create or replace function public.verify_catalog_entries(_ids uuid[], _verified boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _count integer;
begin
  if not public.is_developer() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if _ids is null or cardinality(_ids) > 2000 or _verified is null then
    raise exception 'Invalid entry' using errcode = '22023';
  end if;
  update public.equipment_catalog
  set verified = _verified,
      verified_at = case when _verified then now() end,
      verified_by = case when _verified then (select auth.uid()) end
  where id = any(_ids) and verified is distinct from _verified;
  get diagnostics _count = row_count;
  return _count;
end;
$$;

revoke execute on function public.verify_catalog_entries(uuid[], boolean) from public, anon;
grant execute on function public.verify_catalog_entries(uuid[], boolean) to authenticated;
