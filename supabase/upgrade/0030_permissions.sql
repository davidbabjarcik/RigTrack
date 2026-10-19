-- RigTrack: nastaviteľné oprávnenia.
-- Doteraz bolo natvrdo dané, čo ktorá rola smie. Teraz má každá činnosť svoju permisiu
-- (napr. loans.edit) s predvolenými rolami, ktoré zodpovedajú doterajšiemu správaniu.
-- Admin firmy môže permisiu povoliť alebo zakázať celej role (role_permissions)
-- alebo jednému členovi (member_permissions). Poradie: člen > rola > predvolené.
-- Admin má vždy všetko, aby sa firma nemohla zamknúť. Členov, pozvánky a nastavenia
-- firmy spravuje naďalej iba admin.

-- Zoznam permisií a rolí (okrem admina), ktoré ich majú, kým to admin nezmení.
create function public.permission_defaults()
returns table (permission text, roles public.app_role[])
language sql immutable set search_path = '' as $$
  values
    ('equipment.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('equipment.edit', array['skladnik', 'technik']::public.app_role[]),
    ('equipment.delete', array['skladnik']::public.app_role[]),
    ('lookups.manage', array['skladnik']::public.app_role[]),
    ('cases.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('cases.edit', array['skladnik', 'technik']::public.app_role[]),
    ('cases.delete', array['skladnik']::public.app_role[]),
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
    ('events.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('events.edit', array['skladnik', 'technik']::public.app_role[]),
    ('events.delete', array['skladnik']::public.app_role[]),
    ('service.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('service.edit', array['skladnik', 'technik']::public.app_role[]),
    ('service.delete', array['skladnik']::public.app_role[]),
    ('tasks.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('tasks.edit', array['skladnik', 'technik']::public.app_role[]),
    ('tasks.delete', array['skladnik']::public.app_role[]),
    ('shopping.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('shopping.edit', array['skladnik', 'technik']::public.app_role[]),
    ('shopping.delete', array['skladnik']::public.app_role[]),
    ('suggestions.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('suggestions.add', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('suggestions.manage', array['skladnik']::public.app_role[]),
    ('suggestions.delete', array[]::public.app_role[]),
    ('payouts.view_all', array[]::public.app_role[]),
    ('payouts.manage', array[]::public.app_role[]),
    ('audit.view', array[]::public.app_role[])
$$;

create function public.is_permission(_permission text)
returns boolean language sql immutable set search_path = '' as $$
  select exists (select 1 from public.permission_defaults() d where d.permission = _permission);
$$;

create table public.role_permissions (
  company_id uuid not null references public.companies (id) on delete cascade,
  role public.app_role not null check (role <> 'admin'),
  permission text not null check (public.is_permission(permission)),
  allowed boolean not null,
  primary key (company_id, role, permission)
);

create table public.member_permissions (
  company_id uuid not null,
  user_id uuid not null,
  permission text not null check (public.is_permission(permission)),
  allowed boolean not null,
  primary key (company_id, user_id, permission),
  -- Výnimky zaniknú s členstvom.
  foreign key (company_id, user_id) references public.company_members (company_id, user_id) on delete cascade
);

alter table public.role_permissions enable row level security;
alter table public.member_permissions enable row level security;

create policy role_permissions_admin on public.role_permissions for all to authenticated
  using (public.has_role(company_id, 'admin'))
  with check (public.has_role(company_id, 'admin'));
create policy member_permissions_admin on public.member_permissions for all to authenticated
  using (public.has_role(company_id, 'admin'))
  with check (public.has_role(company_id, 'admin'));

revoke all on public.role_permissions, public.member_permissions from anon, authenticated;
grant select, insert, delete on public.role_permissions, public.member_permissions to authenticated;

-- Smie prihlásený používateľ v danej firme túto činnosť?
-- SECURITY DEFINER: číta členstvo a výnimky, ku ktorým bežný člen cez RLS nemá prístup.
create function public.can(_company_id uuid, _permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (
      select m.role = 'admin' or coalesce(
        (select mp.allowed from public.member_permissions mp
          where mp.company_id = m.company_id and mp.user_id = m.user_id and mp.permission = _permission),
        (select rp.allowed from public.role_permissions rp
          where rp.company_id = m.company_id and rp.role = m.role and rp.permission = _permission),
        (select m.role = any (d.roles) from public.permission_defaults() d where d.permission = _permission),
        false
      )
      from public.company_members m
      where m.company_id = _company_id and m.user_id = auth.uid()
    ),
    false
  );
$$;

-- Všetky permisie, ktoré má prihlásený používateľ vo firme; podľa nich aplikácia skrýva ovládanie.
create function public.my_permissions(_company_id uuid)
returns text[] language sql stable security invoker set search_path = '' as $$
  select coalesce(array_agg(d.permission order by d.permission), '{}')
  from public.permission_defaults() d
  where public.can(_company_id, d.permission);
$$;

revoke execute on function
  public.permission_defaults(), public.is_permission(text), public.can(uuid, text), public.my_permissions(uuid)
  from public, anon;
grant execute on function
  public.permission_defaults(), public.is_permission(text), public.can(uuid, text), public.my_permissions(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Politiky: pevné roly nahrádza public.can(). Podmienky sú inak rovnaké ako doteraz.
-- ---------------------------------------------------------------------------

alter policy audit_log_select on public.audit_log
  using (public.can(company_id, 'audit.view'));
alter policy cable_colors_delete on public.cable_colors
  using (public.can(company_id, 'lookups.manage'));
alter policy cable_colors_insert on public.cable_colors
  with check (public.can(company_id, 'lookups.manage'));
alter policy cable_colors_update on public.cable_colors
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));
alter policy case_checks_insert on public.case_checks
  with check (public.can(company_id, 'cases.edit'));
alter policy case_checks_select on public.case_checks
  using (public.can(company_id, 'cases.view'));
alter policy cases_delete on public.cases
  using (public.can(company_id, 'cases.delete'));
alter policy cases_insert on public.cases
  with check (public.can(company_id, 'cases.edit'));
alter policy cases_select on public.cases
  using (public.can(company_id, 'cases.view'));
alter policy cases_update on public.cases
  using (public.can(company_id, 'cases.edit'))
  with check (public.can(company_id, 'cases.edit'));
alter policy equipment_delete on public.equipment
  using (public.can(company_id, 'equipment.delete'));
alter policy equipment_insert on public.equipment
  with check (public.can(company_id, 'equipment.edit'));
alter policy equipment_select on public.equipment
  using (public.can(company_id, 'equipment.view'));
alter policy equipment_update on public.equipment
  using (public.can(company_id, 'equipment.edit'))
  with check (public.can(company_id, 'equipment.edit'));
alter policy equipment_categories_delete on public.equipment_categories
  using (public.can(company_id, 'lookups.manage'));
alter policy equipment_categories_insert on public.equipment_categories
  with check (public.can(company_id, 'equipment.edit'));
alter policy equipment_categories_update on public.equipment_categories
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));
alter policy equipment_hour_readings_delete on public.equipment_hour_readings
  using (public.can(company_id, 'equipment.delete'));
alter policy equipment_hour_readings_insert on public.equipment_hour_readings
  with check (public.can(company_id, 'equipment.edit'));
alter policy equipment_hour_readings_select on public.equipment_hour_readings
  using (public.can(company_id, 'equipment.view'));
alter policy event_crew_delete on public.event_crew
  using (public.can(company_id, 'events.edit'));
alter policy event_crew_insert on public.event_crew
  with check ((public.can(company_id, 'events.edit') AND ((member_id IS NULL) OR public.is_member_of(company_id, member_id)) AND ((member_id IS NOT NULL) OR (TRIM(BOTH FROM name) <> ''::text))));
alter policy event_crew_select on public.event_crew
  using (public.can(company_id, 'events.view'));
alter policy event_documents_delete on public.event_documents
  using (public.can(company_id, 'events.edit'));
alter policy event_documents_insert on public.event_documents
  with check (public.can(company_id, 'events.edit'));
alter policy event_documents_select on public.event_documents
  using (public.can(company_id, 'events.view'));
alter policy event_equipment_delete on public.event_equipment
  using (public.can(company_id, 'events.edit'));
alter policy event_equipment_insert on public.event_equipment
  with check (public.can(company_id, 'events.edit'));
alter policy event_equipment_select on public.event_equipment
  using (public.can(company_id, 'events.view'));
alter policy event_equipment_update on public.event_equipment
  using (public.can(company_id, 'events.edit'))
  with check (public.can(company_id, 'events.edit'));
alter policy events_delete on public.events
  using (public.can(company_id, 'events.delete'));
alter policy events_insert on public.events
  with check (public.can(company_id, 'events.edit'));
alter policy events_select on public.events
  using (public.can(company_id, 'events.view'));
alter policy events_update on public.events
  using (public.can(company_id, 'events.edit'))
  with check (public.can(company_id, 'events.edit'));
alter policy loan_items_delete on public.loan_items
  using ((public.can(company_id, 'loans.edit') AND (EXISTS ( SELECT 1
   FROM public.loans l
  WHERE ((l.id = loan_items.loan_id) AND (l.status = 'reserved'::text))))));
alter policy loan_items_insert on public.loan_items
  with check (public.can(company_id, 'loans.edit'));
alter policy loan_items_select on public.loan_items
  using (public.can(company_id, 'loans.view'));
alter policy loan_items_update on public.loan_items
  using (public.can(company_id, 'loans.edit'))
  with check (public.can(company_id, 'loans.edit'));
alter policy loans_delete on public.loans
  using ((public.can(company_id, 'loans.delete') AND (status <> 'issued'::text)));
alter policy loans_insert on public.loans
  with check (public.can(company_id, 'loans.edit'));
alter policy loans_select on public.loans
  using (public.can(company_id, 'loans.view'));
alter policy loans_update on public.loans
  using (public.can(company_id, 'loans.edit'))
  with check (public.can(company_id, 'loans.edit'));
alter policy locations_delete on public.locations
  using (public.can(company_id, 'lookups.manage'));
alter policy locations_insert on public.locations
  with check (public.can(company_id, 'equipment.edit'));
alter policy locations_update on public.locations
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));
alter policy member_payments_delete on public.member_payments
  using (public.can(company_id, 'payouts.manage'));
alter policy member_payments_insert on public.member_payments
  with check ((public.can(company_id, 'payouts.manage') AND public.is_member_of(company_id, member_id)));
alter policy member_payments_select on public.member_payments
  using ((public.can(company_id, 'payouts.view_all') OR ((member_id = ( SELECT auth.uid() AS uid)) AND public.is_company_member(company_id))));
alter policy member_payments_update on public.member_payments
  using (public.can(company_id, 'payouts.manage'))
  with check (public.can(company_id, 'payouts.manage'));
alter policy order_item_equipment_insert on public.order_item_equipment
  with check (public.can(company_id, 'orders.edit'));
alter policy order_item_equipment_select on public.order_item_equipment
  using (public.can(company_id, 'orders.view'));
alter policy order_items_insert on public.order_items
  with check (public.can(company_id, 'orders.edit'));
alter policy order_items_select on public.order_items
  using (public.can(company_id, 'orders.view'));
alter policy orders_delete on public.orders
  using (public.can(company_id, 'orders.delete'));
alter policy orders_insert on public.orders
  with check (public.can(company_id, 'orders.edit'));
alter policy orders_select on public.orders
  using (public.can(company_id, 'orders.view'));
alter policy orders_update on public.orders
  using (public.can(company_id, 'orders.edit'))
  with check (public.can(company_id, 'orders.edit'));
alter policy service_records_delete on public.service_records
  using (public.can(company_id, 'service.delete'));
alter policy service_records_insert on public.service_records
  with check (public.can(company_id, 'service.edit'));
alter policy service_records_select on public.service_records
  using (public.can(company_id, 'service.view'));
alter policy service_records_update on public.service_records
  using (public.can(company_id, 'service.edit'))
  with check (public.can(company_id, 'service.edit'));
alter policy shopping_items_delete on public.shopping_items
  using ((public.can(company_id, 'shopping.delete') OR ((created_by = ( SELECT auth.uid() AS uid)) AND public.is_company_member(company_id))));
alter policy shopping_items_insert on public.shopping_items
  with check ((public.can(company_id, 'shopping.edit') AND ((assignee_id IS NULL) OR public.is_member_of(company_id, assignee_id))));
alter policy shopping_items_select on public.shopping_items
  using (public.can(company_id, 'shopping.view'));
alter policy shopping_items_update on public.shopping_items
  using (public.can(company_id, 'shopping.edit'))
  with check ((public.can(company_id, 'shopping.edit') AND ((assignee_id IS NULL) OR public.is_member_of(company_id, assignee_id))));
alter policy suggestion_comments_delete on public.suggestion_comments
  using ((public.can(company_id, 'suggestions.delete') OR ((created_by = ( SELECT auth.uid() AS uid)) AND public.is_company_member(company_id))));
alter policy suggestion_comments_insert on public.suggestion_comments
  with check (public.can(company_id, 'suggestions.add'));
alter policy suggestion_comments_select on public.suggestion_comments
  using (public.can(company_id, 'suggestions.view'));
alter policy suggestions_delete on public.suggestions
  using ((public.can(company_id, 'suggestions.delete') OR ((created_by = ( SELECT auth.uid() AS uid)) AND public.is_company_member(company_id))));
alter policy suggestions_insert on public.suggestions
  with check (public.can(company_id, 'suggestions.add'));
alter policy suggestions_select on public.suggestions
  using (public.can(company_id, 'suggestions.view'));
alter policy suggestions_update on public.suggestions
  using ((public.can(company_id, 'suggestions.manage') OR ((created_by = ( SELECT auth.uid() AS uid)) AND public.is_company_member(company_id))))
  with check ((public.can(company_id, 'suggestions.manage') OR ((created_by = ( SELECT auth.uid() AS uid)) AND public.is_company_member(company_id))));
alter policy tasks_delete on public.tasks
  using ((public.can(company_id, 'tasks.delete') OR ((created_by = ( SELECT auth.uid() AS uid)) AND public.is_company_member(company_id))));
alter policy tasks_insert on public.tasks
  with check ((public.can(company_id, 'tasks.edit') AND ((assignee_id IS NULL) OR public.is_member_of(company_id, assignee_id))));
alter policy tasks_select on public.tasks
  using (public.can(company_id, 'tasks.view'));
alter policy tasks_update on public.tasks
  using (public.can(company_id, 'tasks.edit'))
  with check ((public.can(company_id, 'tasks.edit') AND ((assignee_id IS NULL) OR public.is_member_of(company_id, assignee_id))));
alter policy vehicle_records_delete on public.vehicle_records
  using (public.can(company_id, 'vehicles.edit'));
alter policy vehicle_records_insert on public.vehicle_records
  with check (public.can(company_id, 'vehicles.log'));
alter policy vehicle_records_select on public.vehicle_records
  using (public.can(company_id, 'vehicles.view'));
alter policy vehicles_delete on public.vehicles
  using (public.can(company_id, 'vehicles.delete'));
alter policy vehicles_insert on public.vehicles
  with check (public.can(company_id, 'vehicles.edit'));
alter policy vehicles_select on public.vehicles
  using (public.can(company_id, 'vehicles.view'));
alter policy vehicles_update on public.vehicles
  using (public.can(company_id, 'vehicles.edit'))
  with check (public.can(company_id, 'vehicles.edit'));
alter policy event_documents_files_delete on storage.objects
  using (((bucket_id = 'event-documents'::text) AND public.can(((storage.foldername(name))[1])::uuid, 'events.edit')));
alter policy event_documents_files_insert on storage.objects
  with check (((bucket_id = 'event-documents'::text) AND public.can(((storage.foldername(name))[1])::uuid, 'events.edit')));
alter policy event_documents_files_select on storage.objects
  using (((bucket_id = 'event-documents'::text) AND public.can(((storage.foldername(name))[1])::uuid, 'events.view')));

-- Prílohy patria servisnému záznamu alebo vozidlu a riadia sa ich oprávneniami.
alter policy attachments_select on public.attachments
  using (public.can(company_id, case entity_type when 'service' then 'service.view' else 'vehicles.view' end));
alter policy attachments_insert on public.attachments
  with check (public.can(company_id, case entity_type when 'service' then 'service.edit' else 'vehicles.log' end));
alter policy attachments_delete on public.attachments
  using (public.can(company_id, case entity_type when 'service' then 'service.edit' else 'vehicles.log' end));
