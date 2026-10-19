-- RigTrack: celá databáza naraz (baseline).
-- baseline: 0058
--
-- Tento súbor je stav databázy po migrácii 0058 – všetky pôvodné migrácie 0001–0058 za sebou.
-- Nová inštalácia: spustite v Supabase SQL Editore len tento súbor.
-- Ďalšie zmeny prídu ako nové migrácie v supabase/migrations od 0059 vyššie.
--
-- Pozor: rola 'ceo' je už v pôvodnej definícii app_role (v pôvodných migráciách ju pridávala 0053,
-- čo sa v jednom skripte nedá – novú hodnotu typu nemožno použiť v tej istej transakcii).

-- =============================================================================
-- 0001_core.sql
-- =============================================================================

-- RigTrack: jadro multi-tenant modelu — profily, firmy, členstvá, pozvánky.
-- Izolácia firiem stojí na RLS; frontendové guardy sú iba UX.

create type public.app_role as enum ('admin', 'technik', 'skladnik', 'viewer', 'ceo');

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

-- =============================================================================
-- 0002_equipment.sql
-- =============================================================================

-- RigTrack: technika, kategórie a umiestnenia.
-- Čítať môže každý člen firmy; zapisovať admin, skladník a technik;
-- mazať a upravovať číselníky iba admin a skladník.

create type public.equipment_status as enum ('available', 'loaned', 'in_service', 'damaged', 'retired');

create table public.equipment_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create unique index equipment_categories_name_idx on public.equipment_categories (company_id, lower(name));

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create unique index locations_name_idx on public.locations (company_id, lower(name));

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  category_id uuid,
  location_id uuid,
  manufacturer text not null default '' check (char_length(manufacturer) <= 80),
  model text not null default '' check (char_length(model) <= 80),
  serial_number text not null default '' check (char_length(serial_number) <= 80),
  inventory_number text not null default '' check (char_length(inventory_number) <= 40),
  status public.equipment_status not null default 'available',
  note text not null default '' check (char_length(note) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Zložené cudzie kľúče: kategória aj umiestnenie musia patriť tej istej firme.
  foreign key (company_id, category_id) references public.equipment_categories (company_id, id)
    on delete set null (category_id),
  foreign key (company_id, location_id) references public.locations (company_id, id)
    on delete set null (location_id)
);
create index equipment_company_idx on public.equipment (company_id, name);
create unique index equipment_inventory_number_idx on public.equipment (company_id, lower(inventory_number))
  where inventory_number <> '';

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger equipment_touch_updated_at
  before update on public.equipment
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.equipment_categories enable row level security;
alter table public.locations enable row level security;
alter table public.equipment enable row level security;

create policy equipment_select on public.equipment for select to authenticated
  using (public.is_company_member(company_id));
create policy equipment_insert on public.equipment for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy equipment_update on public.equipment for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy equipment_delete on public.equipment for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

create policy equipment_categories_select on public.equipment_categories for select to authenticated
  using (public.is_company_member(company_id));
create policy equipment_categories_insert on public.equipment_categories for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy equipment_categories_update on public.equipment_categories for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'))
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy equipment_categories_delete on public.equipment_categories for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

create policy locations_select on public.locations for select to authenticated
  using (public.is_company_member(company_id));
create policy locations_insert on public.locations for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy locations_update on public.locations for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'))
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy locations_delete on public.locations for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

-- ---------------------------------------------------------------------------
-- Oprávnenia. company_id sa po vytvorení nedá zmeniť (nie je v zozname stĺpcov pre update).
-- ---------------------------------------------------------------------------

revoke all on public.equipment, public.equipment_categories, public.locations from anon, authenticated;

grant select, insert, delete on public.equipment to authenticated;
grant update (name, category_id, location_id, manufacturer, model, serial_number, inventory_number, status, note)
  on public.equipment to authenticated;

grant select, insert, delete, update (name) on public.equipment_categories to authenticated;
grant select, insert, delete, update (name) on public.locations to authenticated;

revoke execute on function public.touch_updated_at() from public, anon;

-- =============================================================================
-- 0003_cases.sql
-- =============================================================================

-- RigTrack: cases (prepravné kufre) a ich obsah.
-- Kus techniky je najviac v jednom case (equipment.case_id).
-- Oprávnenia ako pri technike: zapisuje admin, skladník a technik; maže admin a skladník.

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  inventory_number text not null default '' check (char_length(inventory_number) <= 40),
  location_id uuid,
  note text not null default '' check (char_length(note) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, location_id) references public.locations (company_id, id)
    on delete set null (location_id)
);
create index cases_company_idx on public.cases (company_id, name);
create unique index cases_inventory_number_idx on public.cases (company_id, lower(inventory_number))
  where inventory_number <> '';

create trigger cases_touch_updated_at
  before update on public.cases
  for each row execute function public.touch_updated_at();

-- Zložený cudzí kľúč: technika môže byť iba v case tej istej firmy.
alter table public.equipment
  add column case_id uuid,
  add foreign key (company_id, case_id) references public.cases (company_id, id)
    on delete set null (case_id);
create index equipment_case_idx on public.equipment (case_id) where case_id is not null;

alter table public.cases enable row level security;

create policy cases_select on public.cases for select to authenticated
  using (public.is_company_member(company_id));
create policy cases_insert on public.cases for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy cases_update on public.cases for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy cases_delete on public.cases for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.cases from anon, authenticated;
grant select, insert, delete on public.cases to authenticated;
grant update (name, inventory_number, location_id, note) on public.cases to authenticated;
grant update (case_id) on public.equipment to authenticated;

-- =============================================================================
-- 0004_orders.sql
-- =============================================================================

-- RigTrack: objednávky (nákupy) a ich prepojenie na techniku.
-- Ceny vidí a objednávky zapisuje iba admin a skladník; maže iba admin.

-- Technika na množstvo (háky, káble): jedna položka s počtom kusov.
alter table public.equipment
  add column quantity integer not null default 1 check (quantity between 1 and 100000),
  add unique (company_id, id);
grant update (quantity) on public.equipment to authenticated;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  supplier text not null check (char_length(trim(supplier)) between 1 and 120),
  order_number text not null default '' check (char_length(order_number) <= 80),
  ordered_at date not null default current_date,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  note text not null default '' check (char_length(note) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create index orders_company_idx on public.orders (company_id, ordered_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  order_id uuid not null,
  position integer not null default 0,
  name text not null check (char_length(trim(name)) between 1 and 200),
  quantity integer not null check (quantity between 1 and 100000),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  unique (company_id, id),
  foreign key (company_id, order_id) references public.orders (company_id, id) on delete cascade
);
create index order_items_order_idx on public.order_items (order_id, position);

-- Ktorá technika vznikla (alebo bola doplnená) z ktorého riadku objednávky.
-- 4 svetlá evidované samostatne = 4 riadky po 1 ks; 16 hákov v jednej položke = 1 riadok so 16 ks.
create table public.order_item_equipment (
  company_id uuid not null,
  order_item_id uuid not null,
  equipment_id uuid not null,
  quantity integer not null check (quantity >= 1),
  primary key (order_item_id, equipment_id),
  foreign key (company_id, order_item_id) references public.order_items (company_id, id) on delete cascade,
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade
);
create index order_item_equipment_equipment_idx on public.order_item_equipment (equipment_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_equipment enable row level security;

create policy orders_select on public.orders for select to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));
create policy orders_insert on public.orders for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy orders_update on public.orders for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'))
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy orders_delete on public.orders for delete to authenticated
  using (public.has_role(company_id, 'admin'));

create policy order_items_select on public.order_items for select to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));
create policy order_items_insert on public.order_items for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik'));

create policy order_item_equipment_select on public.order_item_equipment for select to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));
create policy order_item_equipment_insert on public.order_item_equipment for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.orders, public.order_items, public.order_item_equipment from anon, authenticated;
grant select, insert, delete on public.orders to authenticated;
grant update (supplier, order_number, ordered_at, note) on public.orders to authenticated;
-- Riadky objednávky sa po vytvorení nemenia; mažú sa iba kaskádou s objednávkou.
grant select, insert on public.order_items, public.order_item_equipment to authenticated;

-- ---------------------------------------------------------------------------
-- Pohľady (security_invoker: platia RLS pravidlá volajúceho)
-- ---------------------------------------------------------------------------

create view public.orders_overview with (security_invoker = true) as
select
  o.id, o.company_id, o.supplier, o.order_number, o.ordered_at, o.currency, o.note,
  count(i.id)::integer as item_count,
  coalesce(sum(i.quantity * i.unit_price), 0)::numeric(14, 2) as total
from public.orders o
left join public.order_items i on i.order_id = o.id
group by o.id;

create view public.equipment_purchases with (security_invoker = true) as
select
  l.company_id, l.equipment_id, l.order_item_id, l.quantity,
  i.name as item_name, i.unit_price,
  o.id as order_id, o.supplier, o.order_number, o.ordered_at, o.currency
from public.order_item_equipment l
join public.order_items i on i.id = l.order_item_id
join public.orders o on o.id = i.order_id;

revoke all on public.orders_overview, public.equipment_purchases from anon, authenticated;
grant select on public.orders_overview, public.equipment_purchases to authenticated;

-- ---------------------------------------------------------------------------
-- Vytvorenie objednávky v jednej transakcii. SECURITY INVOKER: všetko prechádza
-- cez RLS volajúceho. Režim riadku (mode):
--   none     – do techniky sa nepridáva (doprava, spotrebný materiál)
--   separate – každý kus ako samostatná položka techniky
--   bulk     – jedna nová položka techniky s počtom kusov
--   existing – pripočíta kusy k existujúcej položke (equipment_id)
-- ---------------------------------------------------------------------------

create function public.create_order(_company_id uuid, _order jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _order_id uuid;
  _item jsonb;
  _item_id uuid;
  _equipment_id uuid;
  _equipment_name text;
  _category_id uuid;
  _qty integer;
  _mode text;
  _position integer := 0;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Objednávka musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.orders (company_id, supplier, order_number, ordered_at, currency, note)
  values (
    _company_id,
    trim(_order ->> 'supplier'),
    coalesce(trim(_order ->> 'order_number'), ''),
    coalesce((_order ->> 'ordered_at')::date, current_date),
    coalesce(_order ->> 'currency', 'EUR'),
    coalesce(trim(_order ->> 'note'), '')
  )
  returning id into _order_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    _mode := coalesce(_item ->> 'mode', 'none');

    insert into public.order_items (company_id, order_id, position, name, quantity, unit_price)
    values (_company_id, _order_id, _position, trim(_item ->> 'name'), _qty, coalesce((_item ->> 'unit_price')::numeric, 0))
    returning id into _item_id;
    _position := _position + 1;

    _equipment_name := left(coalesce(nullif(trim(_item ->> 'equipment_name'), ''), trim(_item ->> 'name')), 120);
    _category_id := nullif(_item ->> 'category_id', '')::uuid;

    if _mode = 'separate' then
      if _qty > 200 then
        raise exception 'Samostatne možno naraz založiť najviac 200 kusov' using errcode = 'check_violation';
      end if;
      for _n in 1 .. _qty loop
        insert into public.equipment (company_id, name, category_id)
        values (_company_id, _equipment_name, _category_id)
        returning id into _equipment_id;
        insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
        values (_company_id, _item_id, _equipment_id, 1);
      end loop;
    elsif _mode = 'bulk' then
      insert into public.equipment (company_id, name, category_id, quantity)
      values (_company_id, _equipment_name, _category_id, _qty)
      returning id into _equipment_id;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode = 'existing' then
      update public.equipment set quantity = quantity + _qty
      where company_id = _company_id and id = (_item ->> 'equipment_id')::uuid
      returning id into _equipment_id;
      if _equipment_id is null then
        raise exception 'Technika na doplnenie neexistuje' using errcode = 'no_data_found';
      end if;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode <> 'none' then
      raise exception 'Neznámy režim položky: %', _mode using errcode = 'check_violation';
    end if;
  end loop;

  return _order_id;
end;
$$;

revoke execute on function public.create_order(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_order(uuid, jsonb, jsonb) to authenticated;

-- =============================================================================
-- 0005_case_checks.sql
-- =============================================================================

-- RigTrack: kontroly obsahu cases. Každá kontrola je samostatný záznam (história),
-- nedá sa upraviť ani zmazať. Kontrolovať môže admin, skladník a technik.

create table public.case_checks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  case_id uuid not null,
  checked_at timestamptz not null default now(),
  checked_by uuid references public.profiles (id) on delete set null,
  -- Meno v čase kontroly; ostane čitateľné aj po odchode človeka z firmy.
  checked_by_name text not null default '',
  note text not null default '' check (char_length(note) <= 500),
  foreign key (company_id, case_id) references public.cases (company_id, id) on delete cascade
);
create index case_checks_case_idx on public.case_checks (case_id, checked_at desc);

-- Kto a kedy kontroloval určuje server, nie klient.
create function public.stamp_case_check()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.checked_at := now();
  new.checked_by := auth.uid();
  new.checked_by_name := coalesce(
    (select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()),
    ''
  );
  return new;
end;
$$;

create trigger case_checks_stamp
  before insert on public.case_checks
  for each row execute function public.stamp_case_check();

alter table public.case_checks enable row level security;

create policy case_checks_select on public.case_checks for select to authenticated
  using (public.is_company_member(company_id));
create policy case_checks_insert on public.case_checks for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

revoke all on public.case_checks from anon, authenticated;
grant select, insert (company_id, case_id, note) on public.case_checks to authenticated;
revoke execute on function public.stamp_case_check() from public, anon;

-- Posledná kontrola každého case.
create view public.case_last_checks with (security_invoker = true) as
select distinct on (case_id) company_id, case_id, checked_at, checked_by_name, note
from public.case_checks
order by case_id, checked_at desc;

revoke all on public.case_last_checks from anon, authenticated;
grant select on public.case_last_checks to authenticated;

-- =============================================================================
-- 0006_order_article_numbers.sql
-- =============================================================================

-- RigTrack: kód tovaru dodávateľa na riadku objednávky.
-- Pri ďalšom importe faktúry sa podľa neho nájde technika, ku ktorej sa má
-- rovnaký tovar pripočítať (napr. opakovane objednávané háky).

alter table public.order_items
  add column article_number text not null default '' check (char_length(article_number) <= 60);
create index order_items_article_idx on public.order_items (company_id, article_number) where article_number <> '';

-- Nový stĺpec je na konci, preto stačí create or replace.
create or replace view public.equipment_purchases with (security_invoker = true) as
select
  l.company_id, l.equipment_id, l.order_item_id, l.quantity,
  i.name as item_name, i.unit_price,
  o.id as order_id, o.supplier, o.order_number, o.ordered_at, o.currency,
  i.article_number
from public.order_item_equipment l
join public.order_items i on i.id = l.order_item_id
join public.orders o on o.id = i.order_id;

-- Rovnaká funkcia ako v 0004, navyše ukladá article_number.
create or replace function public.create_order(_company_id uuid, _order jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _order_id uuid;
  _item jsonb;
  _item_id uuid;
  _equipment_id uuid;
  _equipment_name text;
  _category_id uuid;
  _qty integer;
  _mode text;
  _position integer := 0;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Objednávka musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.orders (company_id, supplier, order_number, ordered_at, currency, note)
  values (
    _company_id,
    trim(_order ->> 'supplier'),
    coalesce(trim(_order ->> 'order_number'), ''),
    coalesce((_order ->> 'ordered_at')::date, current_date),
    coalesce(_order ->> 'currency', 'EUR'),
    coalesce(trim(_order ->> 'note'), '')
  )
  returning id into _order_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    _mode := coalesce(_item ->> 'mode', 'none');

    insert into public.order_items (company_id, order_id, position, name, quantity, unit_price, article_number)
    values (
      _company_id, _order_id, _position, trim(_item ->> 'name'), _qty,
      coalesce((_item ->> 'unit_price')::numeric, 0),
      coalesce(trim(_item ->> 'article_number'), '')
    )
    returning id into _item_id;
    _position := _position + 1;

    _equipment_name := left(coalesce(nullif(trim(_item ->> 'equipment_name'), ''), trim(_item ->> 'name')), 120);
    _category_id := nullif(_item ->> 'category_id', '')::uuid;

    if _mode = 'separate' then
      if _qty > 200 then
        raise exception 'Samostatne možno naraz založiť najviac 200 kusov' using errcode = 'check_violation';
      end if;
      for _n in 1 .. _qty loop
        insert into public.equipment (company_id, name, category_id)
        values (_company_id, _equipment_name, _category_id)
        returning id into _equipment_id;
        insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
        values (_company_id, _item_id, _equipment_id, 1);
      end loop;
    elsif _mode = 'bulk' then
      insert into public.equipment (company_id, name, category_id, quantity)
      values (_company_id, _equipment_name, _category_id, _qty)
      returning id into _equipment_id;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode = 'existing' then
      update public.equipment set quantity = quantity + _qty
      where company_id = _company_id and id = (_item ->> 'equipment_id')::uuid
      returning id into _equipment_id;
      if _equipment_id is null then
        raise exception 'Technika na doplnenie neexistuje' using errcode = 'no_data_found';
      end if;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode <> 'none' then
      raise exception 'Neznámy režim položky: %', _mode using errcode = 'check_violation';
    end if;
  end loop;

  return _order_id;
end;
$$;

-- =============================================================================
-- 0007_equipment_details.sql
-- =============================================================================

-- RigTrack: druhy techniky s vlastnými údajmi, sieťové údaje, servisný interval,
-- spotrebný materiál a zapamätanie rozhodnutia pri riadkoch objednávok.

-- ---------------------------------------------------------------------------
-- Technika
-- ---------------------------------------------------------------------------

alter table public.equipment
  -- Druh určuje, ktoré polia formulár ponúka (kábel: dĺžka a konektor; svetlo: výkon a zdroj…).
  add column kind text not null default 'general' check (kind in ('general', 'cable', 'light', 'audio')),
  -- Údaje špecifické pre druh; ich tvar stráži aplikácia, databáza len rozumnú veľkosť.
  add column attributes jsonb not null default '{}'
    check (jsonb_typeof(attributes) = 'object' and char_length(attributes::text) <= 2000),
  add column mac_address text not null default ''
    check (mac_address = '' or mac_address ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'),
  add column ip_address text not null default ''
    check (ip_address = '' or ip_address ~ '^(\d{1,3}\.){3}\d{1,3}$'),
  add column service_interval_months integer check (service_interval_months between 1 and 120),
  add column last_service_on date;

grant update (kind, attributes, mac_address, ip_address, service_interval_months, last_service_on)
  on public.equipment to authenticated;

-- Spotrebný materiál (viazačky, konektory…): eviduje sa iba v objednávkach, nie v technike.
alter table public.equipment_categories add column consumable boolean not null default false;
grant update (consumable) on public.equipment_categories to authenticated;

-- ---------------------------------------------------------------------------
-- Riadky objednávok: kategória a to, čo sa s riadkom stalo v technike.
-- Podľa toho sa pri ďalšom importe toho istého tovaru predvolí rovnaké rozhodnutie.
-- ---------------------------------------------------------------------------

alter table public.order_items
  add column mode text not null default 'none' check (mode in ('none', 'separate', 'bulk', 'existing')),
  add column category_id uuid,
  add foreign key (company_id, category_id) references public.equipment_categories (company_id, id)
    on delete set null (category_id);

-- Všetky riadky objednávok s údajmi objednávky: história cien a hľadanie v položkách.
create view public.order_lines with (security_invoker = true) as
select
  i.id, i.company_id, i.order_id, i.name, i.article_number, i.quantity, i.unit_price, i.mode, i.category_id,
  o.supplier, o.order_number, o.ordered_at, o.currency
from public.order_items i
join public.orders o on o.id = i.order_id;

revoke all on public.order_lines from anon, authenticated;
grant select on public.order_lines to authenticated;

-- Rovnaká funkcia ako v 0006; navyše ukladá mode a kategóriu riadku
-- a novej technike nastaví druh a jeho údaje.
create or replace function public.create_order(_company_id uuid, _order jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _order_id uuid;
  _item jsonb;
  _item_id uuid;
  _equipment_id uuid;
  _equipment_name text;
  _category_id uuid;
  _kind text;
  _attributes jsonb;
  _qty integer;
  _mode text;
  _position integer := 0;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Objednávka musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.orders (company_id, supplier, order_number, ordered_at, currency, note)
  values (
    _company_id,
    trim(_order ->> 'supplier'),
    coalesce(trim(_order ->> 'order_number'), ''),
    coalesce((_order ->> 'ordered_at')::date, current_date),
    coalesce(_order ->> 'currency', 'EUR'),
    coalesce(trim(_order ->> 'note'), '')
  )
  returning id into _order_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    _mode := coalesce(_item ->> 'mode', 'none');
    _category_id := nullif(_item ->> 'category_id', '')::uuid;
    _kind := coalesce(nullif(_item ->> 'kind', ''), 'general');
    _attributes := coalesce(_item -> 'attributes', '{}'::jsonb);

    insert into public.order_items (company_id, order_id, position, name, quantity, unit_price, article_number, mode, category_id)
    values (
      _company_id, _order_id, _position, trim(_item ->> 'name'), _qty,
      coalesce((_item ->> 'unit_price')::numeric, 0),
      coalesce(trim(_item ->> 'article_number'), ''),
      _mode, _category_id
    )
    returning id into _item_id;
    _position := _position + 1;

    _equipment_name := left(coalesce(nullif(trim(_item ->> 'equipment_name'), ''), trim(_item ->> 'name')), 120);

    if _mode = 'separate' then
      if _qty > 200 then
        raise exception 'Samostatne možno naraz založiť najviac 200 kusov' using errcode = 'check_violation';
      end if;
      for _n in 1 .. _qty loop
        insert into public.equipment (company_id, name, category_id, kind, attributes)
        values (_company_id, _equipment_name, _category_id, _kind, _attributes)
        returning id into _equipment_id;
        insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
        values (_company_id, _item_id, _equipment_id, 1);
      end loop;
    elsif _mode = 'bulk' then
      insert into public.equipment (company_id, name, category_id, kind, attributes, quantity)
      values (_company_id, _equipment_name, _category_id, _kind, _attributes, _qty)
      returning id into _equipment_id;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode = 'existing' then
      update public.equipment set quantity = quantity + _qty
      where company_id = _company_id and id = (_item ->> 'equipment_id')::uuid
      returning id into _equipment_id;
      if _equipment_id is null then
        raise exception 'Technika na doplnenie neexistuje' using errcode = 'no_data_found';
      end if;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode <> 'none' then
      raise exception 'Neznámy režim položky: %', _mode using errcode = 'check_violation';
    end if;
  end loop;

  return _order_id;
end;
$$;

-- =============================================================================
-- 0008_equipment_photos.sql
-- =============================================================================

-- RigTrack: fotka techniky v súkromnom Storage buckete.
-- Cesta súboru je {company_id}/{názov}; prvý priečinok určuje firmu a podľa neho
-- sa overuje prístup. Čítať môže člen firmy, nahrávať a mazať admin, skladník a technik.

alter table public.equipment
  add column photo_path text not null default '' check (char_length(photo_path) <= 200);
grant update (photo_path) on public.equipment to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipment-photos', 'equipment-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy equipment_photos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'equipment-photos'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

create policy equipment_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'equipment-photos'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );

create policy equipment_photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'equipment-photos'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );

-- =============================================================================
-- 0009_case_labels.sql
-- =============================================================================

-- RigTrack: rozmery, hmotnosť a kategória cases + podklady pre flight case štítok
-- (logo firmy a kontaktný riadok).

alter table public.cases
  add column weight_kg numeric(7, 2) check (weight_kg > 0),
  add column width_cm numeric(7, 1) check (width_cm > 0),
  add column length_cm numeric(7, 1) check (length_cm > 0),
  add column depth_cm numeric(7, 1) check (depth_cm > 0),
  add column category_id uuid,
  add foreign key (company_id, category_id) references public.equipment_categories (company_id, id)
    on delete set null (category_id);
grant update (weight_kg, width_cm, length_cm, depth_cm, category_id) on public.cases to authenticated;

-- Meniť smie iba admin (policy companies_update z 0001).
alter table public.companies
  add column logo_path text not null default '' check (char_length(logo_path) <= 200),
  add column label_footer text not null default '' check (char_length(label_footer) <= 200);
grant update (logo_path, label_footer) on public.companies to authenticated;

-- Logo: súkromný bucket, cesta {company_id}/{názov}. Vidí ho člen firmy, mení admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-logos', 'company-logos', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy company_logos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'company-logos'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

create policy company_logos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin')
  );

create policy company_logos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'company-logos'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin')
  );

-- =============================================================================
-- 0010_case_label_fields.sql
-- =============================================================================

-- RigTrack: údaje pre flight case štítok.
-- Číslo case v sade (napr. blindre v dvoch cases: 1 a 2), kategória na štítku
-- (Sound, Light, Cables…) a označenie techniky, ktorá sa má na štítok vypísať.

alter table public.cases
  add column label_number text not null default '' check (char_length(label_number) <= 20),
  add column label_category text not null default '' check (char_length(label_category) <= 40);
grant update (label_number, label_category) on public.cases to authenticated;

-- Na štítku je iba hlavný obsah case, nie každý kábel v ňom.
alter table public.equipment add column on_label boolean not null default false;
grant update (on_label) on public.equipment to authenticated;

-- Označenie patrí ku konkrétnemu case: po presune alebo vybratí techniky zaniká.
create function public.reset_on_label()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.case_id is distinct from old.case_id then
    new.on_label := false;
  end if;
  return new;
end;
$$;

create trigger equipment_reset_on_label
  before update of case_id on public.equipment
  for each row execute function public.reset_on_label();

revoke execute on function public.reset_on_label() from public, anon;

-- =============================================================================
-- 0011_label_roles_stock_colors.sql
-- =============================================================================

-- RigTrack: hlavný a vedľajší prvok na štítku, zásoby spotrebného materiálu
-- a farebný kód dĺžok káblov pre hárok FLIGHTCASE CONTENT.

-- ---------------------------------------------------------------------------
-- Štítok: jeden hlavný prvok case (s fotkou) a ľubovoľne veľa vedľajších.
-- Nahrádza stĺpec on_label z 0010.
-- ---------------------------------------------------------------------------

alter table public.equipment
  add column label_role text check (label_role in ('main', 'secondary'));
update public.equipment set label_role = 'secondary' where on_label;

drop trigger equipment_reset_on_label on public.equipment;
drop function public.reset_on_label();
alter table public.equipment drop column on_label;

create unique index equipment_one_main_per_case on public.equipment (case_id) where label_role = 'main';
grant update (label_role) on public.equipment to authenticated;

-- Rola patrí ku konkrétnemu case: po presune alebo vybratí zaniká.
-- Nový hlavný prvok nahradí doterajší hlavný prvok toho istého case.
create function public.maintain_label_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.case_id is null or new.case_id is distinct from old.case_id then
    new.label_role := null;
  end if;
  if new.label_role = 'main' and old.label_role is distinct from 'main' then
    update public.equipment set label_role = null
    where case_id = new.case_id and label_role = 'main' and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger equipment_maintain_label_role
  before update of case_id, label_role on public.equipment
  for each row execute function public.maintain_label_role();

revoke execute on function public.maintain_label_role() from public, anon;

-- ---------------------------------------------------------------------------
-- Zásoby: spotrebný materiál (napr. kvapalina do hazera) môže klesnúť na nulu
-- a pri dosiahnutí min_quantity sa objaví v zozname „treba kúpiť“.
-- ---------------------------------------------------------------------------

alter table public.equipment
  drop constraint equipment_quantity_check,
  add constraint equipment_quantity_check check (quantity between 0 and 100000),
  drop constraint equipment_kind_check,
  add constraint equipment_kind_check check (kind in ('general', 'cable', 'light', 'audio', 'consumable')),
  add column min_quantity integer check (min_quantity between 0 and 100000);
grant update (min_quantity) on public.equipment to authenticated;

-- ---------------------------------------------------------------------------
-- Farebný kód dĺžok káblov: každá dĺžka má vo firme svoju farbu.
-- ---------------------------------------------------------------------------

create table public.cable_colors (
  company_id uuid not null references public.companies (id) on delete cascade,
  length_m numeric(6, 2) not null check (length_m > 0),
  name text not null default '' check (char_length(name) <= 40),
  color text not null check (color ~ '^#[0-9a-f]{6}$'),
  primary key (company_id, length_m)
);

alter table public.cable_colors enable row level security;

create policy cable_colors_select on public.cable_colors for select to authenticated
  using (public.is_company_member(company_id));
create policy cable_colors_insert on public.cable_colors for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy cable_colors_update on public.cable_colors for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'))
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy cable_colors_delete on public.cable_colors for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.cable_colors from anon, authenticated;
grant select, insert, delete, update (name, color) on public.cable_colors to authenticated;

-- =============================================================================
-- 0012_case_label_custom.sql
-- =============================================================================

-- RigTrack: vlastný obsah flight case štítku.
-- Keď v case nie je označený hlavný prvok, na štítok sa dá napísať vlastný názov
-- a priložiť vlastná fotka (uložená v buckete equipment-photos v priečinku firmy).

alter table public.cases
  add column label_title text not null default '' check (char_length(label_title) <= 80),
  add column label_photo_path text not null default '' check (char_length(label_photo_path) <= 200);
grant update (label_title, label_photo_path) on public.cases to authenticated;

-- =============================================================================
-- 0013_vehicles.sql
-- =============================================================================

-- RigTrack: firemné vozidlá, ich termíny (STK, EK, diaľničná známka, poistky, leasing)
-- a záznamy o prevádzke (servis, tankovanie, pneumatiky, nehody…).
-- Vozidlá vidí každý člen firmy; upravuje ich admin a skladník.
-- Záznam o prevádzke môže pridať aj technik (napr. tankovanie na ceste).

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  plate text not null check (char_length(trim(plate)) between 1 and 20),
  model text not null default '' check (char_length(model) <= 80),
  vin text not null default '' check (char_length(vin) <= 20),
  status text not null default 'active' check (status in ('active', 'in_service', 'retired')),
  driver text not null default '' check (char_length(driver) <= 80),
  odometer_km integer check (odometer_km between 0 and 5000000),
  stk_until date,
  ek_until date,
  vignette_until date,
  pzp_until date,
  casco_until date,
  leasing_until date,
  note text not null default '' check (char_length(note) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);
create unique index vehicles_plate_idx on public.vehicles (company_id, lower(plate));

create trigger vehicles_touch_updated_at
  before update on public.vehicles
  for each row execute function public.touch_updated_at();

create table public.vehicle_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  vehicle_id uuid not null,
  kind text not null check (kind in ('service', 'repair', 'oil', 'tyres', 'fuel', 'accident', 'other')),
  happened_on date not null default current_date,
  odometer_km integer check (odometer_km between 0 and 5000000),
  cost numeric(10, 2) check (cost >= 0),
  liters numeric(7, 2) check (liters > 0),
  description text not null default '' check (char_length(description) <= 1000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (company_id, vehicle_id) references public.vehicles (company_id, id) on delete cascade
);
create index vehicle_records_vehicle_idx on public.vehicle_records (vehicle_id, happened_on desc);

-- Záznam s vyšším stavom kilometrov posunie tachometer vozidla.
-- SECURITY DEFINER: záznam smie pridať aj technik, ktorý vozidlo sám upraviť nemôže.
create function public.bump_vehicle_odometer()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.odometer_km is not null then
    update public.vehicles set odometer_km = new.odometer_km
    where id = new.vehicle_id and company_id = new.company_id
      and (odometer_km is null or odometer_km < new.odometer_km);
  end if;
  return new;
end;
$$;

create trigger vehicle_records_bump_odometer
  after insert on public.vehicle_records
  for each row execute function public.bump_vehicle_odometer();

revoke execute on function public.bump_vehicle_odometer() from public, anon;

alter table public.vehicles enable row level security;
alter table public.vehicle_records enable row level security;

create policy vehicles_select on public.vehicles for select to authenticated
  using (public.is_company_member(company_id));
create policy vehicles_insert on public.vehicles for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy vehicles_update on public.vehicles for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'))
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy vehicles_delete on public.vehicles for delete to authenticated
  using (public.has_role(company_id, 'admin'));

create policy vehicle_records_select on public.vehicle_records for select to authenticated
  using (public.is_company_member(company_id));
create policy vehicle_records_insert on public.vehicle_records for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy vehicle_records_delete on public.vehicle_records for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.vehicles, public.vehicle_records from anon, authenticated;
grant select, insert, delete on public.vehicles to authenticated;
grant update (plate, model, vin, status, driver, odometer_km, stk_until, ek_until, vignette_until, pzp_until,
  casco_until, leasing_until, note) on public.vehicles to authenticated;
grant select, insert, delete on public.vehicle_records to authenticated;

-- =============================================================================
-- 0014_loans.sql
-- =============================================================================

-- RigTrack: výpožičky techniky.
-- Priebeh: rezervované → vydané → vrátené (alebo vrátené s poškodením).
-- Čítať môže každý člen firmy; vytvárať, vydávať a prijímať späť admin, skladník a technik;
-- mazať admin a skladník, ale nie výpožičku, ktorá je práve vydaná.

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  borrower text not null check (char_length(trim(borrower)) between 1 and 120),
  contact text not null default '' check (char_length(contact) <= 120),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'reserved' check (status in ('reserved', 'issued', 'returned', 'damaged')),
  note text not null default '' check (char_length(note) <= 2000),
  issued_at timestamptz,
  returned_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (company_id, id)
);
create index loans_company_idx on public.loans (company_id, starts_on desc);

create table public.loan_items (
  company_id uuid not null,
  loan_id uuid not null,
  equipment_id uuid not null,
  quantity integer not null check (quantity between 1 and 100000),
  damaged boolean not null default false,
  primary key (loan_id, equipment_id),
  foreign key (company_id, loan_id) references public.loans (company_id, id) on delete cascade,
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade
);
create index loan_items_equipment_idx on public.loan_items (equipment_id);

alter table public.loans enable row level security;
alter table public.loan_items enable row level security;

create policy loans_select on public.loans for select to authenticated
  using (public.is_company_member(company_id));
create policy loans_insert on public.loans for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy loans_update on public.loans for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy loans_delete on public.loans for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik') and status <> 'issued');

create policy loan_items_select on public.loan_items for select to authenticated
  using (public.is_company_member(company_id));
create policy loan_items_insert on public.loan_items for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy loan_items_update on public.loan_items for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

revoke all on public.loans, public.loan_items from anon, authenticated;
grant select, insert, delete on public.loans to authenticated;
grant update (borrower, contact, note, status, issued_at, returned_at) on public.loans to authenticated;
grant select, insert, update (damaged) on public.loan_items to authenticated;

-- ---------------------------------------------------------------------------
-- Funkcie (SECURITY INVOKER: všetko prechádza cez RLS volajúceho)
-- ---------------------------------------------------------------------------

-- Vytvorí rezerváciu. Každý kus overí proti iným rezerváciám a výpožičkám v tom istom
-- termíne; pri kolízii nevznikne nič. Vydaná výpožička po termíne blokuje techniku,
-- až kým sa nevráti.
create function public.create_loan(_company_id uuid, _loan jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _loan_id uuid;
  _starts date := (_loan ->> 'starts_on')::date;
  _ends date := (_loan ->> 'ends_on')::date;
  _item jsonb;
  _equipment public.equipment;
  _qty integer;
  _busy integer;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, note)
  values (
    _company_id, trim(_loan ->> 'borrower'), coalesce(trim(_loan ->> 'contact'), ''),
    _starts, _ends, coalesce(trim(_loan ->> 'note'), '')
  )
  returning id into _loan_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    select * into _equipment from public.equipment e
    where e.company_id = _company_id and e.id = (_item ->> 'equipment_id')::uuid;
    if not found then
      raise exception 'Technika neexistuje' using errcode = 'no_data_found';
    end if;
    if _equipment.status = 'retired' then
      raise exception 'Technika „%“ je vyradená', _equipment.name using errcode = 'check_violation';
    end if;

    select coalesce(sum(li.quantity), 0) into _busy
    from public.loan_items li
    join public.loans l on l.id = li.loan_id
    where li.equipment_id = _equipment.id
      and l.status in ('reserved', 'issued')
      and l.starts_on <= _ends
      and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts;

    if _busy + _qty > _equipment.quantity then
      raise exception 'Technika „%“ nie je v tomto termíne voľná (voľné % z % ks)',
        _equipment.name, greatest(_equipment.quantity - _busy, 0), _equipment.quantity
        using errcode = 'check_violation';
    end if;

    insert into public.loan_items (company_id, loan_id, equipment_id, quantity)
    values (_company_id, _loan_id, _equipment.id, _qty);
  end loop;

  return _loan_id;
end;
$$;

-- Vydanie: technika, ktorej sa požičiava celý počet kusov, prejde do stavu „vypožičaná“.
create function public.issue_loan(_loan_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.loans set status = 'issued', issued_at = now()
  where id = _loan_id and status = 'reserved';
  if not found then
    raise exception 'Výpožičku nemožno vydať' using errcode = 'check_violation';
  end if;

  update public.equipment e set status = 'loaned'
  from public.loan_items li
  where li.loan_id = _loan_id and li.equipment_id = e.id
    and e.status = 'available' and li.quantity >= e.quantity;
end;
$$;

-- Vrátenie: poškodené kusy prejdú do stavu „poškodená“, ostatné späť na „dostupná“.
create function public.return_loan(_loan_id uuid, _damaged uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
declare
  _any_damaged boolean;
begin
  update public.loan_items set damaged = (equipment_id = any (coalesce(_damaged, '{}')))
  where loan_id = _loan_id;
  select coalesce(bool_or(damaged), false) into _any_damaged from public.loan_items where loan_id = _loan_id;

  update public.loans
  set status = case when _any_damaged then 'damaged' else 'returned' end, returned_at = now()
  where id = _loan_id and status = 'issued';
  if not found then
    raise exception 'Výpožičku nemožno vrátiť' using errcode = 'check_violation';
  end if;

  update public.equipment e
  set status = case when li.damaged then 'damaged'::public.equipment_status else 'available'::public.equipment_status end
  from public.loan_items li
  where li.loan_id = _loan_id and li.equipment_id = e.id
    and (li.damaged or e.status = 'loaned');
end;
$$;

revoke execute on function
  public.create_loan(uuid, jsonb, jsonb), public.issue_loan(uuid), public.return_loan(uuid, uuid[])
  from public, anon;
grant execute on function
  public.create_loan(uuid, jsonb, jsonb), public.issue_loan(uuid), public.return_loan(uuid, uuid[])
  to authenticated;

-- =============================================================================
-- 0015_service.sql
-- =============================================================================

-- RigTrack: servisné záznamy techniky (oprava / kontrola / údržba).
-- Čítať môže každý člen firmy; zapisovať admin, skladník a technik; mazať admin a skladník.
-- Otvorený záznam prepne techniku do stavu „v servise“, dokončený ju vráti medzi dostupnú
-- a zapíše dátum posledného servisu (od neho sa počíta servisný interval).

create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  equipment_id uuid not null,
  kind text not null default 'repair' check (kind in ('repair', 'inspection', 'maintenance')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  happened_on date not null default current_date,
  problem text not null default '' check (char_length(problem) <= 2000),
  work_done text not null default '' check (char_length(work_done) <= 2000),
  hours numeric(6, 2) check (hours >= 0),
  cost numeric(10, 2) check (cost >= 0),
  technician text not null default '' check (char_length(technician) <= 80),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade
);
create index service_records_company_idx on public.service_records (company_id, happened_on desc);
create index service_records_equipment_idx on public.service_records (equipment_id, happened_on desc);

create trigger service_records_touch_updated_at
  before update on public.service_records
  for each row execute function public.touch_updated_at();

-- Stav záznamu sa premieta do stavu techniky.
create function public.apply_service_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    update public.equipment
    set
      status = case when status = 'in_service' then 'available'::public.equipment_status else status end,
      last_service_on = greatest(coalesce(last_service_on, new.happened_on), new.happened_on)
    where id = new.equipment_id and company_id = new.company_id;
  elsif new.status <> 'done' and (tg_op = 'INSERT' or old.status = 'done') then
    update public.equipment set status = 'in_service'
    where id = new.equipment_id and company_id = new.company_id and status in ('available', 'damaged');
  end if;
  return new;
end;
$$;

create trigger service_records_apply_status
  after insert or update of status on public.service_records
  for each row execute function public.apply_service_status();

revoke execute on function public.apply_service_status() from public, anon;

alter table public.service_records enable row level security;

create policy service_records_select on public.service_records for select to authenticated
  using (public.is_company_member(company_id));
create policy service_records_insert on public.service_records for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy service_records_update on public.service_records for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy service_records_delete on public.service_records for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.service_records from anon, authenticated;
grant select, insert, delete on public.service_records to authenticated;
grant update (kind, status, happened_on, problem, work_done, hours, cost, technician) on public.service_records to authenticated;

-- =============================================================================
-- 0016_tasks_shopping.sql
-- =============================================================================

-- RigTrack: úlohy (to-do) a nákupné zoznamy (want list a to-buy list).
-- Čítať môže každý člen firmy; zapisovať admin, skladník a technik;
-- mazať admin, skladník a ten, kto položku vytvoril.

-- Zodpovedná osoba musí byť členom tej istej firmy.
create function public.is_member_of(_company_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_members m where m.company_id = _company_id and m.user_id = _user_id
  );
$$;
revoke execute on function public.is_member_of(uuid, uuid) from public, anon;
grant execute on function public.is_member_of(uuid, uuid) to authenticated;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  note text not null default '' check (char_length(note) <= 2000),
  assignee_id uuid references public.profiles (id) on delete set null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_on date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_company_idx on public.tasks (company_id, status, due_on);

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- want = chceme časom kúpiť; buy = konkrétna položka na nákup
  list text not null default 'want' check (list in ('want', 'buy')),
  name text not null check (char_length(trim(name)) between 1 and 200),
  quantity integer not null default 1 check (quantity between 1 and 100000),
  unit_price numeric(12, 2) check (unit_price >= 0),
  supplier text not null default '' check (char_length(supplier) <= 120),
  url text not null default '' check (char_length(url) <= 500 and (url = '' or url ~* '^https?://')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_on date,
  status text not null default 'planned' check (status in ('planned', 'ordered', 'delivered')),
  assignee_id uuid references public.profiles (id) on delete set null,
  order_number text not null default '' check (char_length(order_number) <= 80),
  note text not null default '' check (char_length(note) <= 2000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shopping_items_company_idx on public.shopping_items (company_id, list, status);

create trigger shopping_items_touch_updated_at
  before update on public.shopping_items
  for each row execute function public.touch_updated_at();

alter table public.tasks enable row level security;
alter table public.shopping_items enable row level security;

create policy tasks_select on public.tasks for select to authenticated
  using (public.is_company_member(company_id));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    public.has_role(company_id, 'admin', 'skladnik', 'technik')
    and (assignee_id is null or public.is_member_of(company_id, assignee_id))
  );
create policy tasks_update on public.tasks for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (
    public.has_role(company_id, 'admin', 'skladnik', 'technik')
    and (assignee_id is null or public.is_member_of(company_id, assignee_id))
  );
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik') or (created_by = (select auth.uid()) and public.is_company_member(company_id)));

create policy shopping_items_select on public.shopping_items for select to authenticated
  using (public.is_company_member(company_id));
create policy shopping_items_insert on public.shopping_items for insert to authenticated
  with check (
    public.has_role(company_id, 'admin', 'skladnik', 'technik')
    and (assignee_id is null or public.is_member_of(company_id, assignee_id))
  );
create policy shopping_items_update on public.shopping_items for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (
    public.has_role(company_id, 'admin', 'skladnik', 'technik')
    and (assignee_id is null or public.is_member_of(company_id, assignee_id))
  );
create policy shopping_items_delete on public.shopping_items for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik') or (created_by = (select auth.uid()) and public.is_company_member(company_id)));

revoke all on public.tasks, public.shopping_items from anon, authenticated;
grant select, insert, delete on public.tasks to authenticated;
grant update (title, note, assignee_id, priority, due_on, status) on public.tasks to authenticated;
grant select, insert, delete on public.shopping_items to authenticated;
grant update (list, name, quantity, unit_price, supplier, url, priority, due_on, status, assignee_id, order_number, note)
  on public.shopping_items to authenticated;

-- =============================================================================
-- 0017_suggestions.sql
-- =============================================================================

-- RigTrack: interné návrhy a nápady s komentármi.
-- Navrhnúť a komentovať môže každý člen firmy vrátane viewera.
-- Stav návrhu (nový / rieši sa / hotové) mení admin a skladník.
-- Upraviť smie autor, zmazať autor alebo admin.

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  body text not null default '' check (char_length(body) <= 4000),
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  created_by uuid references public.profiles (id) on delete set null,
  -- Meno v čase zápisu; ostane čitateľné aj po odchode človeka z firmy.
  author_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);
create index suggestions_company_idx on public.suggestions (company_id, created_at desc);

create table public.suggestion_comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  suggestion_id uuid not null,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_by uuid references public.profiles (id) on delete set null,
  author_name text not null default '',
  created_at timestamptz not null default now(),
  foreign key (company_id, suggestion_id) references public.suggestions (company_id, id) on delete cascade
);
create index suggestion_comments_suggestion_idx on public.suggestion_comments (suggestion_id, created_at);

-- Autora a jeho meno určuje server, nie klient.
create function public.stamp_author()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.created_by := auth.uid();
  new.author_name := coalesce(
    (select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()),
    ''
  );
  return new;
end;
$$;

create trigger suggestions_stamp_author
  before insert on public.suggestions
  for each row execute function public.stamp_author();
create trigger suggestion_comments_stamp_author
  before insert on public.suggestion_comments
  for each row execute function public.stamp_author();

create trigger suggestions_touch_updated_at
  before update on public.suggestions
  for each row execute function public.touch_updated_at();

-- Autor smie upraviť text svojho návrhu, ale stav posúva iba admin a skladník.
create function public.guard_suggestion_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status and not public.has_role(new.company_id, 'admin', 'skladnik') then
    raise exception 'Stav návrhu môže zmeniť iba admin alebo skladník' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger suggestions_guard_status
  before update of status on public.suggestions
  for each row execute function public.guard_suggestion_status();

revoke execute on function public.stamp_author(), public.guard_suggestion_status() from public, anon;

alter table public.suggestions enable row level security;
alter table public.suggestion_comments enable row level security;

create policy suggestions_select on public.suggestions for select to authenticated
  using (public.is_company_member(company_id));
create policy suggestions_insert on public.suggestions for insert to authenticated
  with check (public.is_company_member(company_id));
create policy suggestions_update on public.suggestions for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik') or (created_by = (select auth.uid()) and public.is_company_member(company_id)))
  with check (public.has_role(company_id, 'admin', 'skladnik') or (created_by = (select auth.uid()) and public.is_company_member(company_id)));
create policy suggestions_delete on public.suggestions for delete to authenticated
  using (public.has_role(company_id, 'admin') or (created_by = (select auth.uid()) and public.is_company_member(company_id)));

create policy suggestion_comments_select on public.suggestion_comments for select to authenticated
  using (public.is_company_member(company_id));
create policy suggestion_comments_insert on public.suggestion_comments for insert to authenticated
  with check (public.is_company_member(company_id));
create policy suggestion_comments_delete on public.suggestion_comments for delete to authenticated
  using (public.has_role(company_id, 'admin') or (created_by = (select auth.uid()) and public.is_company_member(company_id)));

revoke all on public.suggestions, public.suggestion_comments from anon, authenticated;
grant select, insert (company_id, title, body), update (title, body, status), delete on public.suggestions to authenticated;
grant select, insert (company_id, suggestion_id, body), delete on public.suggestion_comments to authenticated;

-- =============================================================================
-- 0018_events.sql
-- =============================================================================

-- RigTrack: eventy (akcie) s technikou, posádkou a dokumentmi.
-- Čítať môže každý člen firmy; zapisovať admin, skladník a technik; event maže admin a skladník.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  client text not null default '' check (char_length(client) <= 120),
  venue text not null default '' check (char_length(venue) <= 200),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned' check (status in ('planned', 'confirmed', 'done', 'cancelled')),
  note text not null default '' check (char_length(note) <= 4000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (company_id, id)
);
create index events_company_idx on public.events (company_id, starts_on);

create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

create table public.event_equipment (
  company_id uuid not null,
  event_id uuid not null,
  equipment_id uuid not null,
  quantity integer not null default 1 check (quantity between 1 and 100000),
  primary key (event_id, equipment_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade,
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade
);
create index event_equipment_equipment_idx on public.event_equipment (equipment_id);

-- Posádka: člen firmy alebo externista zapísaný menom.
create table public.event_crew (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  member_id uuid references public.profiles (id) on delete set null,
  name text not null default '' check (char_length(name) <= 80),
  role text not null default '' check (char_length(role) <= 80),
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index event_crew_event_idx on public.event_crew (event_id);

create table public.event_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 200),
  path text not null check (char_length(path) <= 300),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index event_documents_event_idx on public.event_documents (event_id);

alter table public.events enable row level security;
alter table public.event_equipment enable row level security;
alter table public.event_crew enable row level security;
alter table public.event_documents enable row level security;

create policy events_select on public.events for select to authenticated
  using (public.is_company_member(company_id));
create policy events_insert on public.events for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy events_update on public.events for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy events_delete on public.events for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

create policy event_equipment_select on public.event_equipment for select to authenticated
  using (public.is_company_member(company_id));
create policy event_equipment_insert on public.event_equipment for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy event_equipment_update on public.event_equipment for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy event_equipment_delete on public.event_equipment for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

create policy event_crew_select on public.event_crew for select to authenticated
  using (public.is_company_member(company_id));
create policy event_crew_insert on public.event_crew for insert to authenticated
  with check (
    public.has_role(company_id, 'admin', 'skladnik', 'technik')
    and (member_id is null or public.is_member_of(company_id, member_id))
    and (member_id is not null or trim(name) <> '')
  );
create policy event_crew_delete on public.event_crew for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

create policy event_documents_select on public.event_documents for select to authenticated
  using (public.is_company_member(company_id));
create policy event_documents_insert on public.event_documents for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy event_documents_delete on public.event_documents for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

revoke all on public.events, public.event_equipment, public.event_crew, public.event_documents from anon, authenticated;
grant select, insert, delete on public.events to authenticated;
grant update (name, client, venue, starts_on, ends_on, status, note) on public.events to authenticated;
grant select, insert, delete, update (quantity) on public.event_equipment to authenticated;
grant select, insert, delete on public.event_crew, public.event_documents to authenticated;

-- Dokumenty: súkromný bucket, cesta {company_id}/{event_id}/{súbor}. Najviac 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-documents', 'event-documents', false, 10485760,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

create policy event_documents_files_select on storage.objects for select to authenticated
  using (
    bucket_id = 'event-documents'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );
create policy event_documents_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-documents'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );
create policy event_documents_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-documents'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );

-- =============================================================================
-- 0019_attachments_audit.sql
-- =============================================================================

-- RigTrack: prílohy k servisným záznamom a vozidlám + história zmien (audit log).

-- ---------------------------------------------------------------------------
-- Prílohy. Jedna tabuľka pre viac druhov záznamov; entity_type hovorí, k čomu patrí.
-- Čítať môže člen firmy; nahrávať a mazať admin, skladník a technik.
-- ---------------------------------------------------------------------------

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  entity_type text not null check (entity_type in ('service', 'vehicle')),
  entity_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 200),
  path text not null check (char_length(path) <= 300),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index attachments_entity_idx on public.attachments (company_id, entity_type, entity_id);

alter table public.attachments enable row level security;

create policy attachments_select on public.attachments for select to authenticated
  using (public.is_company_member(company_id));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy attachments_delete on public.attachments for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

revoke all on public.attachments from anon, authenticated;
grant select, insert, delete on public.attachments to authenticated;

-- Keď zanikne záznam, zaniknú aj riadky jeho príloh (súbory upratuje aplikácia).
create function public.drop_attachments()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.attachments where entity_type = tg_argv[0] and entity_id = old.id;
  return old;
end;
$$;

create trigger service_records_drop_attachments
  after delete on public.service_records
  for each row execute function public.drop_attachments('service');
create trigger vehicles_drop_attachments
  after delete on public.vehicles
  for each row execute function public.drop_attachments('vehicle');

revoke execute on function public.drop_attachments() from public, anon;

-- Súbory: súkromný bucket, cesta {company_id}/{druh}/{id záznamu}/{súbor}. Najviac 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments', 'attachments', false, 10485760,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

create policy attachments_files_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy attachments_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );
create policy attachments_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );

-- ---------------------------------------------------------------------------
-- História zmien. Zapisuje ju výhradne trigger; čítať ju smie iba admin
-- a nikto ju nemôže upraviť ani zmazať.
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  -- Meno v čase zmeny; ostane čitateľné aj po odchode človeka z firmy.
  actor_name text not null default '',
  action text not null check (action in ('insert', 'update', 'delete')),
  entity text not null,
  entity_id uuid,
  label text not null default '',
  -- Pri úprave názvy stĺpcov, ktoré sa zmenili.
  changed text[],
  created_at timestamptz not null default now()
);
create index audit_log_company_idx on public.audit_log (company_id, created_at desc);

alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log for select to authenticated
  using (public.has_role(company_id, 'admin'));

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create function public.write_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _row jsonb;
  _old jsonb;
  _changed text[];
  _company uuid;
begin
  if tg_op = 'DELETE' then
    _row := to_jsonb(old);
  else
    _row := to_jsonb(new);
  end if;
  _company := (_row ->> 'company_id')::uuid;

  -- Pri mazaní celej firmy (cascade) už rodič neexistuje; históriu niet kam zapísať.
  if not exists (select 1 from public.companies c where c.id = _company) then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    _old := to_jsonb(old);
    select array_agg(e.key order by e.key) into _changed
    from jsonb_each(_row) e
    where e.key <> 'updated_at' and e.value is distinct from _old -> e.key;
    if _changed is null then
      return new;
    end if;
  end if;

  insert into public.audit_log (company_id, actor_id, actor_name, action, entity, entity_id, label, changed)
  values (
    _company,
    auth.uid(),
    coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), ''),
    lower(tg_op),
    tg_table_name,
    (_row ->> 'id')::uuid,
    left(coalesce(_row ->> 'name', _row ->> 'title', _row ->> 'plate', _row ->> 'borrower', _row ->> 'supplier', ''), 200),
    _changed
  );
  return coalesce(new, old);
end;
$$;

revoke execute on function public.write_audit() from public, anon;

create trigger equipment_audit after insert or update or delete on public.equipment
  for each row execute function public.write_audit();
create trigger cases_audit after insert or update or delete on public.cases
  for each row execute function public.write_audit();
create trigger loans_audit after insert or update or delete on public.loans
  for each row execute function public.write_audit();
create trigger orders_audit after insert or update or delete on public.orders
  for each row execute function public.write_audit();
create trigger vehicles_audit after insert or update or delete on public.vehicles
  for each row execute function public.write_audit();
create trigger service_records_audit after insert or update or delete on public.service_records
  for each row execute function public.write_audit();
create trigger events_audit after insert or update or delete on public.events
  for each row execute function public.write_audit();

-- =============================================================================
-- 0020_loans_respect_events.sql
-- =============================================================================

-- RigTrack: výpožičky rešpektujú techniku naplánovanú na eventy.
-- Rovnaká funkcia ako v 0014, navyše do obsadených kusov ráta aj techniku
-- na plánovaných a potvrdených eventoch v tom istom termíne.

create or replace function public.create_loan(_company_id uuid, _loan jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _loan_id uuid;
  _starts date := (_loan ->> 'starts_on')::date;
  _ends date := (_loan ->> 'ends_on')::date;
  _item jsonb;
  _equipment public.equipment;
  _qty integer;
  _busy integer;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, note)
  values (
    _company_id, trim(_loan ->> 'borrower'), coalesce(trim(_loan ->> 'contact'), ''),
    _starts, _ends, coalesce(trim(_loan ->> 'note'), '')
  )
  returning id into _loan_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    select * into _equipment from public.equipment e
    where e.company_id = _company_id and e.id = (_item ->> 'equipment_id')::uuid;
    if not found then
      raise exception 'Technika neexistuje' using errcode = 'no_data_found';
    end if;
    if _equipment.status = 'retired' then
      raise exception 'Technika „%“ je vyradená', _equipment.name using errcode = 'check_violation';
    end if;

    select coalesce(sum(li.quantity), 0) into _busy
    from public.loan_items li
    join public.loans l on l.id = li.loan_id
    where li.equipment_id = _equipment.id
      and l.status in ('reserved', 'issued')
      and l.starts_on <= _ends
      and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts;

    -- Technika naplánovaná na plánovaný alebo potvrdený event v tom istom termíne je tiež obsadená.
    select _busy + coalesce(sum(ee.quantity), 0) into _busy
    from public.event_equipment ee
    join public.events ev on ev.id = ee.event_id
    where ee.equipment_id = _equipment.id
      and ev.status in ('planned', 'confirmed')
      and ev.starts_on <= _ends
      and ev.ends_on >= _starts;

    if _busy + _qty > _equipment.quantity then
      raise exception 'Technika „%“ nie je v tomto termíne voľná (voľné % z % ks)',
        _equipment.name, greatest(_equipment.quantity - _busy, 0), _equipment.quantity
        using errcode = 'check_violation';
    end if;

    insert into public.loan_items (company_id, loan_id, equipment_id, quantity)
    values (_company_id, _loan_id, _equipment.id, _qty);
  end loop;

  return _loan_id;
end;
$$;

-- =============================================================================
-- 0021_hours_payouts.sql
-- =============================================================================

-- RigTrack: prevádzkové hodiny techniky (odčítané z počítadla zariadenia) a odmeny členov.

-- ---------------------------------------------------------------------------
-- Prevádzkové hodiny. Zariadenia ako hlavy či zosilňovače si hodiny počítajú samy;
-- eviduje sa interval, ako často ich treba odčítať, a každé odčítanie.
-- ---------------------------------------------------------------------------

alter table public.equipment
  add column hours_interval_months integer check (hours_interval_months between 1 and 120),
  -- Posledný odčítaný stav; zapisuje ho iba trigger z tabuľky odčítaní.
  add column operating_hours numeric(10, 1) check (operating_hours >= 0),
  add column hours_read_on date;
grant update (hours_interval_months) on public.equipment to authenticated;

create table public.equipment_hour_readings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  equipment_id uuid not null,
  read_on date not null default current_date,
  hours numeric(10, 1) not null check (hours >= 0),
  note text not null default '' check (char_length(note) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  author_name text not null default '',
  created_at timestamptz not null default now(),
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade
);
create index equipment_hour_readings_idx on public.equipment_hour_readings (equipment_id, read_on desc);

-- Kto odčítal, určuje server (rovnaká funkcia ako pri návrhoch).
create trigger equipment_hour_readings_stamp_author
  before insert on public.equipment_hour_readings
  for each row execute function public.stamp_author();

-- Najnovšie odčítanie sa premietne do techniky. SECURITY DEFINER: klient tieto stĺpce
-- priamo meniť nesmie, aby sa stav nedal prepísať bez záznamu o odčítaní.
create function public.apply_hour_reading()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.equipment
  set operating_hours = new.hours, hours_read_on = new.read_on
  where id = new.equipment_id and company_id = new.company_id
    and (hours_read_on is null or hours_read_on <= new.read_on);
  return new;
end;
$$;

create trigger equipment_hour_readings_apply
  after insert on public.equipment_hour_readings
  for each row execute function public.apply_hour_reading();

revoke execute on function public.apply_hour_reading() from public, anon;

alter table public.equipment_hour_readings enable row level security;

create policy equipment_hour_readings_select on public.equipment_hour_readings for select to authenticated
  using (public.is_company_member(company_id));
create policy equipment_hour_readings_insert on public.equipment_hour_readings for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy equipment_hour_readings_delete on public.equipment_hour_readings for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.equipment_hour_readings from anon, authenticated;
grant select, insert (company_id, equipment_id, read_on, hours, note), delete on public.equipment_hour_readings to authenticated;

-- ---------------------------------------------------------------------------
-- Odmeny členov. Zapisuje a vypláca ich iba admin; člen vidí len svoje záznamy.
-- ---------------------------------------------------------------------------

create table public.member_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  kind text not null default 'reward' check (kind in ('reward', 'advance', 'bonus', 'other')),
  happened_on date not null default current_date,
  event_id uuid,
  note text not null default '' check (char_length(note) <= 500),
  -- Prázdne = ešte nevyplatené.
  paid_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete set null (event_id)
);
create index member_payments_company_idx on public.member_payments (company_id, member_id, happened_on desc);

alter table public.member_payments enable row level security;

create policy member_payments_select on public.member_payments for select to authenticated
  using (
    public.has_role(company_id, 'admin')
    or (member_id = (select auth.uid()) and public.is_company_member(company_id))
  );
create policy member_payments_insert on public.member_payments for insert to authenticated
  with check (public.has_role(company_id, 'admin') and public.is_member_of(company_id, member_id));
create policy member_payments_update on public.member_payments for update to authenticated
  using (public.has_role(company_id, 'admin'))
  with check (public.has_role(company_id, 'admin'));
create policy member_payments_delete on public.member_payments for delete to authenticated
  using (public.has_role(company_id, 'admin'));

revoke all on public.member_payments from anon, authenticated;
grant select, insert, delete on public.member_payments to authenticated;
grant update (amount, kind, happened_on, event_id, note, paid_at) on public.member_payments to authenticated;

-- =============================================================================
-- 0022_service_quantity.sql
-- =============================================================================

-- RigTrack: servis po kusoch.
-- Technika s viacerými kusmi (2× DI box) môže mať v servise iba časť z nich.
-- Záznam nesie počet kusov; stav „v servise“ dostane technika až vtedy, keď sú
-- v rozpracovaných záznamoch všetky jej kusy.

alter table public.service_records
  add column quantity integer not null default 1 check (quantity >= 1);

create or replace function public.apply_service_status()
returns trigger language plpgsql set search_path = '' as $$
declare
  _record public.service_records;
  _total integer;
  _open integer;
begin
  if tg_op = 'DELETE' then
    _record := old;
  else
    _record := new;
  end if;

  select e.quantity into _total from public.equipment e
  where e.id = _record.equipment_id and e.company_id = _record.company_id;
  -- Technika sa práve maže (kaskáda), niet čo prepínať.
  if not found then
    return null;
  end if;

  if tg_op <> 'DELETE' and new.status <> 'done' and new.quantity > greatest(_total, 1) then
    raise exception 'V servise nemôže byť viac kusov (%), než koľko ich technika má (%)', new.quantity, _total
      using errcode = 'check_violation';
  end if;

  if tg_op <> 'DELETE' and new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    update public.equipment
    set last_service_on = greatest(coalesce(last_service_on, new.happened_on), new.happened_on)
    where id = new.equipment_id and company_id = new.company_id;
  end if;

  select coalesce(sum(s.quantity), 0) into _open from public.service_records s
  where s.equipment_id = _record.equipment_id and s.status <> 'done';

  update public.equipment
  set status = case
    when _open > 0 and _open >= quantity and status in ('available', 'damaged') then 'in_service'::public.equipment_status
    when (_open = 0 or _open < quantity) and status = 'in_service' then 'available'::public.equipment_status
    else status
  end
  where id = _record.equipment_id and company_id = _record.company_id;

  return null;
end;
$$;

-- Stav sa prepočíta aj pri zmene počtu kusov a pri zmazaní záznamu.
drop trigger service_records_apply_status on public.service_records;
create trigger service_records_apply_status
  after insert or delete or update of status, quantity on public.service_records
  for each row execute function public.apply_service_status();

grant update (quantity) on public.service_records to authenticated;

-- Doterajšie rozpracované záznamy platili pre všetky kusy; nech to tak ostane,
-- kým ich niekto neupraví.
update public.service_records s
set quantity = greatest(e.quantity, 1)
from public.equipment e
where e.id = s.equipment_id and s.status <> 'done' and e.quantity > 1;

-- =============================================================================
-- 0023_service_units.sql
-- =============================================================================

-- RigTrack: servis konkrétnych kusov.
-- Kusy techniky sú očíslované 1..quantity (DI box #1, DI box #2). Servisný záznam
-- nesie čísla kusov, ktorých sa týka, takže je jasné, ktorý kus je v servise.
-- Počet kusov (quantity z 0022) sa z čísel odvodzuje.

alter table public.service_records
  add column unit_numbers integer[] not null default '{}';

create function public.check_service_units()
returns trigger language plpgsql set search_path = '' as $$
declare
  _total integer;
  _taken integer;
begin
  if cardinality(new.unit_numbers) = 0 then
    return new;
  end if;

  new.unit_numbers := array(select distinct u from unnest(new.unit_numbers) u order by u);
  if exists (select 1 from unnest(new.unit_numbers) u where u is null or u < 1) then
    raise exception 'Neplatné číslo kusu' using errcode = 'check_violation';
  end if;

  if new.status <> 'done' then
    select e.quantity into _total from public.equipment e
    where e.id = new.equipment_id and e.company_id = new.company_id;
    if new.unit_numbers[cardinality(new.unit_numbers)] > greatest(_total, 1) then
      raise exception 'Technika má iba % ks, kus #% neexistuje', _total, new.unit_numbers[cardinality(new.unit_numbers)]
        using errcode = 'check_violation';
    end if;

    select u into _taken
    from public.service_records s, unnest(s.unit_numbers) u
    where s.equipment_id = new.equipment_id and s.id <> new.id and s.status <> 'done'
      and u = any (new.unit_numbers)
    limit 1;
    if found then
      raise exception 'Kus #% už je v servise v inom zázname', _taken using errcode = 'check_violation';
    end if;
  end if;

  new.quantity := cardinality(new.unit_numbers);
  return new;
end;
$$;

create trigger service_records_check_units
  before insert or update of unit_numbers, quantity, status on public.service_records
  for each row execute function public.check_service_units();

revoke execute on function public.check_service_units() from public, anon;
grant update (unit_numbers) on public.service_records to authenticated;

-- Rozpracované záznamy techniky s viacerými kusmi: ak pokrývajú všetky kusy, sú to kusy 1..n.
-- Pri ostatných čísla nepoznáme, doplní ich človek.
update public.service_records s
set unit_numbers = array(select generate_series(1, e.quantity))
from public.equipment e
where e.id = s.equipment_id and s.status <> 'done' and e.quantity > 1 and s.quantity >= e.quantity;

-- =============================================================================
-- 0024_loan_cases.sql
-- =============================================================================

-- RigTrack: výpožička celého case.
-- Položka výpožičky si pamätá case, s ktorým odišla ako celok. Podľa toho ju
-- výpožičná listina zoskupí pod case a case má vlastnú históriu výpožičiek.
-- Technika vybraná z case jednotlivo ostáva bez case.

alter table public.loan_items
  add column case_id uuid,
  add foreign key (company_id, case_id) references public.cases (company_id, id) on delete set null (case_id);
create index loan_items_case_idx on public.loan_items (case_id) where case_id is not null;

-- Rovnaká funkcia ako v 0020, navyše zapisuje case položky.
create or replace function public.create_loan(_company_id uuid, _loan jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _loan_id uuid;
  _starts date := (_loan ->> 'starts_on')::date;
  _ends date := (_loan ->> 'ends_on')::date;
  _item jsonb;
  _equipment public.equipment;
  _qty integer;
  _busy integer;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, note)
  values (
    _company_id, trim(_loan ->> 'borrower'), coalesce(trim(_loan ->> 'contact'), ''),
    _starts, _ends, coalesce(trim(_loan ->> 'note'), '')
  )
  returning id into _loan_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    select * into _equipment from public.equipment e
    where e.company_id = _company_id and e.id = (_item ->> 'equipment_id')::uuid;
    if not found then
      raise exception 'Technika neexistuje' using errcode = 'no_data_found';
    end if;
    if _equipment.status = 'retired' then
      raise exception 'Technika „%“ je vyradená', _equipment.name using errcode = 'check_violation';
    end if;

    select coalesce(sum(li.quantity), 0) into _busy
    from public.loan_items li
    join public.loans l on l.id = li.loan_id
    where li.equipment_id = _equipment.id
      and l.status in ('reserved', 'issued')
      and l.starts_on <= _ends
      and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts;

    -- Technika naplánovaná na plánovaný alebo potvrdený event v tom istom termíne je tiež obsadená.
    select _busy + coalesce(sum(ee.quantity), 0) into _busy
    from public.event_equipment ee
    join public.events ev on ev.id = ee.event_id
    where ee.equipment_id = _equipment.id
      and ev.status in ('planned', 'confirmed')
      and ev.starts_on <= _ends
      and ev.ends_on >= _starts;

    if _busy + _qty > _equipment.quantity then
      raise exception 'Technika „%“ nie je v tomto termíne voľná (voľné % z % ks)',
        _equipment.name, greatest(_equipment.quantity - _busy, 0), _equipment.quantity
        using errcode = 'check_violation';
    end if;

    insert into public.loan_items (company_id, loan_id, equipment_id, quantity, case_id)
    values (_company_id, _loan_id, _equipment.id, _qty, nullif(_item ->> 'case_id', '')::uuid);
  end loop;

  return _loan_id;
end;
$$;

-- =============================================================================
-- 0025_tracked_units.sql
-- =============================================================================

-- RigTrack: technika evidovaná po kusoch.
-- Pri technike s track_units má každý kus číslo (1..quantity) a vlastnú históriu:
-- výpožička aj servis hovoria, ktorých kusov sa týkajú. Ostatná technika (háky, gurtne)
-- sa ďalej ráta len na počet.
-- Poškodenie pri vrátení už neoznačí celú techniku ako poškodenú; poškodeným kusom
-- sa otvorí servisný záznam.

alter table public.equipment add column track_units boolean not null default false;
grant update (track_units) on public.equipment to authenticated;

-- Technika, pri ktorej sa už čísla kusov používajú v servise.
update public.equipment e set track_units = true
where e.quantity > 1
  and exists (select 1 from public.service_records s where s.equipment_id = e.id and cardinality(s.unit_numbers) > 0);

alter table public.loan_items
  add column unit_numbers integer[] not null default '{}',
  add column damaged_units integer[] not null default '{}',
  add column damaged_quantity integer not null default 0 check (damaged_quantity >= 0);
update public.loan_items set damaged_quantity = quantity where damaged;
grant update (damaged_units, damaged_quantity) on public.loan_items to authenticated;

-- Rovnaká funkcia ako v 0024, navyše pri technike evidovanej po kusoch zapisuje čísla
-- kusov a stráži, aby ten istý kus nebol v jednom termíne na dvoch výpožičkách.
create or replace function public.create_loan(_company_id uuid, _loan jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _loan_id uuid;
  _starts date := (_loan ->> 'starts_on')::date;
  _ends date := (_loan ->> 'ends_on')::date;
  _item jsonb;
  _equipment public.equipment;
  _qty integer;
  _busy integer;
  _units integer[];
  _taken integer;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, note)
  values (
    _company_id, trim(_loan ->> 'borrower'), coalesce(trim(_loan ->> 'contact'), ''),
    _starts, _ends, coalesce(trim(_loan ->> 'note'), '')
  )
  returning id into _loan_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    select * into _equipment from public.equipment e
    where e.company_id = _company_id and e.id = (_item ->> 'equipment_id')::uuid;
    if not found then
      raise exception 'Technika neexistuje' using errcode = 'no_data_found';
    end if;
    if _equipment.status = 'retired' then
      raise exception 'Technika „%“ je vyradená', _equipment.name using errcode = 'check_violation';
    end if;

    _units := '{}';
    if _equipment.track_units then
      if jsonb_typeof(_item -> 'unit_numbers') = 'array' then
        _units := array(select distinct u::integer from jsonb_array_elements_text(_item -> 'unit_numbers') u order by 1);
      end if;
      if cardinality(_units) = 0 then
        raise exception 'Pri technike „%“ vyberte konkrétne kusy', _equipment.name using errcode = 'check_violation';
      end if;
      if _units[1] < 1 or _units[cardinality(_units)] > _equipment.quantity then
        raise exception 'Technika „%“ má iba kusy #1 až #%', _equipment.name, _equipment.quantity using errcode = 'check_violation';
      end if;
      _qty := cardinality(_units);

      select u into _taken
      from public.loan_items li
      join public.loans l on l.id = li.loan_id
      cross join unnest(li.unit_numbers) u
      where li.equipment_id = _equipment.id
        and l.status in ('reserved', 'issued')
        and l.starts_on <= _ends
        and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts
        and u = any (_units)
      limit 1;
      if found then
        raise exception 'Kus #% techniky „%“ je v tomto termíne už na inej výpožičke', _taken, _equipment.name
          using errcode = 'check_violation';
      end if;
    end if;

    select coalesce(sum(li.quantity), 0) into _busy
    from public.loan_items li
    join public.loans l on l.id = li.loan_id
    where li.equipment_id = _equipment.id
      and l.status in ('reserved', 'issued')
      and l.starts_on <= _ends
      and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts;

    -- Technika naplánovaná na plánovaný alebo potvrdený event v tom istom termíne je tiež obsadená.
    select _busy + coalesce(sum(ee.quantity), 0) into _busy
    from public.event_equipment ee
    join public.events ev on ev.id = ee.event_id
    where ee.equipment_id = _equipment.id
      and ev.status in ('planned', 'confirmed')
      and ev.starts_on <= _ends
      and ev.ends_on >= _starts;

    if _busy + _qty > _equipment.quantity then
      raise exception 'Technika „%“ nie je v tomto termíne voľná (voľné % z % ks)',
        _equipment.name, greatest(_equipment.quantity - _busy, 0), _equipment.quantity
        using errcode = 'check_violation';
    end if;

    insert into public.loan_items (company_id, loan_id, equipment_id, quantity, case_id, unit_numbers)
    values (_company_id, _loan_id, _equipment.id, _qty, nullif(_item ->> 'case_id', '')::uuid, _units);
  end loop;

  return _loan_id;
end;
$$;

-- Vrátenie. _damaged je pole { equipment_id, units: [čísla kusov], quantity: počet }:
-- pri technike evidovanej po kusoch platia čísla, pri ostatnej počet (bez neho všetky kusy).
-- Poškodeným kusom sa otvorí servisný záznam; technika ako celok ostáva dostupná,
-- kým nie sú v servise všetky jej kusy (to rieši trigger servisu).
drop function public.return_loan(uuid, uuid[]);

create function public.return_loan(_loan_id uuid, _damaged jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  _loan public.loans;
  _row record;
  _units integer[];
  _count integer;
  _any boolean := false;
begin
  update public.loans set status = 'returned', returned_at = now()
  where id = _loan_id and status = 'issued'
  returning * into _loan;
  if not found then
    raise exception 'Výpožičku nemožno vrátiť' using errcode = 'check_violation';
  end if;

  update public.loan_items set damaged = false, damaged_units = '{}', damaged_quantity = 0 where loan_id = _loan_id;

  update public.equipment e set status = 'available'
  from public.loan_items li
  where li.loan_id = _loan_id and li.equipment_id = e.id and e.status = 'loaned';

  for _row in
    select li.equipment_id, li.quantity, li.unit_numbers, d.value as entry
    from jsonb_array_elements(case when jsonb_typeof(_damaged) = 'array' then _damaged else '[]'::jsonb end) d
    join public.loan_items li on li.loan_id = _loan_id and li.equipment_id = (d.value ->> 'equipment_id')::uuid
  loop
    if cardinality(_row.unit_numbers) > 0 then
      _units := '{}';
      if jsonb_typeof(_row.entry -> 'units') = 'array' then
        _units := array(
          select distinct u::integer from jsonb_array_elements_text(_row.entry -> 'units') u
          where u::integer = any (_row.unit_numbers) order by 1
        );
      end if;
      _count := cardinality(_units);
    else
      _units := '{}';
      _count := least(greatest(coalesce((_row.entry ->> 'quantity')::integer, _row.quantity), 0), _row.quantity);
    end if;
    continue when _count = 0;

    update public.loan_items set damaged = true, damaged_units = _units, damaged_quantity = _count
    where loan_id = _loan_id and equipment_id = _row.equipment_id;
    _any := true;

    -- Kusy, ktoré už v servise sú, nový záznam nedostanú.
    begin
      insert into public.service_records (company_id, equipment_id, kind, status, problem, unit_numbers, quantity)
      values (
        _loan.company_id, _row.equipment_id, 'repair', 'open',
        left('Vrátené poškodené z výpožičky: ' || _loan.borrower, 2000), _units, _count
      );
    exception when check_violation then
      null;
    end;
  end loop;

  if _any then
    update public.loans set status = 'damaged' where id = _loan_id;
  end if;
end;
$$;

revoke execute on function public.return_loan(uuid, jsonb) from public, anon;
grant execute on function public.return_loan(uuid, jsonb) to authenticated;

-- =============================================================================
-- 0026_vehicle_photos.sql
-- =============================================================================

-- pridat moznost pri vypozicke zadat Ceny, kaucia ani IČO/adresa variabilne... mozno pridat funkciu kalkulacie rentalu... ze by sme zadali napr fixne ceny za urcite veci a same by to pocitalo cenu rentalu

-- =============================================================================
-- 0027_loan_pricing.sql
-- =============================================================================

-- RigTrack: ceny výpožičiek.
-- Technika má cenu prenájmu za deň; výpožička si pri vzniku zapíše cenu každej položky,
-- počet účtovaných dní, prípadnú dohodnutú cenu, kauciu a fakturačné údaje vypožičiavateľa.

-- Fotka vozidla (pôvodne 0026). Zopakované tu, aby stĺpec vznikol, aj keby 0026 nebežala.
alter table public.vehicles
  add column if not exists photo_path text not null default '' check (char_length(photo_path) <= 300);
grant update (photo_path) on public.vehicles to authenticated;

alter table public.equipment add column rental_price numeric(10, 2) check (rental_price >= 0);
grant update (rental_price) on public.equipment to authenticated;

alter table public.loans
  add column borrower_ico text not null default '' check (char_length(borrower_ico) <= 20),
  add column borrower_address text not null default '' check (char_length(borrower_address) <= 200),
  -- Prázdne = účtujú sa kalendárne dni od–do vrátane.
  add column billed_days integer check (billed_days between 1 and 3650),
  -- Prázdne = platí vypočítaná cena (súčet položiek × dni).
  add column price numeric(10, 2) check (price >= 0),
  add column deposit numeric(10, 2) check (deposit >= 0);
alter table public.loan_items
  -- Cena za kus a deň v čase výpožičky; neskoršia zmena cenníka ju nemení.
  add column unit_price numeric(10, 2) check (unit_price >= 0);

grant update (borrower_ico, borrower_address, billed_days, price, deposit) on public.loans to authenticated;
grant update (unit_price) on public.loan_items to authenticated;

-- Vytvorí výpožičku cez create_loan (všetky kontroly dostupnosti) a v tej istej transakcii
-- k nej zapíše ceny a fakturačné údaje.
create function public.create_priced_loan(_company_id uuid, _loan jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _loan_id uuid;
begin
  _loan_id := public.create_loan(_company_id, _loan, _items);

  update public.loans
  set
    borrower_ico = coalesce(trim(_loan ->> 'borrower_ico'), ''),
    borrower_address = coalesce(trim(_loan ->> 'borrower_address'), ''),
    billed_days = (_loan ->> 'billed_days')::integer,
    price = (_loan ->> 'price')::numeric,
    deposit = (_loan ->> 'deposit')::numeric
  where id = _loan_id;

  update public.loan_items li
  set unit_price = (i.value ->> 'unit_price')::numeric
  from jsonb_array_elements(_items) i
  where li.loan_id = _loan_id and li.equipment_id = (i.value ->> 'equipment_id')::uuid;

  return _loan_id;
end;
$$;

revoke execute on function public.create_priced_loan(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_priced_loan(uuid, jsonb, jsonb) to authenticated;

-- =============================================================================
-- 0028_loan_edit.sql
-- =============================================================================

-- RigTrack: úprava výpožičky pred vydaním.
-- Rezerváciu možno upraviť, kým technika neodišla. Kontroly dostupnosti sú tie isté
-- ako pri vytvorení, preto sa zápis položiek vyčlenil do spoločnej funkcie.

grant update (starts_on, ends_on) on public.loans to authenticated;

-- Položky smie mazať ten, kto výpožičky vytvára, a len kým je výpožička rezerváciou.
grant delete on public.loan_items to authenticated;
create policy loan_items_delete on public.loan_items for delete to authenticated
  using (
    public.has_role(company_id, 'admin', 'skladnik', 'technik')
    and exists (select 1 from public.loans l where l.id = loan_id and l.status = 'reserved')
  );

-- Overí a zapíše položky výpožičky. Termín berie z výpožičky; jej vlastné položky
-- sa do obsadenosti nerátajú. Pri kolízii vyhodí chybu a volajúca transakcia sa zruší.
create function public.add_loan_items(_company_id uuid, _loan_id uuid, _items jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  _starts date;
  _ends date;
  _item jsonb;
  _equipment public.equipment;
  _qty integer;
  _busy integer;
  _units integer[];
  _taken integer;
begin
  select l.starts_on, l.ends_on into _starts, _ends from public.loans l
  where l.id = _loan_id and l.company_id = _company_id;
  if not found then
    raise exception 'Výpožička neexistuje' using errcode = 'no_data_found';
  end if;
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    select * into _equipment from public.equipment e
    where e.company_id = _company_id and e.id = (_item ->> 'equipment_id')::uuid;
    if not found then
      raise exception 'Technika neexistuje' using errcode = 'no_data_found';
    end if;
    if _equipment.status = 'retired' then
      raise exception 'Technika „%“ je vyradená', _equipment.name using errcode = 'check_violation';
    end if;

    _units := '{}';
    if _equipment.track_units then
      if jsonb_typeof(_item -> 'unit_numbers') = 'array' then
        _units := array(select distinct u::integer from jsonb_array_elements_text(_item -> 'unit_numbers') u order by 1);
      end if;
      if cardinality(_units) = 0 then
        raise exception 'Pri technike „%“ vyberte konkrétne kusy', _equipment.name using errcode = 'check_violation';
      end if;
      if _units[1] < 1 or _units[cardinality(_units)] > _equipment.quantity then
        raise exception 'Technika „%“ má iba kusy #1 až #%', _equipment.name, _equipment.quantity using errcode = 'check_violation';
      end if;
      _qty := cardinality(_units);

      select u into _taken
      from public.loan_items li
      join public.loans l on l.id = li.loan_id
      cross join unnest(li.unit_numbers) u
      where li.equipment_id = _equipment.id
        and l.id <> _loan_id
        and l.status in ('reserved', 'issued')
        and l.starts_on <= _ends
        and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts
        and u = any (_units)
      limit 1;
      if found then
        raise exception 'Kus #% techniky „%“ je v tomto termíne už na inej výpožičke', _taken, _equipment.name
          using errcode = 'check_violation';
      end if;
    end if;

    select coalesce(sum(li.quantity), 0) into _busy
    from public.loan_items li
    join public.loans l on l.id = li.loan_id
    where li.equipment_id = _equipment.id
      and l.id <> _loan_id
      and l.status in ('reserved', 'issued')
      and l.starts_on <= _ends
      and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts;

    -- Technika naplánovaná na plánovaný alebo potvrdený event v tom istom termíne je tiež obsadená.
    select _busy + coalesce(sum(ee.quantity), 0) into _busy
    from public.event_equipment ee
    join public.events ev on ev.id = ee.event_id
    where ee.equipment_id = _equipment.id
      and ev.status in ('planned', 'confirmed')
      and ev.starts_on <= _ends
      and ev.ends_on >= _starts;

    if _busy + _qty > _equipment.quantity then
      raise exception 'Technika „%“ nie je v tomto termíne voľná (voľné % z % ks)',
        _equipment.name, greatest(_equipment.quantity - _busy, 0), _equipment.quantity
        using errcode = 'check_violation';
    end if;

    insert into public.loan_items (company_id, loan_id, equipment_id, quantity, case_id, unit_numbers, unit_price)
    values (
      _company_id, _loan_id, _equipment.id, _qty, nullif(_item ->> 'case_id', '')::uuid, _units,
      (_item ->> 'unit_price')::numeric
    );
  end loop;
end;
$$;

create or replace function public.create_loan(_company_id uuid, _loan jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _loan_id uuid;
begin
  -- Prázdny zoznam odmietneme skôr, než vznikne riadok výpožičky.
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, note)
  values (
    _company_id, trim(_loan ->> 'borrower'), coalesce(trim(_loan ->> 'contact'), ''),
    (_loan ->> 'starts_on')::date, (_loan ->> 'ends_on')::date, coalesce(trim(_loan ->> 'note'), '')
  )
  returning id into _loan_id;

  perform public.add_loan_items(_company_id, _loan_id, _items);
  return _loan_id;
end;
$$;

-- Prepíše rezerváciu novými údajmi a položkami. Vydanú alebo vrátenú výpožičku nemení.
create function public.update_loan(_loan_id uuid, _loan jsonb, _items jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  _company_id uuid;
begin
  update public.loans
  set
    borrower = trim(_loan ->> 'borrower'),
    contact = coalesce(trim(_loan ->> 'contact'), ''),
    starts_on = (_loan ->> 'starts_on')::date,
    ends_on = (_loan ->> 'ends_on')::date,
    note = coalesce(trim(_loan ->> 'note'), ''),
    borrower_ico = coalesce(trim(_loan ->> 'borrower_ico'), ''),
    borrower_address = coalesce(trim(_loan ->> 'borrower_address'), ''),
    billed_days = (_loan ->> 'billed_days')::integer,
    price = (_loan ->> 'price')::numeric,
    deposit = (_loan ->> 'deposit')::numeric
  where id = _loan_id and status = 'reserved'
  returning company_id into _company_id;
  if not found then
    raise exception 'Upraviť sa dá len rezervácia, ktorá ešte nebola vydaná' using errcode = 'check_violation';
  end if;

  delete from public.loan_items where loan_id = _loan_id;
  perform public.add_loan_items(_company_id, _loan_id, _items);
end;
$$;

revoke execute on function public.add_loan_items(uuid, uuid, jsonb), public.update_loan(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.add_loan_items(uuid, uuid, jsonb), public.update_loan(uuid, jsonb, jsonb) to authenticated;

-- =============================================================================
-- 0029_event_cases.sql
-- =============================================================================

-- RigTrack: celý case na evente.
-- Technika naplánovaná na event si pamätá case, s ktorým bola pridaná ako celok,
-- rovnako ako položky výpožičky (0024).

alter table public.event_equipment
  add column case_id uuid,
  add foreign key (company_id, case_id) references public.cases (company_id, id) on delete set null (case_id);
create index event_equipment_case_idx on public.event_equipment (case_id) where case_id is not null;

-- =============================================================================
-- 0030_permissions.sql
-- =============================================================================

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

-- =============================================================================
-- 0031_vehicle_cargo.sql
-- =============================================================================

-- RigTrack: nákladný priestor vozidla.
-- Nosnosť, vnútorné rozmery a miesta, kam sa nakladať nedá (podbehy kolies, prepážka…).
-- Z týchto údajov a z rozmerov cases aplikácia navrhuje nakladanie na event.
-- Prekážka je kváder na podlahe: x = vzdialenosť od kabíny, y = od ľavej steny (cm).

alter table public.vehicles
  add column payload_kg integer check (payload_kg between 1 and 100000),
  add column cargo_length_cm integer check (cargo_length_cm between 1 and 2000),
  add column cargo_width_cm integer check (cargo_width_cm between 1 and 500),
  add column cargo_height_cm integer check (cargo_height_cm between 1 and 500),
  add column cargo_obstacles jsonb not null default '[]'
    check (jsonb_typeof(cargo_obstacles) = 'array' and jsonb_array_length(cargo_obstacles) <= 20);

grant update (payload_kg, cargo_length_cm, cargo_width_cm, cargo_height_cm, cargo_obstacles) on public.vehicles to authenticated;

-- =============================================================================
-- 0032_warehouse.sql
-- =============================================================================

-- RigTrack: plán skladu.
-- Pôdorys skladu (jeden na firmu) s miestami: regály, palety a voľné zóny. Každý case môže
-- mať miesto a pri regáli aj poschodie, takže na pláne vidno, kde čo leží.
-- Plán vidí každý člen; kreslí ho ten, kto spravuje zoznamy (lookups.manage);
-- case na miesto ukladá ten, kto smie upravovať cases.
-- Súradnice v cm: x zľava doprava, y zhora nadol.

create table public.warehouses (
  company_id uuid primary key references public.companies (id) on delete cascade,
  length_cm integer not null check (length_cm between 100 and 100000),
  width_cm integer not null check (width_cm between 100 and 100000)
);

create table public.warehouse_spots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  kind text not null default 'rack' check (kind in ('rack', 'pallet', 'zone')),
  x integer not null check (x >= 0),
  y integer not null check (y >= 0),
  length integer not null check (length > 0),
  width integer not null check (width > 0),
  -- Počet poschodí regála; paleta a zóna majú jedno.
  levels integer not null default 1 check (levels between 1 and 20),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create index warehouse_spots_company_idx on public.warehouse_spots (company_id);

alter table public.cases
  add column spot_id uuid,
  add column spot_level integer check (spot_level between 1 and 20),
  add foreign key (company_id, spot_id) references public.warehouse_spots (company_id, id) on delete set null (spot_id);
create index cases_spot_idx on public.cases (spot_id) where spot_id is not null;
grant update (spot_id, spot_level) on public.cases to authenticated;

alter table public.warehouses enable row level security;
alter table public.warehouse_spots enable row level security;

create policy warehouses_select on public.warehouses for select to authenticated
  using (public.is_company_member(company_id));
create policy warehouses_insert on public.warehouses for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy warehouses_update on public.warehouses for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));

create policy warehouse_spots_select on public.warehouse_spots for select to authenticated
  using (public.is_company_member(company_id));
create policy warehouse_spots_insert on public.warehouse_spots for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy warehouse_spots_update on public.warehouse_spots for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));
create policy warehouse_spots_delete on public.warehouse_spots for delete to authenticated
  using (public.can(company_id, 'lookups.manage'));

revoke all on public.warehouses, public.warehouse_spots from anon, authenticated;
grant select, insert on public.warehouses to authenticated;
grant update (length_cm, width_cm) on public.warehouses to authenticated;
grant select, insert, delete on public.warehouse_spots to authenticated;
grant update (name, kind, x, y, length, width, levels) on public.warehouse_spots to authenticated;

-- =============================================================================
-- 0033_custom_unit_ids.sql
-- =============================================================================

-- RigTrack: vlastné čísla kusov.
-- Technika evidovaná po kusoch nemusí mať čísla 1..počet. Keď sa kus #2 vyradí, ostatným
-- čísla ostávajú (napr. 1, 4, 8), takže sedia so štítkami na technike aj s históriou.
-- Prázdny zoznam znamená doterajšie správanie: kusy 1..počet.

alter table public.equipment add column unit_ids integer[] not null default '{}';
grant update (unit_ids) on public.equipment to authenticated;

/** Platné čísla kusov: vlastný zoznam, alebo 1..počet, ak zoznam nie je. */
create function public.unit_ids_of(_quantity integer, _unit_ids integer[])
returns integer[] language sql immutable set search_path = '' as $$
  select case
    when cardinality(_unit_ids) > 0 then _unit_ids
    else array(select generate_series(1, greatest(_quantity, 1)))
  end;
$$;
revoke execute on function public.unit_ids_of(integer, integer[]) from public, anon;
grant execute on function public.unit_ids_of(integer, integer[]) to authenticated;

-- Zoznam čísel sa uprace (bez duplicít, vzostupne) a počet kusov sa mu prispôsobí.
-- Technika na počet žiadne čísla nemá.
create function public.normalize_unit_ids()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not new.track_units then
    new.unit_ids := '{}';
  elsif cardinality(new.unit_ids) > 0 then
    new.unit_ids := array(select distinct u from unnest(new.unit_ids) u order by u);
    if exists (select 1 from unnest(new.unit_ids) u where u is null or u < 1 or u > 100000) then
      raise exception 'Čísla kusov musia byť od 1 do 100000' using errcode = 'check_violation';
    end if;
    new.quantity := cardinality(new.unit_ids);
  end if;
  return new;
end;
$$;

create trigger equipment_normalize_unit_ids
  before insert or update of unit_ids, quantity, track_units on public.equipment
  for each row execute function public.normalize_unit_ids();
revoke execute on function public.normalize_unit_ids() from public, anon;

-- Servis: rovnaké pravidlá ako v 0023, len kus musí byť z platných čísel techniky.
create or replace function public.check_service_units()
returns trigger language plpgsql set search_path = '' as $$
declare
  _valid integer[];
  _missing integer;
  _taken integer;
begin
  if cardinality(new.unit_numbers) = 0 then
    return new;
  end if;

  new.unit_numbers := array(select distinct u from unnest(new.unit_numbers) u order by u);
  if exists (select 1 from unnest(new.unit_numbers) u where u is null or u < 1) then
    raise exception 'Neplatné číslo kusu' using errcode = 'check_violation';
  end if;

  if new.status <> 'done' then
    select public.unit_ids_of(e.quantity, e.unit_ids) into _valid from public.equipment e
    where e.id = new.equipment_id and e.company_id = new.company_id;
    select u into _missing from unnest(new.unit_numbers) u where u <> all (_valid) order by u limit 1;
    if found then
      raise exception 'Technika má % ks, kus #% neexistuje', cardinality(_valid), _missing using errcode = 'check_violation';
    end if;

    select u into _taken
    from public.service_records s, unnest(s.unit_numbers) u
    where s.equipment_id = new.equipment_id and s.id <> new.id and s.status <> 'done'
      and u = any (new.unit_numbers)
    limit 1;
    if found then
      raise exception 'Kus #% už je v servise v inom zázname', _taken using errcode = 'check_violation';
    end if;
  end if;

  new.quantity := cardinality(new.unit_numbers);
  return new;
end;
$$;

-- Výpožičky: rovnaká funkcia ako v 0028, len kus musí byť z platných čísel techniky.
create or replace function public.add_loan_items(_company_id uuid, _loan_id uuid, _items jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  _starts date;
  _ends date;
  _item jsonb;
  _equipment public.equipment;
  _qty integer;
  _busy integer;
  _units integer[];
  _taken integer;
begin
  select l.starts_on, l.ends_on into _starts, _ends from public.loans l
  where l.id = _loan_id and l.company_id = _company_id;
  if not found then
    raise exception 'Výpožička neexistuje' using errcode = 'no_data_found';
  end if;
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    select * into _equipment from public.equipment e
    where e.company_id = _company_id and e.id = (_item ->> 'equipment_id')::uuid;
    if not found then
      raise exception 'Technika neexistuje' using errcode = 'no_data_found';
    end if;
    if _equipment.status = 'retired' then
      raise exception 'Technika „%“ je vyradená', _equipment.name using errcode = 'check_violation';
    end if;

    _units := '{}';
    if _equipment.track_units then
      if jsonb_typeof(_item -> 'unit_numbers') = 'array' then
        _units := array(select distinct u::integer from jsonb_array_elements_text(_item -> 'unit_numbers') u order by 1);
      end if;
      if cardinality(_units) = 0 then
        raise exception 'Pri technike „%“ vyberte konkrétne kusy', _equipment.name using errcode = 'check_violation';
      end if;
      if not (_units <@ public.unit_ids_of(_equipment.quantity, _equipment.unit_ids)) then
        raise exception 'Technika „%“ má iba kusy %', _equipment.name,
          array_to_string(public.unit_ids_of(_equipment.quantity, _equipment.unit_ids), ', ')
          using errcode = 'check_violation';
      end if;
      _qty := cardinality(_units);

      select u into _taken
      from public.loan_items li
      join public.loans l on l.id = li.loan_id
      cross join unnest(li.unit_numbers) u
      where li.equipment_id = _equipment.id
        and l.id <> _loan_id
        and l.status in ('reserved', 'issued')
        and l.starts_on <= _ends
        and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts
        and u = any (_units)
      limit 1;
      if found then
        raise exception 'Kus #% techniky „%“ je v tomto termíne už na inej výpožičke', _taken, _equipment.name
          using errcode = 'check_violation';
      end if;
    end if;

    select coalesce(sum(li.quantity), 0) into _busy
    from public.loan_items li
    join public.loans l on l.id = li.loan_id
    where li.equipment_id = _equipment.id
      and l.id <> _loan_id
      and l.status in ('reserved', 'issued')
      and l.starts_on <= _ends
      and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts;

    -- Technika naplánovaná na plánovaný alebo potvrdený event v tom istom termíne je tiež obsadená.
    select _busy + coalesce(sum(ee.quantity), 0) into _busy
    from public.event_equipment ee
    join public.events ev on ev.id = ee.event_id
    where ee.equipment_id = _equipment.id
      and ev.status in ('planned', 'confirmed')
      and ev.starts_on <= _ends
      and ev.ends_on >= _starts;

    if _busy + _qty > _equipment.quantity then
      raise exception 'Technika „%“ nie je v tomto termíne voľná (voľné % z % ks)',
        _equipment.name, greatest(_equipment.quantity - _busy, 0), _equipment.quantity
        using errcode = 'check_violation';
    end if;

    insert into public.loan_items (company_id, loan_id, equipment_id, quantity, case_id, unit_numbers, unit_price)
    values (
      _company_id, _loan_id, _equipment.id, _qty, nullif(_item ->> 'case_id', '')::uuid, _units,
      (_item ->> 'unit_price')::numeric
    );
  end loop;
end;
$$;

-- =============================================================================
-- 0034_case_templates.sql
-- =============================================================================

-- RigTrack: šablóny cases.
-- Typ case (napr. „Thon case 120“) s rozmermi a hmotnosťou sa zadá raz; nový case sa potom
-- založí výberom šablóny a rozmery sa doplnia samy. Šablóna je len predloha: neskoršia
-- zmena šablóny už existujúce cases nemení.
-- Vidí ich každý člen; spravuje ten, kto spravuje zoznamy (lookups.manage).

create table public.case_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  label_category text not null default '' check (char_length(label_category) <= 40),
  weight_kg numeric(7, 2) check (weight_kg > 0),
  width_cm numeric(7, 1) check (width_cm > 0),
  length_cm numeric(7, 1) check (length_cm > 0),
  depth_cm numeric(7, 1) check (depth_cm > 0),
  created_at timestamptz not null default now()
);
create unique index case_templates_name_idx on public.case_templates (company_id, lower(name));

alter table public.case_templates enable row level security;

create policy case_templates_select on public.case_templates for select to authenticated
  using (public.is_company_member(company_id));
create policy case_templates_insert on public.case_templates for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy case_templates_update on public.case_templates for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));
create policy case_templates_delete on public.case_templates for delete to authenticated
  using (public.can(company_id, 'lookups.manage'));

revoke all on public.case_templates from anon, authenticated;
grant select, insert, delete on public.case_templates to authenticated;
grant update (name, label_category, weight_kg, width_cm, length_cm, depth_cm) on public.case_templates to authenticated;

-- =============================================================================
-- 0035_loan_handover_names.sql
-- =============================================================================

-- RigTrack: kto techniku vydal a kto ju prijal späť.
-- Pri vydaní a pri vrátení výpožičky sa zapíše meno prihláseného používateľa, aby ho
-- zapožičacia listina vedela vytlačiť spolu s dátumom. Meno sa kopíruje (nie odkaz na
-- profil), takže na listine ostane, aj keď človek z firmy odíde.

alter table public.loans
  add column issued_by_name text not null default '',
  add column returned_by_name text not null default '';

create function public.stamp_loan_handover()
returns trigger language plpgsql set search_path = '' as $$
declare
  _name text;
begin
  if new.status is distinct from old.status and (new.status = 'issued' or old.status = 'issued') then
    select coalesce(nullif(trim(p.full_name), ''), p.email, '') into _name from public.profiles p where p.id = auth.uid();
    if new.status = 'issued' then
      new.issued_by_name := coalesce(_name, '');
    else
      new.returned_by_name := coalesce(_name, '');
    end if;
  end if;
  return new;
end;
$$;

create trigger loans_stamp_handover
  before update of status on public.loans
  for each row execute function public.stamp_loan_handover();

revoke execute on function public.stamp_loan_handover() from public, anon;

-- =============================================================================
-- 0036_recycle_bin.sql
-- =============================================================================

-- RigTrack: kôš.
-- Zmazanie techniky (zariadenie, položka, spotrebný materiál), case, fotky alebo dokumentu
-- záznam nezničí, len ho označí ako zmazaný. Bežné dotazy ho potom nevidia (stráži to RLS),
-- história, výpožičky aj servis ostávajú. Admin ho môže 30 dní obnoviť, alebo zmazať natrvalo.
--
-- Do koša sa hádže cez funkcie trash_*: kontrolujú tie isté oprávnenia ako doterajšie mazanie.
-- Sú SECURITY DEFINER, lebo riadok po označení prestane byť pre volajúceho viditeľný.

alter table public.equipment
  add column deleted_at timestamptz,
  add column deleted_by_name text not null default '';
alter table public.cases
  add column deleted_at timestamptz,
  add column deleted_by_name text not null default '',
  -- Čo v case bolo, keď išiel do koša; pri obnove sa to doň vráti.
  add column trashed_content uuid[] not null default '{}';
alter table public.event_documents
  add column deleted_at timestamptz,
  add column deleted_by_name text not null default '';
alter table public.attachments
  add column deleted_at timestamptz,
  add column deleted_by_name text not null default '';

-- Fotka nie je samostatný záznam, len cesta v riadku majiteľa; v koši preto má vlastný riadok.
create table public.trashed_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  owner_table text not null check (owner_table in ('equipment', 'vehicles', 'cases')),
  owner_id uuid not null,
  path text not null check (char_length(path) <= 300),
  label text not null default '',
  deleted_at timestamptz not null default now(),
  deleted_by_name text not null default ''
);
create index trashed_photos_company_idx on public.trashed_photos (company_id, deleted_at);
alter table public.trashed_photos enable row level security;
revoke all on public.trashed_photos from anon, authenticated;
-- Žiadna politika ani grant: k tabuľke sa pristupuje len cez funkcie nižšie.

create index equipment_deleted_idx on public.equipment (company_id, deleted_at) where deleted_at is not null;
create index cases_deleted_idx on public.cases (company_id, deleted_at) where deleted_at is not null;

-- Zmazaný záznam nesmie blokovať označenie pre nový; obnova s kolíziou zlyhá s jasnou chybou.
drop index public.equipment_inventory_number_idx;
create unique index equipment_inventory_number_idx on public.equipment (company_id, lower(inventory_number))
  where inventory_number <> '' and deleted_at is null;
drop index public.cases_inventory_number_idx;
create unique index cases_inventory_number_idx on public.cases (company_id, lower(inventory_number))
  where inventory_number <> '' and deleted_at is null;

-- Zmazané záznamy nevidí nikto, ani admin: kôš sa číta funkciou recycle_bin_items().
alter policy equipment_select on public.equipment
  using (public.can(company_id, 'equipment.view') and deleted_at is null);
alter policy cases_select on public.cases
  using (public.can(company_id, 'cases.view') and deleted_at is null);
alter policy event_documents_select on public.event_documents
  using (public.can(company_id, 'events.view') and deleted_at is null);
alter policy attachments_select on public.attachments
  using (
    public.can(company_id, case entity_type when 'service' then 'service.view' else 'vehicles.view' end)
    and deleted_at is null
  );

create function public.actor_name()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
$$;
revoke execute on function public.actor_name() from public, anon;

-- ---------------------------------------------------------------------------
-- Hodenie do koša
-- ---------------------------------------------------------------------------

create function public.trash_equipment(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.equipment set deleted_at = now(), deleted_by_name = public.actor_name()
  where id = _id and deleted_at is null and public.can(company_id, 'equipment.delete');
  if not found then
    raise exception 'Techniku sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- Case si zapamätá svoj obsah a technika sa z neho vyberie, aby neostala „v case, ktorý nie je“.
create function public.trash_case(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.cases c
  set deleted_at = now(), deleted_by_name = public.actor_name(),
      trashed_content = array(select e.id from public.equipment e where e.case_id = c.id)
  where c.id = _id and c.deleted_at is null and public.can(c.company_id, 'cases.delete');
  if not found then
    raise exception 'Case sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
  update public.equipment set case_id = null where case_id = _id;
end;
$$;

create function public.trash_event_document(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.event_documents set deleted_at = now(), deleted_by_name = public.actor_name()
  where id = _id and deleted_at is null and public.can(company_id, 'events.edit');
  if not found then
    raise exception 'Dokument sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

create function public.trash_attachment(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.attachments set deleted_at = now(), deleted_by_name = public.actor_name()
  where id = _id and deleted_at is null
    and public.can(company_id, case entity_type when 'service' then 'service.edit' else 'vehicles.log' end);
  if not found then
    raise exception 'Prílohu sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- Fotka techniky, vozidla alebo vlastná fotka na štítku case: cesta sa presunie do koša.
create function public.trash_photo(_owner_table text, _owner_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _path text;
  _label text;
begin
  if _owner_table = 'equipment' then
    select company_id, photo_path, name into _company, _path, _label from public.equipment
    where id = _owner_id and deleted_at is null and public.can(company_id, 'equipment.edit');
  elsif _owner_table = 'vehicles' then
    select company_id, photo_path, plate into _company, _path, _label from public.vehicles
    where id = _owner_id and public.can(company_id, 'vehicles.edit');
  elsif _owner_table = 'cases' then
    select company_id, label_photo_path, name into _company, _path, _label from public.cases
    where id = _owner_id and deleted_at is null and public.can(company_id, 'cases.edit');
  end if;
  if _company is null or coalesce(_path, '') = '' then
    raise exception 'Fotku sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;

  insert into public.trashed_photos (company_id, owner_table, owner_id, path, label, deleted_by_name)
  values (_company, _owner_table, _owner_id, _path, _label, public.actor_name());
  if _owner_table = 'equipment' then
    update public.equipment set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'vehicles' then
    update public.vehicles set photo_path = '' where id = _owner_id;
  else
    update public.cases set label_photo_path = '' where id = _owner_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Kôš: prehľad, obnova a trvalé zmazanie. Iba admin firmy.
-- ---------------------------------------------------------------------------

create function public.recycle_bin_items(_company_id uuid)
returns table (kind text, id uuid, label text, detail text, deleted_at timestamptz, deleted_by_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kôš môže otvoriť iba admin' using errcode = 'insufficient_privilege';
  end if;
  return query
    select case when e.kind = 'consumable' then 'consumable' else 'equipment' end, e.id, e.name,
      concat_ws(' · ', nullif(trim(e.manufacturer || ' ' || e.model), ''), nullif(e.inventory_number, ''), e.quantity || ' ks'),
      e.deleted_at, e.deleted_by_name
    from public.equipment e where e.company_id = _company_id and e.deleted_at is not null
    union all
    select 'case', c.id, c.name,
      concat_ws(' · ', nullif(c.inventory_number, ''), 'položiek v obsahu: ' || cardinality(c.trashed_content)),
      c.deleted_at, c.deleted_by_name
    from public.cases c where c.company_id = _company_id and c.deleted_at is not null
    union all
    select 'event_document', d.id, d.name, 'dokument eventu: ' || coalesce(ev.name, ''), d.deleted_at, d.deleted_by_name
    from public.event_documents d left join public.events ev on ev.id = d.event_id
    where d.company_id = _company_id and d.deleted_at is not null
    union all
    select 'attachment', a.id, a.name, case a.entity_type when 'service' then 'príloha servisného záznamu' else 'príloha vozidla' end,
      a.deleted_at, a.deleted_by_name
    from public.attachments a where a.company_id = _company_id and a.deleted_at is not null
    union all
    select 'photo', p.id, p.label,
      case p.owner_table when 'equipment' then 'fotka techniky' when 'vehicles' then 'fotka vozidla' else 'fotka na štítku case' end,
      p.deleted_at, p.deleted_by_name
    from public.trashed_photos p where p.company_id = _company_id
    order by 5 desc;
end;
$$;

create function public.restore_bin_item(_company_id uuid, _kind text, _id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _photo public.trashed_photos;
  _restored integer;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Z koša môže obnovovať iba admin' using errcode = 'insufficient_privilege';
  end if;

  if _kind in ('equipment', 'consumable') then
    update public.equipment set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'case' then
    update public.cases set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
    get diagnostics _restored = row_count;
    -- Obsah sa vráti, pokiaľ ho medzitým niekto nedal do iného case.
    update public.equipment e set case_id = _id
    from public.cases c
    where c.id = _id and _restored = 1 and e.id = any (c.trashed_content) and e.case_id is null and e.company_id = _company_id;
    update public.cases set trashed_content = '{}' where id = _id and _restored = 1;
    if _restored = 0 then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    return;
  elsif _kind = 'event_document' then
    update public.event_documents set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'attachment' then
    update public.attachments set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'photo' then
    select * into _photo from public.trashed_photos where id = _id and company_id = _company_id;
    if not found then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    -- Fotka sa vráti len na prázdne miesto; novšiu fotku neprepíše.
    if _photo.owner_table = 'equipment' then
      update public.equipment set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'vehicles' then
      update public.vehicles set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    else
      update public.cases set label_photo_path = _photo.path where id = _photo.owner_id and label_photo_path = '';
    end if;
    if not found then
      raise exception 'Fotku nemožno obnoviť: záznam už má inú fotku alebo neexistuje' using errcode = 'check_violation';
    end if;
    delete from public.trashed_photos where id = _id;
    return;
  else
    raise exception 'Neznámy druh položky' using errcode = 'check_violation';
  end if;

  if not found then
    raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Natrvalo zmaže položky z koša a vráti súbory, ktoré po nich treba odstrániť zo Storage
-- (to databáza sama nevie). _mode: 'expired' = staršie než 30 dní, 'all' = celý kôš,
-- 'one' = jedna položka (_kind, _id).
create function public.purge_bin(_company_id uuid, _mode text, _kind text default null, _id uuid default null)
returns table (bucket text, path text)
language plpgsql security definer set search_path = '' as $$
declare
  _before timestamptz := case when _mode = 'expired' then now() - interval '30 days' else 'infinity'::timestamptz end;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kôš môže vyprázdniť iba admin' using errcode = 'insufficient_privilege';
  end if;
  if _mode not in ('expired', 'all', 'one') or (_mode = 'one' and (_kind is null or _id is null)) then
    raise exception 'Neplatná požiadavka' using errcode = 'check_violation';
  end if;

  create temporary table if not exists _purged_files (bucket text, path text) on commit drop;
  delete from _purged_files;

  -- Technika: s ňou zanikne jej fotka aj prílohy naviazaných záznamov riešia kaskády.
  with gone as (
    delete from public.equipment e
    where e.company_id = _company_id and e.deleted_at is not null and e.deleted_at < _before
      and (_mode <> 'one' or (_kind in ('equipment', 'consumable') and e.id = _id))
    returning e.photo_path
  )
  insert into _purged_files select 'equipment-photos', g.photo_path from gone g where g.photo_path <> '';

  with gone as (
    delete from public.cases c
    where c.company_id = _company_id and c.deleted_at is not null and c.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'case' and c.id = _id))
    returning c.label_photo_path
  )
  insert into _purged_files select 'equipment-photos', g.label_photo_path from gone g where g.label_photo_path <> '';

  with gone as (
    delete from public.event_documents d
    where d.company_id = _company_id and d.deleted_at is not null and d.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'event_document' and d.id = _id))
    returning d.path
  )
  insert into _purged_files select 'event-documents', g.path from gone g;

  with gone as (
    delete from public.attachments a
    where a.company_id = _company_id and a.deleted_at is not null and a.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'attachment' and a.id = _id))
    returning a.path
  )
  insert into _purged_files select 'attachments', g.path from gone g;

  with gone as (
    delete from public.trashed_photos p
    where p.company_id = _company_id and p.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'photo' and p.id = _id))
    returning p.path
  )
  insert into _purged_files select 'equipment-photos', g.path from gone g;

  return query select f.bucket, f.path from _purged_files f;
end;
$$;

revoke execute on function
  public.trash_equipment(uuid), public.trash_case(uuid), public.trash_event_document(uuid), public.trash_attachment(uuid),
  public.trash_photo(text, uuid), public.recycle_bin_items(uuid), public.restore_bin_item(uuid, text, uuid),
  public.purge_bin(uuid, text, text, uuid)
  from public, anon;
grant execute on function
  public.trash_equipment(uuid), public.trash_case(uuid), public.trash_event_document(uuid), public.trash_attachment(uuid),
  public.trash_photo(text, uuid), public.recycle_bin_items(uuid), public.restore_bin_item(uuid, text, uuid),
  public.purge_bin(uuid, text, text, uuid)
  to authenticated;

-- =============================================================================
-- 0037_marketplace_purchases.sql
-- =============================================================================

-- RigTrack: nákupy z bazárov a inzerátov (Bazoš, Kleinanzeigen, Willhaben, eBay…) a fotka nákupu.
-- Objednávka má zdroj: obchod, alebo bazár/inzerát. Pri bazári je dodávateľ portál
-- (napr. Bazoš.sk) a k tomu meno predajcu. Každý nákup môže mať nepovinnú fotku.
--
-- Dá sa spustiť aj po staršej verzii tejto migrácie (s odkazom na inzerát): odkaz zmaže.

-- Pohľady sa skladajú nanovo, lebo staršia verzia mala v orders_overview odkaz na inzerát.
drop view if exists public.orders_overview;
drop view if exists public.equipment_purchases;
drop view if exists public.order_lines;

alter table public.orders
  add column if not exists source text not null default 'shop' check (source in ('shop', 'marketplace')),
  add column if not exists seller text not null default '' check (char_length(seller) <= 120),
  add column if not exists photo_path text not null default '' check (char_length(photo_path) <= 300),
  drop column if exists listing_url;
grant update (photo_path) on public.orders to authenticated;

create view public.orders_overview with (security_invoker = true) as
select
  o.id, o.company_id, o.supplier, o.order_number, o.ordered_at, o.currency, o.note,
  count(i.id)::integer as item_count,
  coalesce(sum(i.quantity * i.unit_price), 0)::numeric(14, 2) as total,
  o.source, o.seller, o.photo_path
from public.orders o
left join public.order_items i on i.order_id = o.id
group by o.id;

create view public.equipment_purchases with (security_invoker = true) as
select
  l.company_id, l.equipment_id, l.order_item_id, l.quantity,
  i.name as item_name, i.unit_price,
  o.id as order_id, o.supplier, o.order_number, o.ordered_at, o.currency,
  i.article_number,
  o.source, o.seller
from public.order_item_equipment l
join public.order_items i on i.id = l.order_item_id
join public.orders o on o.id = i.order_id;

create view public.order_lines with (security_invoker = true) as
select
  i.id, i.company_id, i.order_id, i.name, i.article_number, i.quantity, i.unit_price, i.mode, i.category_id,
  o.supplier, o.order_number, o.ordered_at, o.currency,
  o.source
from public.order_items i
join public.orders o on o.id = i.order_id;

revoke all on public.orders_overview, public.equipment_purchases, public.order_lines from anon, authenticated;
grant select on public.orders_overview, public.equipment_purchases, public.order_lines to authenticated;

-- Rovnaká funkcia ako v 0007; navyše ukladá zdroj a predajcu.
create or replace function public.create_order(_company_id uuid, _order jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _order_id uuid;
  _item jsonb;
  _item_id uuid;
  _equipment_id uuid;
  _equipment_name text;
  _category_id uuid;
  _kind text;
  _attributes jsonb;
  _qty integer;
  _mode text;
  _position integer := 0;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Objednávka musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.orders (company_id, supplier, order_number, ordered_at, currency, note, source, seller)
  values (
    _company_id,
    trim(_order ->> 'supplier'),
    coalesce(trim(_order ->> 'order_number'), ''),
    coalesce((_order ->> 'ordered_at')::date, current_date),
    coalesce(_order ->> 'currency', 'EUR'),
    coalesce(trim(_order ->> 'note'), ''),
    coalesce(nullif(_order ->> 'source', ''), 'shop'),
    coalesce(trim(_order ->> 'seller'), '')
  )
  returning id into _order_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    _mode := coalesce(_item ->> 'mode', 'none');
    _category_id := nullif(_item ->> 'category_id', '')::uuid;
    _kind := coalesce(nullif(_item ->> 'kind', ''), 'general');
    _attributes := coalesce(_item -> 'attributes', '{}'::jsonb);

    insert into public.order_items (company_id, order_id, position, name, quantity, unit_price, article_number, mode, category_id)
    values (
      _company_id, _order_id, _position, trim(_item ->> 'name'), _qty,
      coalesce((_item ->> 'unit_price')::numeric, 0),
      coalesce(trim(_item ->> 'article_number'), ''),
      _mode, _category_id
    )
    returning id into _item_id;
    _position := _position + 1;

    _equipment_name := left(coalesce(nullif(trim(_item ->> 'equipment_name'), ''), trim(_item ->> 'name')), 120);

    if _mode = 'separate' then
      if _qty > 200 then
        raise exception 'Samostatne možno naraz založiť najviac 200 kusov' using errcode = 'check_violation';
      end if;
      for _n in 1 .. _qty loop
        insert into public.equipment (company_id, name, category_id, kind, attributes)
        values (_company_id, _equipment_name, _category_id, _kind, _attributes)
        returning id into _equipment_id;
        insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
        values (_company_id, _item_id, _equipment_id, 1);
      end loop;
    elsif _mode = 'bulk' then
      insert into public.equipment (company_id, name, category_id, kind, attributes, quantity)
      values (_company_id, _equipment_name, _category_id, _kind, _attributes, _qty)
      returning id into _equipment_id;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode = 'existing' then
      update public.equipment set quantity = quantity + _qty
      where company_id = _company_id and id = (_item ->> 'equipment_id')::uuid
      returning id into _equipment_id;
      if _equipment_id is null then
        raise exception 'Technika na doplnenie neexistuje' using errcode = 'no_data_found';
      end if;
      insert into public.order_item_equipment (company_id, order_item_id, equipment_id, quantity)
      values (_company_id, _item_id, _equipment_id, _qty);
    elsif _mode <> 'none' then
      raise exception 'Neznámy režim položky: %', _mode using errcode = 'check_violation';
    end if;
  end loop;

  return _order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fotka nákupu ide pri odstránení do koša ako ostatné fotky (funkcie z 0036).
-- ---------------------------------------------------------------------------

alter table public.trashed_photos drop constraint if exists trashed_photos_owner_table_check;
alter table public.trashed_photos
  add constraint trashed_photos_owner_table_check check (owner_table in ('equipment', 'vehicles', 'cases', 'orders'));

create or replace function public.trash_photo(_owner_table text, _owner_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _path text;
  _label text;
begin
  if _owner_table = 'equipment' then
    select company_id, photo_path, name into _company, _path, _label from public.equipment
    where id = _owner_id and deleted_at is null and public.can(company_id, 'equipment.edit');
  elsif _owner_table = 'vehicles' then
    select company_id, photo_path, plate into _company, _path, _label from public.vehicles
    where id = _owner_id and public.can(company_id, 'vehicles.edit');
  elsif _owner_table = 'cases' then
    select company_id, label_photo_path, name into _company, _path, _label from public.cases
    where id = _owner_id and deleted_at is null and public.can(company_id, 'cases.edit');
  elsif _owner_table = 'orders' then
    select company_id, photo_path, supplier into _company, _path, _label from public.orders
    where id = _owner_id and public.can(company_id, 'orders.edit');
  end if;
  if _company is null or coalesce(_path, '') = '' then
    raise exception 'Fotku sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;

  insert into public.trashed_photos (company_id, owner_table, owner_id, path, label, deleted_by_name)
  values (_company, _owner_table, _owner_id, _path, _label, public.actor_name());
  if _owner_table = 'equipment' then
    update public.equipment set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'vehicles' then
    update public.vehicles set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'orders' then
    update public.orders set photo_path = '' where id = _owner_id;
  else
    update public.cases set label_photo_path = '' where id = _owner_id;
  end if;
end;
$$;

create or replace function public.recycle_bin_items(_company_id uuid)
returns table (kind text, id uuid, label text, detail text, deleted_at timestamptz, deleted_by_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kôš môže otvoriť iba admin' using errcode = 'insufficient_privilege';
  end if;
  return query
    select case when e.kind = 'consumable' then 'consumable' else 'equipment' end, e.id, e.name,
      concat_ws(' · ', nullif(trim(e.manufacturer || ' ' || e.model), ''), nullif(e.inventory_number, ''), e.quantity || ' ks'),
      e.deleted_at, e.deleted_by_name
    from public.equipment e where e.company_id = _company_id and e.deleted_at is not null
    union all
    select 'case', c.id, c.name,
      concat_ws(' · ', nullif(c.inventory_number, ''), 'položiek v obsahu: ' || cardinality(c.trashed_content)),
      c.deleted_at, c.deleted_by_name
    from public.cases c where c.company_id = _company_id and c.deleted_at is not null
    union all
    select 'event_document', d.id, d.name, 'dokument eventu: ' || coalesce(ev.name, ''), d.deleted_at, d.deleted_by_name
    from public.event_documents d left join public.events ev on ev.id = d.event_id
    where d.company_id = _company_id and d.deleted_at is not null
    union all
    select 'attachment', a.id, a.name, case a.entity_type when 'service' then 'príloha servisného záznamu' else 'príloha vozidla' end,
      a.deleted_at, a.deleted_by_name
    from public.attachments a where a.company_id = _company_id and a.deleted_at is not null
    union all
    select 'photo', p.id, p.label,
      case p.owner_table when 'equipment' then 'fotka techniky' when 'vehicles' then 'fotka vozidla'
        when 'orders' then 'fotka nákupu' else 'fotka na štítku case' end,
      p.deleted_at, p.deleted_by_name
    from public.trashed_photos p where p.company_id = _company_id
    order by 5 desc;
end;
$$;

create or replace function public.restore_bin_item(_company_id uuid, _kind text, _id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _photo public.trashed_photos;
  _restored integer;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Z koša môže obnovovať iba admin' using errcode = 'insufficient_privilege';
  end if;

  if _kind in ('equipment', 'consumable') then
    update public.equipment set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'case' then
    update public.cases set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
    get diagnostics _restored = row_count;
    -- Obsah sa vráti, pokiaľ ho medzitým niekto nedal do iného case.
    update public.equipment e set case_id = _id
    from public.cases c
    where c.id = _id and _restored = 1 and e.id = any (c.trashed_content) and e.case_id is null and e.company_id = _company_id;
    update public.cases set trashed_content = '{}' where id = _id and _restored = 1;
    if _restored = 0 then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    return;
  elsif _kind = 'event_document' then
    update public.event_documents set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'attachment' then
    update public.attachments set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'photo' then
    select * into _photo from public.trashed_photos where id = _id and company_id = _company_id;
    if not found then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    -- Fotka sa vráti len na prázdne miesto; novšiu fotku neprepíše.
    if _photo.owner_table = 'equipment' then
      update public.equipment set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'vehicles' then
      update public.vehicles set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'orders' then
      update public.orders set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    else
      update public.cases set label_photo_path = _photo.path where id = _photo.owner_id and label_photo_path = '';
    end if;
    if not found then
      raise exception 'Fotku nemožno obnoviť: záznam už má inú fotku alebo neexistuje' using errcode = 'check_violation';
    end if;
    delete from public.trashed_photos where id = _id;
    return;
  else
    raise exception 'Neznámy druh položky' using errcode = 'check_violation';
  end if;

  if not found then
    raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
  end if;
end;
$$;

-- =============================================================================
-- 0038_event_details.sql
-- =============================================================================

-- RigTrack: podrobnosti eventu pre tlač a fotky eventu.
-- Organizátor s kontaktom, popis akcie a časy (príchod/stavba, začiatok a koniec programu).
-- Fotky eventu (pódium, miesto, príjazd…) sú súbory v buckete event-documents ako dokumenty,
-- len s príznakom is_photo; mažú sa do koša rovnako.

alter table public.events
  add column organizer text not null default '' check (char_length(organizer) <= 120),
  add column organizer_person text not null default '' check (char_length(organizer_person) <= 120),
  add column organizer_phone text not null default '' check (char_length(organizer_phone) <= 40),
  add column organizer_email text not null default '' check (char_length(organizer_email) <= 120),
  add column description text not null default '' check (char_length(description) <= 8000),
  -- Časy platia pre prvý deň eventu.
  add column get_in_time time,
  add column show_time time,
  add column show_end_time time;

grant update (organizer, organizer_person, organizer_phone, organizer_email, description, get_in_time, show_time, show_end_time)
  on public.events to authenticated;

alter table public.event_documents add column is_photo boolean not null default false;

-- Kôš rozlíši fotku eventu od dokumentu (inak rovnaká funkcia ako v 0037).
create or replace function public.recycle_bin_items(_company_id uuid)
returns table (kind text, id uuid, label text, detail text, deleted_at timestamptz, deleted_by_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kôš môže otvoriť iba admin' using errcode = 'insufficient_privilege';
  end if;
  return query
    select case when e.kind = 'consumable' then 'consumable' else 'equipment' end, e.id, e.name,
      concat_ws(' · ', nullif(trim(e.manufacturer || ' ' || e.model), ''), nullif(e.inventory_number, ''), e.quantity || ' ks'),
      e.deleted_at, e.deleted_by_name
    from public.equipment e where e.company_id = _company_id and e.deleted_at is not null
    union all
    select 'case', c.id, c.name,
      concat_ws(' · ', nullif(c.inventory_number, ''), 'položiek v obsahu: ' || cardinality(c.trashed_content)),
      c.deleted_at, c.deleted_by_name
    from public.cases c where c.company_id = _company_id and c.deleted_at is not null
    union all
    select 'event_document', d.id, d.name,
      case when d.is_photo then 'fotka eventu: ' else 'dokument eventu: ' end || coalesce(ev.name, ''), d.deleted_at, d.deleted_by_name
    from public.event_documents d left join public.events ev on ev.id = d.event_id
    where d.company_id = _company_id and d.deleted_at is not null
    union all
    select 'attachment', a.id, a.name, case a.entity_type when 'service' then 'príloha servisného záznamu' else 'príloha vozidla' end,
      a.deleted_at, a.deleted_by_name
    from public.attachments a where a.company_id = _company_id and a.deleted_at is not null
    union all
    select 'photo', p.id, p.label,
      case p.owner_table when 'equipment' then 'fotka techniky' when 'vehicles' then 'fotka vozidla'
        when 'orders' then 'fotka nákupu' else 'fotka na štítku case' end,
      p.deleted_at, p.deleted_by_name
    from public.trashed_photos p where p.company_id = _company_id
    order by 5 desc;
end;
$$;

-- =============================================================================
-- 0039_stage_settings.sql
-- =============================================================================

-- RigTrack: nastavenie pódiového systému (napr. Nivtec) pre kalkulačku pódia.
-- Jeden záznam na firmu: z akých dielov sa pódium skladá (dosky 2×1 a 1×1 m, nohy podľa výšky,
-- plachty, štipce na plachtu, zábradlia a spojky) a ku ktorej technike v evidencii patria.
-- Obsah je JSON, overuje ho aplikácia; databáza stráži len prístup a rozumnú veľkosť.
-- Vidí ho každý člen; mení ten, kto spravuje zoznamy (lookups.manage).

create table public.stage_settings (
  company_id uuid primary key references public.companies (id) on delete cascade,
  config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(config) = 'object' and pg_column_size(config) <= 20000),
  updated_at timestamptz not null default now()
);

create trigger stage_settings_touch_updated_at
  before update on public.stage_settings
  for each row execute function public.touch_updated_at();

alter table public.stage_settings enable row level security;

create policy stage_settings_select on public.stage_settings for select to authenticated
  using (public.is_company_member(company_id));
create policy stage_settings_insert on public.stage_settings for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy stage_settings_update on public.stage_settings for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));

revoke all on public.stage_settings from anon, authenticated;
grant select, insert on public.stage_settings to authenticated;
grant update (config) on public.stage_settings to authenticated;

-- =============================================================================
-- 0040_equipment_aliases.sql
-- =============================================================================

-- RigTrack: zapamätané názvy techniky z cudzích zoznamov (napr. Equipment Report z Capture).
-- Keď sa pri importe na event raz potvrdí, že „Clay Paky Sharpy“ je naša technika X,
-- pri ďalšom importe sa to priradí samo. Alias je normalizovaný názov (malé písmená, bez diakritiky).
-- Vidí ich každý člen; mení ten, kto smie upravovať eventy.

create table public.equipment_aliases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 200),
  equipment_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade,
  unique (company_id, alias)
);

alter table public.equipment_aliases enable row level security;

create policy equipment_aliases_select on public.equipment_aliases for select to authenticated
  using (public.is_company_member(company_id));
create policy equipment_aliases_insert on public.equipment_aliases for insert to authenticated
  with check (public.can(company_id, 'events.edit'));
create policy equipment_aliases_delete on public.equipment_aliases for delete to authenticated
  using (public.can(company_id, 'events.edit'));

revoke all on public.equipment_aliases from anon, authenticated;
grant select, insert, delete on public.equipment_aliases to authenticated;

-- =============================================================================
-- 0041_demo_company.sql
-- =============================================================================

-- RigTrack: demo firma pre každého používateľa.
-- Každý si môže založiť vlastnú ukážkovú firmu s vymyslenou technikou, cases, eventmi,
-- výpožičkou, vozidlom a úlohami, skúšať na nej čokoľvek a v nastaveniach ju vrátiť
-- do pôvodného stavu (reset) alebo zmazať. Ostatné firmy to nijako neovplyvní.

alter table public.companies
  add column demo_owner uuid references public.profiles (id) on delete cascade;
create unique index companies_demo_owner_idx on public.companies (demo_owner) where demo_owner is not null;

-- Naplnenie demo firmy. Interná funkcia: volajú ju len funkcie nižšie.
create function public.seed_demo_company(_company uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _light uuid;
  _audio uuid;
  _cables uuid;
  _stage uuid;
  _store uuid;
  _van uuid;
  _case_audio uuid;
  _case_light uuid;
  _case_cables uuid;
  _mixer uuid;
  _sharpy uuid;
  _par uuid;
  _speaker uuid;
  _sub uuid;
  _mic uuid;
  _di uuid;
  _xlr10 uuid;
  _xlr5 uuid;
  _dmx uuid;
  _deck uuid;
  _event_next uuid;
  _event_past uuid;
  _loan uuid;
begin
  insert into public.equipment_categories (company_id, name) values (_company, 'Svetlá') returning id into _light;
  insert into public.equipment_categories (company_id, name) values (_company, 'Zvuk') returning id into _audio;
  insert into public.equipment_categories (company_id, name) values (_company, 'Káble') returning id into _cables;
  insert into public.equipment_categories (company_id, name) values (_company, 'Pódium') returning id into _stage;
  insert into public.locations (company_id, name) values (_company, 'Sklad – regál A') returning id into _store;
  insert into public.locations (company_id, name) values (_company, 'Dodávka') returning id into _van;

  insert into public.cases (company_id, name, inventory_number, location_id) values (_company, 'Audio case 1', 'C-01', _store) returning id into _case_audio;
  insert into public.cases (company_id, name, inventory_number, location_id) values (_company, 'Sharpy case', 'C-02', _store) returning id into _case_light;
  insert into public.cases (company_id, name, inventory_number, location_id) values (_company, 'Káble XLR', 'C-03', _store) returning id into _case_cables;

  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, ip_address, attributes)
  values (_company, 'Mixpult X32 Rack', 'audio', _audio, _case_audio, 1, 'Behringer', 'X32 Rack', 60, '192.168.1.10', '{"audioType": "mixer"}')
  returning id into _mixer;
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, ip_address, attributes)
  values (_company, 'Stagebox S16', 'audio', _audio, _case_audio, 1, 'Behringer', 'S16', 25, '192.168.1.11', '{"audioType": "stagebox"}');
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, attributes)
  values (_company, 'DI box', 'audio', _audio, _case_audio, 4, 'Palmer', 'PAN 01', 3, '{"audioType": "di"}') returning id into _di;
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, attributes)
  values (_company, 'Mikrofón SM58', 'audio', _audio, _case_audio, 6, 'Shure', 'SM58', 4, '{"audioType": "microphone"}') returning id into _mic;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, attributes, track_units)
  values (_company, 'Reprobox K12.2', 'audio', _audio, _store, 4, 'QSC', 'K12.2', 35, '{"audioType": "speaker", "powerW": 2000}', true)
  returning id into _speaker;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, attributes, track_units)
  values (_company, 'Subwoofer KS118', 'audio', _audio, _store, 2, 'QSC', 'KS118', 45, '{"audioType": "subwoofer", "powerW": 3600}', true)
  returning id into _sub;

  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, manufacturer, model, rental_price, track_units, attributes)
  values (_company, 'Sharpy', 'light', _light, _case_light, 4, 'Clay Paky', 'Sharpy', 40, true,
    '{"powerW": 350, "lightSource": "discharge", "dmxModes": [{"name": "Standard", "channels": 16}, {"name": "Vector", "channels": 24}]}')
  returning id into _sharpy;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, track_units, attributes)
  values (_company, 'LED Par 18x10W', 'light', _light, _store, 12, 'Stairville', 'LED Par 18x10', 8, true,
    '{"powerW": 180, "lightSource": "led", "dmxModes": [{"name": "Basic", "channels": 3}, {"name": "Full", "channels": 8}]}')
  returning id into _par;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price, attributes)
  values (_company, 'Hazer', 'light', _light, _store, 1, 'Smoke Factory', 'Tour-Hazer II', 30, '{"powerW": 1500}');

  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, rental_price, attributes)
  values (_company, 'XLR kábel 10 m', 'cable', _cables, _case_cables, 12, 1, '{"connector": "XLR", "lengthM": 10}') returning id into _xlr10;
  insert into public.equipment (company_id, name, kind, category_id, case_id, quantity, rental_price, attributes)
  values (_company, 'XLR kábel 5 m', 'cable', _cables, _case_cables, 10, 1, '{"connector": "XLR", "lengthM": 5}') returning id into _xlr5;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, rental_price, attributes)
  values (_company, 'DMX kábel 10 m', 'cable', _cables, _store, 8, 1, '{"connector": "DMX 3-pin", "lengthM": 10}') returning id into _dmx;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, model, rental_price)
  values (_company, 'Pódiová doska 2×1 m', 'general', _stage, _store, 24, 'Nivtec', 'Deck 2x1', 15) returning id into _deck;
  insert into public.equipment (company_id, name, kind, category_id, location_id, quantity, manufacturer, rental_price)
  values (_company, 'Noha pódia 60 cm', 'general', _stage, _store, 96, 'Nivtec', 1);

  insert into public.case_checks (company_id, case_id, checked_at, checked_by_name, note)
  values (_company, _case_audio, now() - interval '40 days', 'Demo', 'Všetko na mieste');

  insert into public.events (company_id, name, client, venue, starts_on, ends_on, status, organizer, organizer_phone, description, get_in_time, show_time, show_end_time)
  values (_company, 'Letný festival', 'Mesto Ukážkovo', 'Amfiteáter Ukážkovo', current_date + 10, current_date + 11, 'confirmed',
    'Mesto Ukážkovo', '+421 900 000 000', 'Open air, dve kapely a DJ. Prípojka 32 A pri pódiu.', '12:00', '18:00', '23:30')
  returning id into _event_next;
  insert into public.event_equipment (company_id, event_id, equipment_id, quantity, case_id) values
    (_company, _event_next, _mixer, 1, _case_audio),
    (_company, _event_next, _di, 4, _case_audio),
    (_company, _event_next, _mic, 6, _case_audio);
  insert into public.event_equipment (company_id, event_id, equipment_id, quantity) values
    (_company, _event_next, _speaker, 4),
    (_company, _event_next, _sub, 2),
    (_company, _event_next, _par, 8);
  insert into public.event_crew (company_id, event_id, name, role) values
    (_company, _event_next, 'Peter Zvukár', 'FOH'),
    (_company, _event_next, 'Jana Svetlárka', 'Svetlá');

  insert into public.events (company_id, name, venue, starts_on, ends_on, status)
  values (_company, 'Firemný večierok', 'Hotel Demo', current_date - 20, current_date - 20, 'done')
  returning id into _event_past;
  insert into public.event_equipment (company_id, event_id, equipment_id, quantity, case_id) values
    (_company, _event_past, _mixer, 1, _case_audio),
    (_company, _event_past, _di, 4, _case_audio),
    (_company, _event_past, _mic, 6, _case_audio);

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, status, note)
  values (_company, 'Kapela Ukážka', '+421 911 111 111', current_date + 3, current_date + 5, 'reserved', 'Skúška v klube')
  returning id into _loan;
  insert into public.loan_items (company_id, loan_id, equipment_id, quantity, unit_price) values
    (_company, _loan, _xlr5, 6, 1),
    (_company, _loan, _dmx, 2, 1);

  insert into public.vehicles (company_id, plate, model, status, odometer_km, stk_until, vignette_until)
  values (_company, 'DEMO 001', 'Ford Transit', 'active', 182000, current_date + 25, current_date + 120);

  insert into public.tasks (company_id, title, priority, due_on) values
    (_company, 'Skontrolovať káble XLR po festivale', 'normal', current_date + 12),
    (_company, 'Objednať náhradné lampy do Sharpy', 'high', current_date + 5);
end;
$$;

create function public.my_demo_company()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.companies where demo_owner = auth.uid()
$$;

/** Založí demo firmu volajúceho (ak ju už má, vráti ju). */
create function public.create_demo_company()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select id into _id from public.companies where demo_owner = auth.uid();
  if _id is not null then
    return _id;
  end if;
  insert into public.companies (name, created_by, demo_owner) values ('DEMO – Ukážková firma', auth.uid(), auth.uid()) returning id into _id;
  insert into public.company_members (company_id, user_id, role) values (_id, auth.uid(), 'admin');
  perform public.seed_demo_company(_id);
  return _id;
end;
$$;

/** Zmaže demo firmu volajúceho so všetkým, čo v nej je. */
create function public.delete_demo_company()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  delete from public.companies where demo_owner = auth.uid();
end;
$$;

/** Vráti demo firmu do pôvodného stavu: zmaže ju a založí nanovo. Vráti nové id. */
create function public.reset_demo_company()
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform public.delete_demo_company();
  return public.create_demo_company();
end;
$$;

revoke execute on function public.seed_demo_company(uuid) from public, anon, authenticated;
revoke execute on function public.my_demo_company(), public.create_demo_company(), public.delete_demo_company(), public.reset_demo_company()
  from public, anon;
grant execute on function public.my_demo_company(), public.create_demo_company(), public.delete_demo_company(), public.reset_demo_company()
  to authenticated;

-- =============================================================================
-- 0042_colors_kinds_event_income.sql
-- =============================================================================

-- RigTrack: farby kategórií, nové druhy techniky a príjmy z eventov.
--
-- 1) Kategória techniky má farbu; v zozname techniky je ňou prúžok pred fotkou
--    (napr. svetlá zelené, zvuk ružový, pódium žlté, hliník/truss červený).
-- 2) Druhy techniky „Hliník / truss“ a „Pódium“ (dosky, nohy, zábradlia a ich príslušenstvo).
-- 3) Príjmy z eventu: koľko firma za akciu dostala – v hotovosti, na účet alebo faktúrou
--    (cez ktorú firmu), suma s DPH alebo bez DPH.
--    Sú to peniaze, preto ich vidí a zapisuje ten, kto spravuje odmeny (payouts.manage).

alter table public.equipment_categories
  add column color text check (color in ('green', 'pink', 'yellow', 'red', 'blue', 'purple', 'orange', 'teal', 'gray'));
grant update (color) on public.equipment_categories to authenticated;

alter table public.equipment
  drop constraint equipment_kind_check,
  add constraint equipment_kind_check check (kind in ('general', 'cable', 'light', 'audio', 'truss', 'stage', 'consumable'));

create table public.event_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  amount numeric(10, 2) not null check (amount > 0 and amount < 10000000),
  method text not null check (method in ('cash', 'account', 'invoice')),
  -- Pri faktúre: cez ktorú firmu sa fakturovalo (napr. JEF alebo JEF Production).
  invoiced_by text not null default '' check (char_length(invoiced_by) <= 120),
  -- Suma je zadaná s DPH alebo bez DPH; sadzba DPH, ak je známa.
  vat text not null default 'with' check (vat in ('with', 'without')),
  vat_rate numeric(4, 1) check (vat_rate between 0 and 50),
  received_on date not null default current_date,
  note text not null default '' check (char_length(note) <= 300),
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index event_payments_event_idx on public.event_payments (event_id);

create function public.stamp_event_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.created_by_name := public.actor_name();
  return new;
end;
$$;
create trigger event_payments_stamp before insert on public.event_payments
  for each row execute function public.stamp_event_payment();

alter table public.event_payments enable row level security;

create policy event_payments_select on public.event_payments for select to authenticated
  using (public.can(company_id, 'payouts.manage'));
create policy event_payments_insert on public.event_payments for insert to authenticated
  with check (public.can(company_id, 'payouts.manage'));
create policy event_payments_delete on public.event_payments for delete to authenticated
  using (public.can(company_id, 'payouts.manage'));

revoke all on public.event_payments from anon, authenticated;
grant select, insert, delete on public.event_payments to authenticated;
revoke execute on function public.stamp_event_payment() from public, anon, authenticated;

-- =============================================================================
-- 0043_case_shopping_photos.sql
-- =============================================================================

-- RigTrack: fotky ku cases a k položkám na nákup („kúpiť“ a „chceme časom“).
-- Fotka sa ukladá do bucketu equipment-photos v priečinku firmy ako ostatné fotky
-- a pri odstránení ide do koša (funkcie z 0036–0038, rozšírené o nové miesta).

alter table public.cases
  add column photo_path text not null default '' check (char_length(photo_path) <= 300);
grant update (photo_path) on public.cases to authenticated;

alter table public.shopping_items
  add column photo_path text not null default '' check (char_length(photo_path) <= 300);
grant update (photo_path) on public.shopping_items to authenticated;

alter table public.trashed_photos drop constraint if exists trashed_photos_owner_table_check;
alter table public.trashed_photos
  add constraint trashed_photos_owner_table_check
  check (owner_table in ('equipment', 'vehicles', 'cases', 'orders', 'case_photo', 'shopping_items'));

create or replace function public.trash_photo(_owner_table text, _owner_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _path text;
  _label text;
begin
  if _owner_table = 'equipment' then
    select company_id, photo_path, name into _company, _path, _label from public.equipment
    where id = _owner_id and deleted_at is null and public.can(company_id, 'equipment.edit');
  elsif _owner_table = 'vehicles' then
    select company_id, photo_path, plate into _company, _path, _label from public.vehicles
    where id = _owner_id and public.can(company_id, 'vehicles.edit');
  elsif _owner_table = 'cases' then
    select company_id, label_photo_path, name into _company, _path, _label from public.cases
    where id = _owner_id and deleted_at is null and public.can(company_id, 'cases.edit');
  elsif _owner_table = 'orders' then
    select company_id, photo_path, supplier into _company, _path, _label from public.orders
    where id = _owner_id and public.can(company_id, 'orders.edit');
  elsif _owner_table = 'case_photo' then
    select company_id, photo_path, name into _company, _path, _label from public.cases
    where id = _owner_id and deleted_at is null and public.can(company_id, 'cases.edit');
  elsif _owner_table = 'shopping_items' then
    select company_id, photo_path, name into _company, _path, _label from public.shopping_items
    where id = _owner_id and public.can(company_id, 'shopping.edit');
  end if;
  if _company is null or coalesce(_path, '') = '' then
    raise exception 'Fotku sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;

  insert into public.trashed_photos (company_id, owner_table, owner_id, path, label, deleted_by_name)
  values (_company, _owner_table, _owner_id, _path, _label, public.actor_name());
  if _owner_table = 'equipment' then
    update public.equipment set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'vehicles' then
    update public.vehicles set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'orders' then
    update public.orders set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'case_photo' then
    update public.cases set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'shopping_items' then
    update public.shopping_items set photo_path = '' where id = _owner_id;
  else
    update public.cases set label_photo_path = '' where id = _owner_id;
  end if;
end;
$$;

create or replace function public.recycle_bin_items(_company_id uuid)
returns table (kind text, id uuid, label text, detail text, deleted_at timestamptz, deleted_by_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kôš môže otvoriť iba admin' using errcode = 'insufficient_privilege';
  end if;
  return query
    select case when e.kind = 'consumable' then 'consumable' else 'equipment' end, e.id, e.name,
      concat_ws(' · ', nullif(trim(e.manufacturer || ' ' || e.model), ''), nullif(e.inventory_number, ''), e.quantity || ' ks'),
      e.deleted_at, e.deleted_by_name
    from public.equipment e where e.company_id = _company_id and e.deleted_at is not null
    union all
    select 'case', c.id, c.name,
      concat_ws(' · ', nullif(c.inventory_number, ''), 'položiek v obsahu: ' || cardinality(c.trashed_content)),
      c.deleted_at, c.deleted_by_name
    from public.cases c where c.company_id = _company_id and c.deleted_at is not null
    union all
    select 'event_document', d.id, d.name,
      case when d.is_photo then 'fotka eventu: ' else 'dokument eventu: ' end || coalesce(ev.name, ''), d.deleted_at, d.deleted_by_name
    from public.event_documents d left join public.events ev on ev.id = d.event_id
    where d.company_id = _company_id and d.deleted_at is not null
    union all
    select 'attachment', a.id, a.name, case a.entity_type when 'service' then 'príloha servisného záznamu' else 'príloha vozidla' end,
      a.deleted_at, a.deleted_by_name
    from public.attachments a where a.company_id = _company_id and a.deleted_at is not null
    union all
    select 'photo', p.id, p.label,
      case p.owner_table when 'equipment' then 'fotka techniky' when 'vehicles' then 'fotka vozidla'
        when 'orders' then 'fotka nákupu' when 'case_photo' then 'fotka case'
        when 'shopping_items' then 'fotka položky na nákup' else 'fotka na štítku case' end,
      p.deleted_at, p.deleted_by_name
    from public.trashed_photos p where p.company_id = _company_id
    order by 5 desc;
end;
$$;

create or replace function public.restore_bin_item(_company_id uuid, _kind text, _id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _photo public.trashed_photos;
  _restored integer;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Z koša môže obnovovať iba admin' using errcode = 'insufficient_privilege';
  end if;

  if _kind in ('equipment', 'consumable') then
    update public.equipment set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'case' then
    update public.cases set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
    get diagnostics _restored = row_count;
    -- Obsah sa vráti, pokiaľ ho medzitým niekto nedal do iného case.
    update public.equipment e set case_id = _id
    from public.cases c
    where c.id = _id and _restored = 1 and e.id = any (c.trashed_content) and e.case_id is null and e.company_id = _company_id;
    update public.cases set trashed_content = '{}' where id = _id and _restored = 1;
    if _restored = 0 then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    return;
  elsif _kind = 'event_document' then
    update public.event_documents set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'attachment' then
    update public.attachments set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'photo' then
    select * into _photo from public.trashed_photos where id = _id and company_id = _company_id;
    if not found then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    -- Fotka sa vráti len na prázdne miesto; novšiu fotku neprepíše.
    if _photo.owner_table = 'equipment' then
      update public.equipment set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'vehicles' then
      update public.vehicles set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'orders' then
      update public.orders set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'case_photo' then
      update public.cases set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'shopping_items' then
      update public.shopping_items set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    else
      update public.cases set label_photo_path = _photo.path where id = _photo.owner_id and label_photo_path = '';
    end if;
    if not found then
      raise exception 'Fotku nemožno obnoviť: záznam už má inú fotku alebo neexistuje' using errcode = 'check_violation';
    end if;
    delete from public.trashed_photos where id = _id;
    return;
  else
    raise exception 'Neznámy druh položky' using errcode = 'check_violation';
  end if;

  if not found then
    raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Pri trvalom zmazaní case zanikne aj jeho fotka.
create or replace function public.purge_bin(_company_id uuid, _mode text, _kind text default null, _id uuid default null)
returns table (bucket text, path text)
language plpgsql security definer set search_path = '' as $$
declare
  _before timestamptz := case when _mode = 'expired' then now() - interval '30 days' else 'infinity'::timestamptz end;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kôš môže vyprázdniť iba admin' using errcode = 'insufficient_privilege';
  end if;
  if _mode not in ('expired', 'all', 'one') or (_mode = 'one' and (_kind is null or _id is null)) then
    raise exception 'Neplatná požiadavka' using errcode = 'check_violation';
  end if;

  create temporary table if not exists _purged_files (bucket text, path text) on commit drop;
  delete from _purged_files;

  -- Technika: s ňou zanikne jej fotka aj prílohy naviazaných záznamov riešia kaskády.
  with gone as (
    delete from public.equipment e
    where e.company_id = _company_id and e.deleted_at is not null and e.deleted_at < _before
      and (_mode <> 'one' or (_kind in ('equipment', 'consumable') and e.id = _id))
    returning e.photo_path
  )
  insert into _purged_files select 'equipment-photos', g.photo_path from gone g where g.photo_path <> '';

  with gone as (
    delete from public.cases c
    where c.company_id = _company_id and c.deleted_at is not null and c.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'case' and c.id = _id))
    returning c.label_photo_path, c.photo_path
  )
  insert into _purged_files
  select 'equipment-photos', p from gone g, unnest(array[g.label_photo_path, g.photo_path]) p where p <> '';

  with gone as (
    delete from public.event_documents d
    where d.company_id = _company_id and d.deleted_at is not null and d.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'event_document' and d.id = _id))
    returning d.path
  )
  insert into _purged_files select 'event-documents', g.path from gone g;

  with gone as (
    delete from public.attachments a
    where a.company_id = _company_id and a.deleted_at is not null and a.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'attachment' and a.id = _id))
    returning a.path
  )
  insert into _purged_files select 'attachments', g.path from gone g;

  with gone as (
    delete from public.trashed_photos p
    where p.company_id = _company_id and p.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'photo' and p.id = _id))
    returning p.path
  )
  insert into _purged_files select 'equipment-photos', g.path from gone g;

  return query select f.bucket, f.path from _purged_files f;
end;
$$;

-- =============================================================================
-- 0044_event_rules.sql
-- =============================================================================

-- RigTrack: pripomienky pri eventoch.
-- Pravidlá „keď je na evente X, pripomeň Y“ (napr. pasívne repro → kabeláž NL4, svetlá → case s hákmi).
-- Jeden záznam na firmu so zoznamom pravidiel v JSON; obsah overuje aplikácia.
-- Vidí ich každý člen; mení ten, kto spravuje zoznamy (lookups.manage).

create table public.event_rules (
  company_id uuid primary key references public.companies (id) on delete cascade,
  rules jsonb not null default '[]'::jsonb
    check (jsonb_typeof(rules) = 'array' and pg_column_size(rules) <= 50000),
  updated_at timestamptz not null default now()
);

create trigger event_rules_touch_updated_at
  before update on public.event_rules
  for each row execute function public.touch_updated_at();

alter table public.event_rules enable row level security;

create policy event_rules_select on public.event_rules for select to authenticated
  using (public.is_company_member(company_id));
create policy event_rules_insert on public.event_rules for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy event_rules_update on public.event_rules for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));

revoke all on public.event_rules from anon, authenticated;
grant select, insert on public.event_rules to authenticated;
grant update (rules) on public.event_rules to authenticated;

-- =============================================================================
-- 0045_equipment_packages.sql
-- =============================================================================

-- RigTrack: balíky techniky.
-- Vopred poskladaná sada (napr. „Malý zvukový balík“, „Veľký svetelný balík“): technika s počtami
-- a celé cases. Na event alebo do výpožičky sa pridá jedným klikom.
-- Obsah je JSON (overuje ho aplikácia); zmazaná technika sa pri pridávaní preskočí.
-- Vidí ich každý člen; spravuje ten, kto spravuje zoznamy (lookups.manage).

create table public.equipment_packages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  category text not null default '' check (char_length(category) <= 60),
  note text not null default '' check (char_length(note) <= 500),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and pg_column_size(items) <= 30000),
  cases jsonb not null default '[]'::jsonb check (jsonb_typeof(cases) = 'array' and pg_column_size(cases) <= 10000),
  created_at timestamptz not null default now()
);
create unique index equipment_packages_name_idx on public.equipment_packages (company_id, lower(name));

alter table public.equipment_packages enable row level security;

create policy equipment_packages_select on public.equipment_packages for select to authenticated
  using (public.is_company_member(company_id));
create policy equipment_packages_insert on public.equipment_packages for insert to authenticated
  with check (public.can(company_id, 'lookups.manage'));
create policy equipment_packages_update on public.equipment_packages for update to authenticated
  using (public.can(company_id, 'lookups.manage'))
  with check (public.can(company_id, 'lookups.manage'));
create policy equipment_packages_delete on public.equipment_packages for delete to authenticated
  using (public.can(company_id, 'lookups.manage'));

revoke all on public.equipment_packages from anon, authenticated;
grant select, insert, delete on public.equipment_packages to authenticated;
grant update (name, category, note, items, cases) on public.equipment_packages to authenticated;

-- =============================================================================
-- 0046_staff.sql
-- =============================================================================

-- RigTrack: zamestnanci.
-- Karta človeka z tímu: fotka, pozícia, kontakt, zručnosti, poznámka a kedy nemôže.
-- Členovia firmy majú kartu naviazanú na účet; brigádnici bez účtu sa dajú pridať len menom.
-- Vidieť ich môže každý s oprávnením staff.view (predvolene všetci); spravovať staff.manage
-- (predvolene skladník a admin). Svoju vlastnú kartu a svoje „kedy nemôžem“ si upraví každý sám.

-- Nové oprávnenia (inak rovnaké ako v 0030).
create or replace function public.permission_defaults()
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
    ('audit.view', array[]::public.app_role[]),
    ('staff.view', array['skladnik', 'technik', 'viewer']::public.app_role[]),
    ('staff.manage', array['skladnik']::public.app_role[])
$$;

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  member_id uuid references public.profiles (id) on delete set null,
  name text not null default '' check (char_length(name) <= 120),
  position text not null default '' check (char_length(position) <= 80),
  phone text not null default '' check (char_length(phone) <= 40),
  email text not null default '' check (char_length(email) <= 120),
  photo_path text not null default '' check (char_length(photo_path) <= 300),
  skills text not null default '' check (char_length(skills) <= 500),
  note text not null default '' check (char_length(note) <= 1000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, id),
  -- Brigádnik bez účtu musí mať aspoň meno.
  check (member_id is not null or char_length(trim(name)) > 0)
);
create unique index staff_member_idx on public.staff (company_id, member_id) where member_id is not null;

create table public.staff_unavailability (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  staff_id uuid not null,
  starts_on date not null,
  ends_on date not null,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  foreign key (company_id, staff_id) references public.staff (company_id, id) on delete cascade
);
create index staff_unavailability_idx on public.staff_unavailability (company_id, staff_id, starts_on);

/** Je karta moja (naviazaná na môj účet)? */
create function public.is_my_staff(_staff_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.id = _staff_id and s.member_id = auth.uid())
$$;

alter table public.staff enable row level security;
alter table public.staff_unavailability enable row level security;

create policy staff_select on public.staff for select to authenticated
  using (public.can(company_id, 'staff.view') or member_id = auth.uid());
create policy staff_insert on public.staff for insert to authenticated
  with check (public.can(company_id, 'staff.manage') or (member_id = auth.uid() and public.is_company_member(company_id)));
create policy staff_update on public.staff for update to authenticated
  using (public.can(company_id, 'staff.manage') or member_id = auth.uid())
  with check (public.can(company_id, 'staff.manage') or member_id = auth.uid());
create policy staff_delete on public.staff for delete to authenticated
  using (public.can(company_id, 'staff.manage'));

create policy staff_unavailability_select on public.staff_unavailability for select to authenticated
  using (public.can(company_id, 'staff.view') or public.is_my_staff(staff_id));
create policy staff_unavailability_insert on public.staff_unavailability for insert to authenticated
  with check (public.can(company_id, 'staff.manage') or public.is_my_staff(staff_id));
create policy staff_unavailability_delete on public.staff_unavailability for delete to authenticated
  using (public.can(company_id, 'staff.manage') or public.is_my_staff(staff_id));

revoke all on public.staff, public.staff_unavailability from anon, authenticated;
grant select, insert, delete on public.staff, public.staff_unavailability to authenticated;
grant update (name, position, phone, email, photo_path, skills, note, active) on public.staff to authenticated;
revoke execute on function public.is_my_staff(uuid) from public, anon;
grant execute on function public.is_my_staff(uuid) to authenticated;

-- =============================================================================
-- 0047_event_venue_power.sql
-- =============================================================================

-- RigTrack: miesto a elektrina pri evente.
-- Interiér / exteriér, aká elektrická prípojka je na mieste (napr. CEE 32 A päťpól), koľko ich je
-- a poznámka; pri exteriéri miesto pre predpoveď počasia (ak sa líši od miesta konania).

alter table public.events
  add column setting text not null default '' check (setting in ('', 'indoor', 'outdoor', 'mixed')),
  add column power text not null default ''
    check (power in ('', 'schuko16', 'cee16', 'cee32', 'cee63', 'cee125', 'generator', 'none')),
  add column power_count integer check (power_count between 1 and 50),
  add column power_note text not null default '' check (char_length(power_note) <= 200),
  add column weather_place text not null default '' check (char_length(weather_place) <= 120);

grant update (setting, power, power_count, power_note, weather_place) on public.events to authenticated;

-- =============================================================================
-- 0048_bug_reports.sql
-- =============================================================================

-- RigTrack: nahlasovanie chýb.
-- Ktokoľvek z firmy nahlási chybu (popis, stránka, verzia, prehliadač, voliteľne screenshot).
-- Vidia ju: autor hlásenia, admin firmy a vývojári aplikácie (tabuľka app_developers).
-- Stav a odpoveď mení admin firmy alebo vývojár. E-mail posiela Edge Function notify-bug-report.
--
-- Vývojára (teba) treba pridať raz ručne v SQL Editore, napr.:
--   insert into public.app_developers (user_id) select id from auth.users where email = 'tvoj@email';

create table public.app_developers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_developers enable row level security;
revoke all on public.app_developers from anon, authenticated;
-- Žiadna politika: zoznam sa mení len v SQL Editore, aplikácia sa pýta cez is_developer().

create function public.is_developer()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_developers d where d.user_id = auth.uid())
$$;
revoke execute on function public.is_developer() from public, anon;
grant execute on function public.is_developer() to authenticated;

create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  reporter_name text not null default '',
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  page_url text not null default '' check (char_length(page_url) <= 500),
  app_version text not null default '' check (char_length(app_version) <= 40),
  user_agent text not null default '' check (char_length(user_agent) <= 400),
  screenshot_path text not null default '' check (char_length(screenshot_path) <= 300),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'wontfix')),
  response text not null default '' check (char_length(response) <= 2000),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bug_reports_company_idx on public.bug_reports (company_id, created_at desc);

-- Autora a jeho meno doplní databáza, nedá sa podvrhnúť.
create function public.stamp_bug_report()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.reporter_id := auth.uid();
  new.reporter_name := public.actor_name();
  new.status := 'new';
  new.notified_at := null;
  return new;
end;
$$;
create trigger bug_reports_stamp before insert on public.bug_reports
  for each row execute function public.stamp_bug_report();
create trigger bug_reports_touch_updated_at before update on public.bug_reports
  for each row execute function public.touch_updated_at();
revoke execute on function public.stamp_bug_report() from public, anon, authenticated;

alter table public.bug_reports enable row level security;

create policy bug_reports_select on public.bug_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_developer() or (company_id is not null and public.has_role(company_id, 'admin')));
create policy bug_reports_insert on public.bug_reports for insert to authenticated
  with check (company_id is null or public.is_company_member(company_id));
create policy bug_reports_update on public.bug_reports for update to authenticated
  using (public.is_developer() or (company_id is not null and public.has_role(company_id, 'admin')))
  with check (public.is_developer() or (company_id is not null and public.has_role(company_id, 'admin')));
create policy bug_reports_delete on public.bug_reports for delete to authenticated
  using (public.is_developer());

revoke all on public.bug_reports from anon, authenticated;
grant select, insert, delete on public.bug_reports to authenticated;
grant update (status, response) on public.bug_reports to authenticated;

-- Screenshoty: súkromný bucket, cesta {company_id}/{súbor}. Najviac 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bug-screenshots', 'bug-screenshots', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy bug_screenshots_select on storage.objects for select to authenticated
  using (
    bucket_id = 'bug-screenshots'
    and (public.is_developer() or public.has_role(((storage.foldername(name))[1])::uuid, 'admin'))
  );
create policy bug_screenshots_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'bug-screenshots' and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy bug_screenshots_delete on storage.objects for delete to authenticated
  using (bucket_id = 'bug-screenshots' and public.is_developer());

-- =============================================================================
-- 0049_service_technicians.sql
-- =============================================================================

-- RigTrack: servisní technici.
-- Adresár ľudí a servisov, ktorí opravujú techniku alebo autá (meno, firma, telefón, e-mail, na čo sú).
-- Servisný záznam techniky, záznam pri aute a samotné auto (stály servis) sa naň môžu odkázať.
-- Vidí ho, kto vidí servis alebo vozidlá; spravuje, kto smie upravovať servis alebo vozidlá.
-- Odkazy sú v rámci jednej firmy (zložený cudzí kľúč); zmazaním technika sa len vynulujú.

create table public.service_technicians (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  firm text not null default '' check (char_length(firm) <= 80),
  phone text not null default '' check (char_length(phone) <= 40),
  email text not null default '' check (char_length(email) <= 120),
  address text not null default '' check (char_length(address) <= 200),
  scope text not null default 'both' check (scope in ('equipment', 'vehicles', 'both')),
  specialization text not null default '' check (char_length(specialization) <= 200),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create index service_technicians_company_idx on public.service_technicians (company_id, name);

alter table public.service_technicians enable row level security;

create policy service_technicians_select on public.service_technicians for select to authenticated
  using (public.can(company_id, 'service.view') or public.can(company_id, 'vehicles.view'));
create policy service_technicians_insert on public.service_technicians for insert to authenticated
  with check (public.can(company_id, 'service.edit') or public.can(company_id, 'vehicles.edit'));
create policy service_technicians_update on public.service_technicians for update to authenticated
  using (public.can(company_id, 'service.edit') or public.can(company_id, 'vehicles.edit'))
  with check (public.can(company_id, 'service.edit') or public.can(company_id, 'vehicles.edit'));
create policy service_technicians_delete on public.service_technicians for delete to authenticated
  using (public.can(company_id, 'service.edit') or public.can(company_id, 'vehicles.edit'));

revoke all on public.service_technicians from anon, authenticated;
grant select, insert, delete on public.service_technicians to authenticated;
grant update (name, firm, phone, email, address, scope, specialization, note) on public.service_technicians to authenticated;

create trigger service_technicians_audit after insert or update or delete on public.service_technicians
  for each row execute function public.write_audit();

-- Odkazy na technika.
alter table public.service_records add column technician_id uuid;
alter table public.service_records add constraint service_records_technician_fk
  foreign key (company_id, technician_id) references public.service_technicians (company_id, id) on delete set null (technician_id);
grant update (technician_id) on public.service_records to authenticated;

alter table public.vehicle_records add column technician_id uuid;
alter table public.vehicle_records add constraint vehicle_records_technician_fk
  foreign key (company_id, technician_id) references public.service_technicians (company_id, id) on delete set null (technician_id);

-- Stály servis auta (kam s ním chodíme).
alter table public.vehicles add column technician_id uuid;
alter table public.vehicles add constraint vehicles_technician_fk
  foreign key (company_id, technician_id) references public.service_technicians (company_id, id) on delete set null (technician_id);
grant update (technician_id) on public.vehicles to authenticated;

-- =============================================================================
-- 0050_delete_company.sql
-- =============================================================================

-- RigTrack: zmazanie firmy.
-- Admin firmy ju môže natrvalo zmazať; pre istotu musí napísať jej presný názov.
-- Všetky údaje firmy (technika, cases, eventy, výpožičky, vozidlá, servis, členstvá, história…)
-- sa zmažú kaskádou cez cudzie kľúče na companies. Súbory v Storage maže aplikácia ešte pred
-- týmto volaním cez Storage API (Supabase nedovolí mazať storage.objects priamo z SQL).
-- Hlásenia chýb ostanú vývojárovi, len bez firmy.

create function public.delete_company(_company uuid, _confirm_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if not public.has_role(_company, 'admin') then
    raise exception 'Only an admin can delete the company' using errcode = '42501';
  end if;
  select c.name into _name from public.companies c where c.id = _company;
  if _name is null then
    raise exception 'Company not found' using errcode = 'P0002';
  end if;
  if trim(coalesce(_confirm_name, '')) <> trim(_name) then
    raise exception 'Company name does not match' using errcode = '22023';
  end if;
  delete from public.companies where id = _company;
end;
$$;

revoke execute on function public.delete_company(uuid, text) from public, anon;
grant execute on function public.delete_company(uuid, text) to authenticated;

-- =============================================================================
-- 0051_member_devices.sql
-- =============================================================================

-- RigTrack: zariadenia členov (mobily, notebooky, tablety) s MAC adresou.
-- Každý člen si zapisuje svoje vlastné zariadenia. Vidieť a spravovať všetky môže, kto má
-- staff.manage (predvolene admin a skladník) – napr. kvôli povoleniu v sieti na akcii.
-- MAC sa ukladá jednotne ako AA:BB:CC:DD:EE:FF; v jednej firme sa nesmie opakovať.

create table public.member_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null default 'phone' check (kind in ('phone', 'laptop', 'tablet', 'other')),
  name text not null check (char_length(trim(name)) between 1 and 80),
  mac text not null check (mac ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  unique (company_id, mac)
);
create index member_devices_user_idx on public.member_devices (company_id, user_id);

alter table public.member_devices enable row level security;

create policy member_devices_select on public.member_devices for select to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'staff.manage'));
create policy member_devices_insert on public.member_devices for insert to authenticated
  with check (user_id = auth.uid() and public.is_company_member(company_id));
create policy member_devices_update on public.member_devices for update to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'staff.manage'))
  with check ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'staff.manage'));
create policy member_devices_delete on public.member_devices for delete to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'staff.manage'));

revoke all on public.member_devices from anon, authenticated;
grant select, insert, delete on public.member_devices to authenticated;
grant update (kind, name, mac, note) on public.member_devices to authenticated;

-- =============================================================================
-- 0052_accounts_devices_owners.sql
-- =============================================================================

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

-- =============================================================================
-- 0053_role_ceo_enum.sql
-- =============================================================================

-- (rola ceo je už v definícii app_role v časti 0001)

-- =============================================================================
-- 0054_role_ceo.sql
-- =============================================================================

  -- RigTrack: nová rola CEO (2. časť).
  -- CEO má vo firme rovnaké práva ako admin: všade, kde sa pýta na admina, prejde aj CEO,
  -- a smie všetko bez ohľadu na nastavenie oprávnení. Firma však stále musí mať aspoň jedného admina.
  
  create or replace function public.has_role(_company_id uuid, variadic _roles public.app_role[])
  returns boolean language sql stable security definer set search_path = '' as $$
    select exists (
      select 1 from public.company_members m
      where m.company_id = _company_id and m.user_id = auth.uid()
        and (m.role = any (_roles) or (m.role = 'ceo' and 'admin' = any (_roles)))
    );
  $$;
  
  create or replace function public.can(_company_id uuid, _permission text)
  returns boolean language sql stable security definer set search_path = '' as $$
    select coalesce(
      (
        select m.role in ('admin', 'ceo') or coalesce(
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
    )
  $$;

-- =============================================================================
-- 0055_wifi_networks.sql
-- =============================================================================

-- RigTrack: siete firmy.
-- Wi-Fi siete (napr. každý mix má svoj router): názov (SSID), heslo, zabezpečenie, IP rozsah, IP routera,
-- k akej technike patrí (mix / router), model routera, IP pre správu a gateway, a kde je. Z údajov sa ukáže QR kód na pripojenie.
-- Vidia ich všetci členovia firmy (aj heslo Wi-Fi – kvôli pripojeniu na akcii); spravuje, kto smie upravovať techniku.
-- Prihlásenie do správy routera je v samostatnej tabuľke a vidí ho len ten, kto smie upravovať techniku.

create table public.wifi_networks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  ssid text not null check (char_length(ssid) between 1 and 32),
  password text not null default '' check (char_length(password) <= 63),
  security text not null default 'WPA' check (security in ('WPA', 'WEP', 'nopass')),
  hidden boolean not null default false,
  -- napr. 192.168.1.0/24; podľa neho sa k sieti priradia IP adresy techniky a zariadení
  subnet text not null default '' check (char_length(subnet) <= 43),
  -- gateway siete (zvyčajne router) a adresa, na ktorej sa router spravuje
  router_ip text not null default '' check (char_length(router_ip) <= 45),
  management_ip text not null default '' check (char_length(management_ip) <= 45),
  router_model text not null default '' check (char_length(router_model) <= 80),
  -- DHCP: router prideľuje adresy sám (v rozsahu od–do); pevné IP dávajte mimo neho
  dhcp boolean not null default true,
  dhcp_start text not null default '' check (char_length(dhcp_start) <= 45),
  dhcp_end text not null default '' check (char_length(dhcp_end) <= 45),
  equipment_id uuid,
  place text not null default '' check (char_length(place) <= 120),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete set null (equipment_id)
);
create index wifi_networks_company_idx on public.wifi_networks (company_id, ssid);

alter table public.wifi_networks enable row level security;

create policy wifi_networks_select on public.wifi_networks for select to authenticated
  using (public.is_company_member(company_id));
create policy wifi_networks_insert on public.wifi_networks for insert to authenticated
  with check (public.can(company_id, 'equipment.edit'));
create policy wifi_networks_update on public.wifi_networks for update to authenticated
  using (public.can(company_id, 'equipment.edit'))
  with check (public.can(company_id, 'equipment.edit'));
create policy wifi_networks_delete on public.wifi_networks for delete to authenticated
  using (public.can(company_id, 'equipment.edit'));

revoke all on public.wifi_networks from anon, authenticated;
grant select, insert, delete on public.wifi_networks to authenticated;
grant update (ssid, password, security, hidden, subnet, router_ip, management_ip, router_model, dhcp, dhcp_start, dhcp_end, equipment_id, place, note) on public.wifi_networks to authenticated;

create trigger wifi_networks_audit after insert or update or delete on public.wifi_networks
  for each row execute function public.write_audit();

-- Prihlásenie do správy routera (len pre tých, čo smú upravovať techniku).
create table public.wifi_router_logins (
  network_id uuid primary key references public.wifi_networks (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  username text not null default '' check (char_length(username) <= 80),
  password text not null default '' check (char_length(password) <= 128)
);

alter table public.wifi_router_logins enable row level security;

create policy wifi_router_logins_all on public.wifi_router_logins for all to authenticated
  using (public.can(company_id, 'equipment.edit'))
  with check (
    public.can(company_id, 'equipment.edit')
    and exists (select 1 from public.wifi_networks n where n.id = network_id and n.company_id = wifi_router_logins.company_id)
  );

revoke all on public.wifi_router_logins from anon, authenticated;
grant select, insert, delete on public.wifi_router_logins to authenticated;
grant update (username, password) on public.wifi_router_logins to authenticated;

-- =============================================================================
-- 0056_invite_only.sql
-- =============================================================================

-- RigTrack: registrácia len na pozvánku.
-- Funkcia pre Supabase Auth hook „Before User Created“: účet sa založí len pre e-mail, ktorý má
-- pozvánku do niektorej firmy. Treba ju zapnúť v Supabase → Authentication → Hooks →
-- Before User Created → Postgres function → public.hook_require_invitation.

create function public.hook_require_invitation(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  _email text := lower(trim(coalesce(event -> 'user' ->> 'email', '')));
begin
  if _email <> '' and exists (select 1 from public.company_invitations i where i.email = _email) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Registrácia je len na pozvánku.'));
end;
$$;

revoke execute on function public.hook_require_invitation(jsonb) from public, anon, authenticated;

-- Volá ju služba prihlasovania Supabase (rola supabase_auth_admin; v testoch neexistuje).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.hook_require_invitation(jsonb) to supabase_auth_admin;
  end if;
end;
$$;

-- =============================================================================
-- 0057_people.sql
-- =============================================================================

-- RigTrack: ľudia (1.13).
-- 1) Karta zamestnanca: dátum narodenia, meniny (deň a mesiac), skupiny vodičského oprávnenia,
--    či prešiel úvodným dotazníkom po prvom prihlásení.
-- 2) Výnimky zo zariadení: kto nemusí mať zapísaný mobil / tablet / notebook (nastavuje admin).
-- 3) Posádka eventu potvrdzuje účasť: môžem / nemôžem (a prečo).
-- 4) Novinky vo firme (napr. nový event) s „prečítané“ pre každého zvlášť.
-- 5) Kto chce e-mail pri novom evente (nastaví si admin sám pre seba).

-- 1) Karta zamestnanca
alter table public.staff add column birth_date date;
alter table public.staff add column name_day text not null default '' check (name_day = '' or name_day ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$');
alter table public.staff add column licences text[] not null default '{}'
  check (licences <@ array['AM', 'A1', 'A2', 'A', 'B1', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'T']::text[]);
alter table public.staff add column onboarded boolean not null default false;
grant update (birth_date, name_day, licences, onboarded) on public.staff to authenticated;

-- 2) Výnimky zo zariadení
create table public.device_exemptions (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('phone', 'laptop', 'tablet')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id, kind)
);
alter table public.device_exemptions enable row level security;
create policy device_exemptions_select on public.device_exemptions for select to authenticated
  using (user_id = auth.uid() or public.can(company_id, 'staff.manage'));
create policy device_exemptions_insert on public.device_exemptions for insert to authenticated
  with check (public.has_role(company_id, 'admin'));
create policy device_exemptions_delete on public.device_exemptions for delete to authenticated
  using (public.has_role(company_id, 'admin'));
revoke all on public.device_exemptions from anon, authenticated;
grant select, insert, delete on public.device_exemptions to authenticated;

-- 3) Potvrdenie účasti na evente
alter table public.event_crew add column response text not null default 'pending' check (response in ('pending', 'yes', 'no'));
alter table public.event_crew add column response_note text not null default '' check (char_length(response_note) <= 300);
create policy event_crew_update on public.event_crew for update to authenticated
  using (member_id = auth.uid() or public.can(company_id, 'events.edit'))
  with check (member_id = auth.uid() or public.can(company_id, 'events.edit'));
grant update (response, response_note) on public.event_crew to authenticated;

-- 4) Novinky vo firme
create table public.company_news (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('event', 'crew', 'other')),
  title text not null check (char_length(title) between 1 and 200),
  link text not null default '' check (char_length(link) <= 200),
  actor_id uuid default auth.uid() references public.profiles (id) on delete set null,
  actor_name text not null default '',
  created_at timestamptz not null default now()
);
create index company_news_company_idx on public.company_news (company_id, created_at desc);
alter table public.company_news enable row level security;
create policy company_news_select on public.company_news for select to authenticated
  using (public.is_company_member(company_id));
revoke all on public.company_news from anon, authenticated;
grant select on public.company_news to authenticated;

-- Do kedy má kto prečítané novinky (všetko staršie je prečítané).
create table public.news_reads (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  read_until timestamptz not null default now(),
  primary key (company_id, user_id)
);
alter table public.news_reads enable row level security;
create policy news_reads_own on public.news_reads for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_company_member(company_id));
revoke all on public.news_reads from anon, authenticated;
grant select, insert, update, delete on public.news_reads to authenticated;

-- Nový event a priradenie do posádky sa zapíšu do noviniek samé.
create function public.write_event_news()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _actor text := coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
  _event record;
begin
  if tg_table_name = 'events' then
    insert into public.company_news (company_id, kind, title, link, actor_name)
    values (new.company_id, 'event', left('Nový event: ' || new.name || ' (' || to_char(new.starts_on, 'DD. MM. YYYY') || ')', 200), '/events/' || new.id, _actor);
  elsif new.member_id is not null and new.member_id is distinct from auth.uid() then
    select e.name, e.starts_on into _event from public.events e where e.id = new.event_id;
    insert into public.company_news (company_id, kind, title, link, actor_name)
    values (
      new.company_id, 'crew',
      left(coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = new.member_id), 'Člen')
        || ' je v posádke: ' || _event.name || ' (' || to_char(_event.starts_on, 'DD. MM. YYYY') || ')', 200),
      '/events/' || new.event_id, _actor
    );
  end if;
  return new;
end;
$$;
revoke execute on function public.write_event_news() from public, anon, authenticated;

create trigger events_news after insert on public.events
  for each row execute function public.write_event_news();
create trigger event_crew_news after insert on public.event_crew
  for each row execute function public.write_event_news();

-- 5) E-mail pri novom evente (opt-in pre adminov / CEO)
create table public.notification_prefs (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  email_new_event boolean not null default false,
  primary key (company_id, user_id)
);
alter table public.notification_prefs enable row level security;
create policy notification_prefs_own on public.notification_prefs for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_company_member(company_id));
revoke all on public.notification_prefs from anon, authenticated;
grant select, insert, update, delete on public.notification_prefs to authenticated;

-- Kedy odišiel e-mail o novom evente (aby sa poslal len raz). Zapisuje ho len serverová funkcia.
alter table public.events add column emailed_at timestamptz;

-- =============================================================================
-- 0058_demo_more.sql
-- =============================================================================

-- RigTrack: bohatšia demo firma.
-- Doplní k pôvodnej ukážke (0041): zamestnancov s pozíciou, kontaktom, narodeninami, meninami a vodičákom,
-- kto kedy nemôže, kartu majiteľa dema, jeho zariadenia (MAC, Wi-Fi), Wi-Fi siete s routerom, servisných technikov,
-- servisný záznam, odmeny, príjmy z akcie, vlastnú techniku zamestnanca, farby kategórií a rozmery subu.
-- Pôvodné funkcie create/reset demo firmy zostávajú, len create volá aj túto.

create function public.seed_demo_extras(_company uuid, _owner uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _peter uuid;
  _jana uuid;
  _marek uuid;
  _mixer uuid;
  _sharpy uuid;
  _sub uuid;
  _event_next uuid;
  _event_past uuid;
  _garage uuid;
  _av uuid;
begin
  -- Farby kategórií
  update public.equipment_categories set color = case name when 'Svetlá' then 'green' when 'Zvuk' then 'pink' when 'Pódium' then 'yellow' when 'Káble' then 'blue' end
  where company_id = _company;

  select id into _mixer from public.equipment where company_id = _company and name = 'Mixpult X32 Rack';
  select id into _sharpy from public.equipment where company_id = _company and name = 'Sharpy';
  select id into _sub from public.equipment where company_id = _company and name = 'Subwoofer KS118';
  select id into _event_next from public.events where company_id = _company and name = 'Letný festival';
  select id into _event_past from public.events where company_id = _company and name = 'Firemný večierok';

  update public.equipment set attributes = attributes || '{"ipPrefix": 24}' where id = _mixer;
  update public.equipment set attributes = attributes || '{"boxWidthCm": 56, "boxDepthCm": 70, "boxHeightCm": 60, "subDelayMs": 0}' where id = _sub;

  -- Zamestnanci (brigádnici bez účtu)
  insert into public.staff (company_id, name, position, phone, email, skills, birth_date, licences)
  values (_company, 'Peter Zvukár', 'Zvukár', '+421 900 111 222', 'peter@demo.sk', 'X32, dLive, Smaart', (current_date + 1) - interval '31 years', '{B}')
  returning id into _peter;
  insert into public.staff (company_id, name, position, phone, email, skills, name_day, licences)
  values (_company, 'Jana Svetlárka', 'Osvetľovačka', '+421 900 333 444', 'jana@demo.sk', 'GrandMA3, Avolites', to_char(current_date, 'MM-DD'), '{B}')
  returning id into _jana;
  insert into public.staff (company_id, name, position, phone, skills, licences)
  values (_company, 'Marek Stagehand', 'Stagehand, vodič', '+421 900 555 666', 'Práca vo výškach, Nivtec', '{B,C,CE}')
  returning id into _marek;
  insert into public.staff (company_id, name, position, phone, licences)
  values (_company, 'Lucia Produkčná', 'Produkcia', '+421 900 777 888', '{B}');
  insert into public.staff_unavailability (company_id, staff_id, starts_on, ends_on, note)
  values (_company, _marek, current_date + 9, current_date + 12, 'Dovolenka');

  -- Karta majiteľa dema (založí ju trigger pri pridaní do firmy)
  update public.staff set position = 'Majiteľ, technik', phone = '+421 900 000 001', onboarded = true, licences = '{B}'
  where company_id = _company and member_id = _owner;

  -- Zariadenia majiteľa; tablet má výnimku, aby nesvietilo červené upozornenie
  insert into public.member_devices (company_id, user_id, kind, name, mac, networks) values
    (_company, _owner, 'phone', 'Môj mobil', 'A4:83:E7:00:00:01', '[{"ssid": "DEMO-FOH", "ip": "", "mac": "DA:A1:19:00:00:01", "dhcp": true}]'),
    (_company, _owner, 'laptop', 'Notebook (FOH)', 'A4:83:E7:00:00:02', '[{"ssid": "DEMO-FOH", "ip": "192.168.1.50", "mac": ""}]');
  insert into public.device_exemptions (company_id, user_id, kind) values (_company, _owner, 'tablet');

  -- Wi-Fi siete
  insert into public.wifi_networks (company_id, ssid, password, security, subnet, router_ip, router_model, dhcp, dhcp_start, dhcp_end, equipment_id, place, note)
  values (_company, 'DEMO-FOH', 'demo-heslo-123', 'WPA', '192.168.1.0/24', '192.168.1.1', 'Ubiquiti UniFi U6 Lite', true, '192.168.1.100', '192.168.1.199', _mixer, 'FOH rack',
    'Router k mixu X32; tablet na mix cez Wi-Fi.');
  insert into public.wifi_networks (company_id, ssid, password, security, subnet, router_ip, router_model, dhcp, place)
  values (_company, 'DEMO-Kancelária', 'kancelaria-2026', 'WPA', '10.0.0.0/24', '10.0.0.1', 'TP-Link Archer AX55', true, 'Sklad / kancelária');

  -- Servisní technici a servis
  insert into public.service_technicians (company_id, name, firm, phone, email, address, scope, specialization)
  values (_company, 'Tomáš Opravár', 'AV Servis Košice', '+421 905 123 456', 'servis@avservis.demo', 'Košice', 'equipment', 'Clay Paky, Robe, Behringer')
  returning id into _av;
  insert into public.service_technicians (company_id, name, firm, phone, address, scope, specialization)
  values (_company, 'Ján Mechanik', 'Autoservis Stropkov', '+421 905 654 321', 'Stropkov', 'vehicles', 'Ford Transit, pneuservis')
  returning id into _garage;
  update public.vehicles set technician_id = _garage where company_id = _company;
  insert into public.service_records (company_id, equipment_id, kind, status, problem, technician, technician_id, unit_numbers)
  values (_company, _sharpy, 'repair', 'in_progress', 'Kus #2 nesvieti – asi lampa.', 'Tomáš Opravár', _av, '{2}');

  -- Posádka: majiteľ na festivale (čaká na potvrdenie)
  insert into public.event_crew (company_id, event_id, member_id, role) values (_company, _event_next, _owner, 'Produkcia');

  -- Odmeny majiteľa a príjem z minulej akcie
  insert into public.member_payments (company_id, member_id, amount, kind, happened_on, event_id, note, paid_at)
  values (_company, _owner, 120, 'reward', current_date - 20, _event_past, 'Firemný večierok', now() - interval '15 days');
  insert into public.member_payments (company_id, member_id, amount, kind, happened_on, note)
  values (_company, _owner, 50, 'advance', current_date - 3, 'Záloha na festival');
  insert into public.event_payments (company_id, event_id, amount, method, vat, received_on, note, created_by_name)
  values (_company, _event_past, 900, 'invoice', 'without', current_date - 15, 'Faktúra hotelu', 'Demo');

  -- Vlastná technika zamestnanca
  insert into public.equipment (company_id, name, kind, quantity, manufacturer, model, owner_staff_id, attributes)
  values (_company, 'Mikrofón Beta 58A (Petrov)', 'audio', 1, 'Shure', 'Beta 58A', _peter, '{"audioType": "microphone"}');
end;
$$;

revoke execute on function public.seed_demo_extras(uuid, uuid) from public, anon, authenticated;

create or replace function public.create_demo_company()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select id into _id from public.companies where demo_owner = auth.uid();
  if _id is not null then
    return _id;
  end if;
  insert into public.companies (name, created_by, demo_owner) values ('DEMO – Ukážková firma', auth.uid(), auth.uid()) returning id into _id;
  insert into public.company_members (company_id, user_id, role) values (_id, auth.uid(), 'admin');
  perform public.seed_demo_company(_id);
  perform public.seed_demo_extras(_id, auth.uid());
  return _id;
end;
$$;
