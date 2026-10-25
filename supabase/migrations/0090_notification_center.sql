-- RigTrack: zvonček s upozorneniami a viac upozornení (3.10).
-- 1) Upozornenia sa dajú označiť ako prečítané a zmazať (zvonček v appke – aj bez push).
-- 2) Nové upozornenia: zmena termínu / miesta eventu alebo jeho zrušenie (posádke), odmietnutie účasti
--    (tomu, kto event založil), stretávka o hodinu (posádke) a výpožička po termíne (tomu, kto ju založil).
--    Stretávky a výpožičky kontroluje plánovač pg_cron; bez neho sa tieto dve nepošlú.

alter table public.notifications add column if not exists read_at timestamptz;
drop policy if exists notifications_update on public.notifications;
drop policy if exists notifications_delete on public.notifications;
create policy notifications_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

-- Zmena termínu, miesta alebo zrušenie eventu → všetkým z posádky (okrem tých, čo odmietli).
create or replace function public.notify_event_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _member uuid;
  _title text;
  _body text;
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    _title := 'Zrušené: ' || new.name;
    _body := to_char(new.starts_on, 'FMDD. FMMM. YYYY');
  elsif new.starts_on <> old.starts_on or new.ends_on <> old.ends_on or new.venue <> old.venue then
    _title := 'Zmena: ' || new.name;
    _body := concat_ws(' · ',
      to_char(new.starts_on, 'FMDD. FMMM. YYYY') || case when new.ends_on > new.starts_on then ' – ' || to_char(new.ends_on, 'FMDD. FMMM. YYYY') else '' end,
      nullif(new.venue, ''));
  else
    return new;
  end if;
  for _member in select distinct c.member_id from public.event_crew c where c.event_id = new.id and c.member_id is not null and c.response <> 'no' loop
    perform public.notify_user(_member, new.company_id, _title, _body, '/events/' || new.id);
  end loop;
  return new;
end;
$$;
revoke execute on function public.notify_event_changed() from public, anon, authenticated;
drop trigger if exists events_notify_changed on public.events;
create trigger events_notify_changed after update of starts_on, ends_on, venue, status on public.events
  for each row execute function public.notify_event_changed();

-- Niekto z posádky odmietol → tomu, kto event založil.
create or replace function public.notify_crew_declined()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  e record;
  _who text;
begin
  if new.response <> 'no' or old.response = 'no' then return new; end if;
  select name, created_by into e from public.events where id = new.event_id;
  if e.created_by is null then return new; end if;
  select coalesce(nullif(full_name, ''), 'Niekto') into _who from public.profiles where id = new.member_id;
  perform public.notify_user(e.created_by, new.company_id, coalesce(_who, 'Niekto') || ' nemôže: ' || e.name, nullif(new.response_note, ''), '/events/' || new.event_id);
  return new;
end;
$$;
revoke execute on function public.notify_crew_declined() from public, anon, authenticated;
drop trigger if exists event_crew_notify_declined on public.event_crew;
create trigger event_crew_notify_declined after update of response on public.event_crew
  for each row execute function public.notify_crew_declined();

-- Stretávka o hodinu a výpožička po termíne (volá plánovač).
alter table public.event_meetings add column if not exists reminded_at timestamptz;
alter table public.loans add column if not exists overdue_notified_on date;

create or replace function public.remind_meetings_and_loans()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  m record;
  l record;
  _member uuid;
  _count integer := 0;
begin
  for m in
    select em.id, em.company_id, em.event_id, em.meet_at, em.address, e.name
    from public.event_meetings em join public.events e on e.id = em.event_id
    where em.reminded_at is null and em.meet_at between now() + interval '15 minutes' and now() + interval '75 minutes' and e.status <> 'cancelled'
  loop
    for _member in select distinct c.member_id from public.event_crew c where c.event_id = m.event_id and c.member_id is not null and c.response <> 'no' loop
      -- Pripomienky plánovača idú aj tomu, kto stretávku zadal (notify_user by vynechal „seba“).
      insert into public.notifications (user_id, company_id, title, body, url)
      values (_member, m.company_id, left('Stretávka o ' || to_char(m.meet_at at time zone 'Europe/Bratislava', 'HH24:MI') || ': ' || m.name, 120), left(m.address, 300), '/events/' || m.event_id);
      _count := _count + 1;
    end loop;
    update public.event_meetings set reminded_at = now() where id = m.id;
  end loop;

  for l in
    select id, company_id, borrower, ends_on, created_by from public.loans
    where status = 'issued' and ends_on < current_date and created_by is not null
      and (overdue_notified_on is null or overdue_notified_on <= current_date - 7)
  loop
    insert into public.notifications (user_id, company_id, title, body, url)
    values (l.created_by, l.company_id, left('Výpožička po termíne: ' || l.borrower, 120), 'Mala sa vrátiť ' || to_char(l.ends_on, 'FMDD. FMMM. YYYY'), '/loans/' || l.id);
    update public.loans set overdue_notified_on = current_date where id = l.id;
    _count := _count + 1;
  end loop;
  return _count;
end;
$$;
revoke execute on function public.remind_meetings_and_loans() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'rigtrack-remind-meetings-loans';
  perform cron.schedule('rigtrack-remind-meetings-loans', '*/15 * * * *', 'select public.remind_meetings_and_loans()');
exception when others then
  raise notice 'pg_cron nie je k dispozícii – stretávky a výpožičky sa nepripomínajú';
end;
$$;
