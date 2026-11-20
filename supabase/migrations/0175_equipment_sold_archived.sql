-- 0175: predaná a archívna technika.
-- Predaná: firma ju už nemá, ale v technike ostáva (história, komu a kedy). Archívna: firma ju má, no bežne
-- sa nepoužíva – na event alebo výpožičku ju smie pridať len CEO firmy (pravidlo je aj v databáze, nielen v appke).
-- Nové hodnoty typu sa tu nikde nepoužívajú priamo (len v tele funkcie), takže migrácia beží v jednej transakcii.

alter type public.equipment_status add value if not exists 'sold';
alter type public.equipment_status add value if not exists 'archived';

-- Kedy, komu a za koľko sa technika predala, je v attributes (soldOn, soldTo, soldPrice) – netreba nové stĺpce.

-- Archívnu techniku na event / výpožičku pridá len CEO (vo firme bez CEO admin); predanú nikto.
create or replace function public.check_equipment_usable()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _status text;
begin
  select e.status::text into _status from public.equipment e where e.company_id = new.company_id and e.id = new.equipment_id;
  if _status = 'sold' then
    raise exception 'Predaná technika sa nedá pridať.' using errcode = 'check_violation';
  end if;
  -- Firma bez CEO: archívnu techniku pridá admin (inak by sa nedala pridať vôbec).
  if _status = 'archived' and not (
    public.has_role(new.company_id, 'ceo')
    or (public.has_role(new.company_id, 'admin')
        and not exists (select 1 from public.company_members m where m.company_id = new.company_id and m.role = 'ceo'))
  ) then
    raise exception 'Archívnu techniku môže pridať len CEO firmy.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_equipment_usable() from public, anon;

drop trigger if exists event_equipment_usable on public.event_equipment;
create trigger event_equipment_usable before insert or update of equipment_id on public.event_equipment
  for each row execute function public.check_equipment_usable();
drop trigger if exists loan_items_usable on public.loan_items;
create trigger loan_items_usable before insert or update of equipment_id on public.loan_items
  for each row execute function public.check_equipment_usable();
