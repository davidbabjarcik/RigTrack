-- RigTrack: technika a objednávky (1.15).
-- 1) Technika: dátum nákupu (celá položka aj po kusoch), odkazy (návod, fixtúra, firmvér…),
--    pri svetlách kópia čoho je a či sedí s Capture (áno / nie / čiastočne + prečo).
-- 2) Kapsule k bezdrôtovým mikrofónom: vlastný zoznam firmy a ktoré idú na event.
-- 3) Objednávky: kto objednal, nie pre nás (pre koho), nepridávať do techniky, bez faktúry.
-- 4) Priorita kontroly cases (nízka / bežná / vysoká).
-- 5) Žiadosti o servis: nahlásiť môže každý člen, vidí svoje; servis ich vybavuje.

-- 1) Technika
alter table public.equipment
  add column purchased_on date,
  -- Dátum nákupu po kusoch: {"1": "2024-05-01", "4": "2025-02-10"}.
  add column unit_purchases jsonb not null default '{}'
    check (jsonb_typeof(unit_purchases) = 'object' and char_length(unit_purchases::text) <= 20000),
  -- [{"title": "Návod", "url": "https://…", "tag": "manual"}]
  add column links jsonb not null default '[]'
    check (jsonb_typeof(links) = 'array' and char_length(links::text) <= 10000),
  add column clone_of text not null default '' check (char_length(clone_of) <= 120),
  add column capture_match text not null default '' check (capture_match in ('', 'yes', 'no', 'partial')),
  add column capture_note text not null default '' check (char_length(capture_note) <= 500);
grant update (purchased_on, unit_purchases, links, clone_of, capture_match, capture_note) on public.equipment to authenticated;

-- 2) Kapsule
create table public.mic_capsules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  manufacturer text not null default '' check (char_length(manufacturer) <= 80),
  quantity integer not null default 1 check (quantity between 0 and 10000),
  -- S čím sa dá použiť, napr. „Shure ULX-D, QLX-D, SLX-D“.
  fits text not null default '' check (char_length(fits) <= 200),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
alter table public.mic_capsules enable row level security;
create policy mic_capsules_select on public.mic_capsules for select to authenticated using (public.can(company_id, 'equipment.view'));
create policy mic_capsules_write on public.mic_capsules for all to authenticated
  using (public.can(company_id, 'equipment.edit')) with check (public.can(company_id, 'equipment.edit'));
revoke all on public.mic_capsules from anon, authenticated;
grant select, insert, delete on public.mic_capsules to authenticated;
grant update (name, manufacturer, quantity, fits, note) on public.mic_capsules to authenticated;

create table public.event_capsules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  capsule_id uuid not null,
  quantity integer not null default 1 check (quantity between 1 and 1000),
  note text not null default '' check (char_length(note) <= 200),
  unique (event_id, capsule_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade,
  foreign key (company_id, capsule_id) references public.mic_capsules (company_id, id) on delete cascade
);
alter table public.event_capsules enable row level security;
create policy event_capsules_select on public.event_capsules for select to authenticated using (public.can(company_id, 'events.view'));
create policy event_capsules_write on public.event_capsules for all to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
revoke all on public.event_capsules from anon, authenticated;
grant select, insert, delete on public.event_capsules to authenticated;
grant update (quantity, note) on public.event_capsules to authenticated;

-- 3) Objednávky
alter table public.orders
  add column ordered_by uuid default auth.uid() references public.profiles (id) on delete set null,
  add column for_us boolean not null default true,
  add column for_whom text not null default '' check (char_length(for_whom) <= 120),
  add column add_to_stock boolean not null default true,
  add column has_invoice boolean not null default true;
grant update (ordered_by, for_us, for_whom, add_to_stock, has_invoice) on public.orders to authenticated;
-- Staré objednávky: objednal ten, kto ich zapísal.
update public.orders set ordered_by = created_by where ordered_by is null;

-- Nové stĺpce sú na konci, preto stačí create or replace.
create or replace view public.orders_overview with (security_invoker = true) as
select
  o.id, o.company_id, o.supplier, o.order_number, o.ordered_at, o.currency, o.note,
  count(i.id)::integer as item_count,
  coalesce(sum(i.quantity * i.unit_price), 0)::numeric(14, 2) as total,
  o.source, o.seller, o.photo_path,
  o.created_at, o.ordered_by, o.for_us, o.for_whom, o.add_to_stock, o.has_invoice
from public.orders o
left join public.order_items i on i.order_id = o.id
group by o.id;

-- 4) Priorita kontroly cases
alter table public.cases
  add column check_priority text not null default 'normal' check (check_priority in ('low', 'normal', 'high'));
grant update (check_priority) on public.cases to authenticated;

-- 5) Žiadosti o servis
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  equipment_id uuid references public.equipment (id) on delete set null,
  unit_id integer check (unit_id between 1 and 100000),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'rejected')),
  response text not null default '' check (char_length(response) <= 1000),
  requested_by uuid default auth.uid() references public.profiles (id) on delete set null,
  requested_by_name text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index service_requests_company_idx on public.service_requests (company_id, created_at desc);

-- Kto a kedy nahlásil určuje server; pri vybavení sa zapíše čas.
create function public.stamp_service_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.requested_by := auth.uid();
    new.requested_by_name := coalesce(
      (select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
    new.created_at := now();
    new.status := 'open';
    new.resolved_at := null;
    insert into public.company_news (company_id, kind, title, link, actor_name)
    values (new.company_id, 'other', left('Žiadosť o servis: ' || new.title, 200), '/service/requests', new.requested_by_name);
  elsif new.status in ('done', 'rejected') and old.status not in ('done', 'rejected') then
    new.resolved_at := now();
  elsif new.status in ('open', 'in_progress') then
    new.resolved_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.stamp_service_request() from public, anon, authenticated;
create trigger service_requests_stamp
  before insert or update on public.service_requests
  for each row execute function public.stamp_service_request();

alter table public.service_requests enable row level security;
create policy service_requests_select on public.service_requests for select to authenticated
  using (public.can(company_id, 'service.view') or (requested_by = auth.uid() and public.is_company_member(company_id)));
create policy service_requests_insert on public.service_requests for insert to authenticated
  with check (
    public.is_company_member(company_id)
    and (equipment_id is null or exists (select 1 from public.equipment e where e.id = equipment_id and e.company_id = service_requests.company_id))
  );
create policy service_requests_update on public.service_requests for update to authenticated
  using (public.can(company_id, 'service.edit')) with check (public.can(company_id, 'service.edit'));
create policy service_requests_delete on public.service_requests for delete to authenticated
  using (public.can(company_id, 'service.delete') or (requested_by = auth.uid() and status = 'open'));
revoke all on public.service_requests from anon, authenticated;
grant select, delete on public.service_requests to authenticated;
grant insert (company_id, equipment_id, unit_id, title, description, priority) on public.service_requests to authenticated;
grant update (status, response, priority) on public.service_requests to authenticated;
