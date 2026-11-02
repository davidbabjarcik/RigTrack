-- RigTrack 6.11: činnosti pri eventoch majú fázu – pred eventom (nakladanie), na evente, po evente (vykladanie, kontrola
-- a naskladnenie hliníka, kontrola kabeláže). Existujúcim sa fáza odhadne podľa názvu.

alter table public.company_duty_types add column if not exists phase text not null default 'event';
do $$
begin
  alter table public.company_duty_types drop constraint if exists company_duty_types_phase_check;
  alter table public.company_duty_types add constraint company_duty_types_phase_check check (phase in ('before', 'event', 'after'));
end;
$$;
grant update (phase) on public.company_duty_types to authenticated;

update public.company_duty_types set phase = 'after'
where phase = 'event' and (name ilike '%vyklad%' or name ilike '%kontrol%' or name ilike '%naskladn%' or name ilike '%upratan%');
update public.company_duty_types set phase = 'before'
where phase = 'event' and (name ilike 'naklad%' or name ilike '%príprav%' or name ilike '%balen%');
