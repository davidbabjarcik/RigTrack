-- RigTrack: registrácia len na pozvánku.
-- Funkcia pre Supabase Auth hook „Before User Created“: účet sa založí len pre e-mail, ktorý má
-- pozvánku do niektorej firmy. Treba ju zapnúť v Supabase → Authentication → Hooks →
-- Before User Created → Postgres function → public.hook_require_invitation.

create function public.hook_require_invitation(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  _email text := lower(trim(coalesce(event -> 'user' ->> 'email', '')));
begin
  if _email <> '' and exists (select 1 from public.company_invitations i where i.email = _email) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Registrácia je len na pozvánku.'));
end;
$$;

revoke execute on function public.hook_require_invitation(jsonb) from public, anon, authenticated;

-- Volá ju služba prihlasovania Supabase (rola supabase_auth_admin; v testoch neexistuje).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.hook_require_invitation(jsonb) to supabase_auth_admin;
  end if;
end;
$$;
