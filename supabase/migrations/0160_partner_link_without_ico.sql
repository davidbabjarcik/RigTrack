-- 0160: prepojenie firmy z adresára s firmou v RigTracku aj bez IČO.
-- 1) Podľa kódu na prepojenie (ten istý ako v Nastavenia → Prepojené firmy) – kód vidí len člen tej firmy, takže ho
--    musia poslať oni. 2) Názov sa porovnáva bez diakritiky, medzier, bodiek a právnej formy (s.r.o., a.s. …), stále
--    však celý – časťou názvu sa hľadať nedá, aby sa nedal stiahnuť zoznam firiem.

/** „Zvuk-Plus, s.r.o.“ → „zvukplus“ */
create or replace function public.company_name_key(_name text)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(
    regexp_replace(
      translate(lower(trim(coalesce(_name, ''))), 'áäčďéěíĺľňóôŕřšťúůýž', 'aacdeeillnoorrstuuyz'),
      '[\s,]*(spol\.?\s*s\s*r\.?\s*o\.?|s\.?\s*r\.?\s*o\.?|a\.\s*s\.?|k\.\s*s\.?|v\.\s*o\.\s*s\.?|gmbh|ltd\.?|inc\.?)$', ''),
    '[^a-z0-9]', '', 'g')
$$;

create or replace function public.find_rigtrack_companies(_ico text, _name text, _legal_name text default '')
returns table (id uuid, name text, legal_name text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, coalesce(p.legal_name, '')
  from public.companies c
  left join public.company_profile p on p.company_id = c.id
  where auth.uid() is not null
    and (
      (length(regexp_replace(coalesce(_ico, ''), '\s', '', 'g')) >= 6
        and regexp_replace(coalesce(p.ico, ''), '\s', '', 'g') = regexp_replace(_ico, '\s', '', 'g'))
      or (length(public.company_name_key(_name)) >= 2
        and public.company_name_key(_name) in (public.company_name_key(c.name), public.company_name_key(p.legal_name)))
      or (length(public.company_name_key(_legal_name)) >= 2
        and public.company_name_key(_legal_name) in (public.company_name_key(c.name), public.company_name_key(p.legal_name)))
    )
  order by c.name
  limit 5;
$$;
revoke execute on function public.find_rigtrack_companies(text, text, text) from public, anon;
grant execute on function public.find_rigtrack_companies(text, text, text) to authenticated;

/** Firma v RigTracku podľa kódu na prepojenie (presná zhoda). */
create or replace function public.find_company_by_link_code(_code text)
returns table (id uuid, name text, legal_name text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name, coalesce(p.legal_name, '')
  from public.company_link_codes l
  join public.companies c on c.id = l.company_id
  left join public.company_profile p on p.company_id = c.id
  where auth.uid() is not null
    and length(regexp_replace(coalesce(_code, ''), '[\s-]', '', 'g')) >= 6
    and l.code = upper(regexp_replace(_code, '[\s-]', '', 'g'));
$$;
revoke execute on function public.find_company_by_link_code(text) from public, anon;
grant execute on function public.find_company_by_link_code(text) to authenticated;
revoke execute on function public.company_name_key(text) from public, anon;
grant execute on function public.company_name_key(text) to authenticated;
