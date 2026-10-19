-- RigTrack: kto má účet, zariadenia v kartách zamestnancov, vlastná technika zamestnancov.
-- 1) Admin vidí pri členoch a pozvánkach, či človek už má účet, potvrdil e-mail a kedy sa naposledy prihlásil.
-- 2) Správca tímu (staff.manage) môže zapísať zariadenie (MAC) aj za iného člena firmy; zariadenie má Wi-Fi siete s IP.
-- 3) Technika aj case / rack môže patriť zamestnancovi (napr. jeho vlastný mikrofón), nie firme.
-- 4) Novému členovi sa sama založí karta zamestnanca.

-- 1) Stav účtov členov a pozvaných (len pre admina firmy).
create function public.company_account_status(_company uuid)
returns table (email text, user_id uuid, is_member boolean, has_account boolean, confirmed boolean, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(_company, 'admin') then
    raise exception 'Only an admin can see account status' using errcode = '42501';
  end if;
  return query
    select u.email::text, u.id, true, true, u.email_confirmed_at is not null, u.last_sign_in_at
    from public.company_members m
    join auth.users u on u.id = m.user_id
    where m.company_id = _company
    union all
    select i.email, u.id, false, u.id is not null, u.email_confirmed_at is not null, u.last_sign_in_at
    from public.company_invitations i
    left join auth.users u on lower(u.email) = i.email
    where i.company_id = _company;
end;
$$;

revoke execute on function public.company_account_status(uuid) from public, anon;
grant execute on function public.company_account_status(uuid) to authenticated;

-- 2) Zariadenie za iného člena smie zapísať správca tímu.
drop policy member_devices_insert on public.member_devices;
create policy member_devices_insert on public.member_devices for insert to authenticated
  with check (
    (user_id = auth.uid() and public.is_company_member(company_id))
    or (
      public.can(company_id, 'staff.manage')
      and exists (select 1 from public.company_members m where m.company_id = member_devices.company_id and m.user_id = member_devices.user_id)
    )
  );

-- Wi-Fi siete zariadenia: názov siete (SSID), IP adresa a MAC v tejto sieti (mobily majú v každej sieti inú, súkromnú).
alter table public.member_devices add column networks jsonb not null default '[]'
  check (jsonb_typeof(networks) = 'array' and jsonb_array_length(networks) <= 20 and char_length(networks::text) <= 4000);
grant update (networks) on public.member_devices to authenticated;

-- 3) Vlastník techniky: prázdne = firma, inak karta zamestnanca (aj brigádnika).
alter table public.equipment add column owner_staff_id uuid;
alter table public.equipment add constraint equipment_owner_staff_fk
  foreign key (company_id, owner_staff_id) references public.staff (company_id, id) on delete set null (owner_staff_id);
create index equipment_owner_idx on public.equipment (company_id, owner_staff_id) where owner_staff_id is not null;
grant update (owner_staff_id) on public.equipment to authenticated;

-- Aj case / rack môže patriť zamestnancovi.
alter table public.cases add column owner_staff_id uuid;
alter table public.cases add constraint cases_owner_staff_fk
  foreign key (company_id, owner_staff_id) references public.staff (company_id, id) on delete set null (owner_staff_id);
grant update (owner_staff_id) on public.cases to authenticated;

-- 4) Každý člen firmy má kartu zamestnanca: pri pridaní do firmy sa založí sama (aj spätne pre doterajších).
create function public.create_member_staff_card()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.staff (company_id, member_id) values (new.company_id, new.user_id) on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.create_member_staff_card() from public, anon, authenticated;

create trigger company_members_staff_card after insert on public.company_members
  for each row execute function public.create_member_staff_card();

insert into public.staff (company_id, member_id)
select m.company_id, m.user_id from public.company_members m
where not exists (select 1 from public.staff s where s.company_id = m.company_id and s.member_id = m.user_id);
