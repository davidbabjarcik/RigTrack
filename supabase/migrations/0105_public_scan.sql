-- RigTrack 4.6: QR štítok pre človeka bez účtu – „Našli ste techniku firmy X, kontakt…“.
-- Predvolene vypnuté; zapína admin v Nastaveniach → Firma. Ukáže sa len názov veci a kontakt firmy.

alter table public.company_profile add column if not exists public_scan boolean not null default false;
grant update (public_scan) on public.company_profile to authenticated;

create or replace function public.public_scan_info(_kind text, _id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  _company uuid;
  _name text;
  p public.company_profile%rowtype;
begin
  if _kind = 'equipment' then
    select company_id, name into _company, _name from public.equipment where id = _id and deleted_at is null;
  elsif _kind = 'case' then
    select company_id, name into _company, _name from public.cases where id = _id and deleted_at is null;
  end if;
  if _company is null then
    return null;
  end if;
  select * into p from public.company_profile where company_id = _company;
  if not found or not p.public_scan then
    return jsonb_build_object('enabled', false);
  end if;
  return jsonb_build_object(
    'enabled', true,
    'name', _name,
    'company', coalesce(nullif(p.legal_name, ''), (select name from public.companies where id = _company)),
    'phone', p.phone,
    'email', p.email,
    'web', p.web
  );
end;
$$;
revoke execute on function public.public_scan_info(text, uuid) from public;
grant execute on function public.public_scan_info(text, uuid) to anon, authenticated;
