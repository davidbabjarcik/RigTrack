-- RigTrack 5.20: vlastné oprávnenie na sklad (warehouse.manage) – rozmery skladu, regály, polia, police a palety
-- v Nastaveniach → Sklad. Doteraz to patrilo pod lookups.manage (kategórie a zoznamy).

create or replace function public.permission_defaults()
returns table (permission text, roles public.app_role[])
language sql immutable set search_path = '' as $$
  values
    ('equipment.view', array['skladnik', 'technik', 'viewer', 'helper']::public.app_role[]),
    ('equipment.edit', array['skladnik', 'technik']::public.app_role[]),
    ('equipment.delete', array['skladnik']::public.app_role[]),
    ('lookups.manage', array['skladnik']::public.app_role[]),
    ('maintenance.manage', array['skladnik']::public.app_role[]),
    ('maintenance.record', array['skladnik', 'technik']::public.app_role[]),
    ('warehouse.manage', array['skladnik']::public.app_role[]),
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

drop policy if exists warehouses_insert on public.warehouses;
drop policy if exists warehouses_update on public.warehouses;
create policy warehouses_insert on public.warehouses for insert to authenticated
  with check (public.can(company_id, 'warehouse.manage'));
create policy warehouses_update on public.warehouses for update to authenticated
  using (public.can(company_id, 'warehouse.manage'))
  with check (public.can(company_id, 'warehouse.manage'));

drop policy if exists warehouse_spots_insert on public.warehouse_spots;
drop policy if exists warehouse_spots_update on public.warehouse_spots;
drop policy if exists warehouse_spots_delete on public.warehouse_spots;
create policy warehouse_spots_insert on public.warehouse_spots for insert to authenticated
  with check (public.can(company_id, 'warehouse.manage'));
create policy warehouse_spots_update on public.warehouse_spots for update to authenticated
  using (public.can(company_id, 'warehouse.manage'))
  with check (public.can(company_id, 'warehouse.manage'));
create policy warehouse_spots_delete on public.warehouse_spots for delete to authenticated
  using (public.can(company_id, 'warehouse.manage'));

-- Kto doteraz smel sklad cez výnimku pri „Spravovať kategórie“, smie ho aj teraz.
insert into public.role_permissions (company_id, role, permission, allowed)
  select company_id, role, 'warehouse.manage', allowed from public.role_permissions where permission = 'lookups.manage'
  on conflict do nothing;
insert into public.member_permissions (company_id, user_id, permission, allowed)
  select company_id, user_id, 'warehouse.manage', allowed from public.member_permissions where permission = 'lookups.manage'
  on conflict do nothing;
insert into public.permission_group_rules (company_id, group_id, permission)
  select company_id, group_id, 'warehouse.manage' from public.permission_group_rules where permission = 'lookups.manage'
  on conflict do nothing;
