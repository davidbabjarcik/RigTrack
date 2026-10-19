-- RigTrack: firma (1.16).
-- 1) Úlohy: viac ľudí, kategória (napr. web, soc. siete), väzba na event; šablóny úloh po evente,
--    ktoré sa po skončení akcie založia samé (create_post_event_tasks).
-- 2) Kancelária: spotrebný materiál (voda, káva, poháre, cukor, mlieko, čaj…) a kto čo kúpil.
-- 3) Škody a úrazy pri ľuďoch (úrazy vidí len admin, dotknutý a ten, kto ich zapísal).
-- 4) Sociálne siete na karte zamestnanca a meno profilu ↔ karta zamestnanca.

-- 1) Úlohy
create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  category text not null default '' check (char_length(category) <= 60),
  -- Termín úlohy: koľko dní po konci eventu.
  days_after integer not null default 1 check (days_after between 0 and 60),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.task_templates enable row level security;
create policy task_templates_select on public.task_templates for select to authenticated using (public.can(company_id, 'tasks.view'));
create policy task_templates_write on public.task_templates for all to authenticated
  using (public.can(company_id, 'tasks.edit')) with check (public.can(company_id, 'tasks.edit'));
revoke all on public.task_templates from anon, authenticated;
grant select, insert, delete on public.task_templates to authenticated;
grant update (title, category, days_after, active) on public.task_templates to authenticated;

alter table public.tasks
  add column assignee_ids uuid[] not null default '{}' check (cardinality(assignee_ids) <= 20),
  add column category text not null default '' check (char_length(category) <= 60),
  add column event_id uuid references public.events (id) on delete cascade,
  add column template_id uuid references public.task_templates (id) on delete set null,
  add column done_at timestamptz;
-- Doterajší riešiteľ je prvý v zozname.
update public.tasks set assignee_ids = array[assignee_id] where assignee_id is not null;
create unique index tasks_event_template_idx on public.tasks (event_id, template_id) where event_id is not null and template_id is not null;
grant update (assignee_ids, category, event_id) on public.tasks to authenticated;

create function public.all_members_of(_company_id uuid, _users uuid[])
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(bool_and(public.is_member_of(_company_id, u)), true) from unnest(_users) u;
$$;
revoke execute on function public.all_members_of(uuid, uuid[]) from public, anon;
grant execute on function public.all_members_of(uuid, uuid[]) to authenticated;

alter policy tasks_insert on public.tasks
  with check (public.can(company_id, 'tasks.edit') and (assignee_id is null or public.is_member_of(company_id, assignee_id)) and public.all_members_of(company_id, assignee_ids));
alter policy tasks_update on public.tasks
  using (public.can(company_id, 'tasks.edit'))
  with check (public.can(company_id, 'tasks.edit') and (assignee_id is null or public.is_member_of(company_id, assignee_id)) and public.all_members_of(company_id, assignee_ids));

-- Kedy bola úloha hotová (pre štatistiky); prvý riešiteľ ostáva v assignee_id kvôli starším verziám appky.
create function public.stamp_task()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.done_at := case when new.status = 'done' then now() end;
    if cardinality(new.assignee_ids) > 0 then
      new.assignee_id := new.assignee_ids[1];
    elsif new.assignee_id is not null then
      new.assignee_ids := array[new.assignee_id];
    end if;
    return new;
  end if;
  if new.status = 'done' and old.status <> 'done' then
    new.done_at := now();
  elsif new.status <> 'done' then
    new.done_at := null;
  end if;
  if new.assignee_ids is distinct from old.assignee_ids then
    new.assignee_id := new.assignee_ids[1];
  elsif new.assignee_id is distinct from old.assignee_id then
    -- Staršia verzia appky mení len jedného riešiteľa.
    new.assignee_ids := case when new.assignee_id is null then '{}' else array[new.assignee_id] end;
  end if;
  return new;
end;
$$;
create trigger tasks_stamp before insert or update on public.tasks
  for each row execute function public.stamp_task();

-- Po skončených eventoch (posledných 60 dní) založí úlohy zo šablón; každú len raz. Vráti počet nových.
create function public.create_post_event_tasks(_company_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _count integer;
begin
  if not public.is_company_member(_company_id) then
    raise exception 'Nie ste členom firmy' using errcode = 'insufficient_privilege';
  end if;
  insert into public.tasks (company_id, title, category, due_on, event_id, template_id, created_by)
  select e.company_id, left(t.title || ': ' || e.name, 200), t.category, e.ends_on + t.days_after, e.id, t.id, null
  from public.events e
  join public.task_templates t on t.company_id = e.company_id and t.active
  where e.company_id = _company_id
    and e.ends_on < current_date
    and e.ends_on >= current_date - 60
    and t.created_at::date <= e.ends_on + 60
  on conflict (event_id, template_id) where event_id is not null and template_id is not null do nothing;
  get diagnostics _count = row_count;
  return _count;
end;
$$;
revoke execute on function public.create_post_event_tasks(uuid) from public, anon;
grant execute on function public.create_post_event_tasks(uuid) to authenticated;

-- 2) Kancelária
create table public.office_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  unit text not null default 'ks' check (char_length(unit) <= 20),
  -- Koľko je na sklade a kedy upozorniť, že treba dokúpiť.
  quantity numeric(10, 2) not null default 0 check (quantity >= 0),
  min_quantity numeric(10, 2) check (min_quantity >= 0),
  created_at timestamptz not null default now(),
  unique (company_id, id),
  unique (company_id, name)
);
alter table public.office_items enable row level security;
create policy office_items_select on public.office_items for select to authenticated using (public.is_company_member(company_id));
create policy office_items_write on public.office_items for all to authenticated
  using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
revoke all on public.office_items from anon, authenticated;
grant select, insert, delete on public.office_items to authenticated;
grant update (name, unit, quantity, min_quantity) on public.office_items to authenticated;

create table public.office_purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  item_id uuid not null,
  quantity numeric(10, 2) not null check (quantity > 0 and quantity <= 100000),
  price numeric(10, 2) not null default 0 check (price >= 0),
  -- Veľkosť jedného balenia, napr. káva 1 kg, voda 1,5 l (pre štatistiky koľko kg / l sa minulo).
  pack_amount numeric(10, 3) check (pack_amount > 0),
  pack_unit text not null default '' check (pack_unit in ('', 'kg', 'g', 'l', 'ml', 'ks')),
  bought_on date not null default current_date,
  bought_by uuid default auth.uid() references public.profiles (id) on delete set null,
  bought_by_name text not null default '',
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  foreign key (company_id, item_id) references public.office_items (company_id, id) on delete cascade
);
create index office_purchases_company_idx on public.office_purchases (company_id, bought_on desc);

-- Kto kúpil (meno sa zapamätá) a nákup sa pripočíta na sklad; zmazanie ho odpočíta.
create function public.stamp_office_purchase()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.bought_by is null or not public.is_member_of(new.company_id, new.bought_by) then
      new.bought_by := auth.uid();
    end if;
    new.bought_by_name := coalesce(
      (select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = new.bought_by), '');
    update public.office_items set quantity = quantity + new.quantity where id = new.item_id;
    return new;
  end if;
  update public.office_items set quantity = greatest(quantity - old.quantity, 0) where id = old.item_id;
  return old;
end;
$$;
revoke execute on function public.stamp_office_purchase() from public, anon, authenticated;
create trigger office_purchases_stamp before insert on public.office_purchases
  for each row execute function public.stamp_office_purchase();
create trigger office_purchases_unstock after delete on public.office_purchases
  for each row execute function public.stamp_office_purchase();

alter table public.office_purchases enable row level security;
create policy office_purchases_select on public.office_purchases for select to authenticated using (public.is_company_member(company_id));
create policy office_purchases_insert on public.office_purchases for insert to authenticated with check (public.is_company_member(company_id));
create policy office_purchases_delete on public.office_purchases for delete to authenticated
  using (public.has_role(company_id, 'admin') or (bought_by = auth.uid() and public.is_company_member(company_id)));
revoke all on public.office_purchases from anon, authenticated;
grant select, delete on public.office_purchases to authenticated;
grant insert (company_id, item_id, quantity, price, pack_amount, pack_unit, bought_on, bought_by, note) on public.office_purchases to authenticated;

-- 3) Škody a úrazy
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('damage', 'injury')),
  occurred_on date not null default current_date,
  -- Koho sa to týka (člen firmy) alebo meno externistu.
  member_id uuid references public.profiles (id) on delete set null,
  person_name text not null default '' check (char_length(person_name) <= 120),
  event_id uuid references public.events (id) on delete set null,
  equipment_id uuid references public.equipment (id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  severity text not null default 'minor' check (severity in ('minor', 'medium', 'serious')),
  cost numeric(12, 2) check (cost >= 0),
  paid_by text not null default '' check (paid_by in ('', 'company', 'person', 'insurance', 'other')),
  resolved boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index incidents_company_idx on public.incidents (company_id, occurred_on desc);
alter table public.incidents enable row level security;
create policy incidents_select on public.incidents for select to authenticated
  using (public.has_role(company_id, 'admin') or (public.is_company_member(company_id) and (member_id = auth.uid() or created_by = auth.uid())));
create policy incidents_insert on public.incidents for insert to authenticated
  with check (public.is_company_member(company_id) and created_by = auth.uid() and (member_id is null or public.is_member_of(company_id, member_id)));
create policy incidents_update on public.incidents for update to authenticated
  using (public.has_role(company_id, 'admin') or created_by = auth.uid())
  with check (public.has_role(company_id, 'admin') or created_by = auth.uid());
create policy incidents_delete on public.incidents for delete to authenticated
  using (public.has_role(company_id, 'admin') or created_by = auth.uid());
revoke all on public.incidents from anon, authenticated;
grant select, insert, delete on public.incidents to authenticated;
grant update (kind, occurred_on, member_id, person_name, event_id, equipment_id, title, description, severity, cost, paid_by, resolved) on public.incidents to authenticated;

-- 4) Soc. siete a meno profilu ↔ karta zamestnanca
alter table public.staff
  add column socials jsonb not null default '{}'
    check (jsonb_typeof(socials) = 'object' and char_length(socials::text) <= 2000);
grant update (socials) on public.staff to authenticated;

-- Zmena mena v profile sa prepíše na karty zamestnanca a naopak (len vlastná karta).
create function public.sync_profile_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if tg_table_name = 'profiles' then
    update public.staff set name = new.full_name where member_id = new.id and name is distinct from new.full_name;
  elsif new.member_id is not null and new.member_id = auth.uid() and trim(new.name) <> '' then
    update public.profiles set full_name = new.name where id = new.member_id and full_name is distinct from new.name;
  end if;
  return new;
end;
$$;
revoke execute on function public.sync_profile_name() from public, anon, authenticated;
create trigger profiles_sync_name after update of full_name on public.profiles
  for each row execute function public.sync_profile_name();
create trigger staff_sync_name after update of name on public.staff
  for each row execute function public.sync_profile_name();

-- 5) Nová firma: karta zamestnanca prevezme osobné údaje človeka z jeho poslednej karty v inej firme
--    (telefón, e-mail, narodenie, meniny, vodičák, soc. siete), aby ich nemusel písať znova.
create or replace function public.create_member_staff_card()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _prev public.staff;
begin
  select * into _prev from public.staff s
  where s.member_id = new.user_id and s.company_id <> new.company_id
  order by (s.phone <> '' or s.birth_date is not null) desc, s.created_at desc
  limit 1;
  insert into public.staff (company_id, member_id, name, phone, email, birth_date, name_day, licences, socials, onboarded)
  values (
    new.company_id, new.user_id,
    coalesce(_prev.name, ''), coalesce(_prev.phone, ''), coalesce(_prev.email, ''),
    _prev.birth_date, coalesce(_prev.name_day, ''), coalesce(_prev.licences, '{}'), coalesce(_prev.socials, '{}'),
    coalesce(_prev.onboarded, false)
  )
  on conflict do nothing;
  return new;
end;
$$;
