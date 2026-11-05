-- 0152: výrobníky hmly (hazery) patria k svetlám, nie k spotrebičom – presun v spoločnej databáze techniky.
update public.equipment_catalog
set kind = 'light', attributes = attributes || '{"lightType": "hazer"}'::jsonb, updated_at = now()
where kind = 'appliance'
  and (lower(manufacturer), lower(model)) in (('mdg', 'theone'), ('look solutions', 'unique 2.1'), ('showtec', 'compact hazer'))
  and not exists (
    select 1 from public.equipment_catalog l
    where l.kind = 'light' and lower(l.manufacturer) = lower(equipment_catalog.manufacturer) and lower(l.model) = lower(equipment_catalog.model)
  );
