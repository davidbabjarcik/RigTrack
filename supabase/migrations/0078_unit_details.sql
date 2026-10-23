-- RigTrack: údaje po kusoch (2.16).
-- Pri technike evidovanej po kusoch má každý kus vlastné inventárne a sériové číslo (číslo kusu → údaje)
-- a prevádzkové hodiny sa môžu odčítavať po kusoch (napr. každý zosilňovač zvlášť).

alter table public.equipment add column if not exists unit_info jsonb not null default '{}'
  check (jsonb_typeof(unit_info) = 'object' and char_length(unit_info::text) <= 60000);
grant update (unit_info) on public.equipment to authenticated;

alter table public.equipment_hour_readings add column if not exists unit integer check (unit > 0);
grant insert (unit) on public.equipment_hour_readings to authenticated;

-- Najnovšie odčítanie sa premietne do techniky. Pri odčítaní po kusoch platí najvyšší stav spomedzi
-- posledných odčítaní kusov a najstarší dátum (aby pripomienka čakala na kus, ktorý sa dlho nečítal).
create or replace function public.apply_hour_reading()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.unit is null then
    update public.equipment
    set operating_hours = new.hours, hours_read_on = new.read_on
    where id = new.equipment_id and company_id = new.company_id
      and (hours_read_on is null or hours_read_on <= new.read_on);
  else
    with latest as (
      select distinct on (r.unit) r.hours, r.read_on
      from public.equipment_hour_readings r
      where r.equipment_id = new.equipment_id and r.unit is not null
      order by r.unit, r.read_on desc, r.created_at desc
    )
    update public.equipment
    set operating_hours = (select max(hours) from latest), hours_read_on = (select min(read_on) from latest)
    where id = new.equipment_id and company_id = new.company_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.apply_hour_reading() from public, anon;

-- Staré čísla case / racku (napr. pôvodné nálepky), aby sa dal nájsť aj podľa nich – v Sklade aj vo vyhľadávaní.
alter table public.cases add column if not exists old_numbers text not null default '' check (char_length(old_numbers) <= 200);
grant update (old_numbers) on public.cases to authenticated;
