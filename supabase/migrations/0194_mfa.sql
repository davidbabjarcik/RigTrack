-- 0194: Dvojfaktorové prihlásenie (TOTP – kód z aplikácie v mobile). Kto si ho zapne, k dátam sa dostane len
-- po zadaní kódu (relácia aal2) – aj keby niekto mal jeho heslo a volal databázu priamo, mimo appky. Kto 2FA
-- nemá, pre toho sa nič nemení.
--   1) public.mfa_ok(): aal2, alebo používateľ nemá overený faktor (alebo nie je prihlásený),
--   2) spoločné kontroly is_company_member / has_role / can ho vyžadujú (pokrýva pravidlá aj RPC funkcie),
--   3) obmedzujúce pravidlo (restrictive) na každej tabuľke s RLS a na súboroch – aj na vlastné riadky.

create or replace function public.mfa_ok()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is null
    or coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status::text = 'verified')
$$;
revoke execute on function public.mfa_ok() from public;
grant execute on function public.mfa_ok() to anon, authenticated;

create or replace function public.is_company_member(_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.mfa_ok() and exists (
    select 1 from public.company_members m
    where m.company_id = _company_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_role(_company_id uuid, variadic _roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select public.mfa_ok() and exists (
    select 1 from public.company_members m
    where m.company_id = _company_id and m.user_id = auth.uid()
      and (m.role = any (_roles) or (m.role = 'ceo' and 'admin' = any (_roles)))
  );
$$;

create or replace function public.can(_company_id uuid, _permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.mfa_ok() and coalesce(
    (
      select m.role in ('admin', 'ceo') or coalesce(
        (select mp.allowed from public.member_permissions mp
          where mp.company_id = m.company_id and mp.user_id = m.user_id and mp.permission = _permission),
        (select true from public.permission_group_members gm
          join public.permission_group_rules gr on gr.group_id = gm.group_id and gr.permission = _permission
          where gm.company_id = m.company_id and gm.user_id = m.user_id
          limit 1),
        (select rp.allowed from public.role_permissions rp
          where rp.company_id = m.company_id and rp.role = m.role and rp.permission = _permission),
        (select m.role = any (d.roles) from public.permission_defaults() d where d.permission = _permission),
        false
      )
      from public.company_members m
      where m.company_id = _company_id and m.user_id = auth.uid()
    ),
    false
  )
$$;

-- Obmedzujúce pravidlo na všetkých tabuľkách s RLS (aj vlastné riadky ako profil či nastavenia).
do $$
declare
  t record;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity loop
    execute format('drop policy if exists mfa_required on public.%I', t.relname);
    execute format('create policy mfa_required on public.%I as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()))', t.relname);
  end loop;
end;
$$;

drop policy if exists mfa_required on storage.objects;
create policy mfa_required on storage.objects as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
