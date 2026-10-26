-- RigTrack 4.3: oprávnenia pre siete a kontroly, Wi-Fi firmy (nie k technike).
-- networks.view       – vidieť siete (názov, kde je, model routera)
-- networks.addresses  – vidieť IP rozsahy, IP a MAC adresy (stráži appka)
-- networks.passwords  – vidieť heslá Wi-Fi (stráži databáza: heslo sa číta len cez wifi_passwords())
-- networks.admin      – prihlásenie do správy routerov (doteraz equipment.edit)
-- checks.all          – v Kontrolách vidieť aj veci, za ktoré zodpovedajú iní

create or replace function public.permission_defaults()
returns table (permission text, roles public.app_role[])
language sql immutable set search_path = '' as $$
  values
    ('equipment.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('equipment.edit', array['skladnik', 'technik']::public.app_role[]),
    ('equipment.delete', array['skladnik']::public.app_role[]),
    ('lookups.manage', array['skladnik']::public.app_role[]),
    ('cases.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('cases.edit', array['skladnik', 'technik']::public.app_role[]),
    ('cases.delete', array['skladnik']::public.app_role[]),
    ('cases.check', array['skladnik', 'technik']::public.app_role[]),
    ('orders.view', array['skladnik']::public.app_role[]),
    ('orders.edit', array['skladnik']::public.app_role[]),
    ('orders.delete', array[]::public.app_role[]),
    ('vehicles.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('vehicles.log', array['skladnik', 'technik']::public.app_role[]),
    ('vehicles.edit', array['skladnik']::public.app_role[]),
    ('vehicles.delete', array[]::public.app_role[]),
    ('loans.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('loans.edit', array['skladnik', 'technik']::public.app_role[]),
    ('loans.delete', array['skladnik']::public.app_role[]),
    ('events.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('events.edit', array['skladnik', 'technik']::public.app_role[]),
    ('events.delete', array['skladnik']::public.app_role[]),
    ('service.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('service.edit', array['skladnik', 'technik']::public.app_role[]),
    ('service.delete', array['skladnik']::public.app_role[]),
    ('tasks.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('tasks.edit', array['skladnik', 'technik']::public.app_role[]),
    ('tasks.delete', array['skladnik']::public.app_role[]),
    ('shopping.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('shopping.edit', array['skladnik', 'technik']::public.app_role[]),
    ('shopping.delete', array['skladnik']::public.app_role[]),
    ('suggestions.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('suggestions.add', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('suggestions.manage', array['skladnik']::public.app_role[]),
    ('suggestions.delete', array[]::public.app_role[]),
    ('payouts.view_all', array[]::public.app_role[]),
    ('payouts.manage', array[]::public.app_role[]),
    ('audit.view', array[]::public.app_role[]),
    ('staff.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('staff.manage', array['skladnik']::public.app_role[]),
    ('report.view', array['skladnik', 'technik']::public.app_role[]),
    ('report.money', array[]::public.app_role[]),
    ('offers.view', array['skladnik']::public.app_role[]),
    ('offers.edit', array['skladnik']::public.app_role[]),
    ('offers.delete', array[]::public.app_role[]),
    ('networks.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('networks.addresses', array['skladnik', 'technik']::public.app_role[]),
    ('networks.passwords', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('networks.admin', array['skladnik', 'technik']::public.app_role[]),
    ('checks.all', array['skladnik']::public.app_role[])
$$;

-- Wi-Fi: k technike (router v racku) alebo sieť firmy (sídlo, kancelária, sklad).
alter table public.wifi_networks add column if not exists scope text not null default 'equipment' check (scope in ('equipment', 'company'));

drop policy if exists wifi_networks_select on public.wifi_networks;
create policy wifi_networks_select on public.wifi_networks for select to authenticated
  using (public.can(company_id, 'networks.view'));

-- Heslo nie je v bežnom čítaní tabuľky; dostane ho len ten, kto smie heslá vidieť.
revoke select on public.wifi_networks from authenticated;
grant select (id, company_id, ssid, security, hidden, subnet, router_ip, management_ip, router_model, dhcp, dhcp_start, dhcp_end, equipment_id, place, note, created_at, scope)
  on public.wifi_networks to authenticated;
grant update (scope) on public.wifi_networks to authenticated;

create or replace function public.wifi_passwords(_company_id uuid)
returns table (id uuid, password text) language sql stable security definer set search_path = '' as $$
  select n.id, n.password from public.wifi_networks n
  where n.company_id = _company_id and public.can(_company_id, 'networks.passwords');
$$;
revoke execute on function public.wifi_passwords(uuid) from public, anon;
grant execute on function public.wifi_passwords(uuid) to authenticated;

drop policy if exists wifi_router_logins_all on public.wifi_router_logins;
create policy wifi_router_logins_all on public.wifi_router_logins for all to authenticated
  using (public.can(company_id, 'networks.admin'))
  with check (
    public.can(company_id, 'networks.admin')
    and exists (select 1 from public.wifi_networks n where n.id = network_id and n.company_id = wifi_router_logins.company_id)
  );
