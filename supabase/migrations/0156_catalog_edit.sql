-- 0156: úprava modelu v spoločnej databáze techniky (vývojár): druh, značka, model, technické údaje a overenie.

create or replace function public.update_catalog_entry(_id uuid, _kind text, _manufacturer text, _model text, _attributes jsonb, _verified boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _maker text := trim(coalesce(_manufacturer, ''));
  _mod text := trim(coalesce(_model, ''));
begin
  if not public.is_developer() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if _maker = '' or char_length(_maker) > 80 or char_length(_mod) > 80 or _verified is null
     or _attributes is null or jsonb_typeof(_attributes) <> 'object' or pg_column_size(_attributes) > 8000 then
    raise exception 'Invalid entry' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.equipment_catalog c
    where c.id <> _id and c.kind = _kind and lower(c.manufacturer) = lower(_maker) and lower(c.model) = lower(_mod)
  ) then
    raise exception 'Duplicate model' using errcode = '23505';
  end if;
  update public.equipment_catalog
  set kind = _kind, manufacturer = _maker, model = _mod, attributes = _attributes, updated_at = now(),
      verified = _verified,
      verified_at = case when _verified and not verified then now() when _verified then verified_at end,
      verified_by = case when _verified and not verified then (select auth.uid()) when _verified then verified_by end
  where id = _id;
end;
$$;

revoke execute on function public.update_catalog_entry(uuid, text, text, text, jsonb, boolean) from public, anon;
grant execute on function public.update_catalog_entry(uuid, text, text, text, jsonb, boolean) to authenticated;
