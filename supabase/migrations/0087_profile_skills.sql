-- RigTrack: zručnosti v osobnom profile (3.8).
-- Čo človek vie ovládať (napr. Avolites, GrandMA, Crown, práca vo výškach) zadá raz v Mojom profile;
-- prenesie sa do jeho kariet zamestnanca vo všetkých firmách (kým má karta zapnuté „brať z profilu“).

alter table public.personal_profiles add column if not exists skills text not null default '' check (char_length(skills) <= 500);
grant update (skills) on public.personal_profiles to authenticated;

create or replace function public.apply_personal_profile(_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.personal_profiles%rowtype;
begin
  select * into p from public.personal_profiles where user_id = _user_id;
  if not found then return; end if;
  update public.staff s
    set phone = p.phone, email = p.email, birth_date = p.birth_date, name_day = p.name_day, licences = p.licences,
        socials = case when p.socials = '{}'::jsonb then s.socials else p.socials end,
        skills = case when p.skills = '' then s.skills else p.skills end
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
    if p.socials <> '{}'::jsonb then new.socials := p.socials; end if;
    if p.skills <> '' then new.skills := p.skills; end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.fill_staff_from_profile() from public, anon, authenticated;
