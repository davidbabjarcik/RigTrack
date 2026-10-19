-- RigTrack: ročná správa a partnerské firmy (1.19).
-- 1) Ročná správa: kto ju vidí (report.view) a kto v nej vidí peniaze (report.money) – nastaví admin v Oprávneniach.
-- 2) Partnerská firma: z Firmy a kontakty sa jej dá založiť vlastná firma v RigTracku („založená nami“, bez CEO);
--    pri zakladaní vlastnej firmy appka navrhne údaje, ktoré o človeku majú firmy, kde je kontaktom.

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
    ('report.money', array[]::public.app_role[])
$$;

-- 2) Partnerské firmy
alter table public.companies add column founded_by uuid references public.companies (id) on delete set null;
alter table public.partners add column linked_company_id uuid references public.companies (id) on delete set null;

-- Založí partnerovi vlastnú firmu: zakladateľ je jej admin, údaje (IČO, DIČ, adresa) sa prenesú z adresára.
create function public.create_partner_company(_partner_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _partner public.partners;
  _id uuid;
begin
  select * into _partner from public.partners p where p.id = _partner_id;
  if not found or not public.can(_partner.company_id, 'events.edit') then
    raise exception 'Firma neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _partner.linked_company_id is not null then
    return _partner.linked_company_id;
  end if;
  insert into public.companies (name, created_by, founded_by) values (left(trim(_partner.name), 120), auth.uid(), _partner.company_id) returning id into _id;
  insert into public.company_members (company_id, user_id, role) values (_id, auth.uid(), 'admin');
  insert into public.company_profile (company_id, legal_name, ico, dic, address)
  values (_id, left(_partner.name, 160), left(_partner.ico, 20), left(_partner.dic, 20), left(_partner.address, 200));
  update public.partners set linked_company_id = _id, uses_app = true where id = _partner_id;
  return _id;
end;
$$;
revoke execute on function public.create_partner_company(uuid) from public, anon;
grant execute on function public.create_partner_company(uuid) to authenticated;

-- Návrh údajov pre novú firmu: firmy, kde je prihlásený človek zapísaný ako kontakt (podľa e-mailu).
create function public.suggest_company_profiles()
returns table (name text, ico text, dic text, address text)
language sql stable security definer set search_path = '' as $$
  select distinct p.name, p.ico, p.dic, p.address
  from public.partner_contacts c
  join public.partners p on p.id = c.partner_id
  where lower(c.email) = lower(public.current_email()) and public.current_email() <> ''
  limit 5;
$$;
revoke execute on function public.suggest_company_profiles() from public, anon;
grant execute on function public.suggest_company_profiles() to authenticated;
