-- RigTrack 4.14: vývojár vidí pri pozvánkach do dema, či sa človek zaregistroval, kedy sa naposledy
-- prihlásil a či si založil demo firmu.

create or replace function public.demo_invitation_status()
returns table (email text, note text, invited_at timestamptz, registered boolean, last_sign_in_at timestamptz, demo_created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.email, d.note, d.created_at, u.id is not null, u.last_sign_in_at, c.created_at
  from public.demo_invitations d
  left join lateral (select id, last_sign_in_at from auth.users where lower(auth.users.email) = d.email limit 1) u on true
  left join lateral (select created_at from public.companies where demo_owner = u.id limit 1) c on true
  where public.is_developer()
  order by d.created_at desc
$$;

revoke execute on function public.demo_invitation_status() from public, anon;
grant execute on function public.demo_invitation_status() to authenticated;
