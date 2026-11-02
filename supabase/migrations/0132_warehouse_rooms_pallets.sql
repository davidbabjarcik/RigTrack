-- RigTrack 6.8: v pláne skladu aj miesto na hliník (truss) a miestnosť (room); typy paliet firmy (Nastavenia → Sklad),
-- napr. [{"id": "…", "name": "EUR drevená", "length": 120, "width": 80, "material": "wood"}]. Prázdne (null) = predvolené
-- EUR 120 × 80 drevená a plastová.

do $$
begin
  alter table public.warehouse_spots drop constraint if exists warehouse_spots_kind_check;
  alter table public.warehouse_spots add constraint warehouse_spots_kind_check
    check (kind in ('rack', 'pallet', 'zone', 'column', 'wall', 'door', 'window', 'truss', 'room'));
end;
$$;

alter table public.warehouses add column if not exists pallet_types jsonb;
do $$
begin
  alter table public.warehouses drop constraint if exists warehouses_pallet_types_check;
  alter table public.warehouses add constraint warehouses_pallet_types_check
    check (pallet_types is null or (jsonb_typeof(pallet_types) = 'array' and jsonb_array_length(pallet_types) <= 30 and pg_column_size(pallet_types) <= 20000));
end;
$$;
grant update (pallet_types) on public.warehouses to authenticated;

-- Zodpovednosti: termín odčítania hodín a kontroly case podľa Úrovní kontroly (Nastavenia → Pripomienky), nie podľa
-- vlastných dní pri zodpovednosti (stĺpce hours_every_days / check_every_days sa už nepoužívajú).
create or replace function public.responsibility_due(_company_id uuid)
returns table (responsibility_id uuid, name text, task text, due_count integer, items text[], member_ids uuid[])
language sql stable security definer set search_path = '' as $$
  with r as (
    select * from public.responsibilities where company_id = _company_id
  ),
  lv as (
    select coalesce(l.low_days, 180) as low_days, coalesce(l.normal_days, 60) as normal_days, coalesce(l.high_days, 14) as high_days
    from (select 1) one left join public.company_check_levels l on l.company_id = _company_id
  ),
  scope_equipment as (
    select r.id as rid, e.id, e.name, e.case_id
    from r join public.equipment e on e.company_id = r.company_id
    where e.deleted_at is null and e.status <> 'retired' and (e.kind = any (r.kinds) or e.case_id = any (r.case_ids))
  ),
  hours as (
    select se.rid, se.name,
      (select max(h.read_on) from public.equipment_hour_readings h where h.equipment_id = se.id) as last_read,
      case coalesce(e.attributes ->> 'hoursPriority', '')
        when 'low' then (select low_days from lv)
        when 'normal' then (select normal_days from lv)
        when 'high' then (select high_days from lv)
        when 'none' then null
        else e.hours_interval_months * 30
      end as limit_days
    from scope_equipment se
    join public.equipment e on e.id = se.id
    where coalesce(e.attributes ->> 'trackHours', '') = 'true'
  ),
  scope_cases as (
    select distinct r.id as rid, c.id, c.name, c.check_priority
    from r join public.cases c on c.company_id = r.company_id
    where c.deleted_at is null
      and (c.id = any (r.case_ids) or exists (select 1 from scope_equipment se where se.rid = r.id and se.case_id = c.id))
  ),
  checks as (
    select sc.rid, sc.name,
      (select max(k.checked_at) from public.case_checks k where k.case_id = sc.id) as last_check,
      case sc.check_priority
        when 'low' then (select low_days from lv)
        when 'normal' then (select normal_days from lv)
        when 'high' then (select high_days from lv)
        else null
      end as limit_days
    from scope_cases sc
  )
  select r.id, r.name, 'hours', count(*)::integer, (array_agg(h.name order by h.last_read nulls first))[1:10], r.member_ids
  from r join hours h on h.rid = r.id
  where h.limit_days is not null and (h.last_read is null or h.last_read < current_date - h.limit_days)
  group by r.id, r.name, r.member_ids
  union all
  select r.id, r.name, 'check', count(*)::integer, (array_agg(k.name order by k.last_check nulls first))[1:10], r.member_ids
  from r join checks k on k.rid = r.id
  where k.limit_days is not null and (k.last_check is null or k.last_check < now() - make_interval(days => k.limit_days))
  group by r.id, r.name, r.member_ids;
$$;
revoke execute on function public.responsibility_due(uuid) from public, anon, authenticated;
