-- RigTrack: úrovne kontroly (2.10).
-- Admin v Nastaveniach určí, po koľkých dňoch treba kontrolovať pri úrovni malá / stredná / veľká;
-- platí pre cases a racky aj pre prevádzkové hodiny techniky. Úroveň „žiadna“ = nekontroluje sa.

create table public.company_check_levels (
  company_id uuid primary key references public.companies (id) on delete cascade,
  low_days integer not null default 180 check (low_days between 1 and 3650),
  normal_days integer not null default 60 check (normal_days between 1 and 3650),
  high_days integer not null default 14 check (high_days between 1 and 3650)
);
alter table public.company_check_levels enable row level security;
create policy company_check_levels_select on public.company_check_levels for select to authenticated using (public.is_company_member(company_id));
create policy company_check_levels_write on public.company_check_levels for all to authenticated
  using (public.has_role(company_id, 'admin')) with check (public.has_role(company_id, 'admin'));
revoke all on public.company_check_levels from anon, authenticated;
grant select, insert on public.company_check_levels to authenticated;
grant update (low_days, normal_days, high_days) on public.company_check_levels to authenticated;

-- Cases a racky môžu mať aj úroveň „žiadna“.
alter table public.cases drop constraint if exists cases_check_priority_check;
alter table public.cases add constraint cases_check_priority_check check (check_priority in ('none', 'low', 'normal', 'high'));

-- Úlohy po evente môžu mať riešiteľov (napr. soc media maker dostane „Fotky na soc. siete“ po každej akcii).
alter table public.task_templates add column assignee_ids uuid[] not null default '{}' check (cardinality(assignee_ids) <= 20);
grant update (assignee_ids) on public.task_templates to authenticated;

create or replace function public.create_post_event_tasks(_company_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _count integer;
begin
  if not public.is_company_member(_company_id) then
    raise exception 'Nie ste členom firmy' using errcode = 'insufficient_privilege';
  end if;
  insert into public.tasks (company_id, title, category, due_on, event_id, template_id, created_by, assignee_ids)
  select e.company_id, left(t.title || ': ' || e.name, 200), t.category, e.ends_on + t.days_after, e.id, t.id, null,
    -- len riešitelia, ktorí sú stále členmi firmy
    coalesce((select array_agg(a) from unnest(t.assignee_ids) a where public.is_member_of(e.company_id, a)), '{}')
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
