  -- RigTrack: nová rola CEO (2. časť).
  -- CEO má vo firme rovnaké práva ako admin: všade, kde sa pýta na admina, prejde aj CEO,
  -- a smie všetko bez ohľadu na nastavenie oprávnení. Firma však stále musí mať aspoň jedného admina.
  
  create or replace function public.has_role(_company_id uuid, variadic _roles public.app_role[])
  returns boolean language sql stable security definer set search_path = '' as $$
    select exists (
      select 1 from public.company_members m
      where m.company_id = _company_id and m.user_id = auth.uid()
        and (m.role = any (_roles) or (m.role = 'ceo' and 'admin' = any (_roles)))
    );
  $$;
  
  create or replace function public.can(_company_id uuid, _permission text)
  returns boolean language sql stable security definer set search_path = '' as $$
    select coalesce(
      (
        select m.role in ('admin', 'ceo') or coalesce(
          (select mp.allowed from public.member_permissions mp
            where mp.company_id = m.company_id and mp.user_id = m.user_id and mp.permission = _permission),
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
