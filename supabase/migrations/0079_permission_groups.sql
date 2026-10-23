-- RigTrack: skupiny ľudí v oprávneniach (2.17).
-- Admin si vytvorí skupiny (napr. Zvukári, Šoféri), priradí do nich členov a v tabuľke oprávnení skupine
-- zaškrtne, čo navyše smie. Člen smie to, čo jeho rola, plus všetko, čo mu dáva niektorá jeho skupina.
-- Výnimka pre jedného člena (member_permissions) má stále prednosť.

create table if not exists public.permission_groups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (company_id, id)
);
create unique index if not exists permission_groups_name_idx on public.permission_groups (company_id, lower(trim(name)));

create table if not exists public.permission_group_members (
  company_id uuid not null,
  group_id uuid not null,
  user_id uuid not null,
  primary key (group_id, user_id),
  foreign key (company_id, group_id) references public.permission_groups (company_id, id) on delete cascade,
  foreign key (company_id, user_id) references public.company_members (company_id, user_id) on delete cascade
);
create index if not exists permission_group_members_user_idx on public.permission_group_members (company_id, user_id);

create table if not exists public.permission_group_rules (
  company_id uuid not null,
  group_id uuid not null,
  permission text not null check (public.is_permission(permission)),
  primary key (group_id, permission),
  foreign key (company_id, group_id) references public.permission_groups (company_id, id) on delete cascade
);

alter table public.permission_groups enable row level security;
alter table public.permission_group_members enable row level security;
alter table public.permission_group_rules enable row level security;
drop policy if exists permission_groups_admin on public.permission_groups;
drop policy if exists permission_group_members_admin on public.permission_group_members;
drop policy if exists permission_group_rules_admin on public.permission_group_rules;
-- Skupiny vidí a spravuje admin; člen vidí skupiny, v ktorých je (napr. na svojej karte).
create policy permission_groups_admin on public.permission_groups for all to authenticated
  using (public.has_role(company_id, 'admin')) with check (public.has_role(company_id, 'admin'));
create policy permission_group_members_admin on public.permission_group_members for all to authenticated
  using (public.has_role(company_id, 'admin') or user_id = auth.uid()) with check (public.has_role(company_id, 'admin'));
create policy permission_group_rules_admin on public.permission_group_rules for all to authenticated
  using (public.has_role(company_id, 'admin')) with check (public.has_role(company_id, 'admin'));
revoke all on public.permission_groups, public.permission_group_members, public.permission_group_rules from anon, authenticated;
grant select, insert, delete on public.permission_groups, public.permission_group_members, public.permission_group_rules to authenticated;
grant update (name) on public.permission_groups to authenticated;

-- Poradie: admin a CEO všetko → výnimka člena → niektorá jeho skupina to dovoľuje → rola → predvolené.
create or replace function public.can(_company_id uuid, _permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    (
      select m.role in ('admin', 'ceo') or coalesce(
        (select mp.allowed from public.member_permissions mp
          where mp.company_id = m.company_id and mp.user_id = m.user_id and mp.permission = _permission),
        (select true from public.permission_group_members gm
          join public.permission_group_rules gr on gr.group_id = gm.group_id and gr.permission = _permission
          where gm.company_id = m.company_id and gm.user_id = m.user_id
          limit 1),
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
