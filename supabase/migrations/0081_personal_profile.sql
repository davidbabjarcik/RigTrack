-- RigTrack: osobný profil spoločný pre všetky firmy (3.0).
-- Človek si raz zadá telefón, e-mail, narodeniny, meniny, vodičák a adresu domov. Databáza ich sama prepíše
-- do jeho karty zamestnanca v každej firme (kým má karta zapnuté „brať z profilu“) a do adresy domov pre
-- dochádzku. Profil vidí len jeho majiteľ; kolegovia vidia, čo je na karte zamestnanca, ako doteraz.

create table if not exists public.personal_profiles (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  phone text not null default '' check (char_length(phone) <= 40),
  email text not null default '' check (char_length(email) <= 120),
  birth_date date,
  name_day text not null default '' check (name_day = '' or name_day ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  licences text[] not null default '{}'
    check (licences <@ array['AM', 'A1', 'A2', 'A', 'B1', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'T']::text[]),
  home_address text not null default '' check (char_length(home_address) <= 200),
  home_lat double precision check (home_lat between -90 and 90),
  home_lon double precision check (home_lon between -180 and 180),
  updated_at timestamptz not null default now()
);
alter table public.personal_profiles enable row level security;
drop policy if exists personal_profiles_own on public.personal_profiles;
create policy personal_profiles_own on public.personal_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.personal_profiles from anon, authenticated;
grant select, insert on public.personal_profiles to authenticated;
grant update (phone, email, birth_date, name_day, licences, home_address, home_lat, home_lon, updated_at) on public.personal_profiles to authenticated;

-- Karta zamestnanca: brať údaje z osobného profilu (predvolene áno). Vypnutím sa karta upravuje len vo firme.
alter table public.staff add column if not exists sync_profile boolean not null default true;
grant update (sync_profile) on public.staff to authenticated;

/** Prepíše profil človeka do jeho kariet (so zapnutým sync) a adries domov vo všetkých jeho firmách. */
create or replace function public.apply_personal_profile(_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.personal_profiles%rowtype;
begin
  select * into p from public.personal_profiles where user_id = _user_id;
  if not found then return; end if;
  update public.staff s
    set phone = p.phone, email = p.email, birth_date = p.birth_date, name_day = p.name_day, licences = p.licences
    where s.member_id = _user_id and s.sync_profile;
  if p.home_address <> '' then
    insert into public.member_homes (company_id, user_id, address, lat, lon, updated_at)
      select m.company_id, _user_id, p.home_address, p.home_lat, p.home_lon, now()
      from public.company_members m where m.user_id = _user_id
    on conflict (company_id, user_id) do update set address = excluded.address, lat = excluded.lat, lon = excluded.lon, updated_at = now();
  end if;
end;
$$;
revoke execute on function public.apply_personal_profile(uuid) from public, anon, authenticated;

create or replace function public.personal_profile_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.apply_personal_profile(new.user_id);
  return new;
end;
$$;
revoke execute on function public.personal_profile_changed() from public, anon, authenticated;
drop trigger if exists personal_profiles_apply on public.personal_profiles;
create trigger personal_profiles_apply after insert or update on public.personal_profiles
  for each row execute function public.personal_profile_changed();

-- Nová karta člena (napr. v novej firme) sa hneď vyplní z profilu; zapnutie sync ju dorovná.
create or replace function public.fill_staff_from_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  p public.personal_profiles%rowtype;
begin
  if new.member_id is null or not new.sync_profile then return new; end if;
  if tg_op = 'UPDATE' and old.sync_profile then return new; end if;
  select * into p from public.personal_profiles where user_id = new.member_id;
  if found then
    new.phone := p.phone;
    new.email := p.email;
    new.birth_date := p.birth_date;
    new.name_day := p.name_day;
    new.licences := p.licences;
  end if;
  return new;
end;
$$;
revoke execute on function public.fill_staff_from_profile() from public, anon, authenticated;
drop trigger if exists staff_fill_from_profile on public.staff;
create trigger staff_fill_from_profile before insert or update of sync_profile on public.staff
  for each row execute function public.fill_staff_from_profile();

-- Vstup do novej firmy: adresa domov z profilu sa prenesie aj tam.
create or replace function public.member_joined_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.apply_personal_profile(new.user_id);
  return new;
end;
$$;
revoke execute on function public.member_joined_profile() from public, anon, authenticated;
drop trigger if exists company_members_profile on public.company_members;
create trigger company_members_profile after insert on public.company_members
  for each row execute function public.member_joined_profile();
