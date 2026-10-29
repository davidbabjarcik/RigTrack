-- RigTrack 5.8: viac počítadiel hodín pri technike (napr. prevádzka a výbojka). Odčítanie má názov počítadla;
-- prázdny = hlavné počítadlo (prevádzkové hodiny), ostatné (napr. „Výbojka“) stav na technike nemenia.

alter table public.equipment_hour_readings add column if not exists counter text not null default '';

do $$
begin
  alter table public.equipment_hour_readings drop constraint if exists equipment_hour_readings_counter_check;
  alter table public.equipment_hour_readings add constraint equipment_hour_readings_counter_check check (char_length(counter) <= 40);
end;
$$;

grant insert (counter) on public.equipment_hour_readings to authenticated;

create or replace function public.apply_hour_reading()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Ďalšie počítadlá (výbojka…) sa len zapíšu; prevádzkové hodiny techniky mení len hlavné.
  if coalesce(new.counter, '') <> '' then
    return new;
  end if;
  if new.unit is null then
    update public.equipment
    set operating_hours = new.hours, hours_read_on = new.read_on
    where id = new.equipment_id and company_id = new.company_id
      and (hours_read_on is null or hours_read_on <= new.read_on);
  else
    with latest as (
      select distinct on (r.unit) r.hours, r.read_on
      from public.equipment_hour_readings r
      where r.equipment_id = new.equipment_id and r.unit is not null and coalesce(r.counter, '') = ''
      order by r.unit, r.read_on desc, r.created_at desc
    )
    update public.equipment
    set operating_hours = (select max(hours) from latest), hours_read_on = (select min(read_on) from latest)
    where id = new.equipment_id and company_id = new.company_id;
  end if;
  return new;
end;
$$;
