-- RigTrack 4.8: IP a MAC adresy stráži databáza (oprávnenie networks.addresses), nielen appka.
-- • technika: IP a MAC sú v tabuľke equipment_addresses (čítať len s oprávnením)
-- • Wi-Fi: IP rozsah, gateway, IP správy a DHCP rozsah tiež len cez network_addresses()
-- • zariadenia hostí: len s „Vidieť IP a MAC adresy“
-- POZOR pre ďalšie migrácie: wifi_networks má právo čítať po stĺpcoch – nový stĺpec treba sprístupniť
-- (grant select (stĺpec) on public.wifi_networks to authenticated).

-- Technika: IP a MAC sa presúvajú do vlastnej tabuľky s prístupom podľa oprávnenia.
-- (Stĺpce v equipment ostávajú kvôli starším funkciám, ale sú prázdne.)
create table if not exists public.equipment_addresses (
  equipment_id uuid primary key references public.equipment (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  ip text not null default '' check (char_length(ip) <= 64),
  mac text not null default '' check (char_length(mac) <= 32)
);
alter table public.equipment_addresses enable row level security;
drop policy if exists equipment_addresses_select on public.equipment_addresses;
drop policy if exists equipment_addresses_write on public.equipment_addresses;
create policy equipment_addresses_select on public.equipment_addresses for select to authenticated using (public.can(company_id, 'networks.addresses'));
create policy equipment_addresses_write on public.equipment_addresses for all to authenticated
  using (public.can(company_id, 'equipment.edit') and public.can(company_id, 'networks.addresses'))
  with check (
    public.can(company_id, 'equipment.edit') and public.can(company_id, 'networks.addresses')
    and exists (select 1 from public.equipment e where e.id = equipment_id and e.company_id = equipment_addresses.company_id)
  );
revoke all on public.equipment_addresses from anon, authenticated;
grant select, insert, delete on public.equipment_addresses to authenticated;
grant update (ip, mac) on public.equipment_addresses to authenticated;

insert into public.equipment_addresses (equipment_id, company_id, ip, mac)
select id, company_id, ip_address, mac_address from public.equipment where ip_address <> '' or mac_address <> ''
on conflict (equipment_id) do nothing;
update public.equipment set ip_address = '', mac_address = '' where ip_address <> '' or mac_address <> '';

-- Kto zapíše IP / MAC priamo do techniky (staršia appka, import), tomu sa presunú do equipment_addresses.
-- Prázdne hodnoty uložené adresy nemažú (človek bez oprávnenia ich pri úprave nevidí a nesmie ich zmazať).
create or replace function public.equipment_move_addresses()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.equipment_addresses (equipment_id, company_id, ip, mac)
  values (new.id, new.company_id, coalesce(new.ip_address, ''), coalesce(new.mac_address, ''))
  on conflict (equipment_id) do update
    set ip = case when excluded.ip <> '' then excluded.ip else public.equipment_addresses.ip end,
        mac = case when excluded.mac <> '' then excluded.mac else public.equipment_addresses.mac end;
  update public.equipment set ip_address = '', mac_address = '' where id = new.id;
  return null;
end;
$$;
drop trigger if exists equipment_move_addresses on public.equipment;
create trigger equipment_move_addresses after insert or update of ip_address, mac_address on public.equipment
  for each row when (new.ip_address <> '' or new.mac_address <> '') execute function public.equipment_move_addresses();

-- Wi-Fi: bez hesla (0103) a bez adries.
do $$
declare
  _columns text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into _columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'wifi_networks'
    and column_name not in ('password', 'subnet', 'router_ip', 'management_ip', 'dhcp_start', 'dhcp_end');
  execute 'revoke select on public.wifi_networks from authenticated';
  execute format('grant select (%s) on public.wifi_networks to authenticated', _columns);
end;
$$;

/** Adresy Wi-Fi sietí firmy (IP rozsah, gateway, DHCP) – len s oprávnením „Vidieť IP a MAC adresy“. */
create or replace function public.network_addresses(_company_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when public.can(_company_id, 'networks.addresses') then jsonb_build_object(
    'allowed', true,
    'wifi', coalesce((
      select jsonb_agg(jsonb_build_object('id', n.id, 'subnet', n.subnet, 'routerIp', n.router_ip, 'managementIp', n.management_ip, 'dhcpStart', n.dhcp_start, 'dhcpEnd', n.dhcp_end))
      from public.wifi_networks n where n.company_id = _company_id
    ), '[]'::jsonb)
  ) else jsonb_build_object('allowed', false, 'wifi', '[]'::jsonb) end;
$$;
revoke execute on function public.network_addresses(uuid) from public, anon;
grant execute on function public.network_addresses(uuid) to authenticated;

/** Ktoré stĺpce tabuľky smie prihlásený čítať (záloha číta len tie). */
create or replace function public.readable_columns(_table text)
returns text[] language sql stable set search_path = '' as $$
  select coalesce(array_agg(c.column_name::text order by c.ordinal_position), '{}')
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = _table
    and has_column_privilege('public.' || quote_ident(_table), c.column_name, 'select');
$$;
grant execute on function public.readable_columns(text) to authenticated;

-- Zariadenia hostí: len s „Vidieť IP a MAC adresy“ (zariadenia členov ostávajú: svoje a „Spravovať tím“).
drop policy if exists guest_devices_select on public.guest_devices;
create policy guest_devices_select on public.guest_devices for select to authenticated using (public.can(company_id, 'networks.addresses'));
