-- RigTrack: Firmy a kontakty podrobnejšie (3.8).
-- 1) Firma: obchodné meno (napr. CVR Production funguje pod ARMPRO COMPOSITE s.r.o.), IČ DPH a CEO.
-- 2) Kontakt: dátum narodenia.
-- 3) Prepojenie s firmou, ktorá už v RigTracku je: nájde sa podľa IČO alebo presného názvu / obchodného mena
--    a partner sa s ňou prepojí (namiesto zakladania druhej firmy).

alter table public.partners add column if not exists legal_name text not null default '' check (char_length(legal_name) <= 160);
alter table public.partners add column if not exists ic_dph text not null default '' check (char_length(ic_dph) <= 20);
alter table public.partners add column if not exists ceo text not null default '' check (char_length(ceo) <= 120);
grant update (legal_name, ic_dph, ceo) on public.partners to authenticated;

alter table public.partner_contacts add column if not exists birth_date date;
grant update (birth_date) on public.partner_contacts to authenticated;

/** Firmy v RigTracku s rovnakým IČO, alebo s presne rovnakým názvom či obchodným menom (len názov a id). */
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
      or (trim(coalesce(_name, '')) <> '' and (lower(trim(c.name)) = lower(trim(_name)) or lower(trim(coalesce(p.legal_name, ''))) = lower(trim(_name))))
      or (trim(coalesce(_legal_name, '')) <> '' and (lower(trim(c.name)) = lower(trim(_legal_name)) or lower(trim(coalesce(p.legal_name, ''))) = lower(trim(_legal_name))))
    )
  order by c.name
  limit 5;
$$;
revoke execute on function public.find_rigtrack_companies(text, text, text) from public, anon;
grant execute on function public.find_rigtrack_companies(text, text, text) to authenticated;

/** Prepojí firmu z adresára s firmou v RigTracku (alebo väzbu zruší, keď _company_id je null). */
create or replace function public.link_partner_company(_partner_id uuid, _company_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _owner uuid;
begin
  select company_id into _owner from public.partners where id = _partner_id;
  if _owner is null or not public.can(_owner, 'events.edit') then
    raise exception 'Firma neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _company_id = _owner then
    raise exception 'Firmu nemožno prepojiť samu so sebou' using errcode = 'check_violation';
  end if;
  update public.partners set linked_company_id = _company_id, uses_app = (_company_id is not null) or uses_app where id = _partner_id;
end;
$$;
revoke execute on function public.link_partner_company(uuid, uuid) from public, anon;
grant execute on function public.link_partner_company(uuid, uuid) to authenticated;

/** Založí partnerovi firmu v RigTracku; prenesie aj obchodné meno, IČ DPH a CEO. */
create or replace function public.create_partner_company(_partner_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _partner public.partners;
  _id uuid;
begin
  select * into _partner from public.partners p where p.id = _partner_id;
  if not found or not public.can(_partner.company_id, 'events.edit') then
    raise exception 'Firma neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _partner.linked_company_id is not null then
    return _partner.linked_company_id;
  end if;
  insert into public.companies (name, created_by, founded_by) values (left(trim(_partner.name), 120), auth.uid(), _partner.company_id) returning id into _id;
  insert into public.company_members (company_id, user_id, role) values (_id, auth.uid(), 'admin');
  insert into public.company_profile (company_id, legal_name, ico, dic, ic_dph, address, ceo_name)
  values (_id, left(coalesce(nullif(trim(_partner.legal_name), ''), _partner.name), 160), left(_partner.ico, 20), left(_partner.dic, 20),
          left(_partner.ic_dph, 20), left(_partner.address, 200), left(_partner.ceo, 120));
  update public.partners set linked_company_id = _id, uses_app = true where id = _partner_id;
  return _id;
end;
$$;
revoke execute on function public.create_partner_company(uuid) from public, anon;
grant execute on function public.create_partner_company(uuid) to authenticated;

-- 4) Ako sa zobrazuje logo firmy: automaticky (podľa farieb), pôvodné farby bez podložky, s bielou podložkou,
--    vždy biele alebo vždy čierne.
alter table public.companies add column if not exists logo_style text not null default 'auto'
  check (logo_style in ('auto', 'original', 'plate', 'white', 'black'));
grant update (logo_style) on public.companies to authenticated;

-- 5) Push bez ručného Database Webhooku: nový riadok v notifications pošle databáza sama funkcii send-push
--    (pg_net). Adresa funkcie a tajomstvo sú vo Vault (vault.create_secret – návod v Nastaveniach → Push);
--    kým tam nie sú, nič sa neposiela. Kto už má Database Webhook, nech ho zmaže, inak príde upozornenie dvakrát.
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net nie je k dispozícii – push sa bude posielať len cez Database Webhook';
end;
$$;

create or replace function public.notification_send_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _url text;
  _secret text;
begin
  begin
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into _url using 'push_function_url';
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into _secret using 'push_webhook_secret';
    if coalesce(_url, '') = '' or coalesce(_secret, '') = '' then return new; end if;
    execute 'select net.http_post(url := $1, headers := $2, body := $3)'
      using _url, jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', _secret), jsonb_build_object('record', to_jsonb(new));
  exception when others then
    -- Chýba Vault alebo pg_net: upozornenie ostane v appke, len nepríde na mobil.
    return new;
  end;
  return new;
end;
$$;
revoke execute on function public.notification_send_push() from public, anon, authenticated;
drop trigger if exists notifications_send_push on public.notifications;
create trigger notifications_send_push after insert on public.notifications
  for each row execute function public.notification_send_push();

/** Je push v databáze nastavený? (len áno / nie, žiadne tajomstvá) */
create or replace function public.push_setup_status()
returns table (has_pg_net boolean, has_url boolean, has_secret boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  _url boolean := false;
  _secret boolean := false;
begin
  begin
    execute 'select exists (select 1 from vault.decrypted_secrets where name = $1 and decrypted_secret <> '''')' into _url using 'push_function_url';
    execute 'select exists (select 1 from vault.decrypted_secrets where name = $1 and decrypted_secret <> '''')' into _secret using 'push_webhook_secret';
  exception when others then
    null;
  end;
  return query select exists (select 1 from pg_extension where extname = 'pg_net'), _url, _secret;
end;
$$;
revoke execute on function public.push_setup_status() from public, anon;
grant execute on function public.push_setup_status() to authenticated;
