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
