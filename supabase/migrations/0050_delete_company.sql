-- RigTrack: zmazanie firmy.
-- Admin firmy ju môže natrvalo zmazať; pre istotu musí napísať jej presný názov.
-- Všetky údaje firmy (technika, cases, eventy, výpožičky, vozidlá, servis, členstvá, história…)
-- sa zmažú kaskádou cez cudzie kľúče na companies. Súbory v Storage maže aplikácia ešte pred
-- týmto volaním cez Storage API (Supabase nedovolí mazať storage.objects priamo z SQL).
-- Hlásenia chýb ostanú vývojárovi, len bez firmy.

create function public.delete_company(_company uuid, _confirm_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.has_role(_company, 'admin') then
    raise exception 'Only an admin can delete the company' using errcode = '42501';
  end if;
  select c.name into _name from public.companies c where c.id = _company;
  if _name is null then
    raise exception 'Company not found' using errcode = 'P0002';
  end if;
  if trim(coalesce(_confirm_name, '')) <> trim(_name) then
    raise exception 'Company name does not match' using errcode = '22023';
  end if;
  delete from public.companies where id = _company;
end;
$$;

revoke execute on function public.delete_company(uuid, text) from public, anon;
grant execute on function public.delete_company(uuid, text) to authenticated;
