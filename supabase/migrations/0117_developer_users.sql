-- RigTrack 5.11: vývojár vidí všetky účty – e-mail, meno, kedy vznikol, kedy sa naposledy prihlásil
-- a v ktorých firmách je s akou rolou (demo firmy označené). Ostatní dostanú prázdny výsledok.

create or replace function public.developer_users()
returns table (user_id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz, confirmed boolean, companies jsonb)
language sql stable security definer set search_path = '' as $$
  select
    u.id,
    coalesce(u.email, p.email, ''),
    coalesce(p.full_name, ''),
    p.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at is not null,
    coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'role', m.role, 'demo', c.demo_owner is not null) order by c.name)
      from public.company_members m
      join public.companies c on c.id = m.company_id
      where m.user_id = u.id
    ), '[]'::jsonb)
  from auth.users u
  left join public.profiles p on p.id = u.id
  where public.is_developer()
  order by u.last_sign_in_at desc nulls last
$$;

revoke execute on function public.developer_users() from public, anon;
grant execute on function public.developer_users() to authenticated;
