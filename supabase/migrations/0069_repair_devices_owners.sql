-- RigTrack: oprava pre databázy, kde 0052 / 0059 prebehli len čiastočne alebo v staršej verzii
-- (napr. chyba „column networks of relation member_devices does not exist“ pri demo firme).
-- Dá sa spustiť kedykoľvek aj viackrát – doplní len to, čo chýba.

alter table public.member_devices add column if not exists networks jsonb not null default '[]';
alter table public.member_devices drop constraint if exists member_devices_networks_check;
alter table public.member_devices add constraint member_devices_networks_check
  check (jsonb_typeof(networks) = 'array' and jsonb_array_length(networks) <= 20 and char_length(networks::text) <= 4000);
grant update (networks) on public.member_devices to authenticated;

alter table public.member_devices add column if not exists ethernet_mac text not null default '';
alter table public.member_devices drop constraint if exists member_devices_ethernet_mac_check;
alter table public.member_devices add constraint member_devices_ethernet_mac_check
  check (ethernet_mac = '' or ethernet_mac ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$');
grant update (ethernet_mac) on public.member_devices to authenticated;

-- Vlastník techniky a cases (0052).
alter table public.equipment add column if not exists owner_staff_id uuid;
alter table public.cases add column if not exists owner_staff_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'equipment_owner_staff_fk') then
    alter table public.equipment add constraint equipment_owner_staff_fk
      foreign key (company_id, owner_staff_id) references public.staff (company_id, id) on delete set null (owner_staff_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cases_owner_staff_fk') then
    alter table public.cases add constraint cases_owner_staff_fk
      foreign key (company_id, owner_staff_id) references public.staff (company_id, id) on delete set null (owner_staff_id);
  end if;
end;
$$;
create index if not exists equipment_owner_idx on public.equipment (company_id, owner_staff_id) where owner_staff_id is not null;
grant update (owner_staff_id) on public.equipment to authenticated;
grant update (owner_staff_id) on public.cases to authenticated;

-- Zariadenie za iného člena smie zapísať správca tímu (0052).
drop policy if exists member_devices_insert on public.member_devices;
create policy member_devices_insert on public.member_devices for insert to authenticated
  with check (
    (user_id = auth.uid() and public.is_company_member(company_id))
    or (
      public.can(company_id, 'staff.manage')
      and exists (select 1 from public.company_members m where m.company_id = member_devices.company_id and m.user_id = member_devices.user_id)
    )
  );
