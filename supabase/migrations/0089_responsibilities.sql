-- RigTrack: zodpovedné osoby (3.9).
-- Admin nastaví zodpovednosti, napr. „Svetlá“ (všetka technika druhu svetlo), „Zvuk“ alebo „Case LED“
-- (konkrétne case), ľudí, ktorí za ne zodpovedajú, a čo majú robiť: odčítať prevádzkové hodiny každých N dní,
-- skontrolovať case každých N dní. Zodpovedný to vidí na Prehľade a raz denne dostane upozornenie
-- (ak je v databáze plánovač pg_cron; inak len na Prehľade).

create table if not exists public.responsibilities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  kinds text[] not null default '{}',
  case_ids uuid[] not null default '{}',
  member_ids uuid[] not null default '{}',
  hours_every_days integer check (hours_every_days between 1 and 365),
  check_every_days integer check (check_every_days between 1 and 365),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists responsibilities_company_idx on public.responsibilities (company_id);

alter table public.responsibilities enable row level security;
drop policy if exists responsibilities_select on public.responsibilities;
drop policy if exists responsibilities_write on public.responsibilities;
create policy responsibilities_select on public.responsibilities for select to authenticated using (public.is_company_member(company_id));
create policy responsibilities_write on public.responsibilities for all to authenticated
  using (public.has_role(company_id, 'admin')) with check (public.has_role(company_id, 'admin'));
revoke all on public.responsibilities from anon, authenticated;
grant select, insert, update, delete on public.responsibilities to authenticated;

/**
 * Čo je pri zodpovednostiach po termíne: hodiny (technika s „sledovať hodiny“, ktorej posledné odčítanie
 * je staršie ako N dní) a kontroly (case skontrolované naposledy pred viac ako N dňami alebo nikdy).
 * Rozsah: technika daného druhu alebo v zvolených case; case zvolené alebo s takou technikou.
 */
create or replace function public.responsibility_due(_company_id uuid)
returns table (responsibility_id uuid, name text, task text, due_count integer, items text[], member_ids uuid[])
language sql stable security definer set search_path = '' as $$
  with r as (
    select * from public.responsibilities where company_id = _company_id
  ),
  scope_equipment as (
    select r.id as rid, e.id, e.name, e.case_id
    from r join public.equipment e on e.company_id = r.company_id
    where e.deleted_at is null and e.status <> 'retired' and (e.kind = any (r.kinds) or e.case_id = any (r.case_ids))
  ),
  hours as (
    select se.rid, se.name, (select max(h.read_on) from public.equipment_hour_readings h where h.equipment_id = se.id) as last_read
    from scope_equipment se
    join public.equipment e on e.id = se.id
    where coalesce(e.attributes ->> 'trackHours', '') = 'true'
  ),
  scope_cases as (
    select distinct r.id as rid, c.id, c.name
    from r join public.cases c on c.company_id = r.company_id
    where c.deleted_at is null
      and (c.id = any (r.case_ids) or exists (select 1 from scope_equipment se where se.rid = r.id and se.case_id = c.id))
  ),
  checks as (
    select sc.rid, sc.name, (select max(k.checked_at) from public.case_checks k where k.case_id = sc.id) as last_check
    from scope_cases sc
  )
  select r.id, r.name, 'hours', count(*)::integer, (array_agg(h.name order by h.last_read nulls first))[1:10], r.member_ids
  from r join hours h on h.rid = r.id
  where r.hours_every_days is not null and (h.last_read is null or h.last_read < current_date - r.hours_every_days)
  group by r.id, r.name, r.member_ids
  union all
  select r.id, r.name, 'check', count(*)::integer, (array_agg(k.name order by k.last_check nulls first))[1:10], r.member_ids
  from r join checks k on k.rid = r.id
  where r.check_every_days is not null and (k.last_check is null or k.last_check < now() - make_interval(days => r.check_every_days))
  group by r.id, r.name, r.member_ids;
$$;
revoke execute on function public.responsibility_due(uuid) from public, anon, authenticated;

/** Moje úlohy zo zodpovedností vo firme (len kde som medzi zodpovednými). */
create or replace function public.my_responsibility_tasks(_company_id uuid)
returns table (responsibility_id uuid, name text, task text, due_count integer, items text[])
language sql stable security definer set search_path = '' as $$
  select d.responsibility_id, d.name, d.task, d.due_count, d.items
  from public.responsibility_due(_company_id) d
  where public.is_company_member(_company_id) and auth.uid() = any (d.member_ids);
$$;
revoke execute on function public.my_responsibility_tasks(uuid) from public, anon;
grant execute on function public.my_responsibility_tasks(uuid) to authenticated;

-- Pripomienky: každému zodpovednému raz za 7 dní za každú úlohu po termíne (push cez notifications).
create table if not exists public.responsibility_reminders (
  responsibility_id uuid not null references public.responsibilities (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  task text not null,
  reminded_on date not null default current_date,
  primary key (responsibility_id, member_id, task)
);
alter table public.responsibility_reminders enable row level security;
revoke all on public.responsibility_reminders from anon, authenticated;

create or replace function public.remind_responsibilities()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  d record;
  _member uuid;
  _company uuid;
  _count integer := 0;
begin
  for _company in select distinct company_id from public.responsibilities loop
    for d in select * from public.responsibility_due(_company) loop
      foreach _member in array d.member_ids loop
        continue when not exists (select 1 from public.company_members m where m.company_id = _company and m.user_id = _member);
        continue when exists (
          select 1 from public.responsibility_reminders x
          where x.responsibility_id = d.responsibility_id and x.member_id = _member and x.task = d.task and x.reminded_on > current_date - 7
        );
        insert into public.notifications (user_id, company_id, title, body, url)
        values (
          _member, _company,
          left(case d.task when 'hours' then 'Odčítať prevádzkové hodiny: ' else 'Skontrolovať case: ' end || d.name, 120),
          left(d.due_count || ' ks – ' || array_to_string(d.items, ', '), 300),
          case d.task when 'hours' then '/equipment' else '/cases' end
        );
        insert into public.responsibility_reminders (responsibility_id, member_id, task, reminded_on)
        values (d.responsibility_id, _member, d.task, current_date)
        on conflict (responsibility_id, member_id, task) do update set reminded_on = excluded.reminded_on;
        _count := _count + 1;
      end loop;
    end loop;
  end loop;
  return _count;
end;
$$;
revoke execute on function public.remind_responsibilities() from public, anon, authenticated;

-- Raz denne ráno (6:00 UTC); bez pg_cron sa pripomienky ukazujú len na Prehľade.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'rigtrack-remind-responsibilities';
  perform cron.schedule('rigtrack-remind-responsibilities', '0 6 * * *', 'select public.remind_responsibilities()');
exception when others then
  raise notice 'pg_cron nie je k dispozícii – pripomienky zodpovedností len na Prehľade';
end;
$$;
