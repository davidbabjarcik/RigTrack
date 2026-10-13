-- RigTrack: servis po kusoch.
-- Technika s viacerými kusmi (2× DI box) môže mať v servise iba časť z nich.
-- Záznam nesie počet kusov; stav „v servise“ dostane technika až vtedy, keď sú
-- v rozpracovaných záznamoch všetky jej kusy.

alter table public.service_records
  add column quantity integer not null default 1 check (quantity >= 1);

create or replace function public.apply_service_status()
returns trigger language plpgsql set search_path = '' as $$
declare
  _record public.service_records;
  _total integer;
  _open integer;
begin
  if tg_op = 'DELETE' then
    _record := old;
  else
    _record := new;
  end if;

  select e.quantity into _total from public.equipment e
  where e.id = _record.equipment_id and e.company_id = _record.company_id;
  -- Technika sa práve maže (kaskáda), niet čo prepínať.
  if not found then
    return null;
  end if;

  if tg_op <> 'DELETE' and new.status <> 'done' and new.quantity > greatest(_total, 1) then
    raise exception 'V servise nemôže byť viac kusov (%), než koľko ich technika má (%)', new.quantity, _total
      using errcode = 'check_violation';
  end if;

  if tg_op <> 'DELETE' and new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    update public.equipment
    set last_service_on = greatest(coalesce(last_service_on, new.happened_on), new.happened_on)
    where id = new.equipment_id and company_id = new.company_id;
  end if;

  select coalesce(sum(s.quantity), 0) into _open from public.service_records s
  where s.equipment_id = _record.equipment_id and s.status <> 'done';

  update public.equipment
  set status = case
    when _open > 0 and _open >= quantity and status in ('available', 'damaged') then 'in_service'::public.equipment_status
    when (_open = 0 or _open < quantity) and status = 'in_service' then 'available'::public.equipment_status
    else status
  end
  where id = _record.equipment_id and company_id = _record.company_id;

  return null;
end;
$$;

-- Stav sa prepočíta aj pri zmene počtu kusov a pri zmazaní záznamu.
drop trigger service_records_apply_status on public.service_records;
create trigger service_records_apply_status
  after insert or delete or update of status, quantity on public.service_records
  for each row execute function public.apply_service_status();

grant update (quantity) on public.service_records to authenticated;

-- Doterajšie rozpracované záznamy platili pre všetky kusy; nech to tak ostane,
-- kým ich niekto neupraví.
update public.service_records s
set quantity = greatest(e.quantity, 1)
from public.equipment e
where e.id = s.equipment_id and s.status <> 'done' and e.quantity > 1;
