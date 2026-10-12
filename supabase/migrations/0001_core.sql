-- RigTrack: jadro multi-tenant modelu — profily, firmy, členstvá, pozvánky.
-- Izolácia firiem stojí na RLS; frontendové guardy sú iba UX.

create type public.app_role as enum ('admin', 'technik', 'skladnik', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index company_members_user_id_idx on public.company_members (user_id);

create table public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email like '%_@_%'),
  role public.app_role not null default 'viewer',
  invited_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, email)
);
create index company_invitations_email_idx on public.company_invitations (email);

-- ---------------------------------------------------------------------------
-- Pomocné funkcie pre policies. SECURITY DEFINER, aby policy na company_members
-- nevolala sama seba (rekurzia) a aby sa dalo čítať z auth.users.
-- ---------------------------------------------------------------------------

create function public.is_company_member(_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = _company_id and m.user_id = auth.uid()
  );
$$;

create function public.has_role(_company_id uuid, variadic _roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = _company_id and m.user_id = auth.uid() and m.role = any (_roles)
  );
$$;

create function public.shares_company(_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.company_members mine
    join public.company_members theirs using (company_id)
    where mine.user_id = auth.uid() and theirs.user_id = _user_id
  );
$$;

-- Iba potvrdený e-mail: inak by si cudziu pozvánku privlastnil ktokoľvek,
-- kto sa zaregistruje s adresou pozvaného.
create function public.current_email()
returns text language sql stable security definer set search_path = '' as $$
  select lower(u.email) from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;
$$;

create function public.is_invited_to(_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_invitations i
    where i.company_id = _company_id and i.email = public.current_email()
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggery
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.prevent_last_admin_removal()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'admin'
    and (tg_op = 'DELETE' or new.role <> 'admin')
    -- pri mazaní celej firmy (cascade) už rodič neexistuje a kontrola sa preskočí
    and exists (select 1 from public.companies c where c.id = old.company_id)
    and not exists (
      select 1 from public.company_members m
      where m.company_id = old.company_id and m.role = 'admin' and m.user_id <> old.user_id
    )
  then
    raise exception 'Firma musí mať aspoň jedného admina' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger company_members_keep_admin
  before update of role or delete on public.company_members
  for each row execute function public.prevent_last_admin_removal();

-- ---------------------------------------------------------------------------
-- RPC: jediné cesty, ktorými vzniká členstvo
-- ---------------------------------------------------------------------------

create function public.create_company(_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  insert into public.companies (name, created_by) values (trim(_name), auth.uid()) returning id into _id;
  insert into public.company_members (company_id, user_id, role) values (_id, auth.uid(), 'admin');
  return _id;
end;
$$;

create function public.accept_invitation(_invitation_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _inv public.company_invitations;
begin
  select * into _inv from public.company_invitations i
  where i.id = _invitation_id and i.email = public.current_email();
  if not found then
    raise exception 'Pozvánka neexistuje' using errcode = 'no_data_found';
  end if;
  insert into public.company_members (company_id, user_id, role)
  values (_inv.company_id, auth.uid(), _inv.role)
  on conflict do nothing;
  delete from public.company_invitations where id = _inv.id;
  return _inv.company_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_invitations enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_company(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy companies_select on public.companies for select to authenticated
  using (public.is_company_member(id) or public.is_invited_to(id));
create policy companies_update on public.companies for update to authenticated
  using (public.has_role(id, 'admin')) with check (public.has_role(id, 'admin'));

create policy company_members_select on public.company_members for select to authenticated
  using (public.is_company_member(company_id));
create policy company_members_update on public.company_members for update to authenticated
  using (public.has_role(company_id, 'admin')) with check (public.has_role(company_id, 'admin'));
create policy company_members_delete on public.company_members for delete to authenticated
  using (public.has_role(company_id, 'admin') or user_id = (select auth.uid()));

create policy company_invitations_select on public.company_invitations for select to authenticated
  using (public.has_role(company_id, 'admin') or email = public.current_email());
create policy company_invitations_insert on public.company_invitations for insert to authenticated
  with check (public.has_role(company_id, 'admin') and invited_by = (select auth.uid()));
create policy company_invitations_delete on public.company_invitations for delete to authenticated
  using (public.has_role(company_id, 'admin') or email = public.current_email());

-- ---------------------------------------------------------------------------
-- Oprávnenia: anon nemá nič; authenticated iba to, čo policies ďalej zúžia.
-- Update je povolený len na vymenované stĺpce.
-- ---------------------------------------------------------------------------

revoke all on public.profiles, public.companies, public.company_members, public.company_invitations
  from anon, authenticated;

grant select, update (full_name) on public.profiles to authenticated;
grant select, update (name) on public.companies to authenticated;
grant select, update (role), delete on public.company_members to authenticated;
grant select, insert (company_id, email, role), delete on public.company_invitations to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_company_member(uuid),
  public.has_role(uuid, public.app_role[]),
  public.shares_company(uuid),
  public.current_email(),
  public.is_invited_to(uuid),
  public.create_company(text),
  public.accept_invitation(uuid)
  to authenticated;
