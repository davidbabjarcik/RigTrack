-- 0178: kedy a s akým obsahom bol štítok / hárok vytlačený.
-- Pri hárku s obsahom case sa uloží odtlačok obsahu (content_hash); keď sa obsah case potom zmení,
-- appka upozorní, že hárok treba vytlačiť znova. Pri opätovnej tlači sa dátum a odtlačok prepíšu.

alter table public.printed_labels add column if not exists content_hash text not null default ''
  constraint printed_labels_hash_len check (char_length(content_hash) <= 64);

-- Zápis vytlačených štítkov: nový záznam alebo obnovený dátum, kto a odtlačok (bez práva meniť kľúč riadku).
create or replace function public.mark_printed(_company_id uuid, _items jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (public.is_company_member(_company_id) and (public.can(_company_id, 'equipment.view') or public.can(_company_id, 'cases.view'))) then
    raise exception 'Na zápis tlače nemáte oprávnenie.' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) > 2000 then
    raise exception 'Neplatný zoznam.' using errcode = 'invalid_parameter_value';
  end if;
  insert into public.printed_labels (company_id, kind, target_id, label, content_hash, printed_by, printed_at)
  select _company_id, item ->> 'kind', (item ->> 'target_id')::uuid, coalesce(item ->> 'label', 'qr'), left(coalesce(item ->> 'content_hash', ''), 64), auth.uid(), now()
  from jsonb_array_elements(_items) as item
  on conflict (company_id, kind, target_id, label) do update
    set printed_at = now(), printed_by = auth.uid(), content_hash = excluded.content_hash;
end;
$$;
revoke execute on function public.mark_printed(uuid, jsonb) from public, anon;
grant execute on function public.mark_printed(uuid, jsonb) to authenticated;
