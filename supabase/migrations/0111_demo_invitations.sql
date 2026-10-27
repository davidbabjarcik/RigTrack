-- RigTrack 4.13: pozvánka len do dema. Vývojár pozve e-mail, ktorý sa smie zaregistrovať,
-- ale nedostane prístup do žiadnej firmy – po prihlásení si otvorí vlastnú demo firmu.

create table if not exists public.demo_invitations (
  email text primary key check (email = lower(trim(email)) and email like '%_@_%'),
  note text not null default '' check (char_length(note) <= 200),
  invited_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.demo_invitations enable row level security;
revoke all on public.demo_invitations from anon, authenticated;
grant select, insert, delete on public.demo_invitations to authenticated;

drop policy if exists demo_invitations_developer on public.demo_invitations;
create policy demo_invitations_developer on public.demo_invitations
  for all to authenticated using (public.is_developer()) with check (public.is_developer());

-- Registrácia: pozvánka do firmy alebo do dema.
create or replace function public.hook_require_invitation(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  _email text := lower(trim(coalesce(event -> 'user' ->> 'email', '')));
begin
  if _email <> '' and (
    exists (select 1 from public.company_invitations i where i.email = _email)
    or exists (select 1 from public.demo_invitations d where d.email = _email)
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Registrácia je len na pozvánku.'));
end;
$$;

revoke execute on function public.hook_require_invitation(jsonb) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.hook_require_invitation(jsonb) to supabase_auth_admin;
  end if;
end;
$$;
