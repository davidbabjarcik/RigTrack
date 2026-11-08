-- 0169: kolízie naprieč firmami (0091) bez ukážkovej firmy.
-- Ukážková firma si pri založení vytvorí vzorové eventy a zapíše do posádky toho, kto ju založil.
-- Tie nie sú skutočná práca, takže človek ani technika kvôli nim nemajú byť „v termíne v inej firme“.

create or replace function public.crew_busy_elsewhere(_company_id uuid, _from date, _to date)
returns table (member_id uuid, events integer, starts_on date, ends_on date)
language sql stable security definer set search_path = '' as $$
  select c.member_id, count(distinct e.id)::integer, min(e.starts_on), max(e.ends_on)
  from public.event_crew c
  join public.events e on e.id = c.event_id
  join public.companies co on co.id = e.company_id
  where public.can(_company_id, 'events.view')
    and c.company_id <> _company_id
    and co.demo_owner is null
    and c.member_id in (select m.user_id from public.company_members m where m.company_id = _company_id)
    and c.response <> 'no'
    and e.status <> 'cancelled'
    and e.starts_on <= _to and e.ends_on >= _from
  group by c.member_id;
$$;

create or replace function public.gear_busy_elsewhere(_company_id uuid, _from date, _to date)
returns table (equipment_id uuid, quantity integer, starts_on date, ends_on date)
language sql stable security definer set search_path = '' as $$
  select x.id, sum(ee.quantity)::integer, min(e.starts_on), max(e.ends_on)
  from public.equipment x
  join public.equipment r on coalesce(r.shared_from, r.id) = coalesce(x.shared_from, x.id) and r.company_id <> x.company_id
  join public.event_equipment ee on ee.equipment_id = r.id
  join public.events e on e.id = ee.event_id
  join public.companies co on co.id = e.company_id
  where public.can(_company_id, 'events.view')
    and x.company_id = _company_id
    and co.demo_owner is null
    and (x.shared_from is not null or exists (select 1 from public.equipment c where c.shared_from = x.id))
    and e.status <> 'cancelled'
    and e.starts_on <= _to and e.ends_on >= _from
  group by x.id;
$$;
