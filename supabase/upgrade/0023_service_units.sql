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
