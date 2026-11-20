-- RigTrack 10.5: pripomienka vrátenia techniky. Deň po skončení eventu, ktorý mal techniku a vrátenie ešte nie je
-- uzavreté, príde upozornenie posádke eventu (kto nepovedal „nemôžem“) a tým, čo upravujú eventy. Každý event sa
-- pripomenie len raz (aj keď plánovač beží viackrát); keď plánovač deň vynechá, dobehne to do 3 dní.

create table if not exists public.event_return_reminded (
  company_id uuid not null,
  event_id uuid not null,
  reminded_on date not null default current_date,
  primary key (company_id, event_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
alter table public.event_return_reminded enable row level security;
revoke all on public.event_return_reminded from anon, authenticated;

create or replace function public.remind_event_returns()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _today date := (now() at time zone 'Europe/Bratislava')::date;
  r record;
  _count integer := 0;
begin
  for r in
    select e.company_id, e.id, e.name
    from public.events e
    where e.ends_on between _today - 3 and _today - 1
      and e.status <> 'cancelled'
      and exists (select 1 from public.event_equipment ee where ee.event_id = e.id)
      and not exists (select 1 from public.event_returns x where x.company_id = e.company_id and x.event_id = e.id)
      and not exists (select 1 from public.event_return_reminded x where x.company_id = e.company_id and x.event_id = e.id)
  loop
    insert into public.notifications (user_id, company_id, title, body, url)
    select who.user_id, r.company_id, left('Vrátiť techniku: ' || r.name, 120),
      'Event skončil a vrátenie ešte nie je uzavreté – skontrolujte, či sa všetko vrátilo.',
      '/events/' || r.id || '?tab=gear'
    from (
      select c.member_id as user_id from public.event_crew c
      where c.event_id = r.id and c.member_id is not null and c.response <> 'no'
      union
      select m.user_id from public.company_members m
      where m.company_id = r.company_id and public.user_can(r.company_id, m.user_id, 'events.edit')
    ) who
    -- Len kto je stále vo firme.
    where exists (select 1 from public.company_members m where m.company_id = r.company_id and m.user_id = who.user_id);
    _count := _count + 1;
    insert into public.event_return_reminded (company_id, event_id) values (r.company_id, r.id) on conflict do nothing;
  end loop;
  return _count;
end;
$$;
revoke execute on function public.remind_event_returns() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'rigtrack-remind-event-returns';
  perform cron.schedule('rigtrack-remind-event-returns', '0 7 * * *', 'select public.remind_event_returns()');
exception when others then
  raise notice 'pg_cron nie je k dispozícii – vrátenie techniky sa nepripomína';
end;
$$;
