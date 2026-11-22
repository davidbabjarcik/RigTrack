-- 0190: „Naposledy“ pri účtoch = posledná aktivita, nie posledné prihlásenie heslom. Kto ostane prihlásený, jeho
-- relácia sa obnovuje sama (auth.sessions) a auth.users.last_sign_in_at sa nemení – preto napr. demo založené
-- deň po „poslednom prihlásení“. Platí pre pozvánky do dema, účty vo Vývojárovi a stav účtov členov.

create or replace function public.last_seen(_user uuid)
returns timestamptz language plpgsql stable security definer set search_path = '' as $$
declare
  _signed timestamptz;
  _session timestamptz;
begin
  select u.last_sign_in_at into _signed from auth.users u where u.id = _user;
  begin
    execute 'select max(greatest(s.updated_at, s.refreshed_at at time zone ''UTC'')) from auth.sessions s where s.user_id = $1'
      into _session using _user;
  exception when others then
    _session := null;
  end;
  return greatest(_signed, _session);
end;
$$;
revoke execute on function public.last_seen(uuid) from public, anon, authenticated;

create or replace function public.demo_invitation_status()
returns table (email text, note text, invited_at timestamptz, registered boolean, last_sign_in_at timestamptz, demo_created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.email, d.note, d.created_at, u.id is not null, public.last_seen(u.id), c.created_at
  from public.demo_invitations d
  left join lateral (select id from auth.users where lower(auth.users.email) = d.email limit 1) u on true
  left join lateral (select created_at from public.companies where demo_owner = u.id limit 1) c on true
  where public.is_developer()
  order by d.created_at desc
$$;
revoke execute on function public.demo_invitation_status() from public, anon;
grant execute on function public.demo_invitation_status() to authenticated;

create or replace function public.developer_users()
returns table (user_id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz, confirmed boolean, companies jsonb)
language sql stable security definer set search_path = '' as $$
  select
    u.id,
    coalesce(u.email, p.email, ''),
    coalesce(p.full_name, ''),
    p.created_at,
    public.last_seen(u.id),
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
  order by 5 desc nulls last
$$;
revoke execute on function public.developer_users() from public, anon;
grant execute on function public.developer_users() to authenticated;

create or replace function public.company_account_status(_company uuid)
returns table (email text, user_id uuid, is_member boolean, has_account boolean, confirmed boolean, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(_company, 'admin') then
    raise exception 'Only an admin can see account status' using errcode = '42501';
  end if;
  return query
    select u.email::text, u.id, true, true, u.email_confirmed_at is not null, public.last_seen(u.id)
    from public.company_members m
    join auth.users u on u.id = m.user_id
    where m.company_id = _company
    union all
    select i.email, u.id, false, u.id is not null, u.email_confirmed_at is not null, public.last_seen(u.id)
    from public.company_invitations i
    left join auth.users u on lower(u.email) = i.email
    where i.company_id = _company;
end;
$$;
revoke execute on function public.company_account_status(uuid) from public, anon;
grant execute on function public.company_account_status(uuid) to authenticated;
