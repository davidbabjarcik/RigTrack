-- RigTrack 5.16: limity hodín a revízie.
-- Pravidlá nastaví v Nastaveniach ten, kto má maintenance.manage:
--   hours    – limit hodín počítadla (napr. Výbojka 1500 h, servis každých 500 h prevádzky), upozorniť pri X %;
--   revision – revízia každých N mesiacov (napr. elektro revízia káblov, spotrebičov), upozorniť N dní vopred.
-- Pravidlo platí pre druhy techniky, kategórie alebo vybranú techniku (prázdne = všetko).
-- Výmenu / servis / revíziu zapíše ten, kto má maintenance.record; tým sa limit počíta odznova.

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

-- Oprávnenie konkrétneho člena (pre plánovač, kde nie je prihlásený nikto); rovnaké poradie ako public.can.
create or replace function public.user_can(_company_id uuid, _user_id uuid, _permission text)
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
      where m.company_id = _company_id and m.user_id = _user_id
    ),
    false
  )
$$;
revoke execute on function public.user_can(uuid, uuid, text) from public, anon, authenticated;

create table if not exists public.maintenance_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('hours', 'revision')),
  name text not null check (char_length(trim(name)) between 1 and 80),
  -- Pri hodinách: názov počítadla ('' = prevádzkové hodiny, inak napr. „Výbojka“).
  counter text not null default '' check (char_length(counter) <= 40),
  limit_hours numeric(10, 1) check (limit_hours > 0 and limit_hours <= 1000000),
  warn_percent integer not null default 90 check (warn_percent between 1 and 100),
  interval_months integer check (interval_months between 1 and 240),
  warn_days integer not null default 30 check (warn_days between 0 and 365),
  kinds text[] not null default '{}',
  category_ids uuid[] not null default '{}',
  equipment_ids uuid[] not null default '{}',
  -- Po prekročení limitu (alebo termínu revízie) vznikne aj úloha.
  create_task boolean not null default false,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  check ((kind = 'hours' and limit_hours is not null) or (kind = 'revision' and interval_months is not null))
);
create index if not exists maintenance_rules_company_idx on public.maintenance_rules (company_id);

alter table public.maintenance_rules enable row level security;
drop policy if exists maintenance_rules_select on public.maintenance_rules;
drop policy if exists maintenance_rules_insert on public.maintenance_rules;
drop policy if exists maintenance_rules_update on public.maintenance_rules;
drop policy if exists maintenance_rules_delete on public.maintenance_rules;
create policy maintenance_rules_select on public.maintenance_rules for select to authenticated using (public.can(company_id, 'equipment.view'));
create policy maintenance_rules_insert on public.maintenance_rules for insert to authenticated with check (public.can(company_id, 'maintenance.manage'));
create policy maintenance_rules_update on public.maintenance_rules for update to authenticated
  using (public.can(company_id, 'maintenance.manage')) with check (public.can(company_id, 'maintenance.manage'));
create policy maintenance_rules_delete on public.maintenance_rules for delete to authenticated using (public.can(company_id, 'maintenance.manage'));
grant select, insert, update, delete on public.maintenance_rules to authenticated;

create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  rule_id uuid not null references public.maintenance_rules (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  -- Číslo kusu; prázdne = celá položka (všetky kusy naraz).
  unit integer,
  done_on date not null default current_date check (done_on <= current_date + 1),
  -- Pri hodinách: stav počítadla pri výmene / servise (od neho sa limit počíta odznova).
  hours numeric(10, 1) check (hours >= 0),
  result text not null default 'ok' check (result in ('ok', 'fail')),
  note text not null default '' check (char_length(note) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  author_name text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists maintenance_records_lookup_idx on public.maintenance_records (rule_id, equipment_id, done_on desc);
create index if not exists maintenance_records_company_idx on public.maintenance_records (company_id);

drop trigger if exists maintenance_records_stamp_author on public.maintenance_records;
create trigger maintenance_records_stamp_author before insert on public.maintenance_records
  for each row execute function public.stamp_author();

alter table public.maintenance_records enable row level security;
drop policy if exists maintenance_records_select on public.maintenance_records;
drop policy if exists maintenance_records_insert on public.maintenance_records;
drop policy if exists maintenance_records_delete on public.maintenance_records;
create policy maintenance_records_select on public.maintenance_records for select to authenticated using (public.can(company_id, 'equipment.view'));
-- Pravidlo aj technika musia byť z tej istej firmy.
create policy maintenance_records_insert on public.maintenance_records for insert to authenticated with check (
  public.can(company_id, 'maintenance.record')
  and exists (select 1 from public.maintenance_rules r where r.id = rule_id and r.company_id = maintenance_records.company_id)
  and exists (select 1 from public.equipment e where e.id = equipment_id and e.company_id = maintenance_records.company_id)
);
create policy maintenance_records_delete on public.maintenance_records for delete to authenticated using (public.can(company_id, 'maintenance.manage'));
grant select, delete on public.maintenance_records to authenticated;
grant insert (company_id, rule_id, equipment_id, unit, done_on, hours, result, note) on public.maintenance_records to authenticated;

-- Čo treba vymeniť, dať do servisu alebo revidovať. Stav: ok, soon (blíži sa), overdue (prekročené / po termíne),
-- unknown (počítadlo neodčítané / revízia ešte nebola), failed (posledná revízia nevyhovela).
-- Bežia s právami volajúceho (RLS), takže každý vidí len svoju firmu.
create or replace function public.maintenance_due(_company_id uuid)
returns table (rule_id uuid, equipment_id uuid, unit integer, state text, used numeric, limit_hours numeric, last_done date, due_on date)
language sql stable set search_path = '' as $$
  with targets as (
    select r.id as rule_id, r.kind, r.counter, r.limit_hours, r.warn_percent, r.interval_months, r.warn_days,
      e.id as equipment_id, u.unit, cardinality(r.equipment_ids) > 0 as picked
    from public.maintenance_rules r
    join public.equipment e on e.company_id = r.company_id and e.status <> 'retired'
      and (cardinality(r.kinds) = 0 or e.kind::text = any (r.kinds))
      and (cardinality(r.category_ids) = 0 or e.category_id = any (r.category_ids))
      and (cardinality(r.equipment_ids) = 0 or e.id = any (r.equipment_ids))
    -- Technika po kusoch (viac kusov) sa sleduje po kusoch, inak celá položka.
    cross join lateral (
      select x as unit from unnest(public.unit_ids_of(e.quantity, e.unit_ids)) x where e.track_units and e.quantity > 1
      union all
      select null::integer where not (e.track_units and e.quantity > 1)
    ) u
    where r.company_id = _company_id
  ),
  measured as (
    select t.*, rec.done_on as rec_on, rec.hours as rec_hours, rec.result as rec_result, rec.created_at as rec_created,
      rd.hours as cur_hours, rd.read_on as cur_on, rd.created_at as cur_created
    from targets t
    left join lateral (
      select m.done_on, m.hours, m.result, m.created_at from public.maintenance_records m
      where m.rule_id = t.rule_id and m.equipment_id = t.equipment_id and (m.unit is null or t.unit is null or m.unit = t.unit)
      order by m.done_on desc, m.created_at desc limit 1
    ) rec on true
    left join lateral (
      select h.hours, h.read_on, h.created_at from public.equipment_hour_readings h
      where t.kind = 'hours' and h.equipment_id = t.equipment_id and coalesce(h.counter, '') = t.counter and (t.unit is null or h.unit = t.unit)
      order by h.read_on desc, h.created_at desc limit 1
    ) rd on true
    -- Limit hodín sa týka len techniky, ktorá to počítadlo má (alebo bola vybraná ručne).
    where t.kind = 'revision' or t.picked or exists (
      select 1 from public.equipment_hour_readings h where h.equipment_id = t.equipment_id and coalesce(h.counter, '') = t.counter
    )
  ),
  computed as (
    select m.*,
      case
        when m.kind <> 'hours' or m.cur_hours is null then null
        when m.rec_on is null then m.cur_hours
        -- Odčítanie spred výmeny sa už nepočíta.
        when m.cur_on < m.rec_on or (m.cur_on = m.rec_on and m.cur_created < m.rec_created) then 0
        when m.cur_hours >= coalesce(m.rec_hours, 0) then m.cur_hours - coalesce(m.rec_hours, 0)
        -- Počítadlo po výmene vynulované.
        else m.cur_hours
      end as used_hours,
      case when m.kind = 'revision' and m.rec_on is not null then (m.rec_on + make_interval(months => m.interval_months))::date end as next_on
    from measured m
  )
  select c.rule_id, c.equipment_id, c.unit,
    case
      when c.kind = 'hours' then
        case
          when c.used_hours is null then 'unknown'
          when c.used_hours >= c.limit_hours then 'overdue'
          when c.used_hours >= c.limit_hours * c.warn_percent / 100.0 then 'soon'
          else 'ok'
        end
      else
        case
          when c.rec_on is null then 'unknown'
          when c.rec_result = 'fail' then 'failed'
          when c.next_on < current_date then 'overdue'
          when c.next_on <= current_date + c.warn_days then 'soon'
          else 'ok'
        end
    end,
    c.used_hours, c.limit_hours, c.rec_on, c.next_on
  from computed c
$$;
revoke execute on function public.maintenance_due(uuid) from public, anon;
grant execute on function public.maintenance_due(uuid) to authenticated;

-- Čo už bolo oznámené (aby plánovač neposielal to isté každý deň).
create table if not exists public.maintenance_notified (
  rule_id uuid not null references public.maintenance_rules (id) on delete cascade,
  equipment_id uuid not null references public.equipment (id) on delete cascade,
  unit integer not null default -1,
  state text not null,
  notified_on date not null default current_date,
  primary key (rule_id, equipment_id, unit)
);
alter table public.maintenance_notified enable row level security;
revoke all on public.maintenance_notified from anon, authenticated;

-- Raz denne: nové „blíži sa“ / „prekročené“ / „nevyhovela“ → upozornenie tým, čo spravujú limity a revízie,
-- a zodpovedným za daný druh techniky; pri pravidle s úlohou aj úloha.
create or replace function public.remind_maintenance()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  r record;
  _member uuid;
  _count integer := 0;
  _late integer;
  _soon integer;
  _kinds text[];
begin
  for _company in select distinct company_id from public.maintenance_rules loop
    create temporary table if not exists _due (rule_id uuid, equipment_id uuid, unit integer, state text) on commit drop;
    delete from _due;
    insert into _due select d.rule_id, d.equipment_id, coalesce(d.unit, -1), d.state from public.maintenance_due(_company) d;

    -- Čo je znova v poriadku, sa zabudne (pri ďalšom cykle sa oznámi znova).
    delete from public.maintenance_notified n using public.maintenance_rules mr
    where mr.id = n.rule_id and mr.company_id = _company
      and not exists (select 1 from _due d where d.rule_id = n.rule_id and d.equipment_id = n.equipment_id and d.unit = n.unit and d.state in ('soon', 'overdue', 'failed'));

    for r in
      select mr.id, mr.name, mr.kind, mr.create_task,
        array_agg(distinct d.equipment_id) filter (where d.state in ('overdue', 'failed')) as late_ids,
        count(*) filter (where d.state in ('overdue', 'failed')) as late,
        count(*) filter (where d.state = 'soon') as soon,
        array_agg(distinct e.kind::text) as kinds
      from _due d
      join public.maintenance_rules mr on mr.id = d.rule_id
      join public.equipment e on e.id = d.equipment_id
      where d.state in ('soon', 'overdue', 'failed')
        and not exists (select 1 from public.maintenance_notified n where n.rule_id = d.rule_id and n.equipment_id = d.equipment_id and n.unit = d.unit and n.state = d.state)
      group by mr.id, mr.name, mr.kind, mr.create_task
    loop
      _late := r.late;
      _soon := r.soon;
      _kinds := r.kinds;
      for _member in
        select m.user_id from public.company_members m where m.company_id = _company and public.user_can(_company, m.user_id, 'maintenance.manage')
        union
        select unnest(x.member_ids) from public.responsibilities x where x.company_id = _company and x.kinds && _kinds
      loop
        insert into public.notifications (user_id, company_id, title, body, url)
        values (
          _member, _company,
          left(r.name || ': ' || concat_ws(', ',
            case when _late > 0 then _late || case when r.kind = 'hours' then ' prekročený limit' else ' po termíne' end end,
            case when _soon > 0 then _soon || ' čoskoro' end), 120),
          case when r.kind = 'hours' then 'Limit hodín' else 'Revízia' end,
          '/checks'
        );
        _count := _count + 1;
      end loop;

      if r.create_task and _late > 0 then
        insert into public.tasks (company_id, title, category, status, note)
        select _company, left(case when r.kind = 'hours' then 'Výmena / servis: ' else 'Revízia: ' end || r.name || ' – ' || e.name, 200), 'Servis', 'open',
          'Vzniklo automaticky z limitov a revízií.'
        from public.equipment e where e.id = any (r.late_ids);
      end if;
    end loop;

    insert into public.maintenance_notified (rule_id, equipment_id, unit, state)
    select d.rule_id, d.equipment_id, d.unit, d.state from _due d where d.state in ('soon', 'overdue', 'failed')
    on conflict (rule_id, equipment_id, unit) do update set state = excluded.state, notified_on = current_date;
  end loop;
  return _count;
end;
$$;
revoke execute on function public.remind_maintenance() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'rigtrack-remind-maintenance';
  perform cron.schedule('rigtrack-remind-maintenance', '0 6 * * *', 'select public.remind_maintenance()');
exception when others then
  raise notice 'pg_cron nie je k dispozícii – limity a revízie sa neoznamujú';
end;
$$;
