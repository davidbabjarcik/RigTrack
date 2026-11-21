-- RigTrack 10.13: potvrdenie termínu cez odkaz. Kto upravuje eventy, vytvorí pre človeka z posádky (najmä externistu
-- bez účtu, napr. DJ alebo technik) tajný odkaz. Cez neho bez prihlásenia vidí len názov akcie, termín, miesto, časy
-- a svoju rolu a potvrdí, že môže, alebo napíše, prečo nie. Odpoveď sa dá zmeniť, kým event neskončil. Tým, čo
-- upravujú eventy, príde upozornenie. Nič iné z firmy cez odkaz nevidno.

alter table public.event_crew add column if not exists invite_token uuid;
create unique index if not exists event_crew_invite_token_idx on public.event_crew (invite_token) where invite_token is not null;

create or replace function public.share_crew_invite(_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _token uuid;
begin
  select company_id, invite_token into _company, _token from public.event_crew where id = _id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Človek v posádke neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _token is null then
    _token := gen_random_uuid();
    update public.event_crew set invite_token = _token where id = _id;
  end if;
  return _token;
end;
$$;
revoke execute on function public.share_crew_invite(uuid) from public, anon;
grant execute on function public.share_crew_invite(uuid) to authenticated;

create or replace function public.get_crew_invite(_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', c.name, 'role', c.role, 'response', c.response, 'responseNote', c.response_note,
    'event', e.name, 'startsOn', e.starts_on, 'endsOn', e.ends_on, 'venue', e.venue, 'status', e.status,
    'getInTime', e.get_in_time, 'showTime', e.show_time, 'showEndTime', e.show_end_time,
    'companyName', co.name
  )
  from public.event_crew c
  join public.events e on e.company_id = c.company_id and e.id = c.event_id
  join public.companies co on co.id = c.company_id
  where _token is not null and c.invite_token = _token;
$$;
revoke execute on function public.get_crew_invite(uuid) from public;
grant execute on function public.get_crew_invite(uuid) to anon, authenticated;

create or replace function public.respond_crew_invite(_token uuid, _response text, _note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c public.event_crew%rowtype;
  e public.events%rowtype;
  _who text;
begin
  select * into c from public.event_crew where _token is not null and invite_token = _token for update;
  if not found then
    raise exception 'Pozvánka sa nenašla' using errcode = 'no_data_found';
  end if;
  select * into e from public.events where company_id = c.company_id and id = c.event_id;
  if e.status = 'cancelled' or e.ends_on < (now() at time zone 'Europe/Bratislava')::date then
    raise exception 'Event už skončil alebo je zrušený' using errcode = 'check_violation';
  end if;
  if _response not in ('yes', 'no') then
    raise exception 'Neplatná odpoveď' using errcode = 'check_violation';
  end if;
  if _response = 'no' and char_length(trim(coalesce(_note, ''))) not between 1 and 300 then
    raise exception 'Napíšte, prečo nemôžete' using errcode = 'check_violation';
  end if;
  update public.event_crew
    set response = _response, response_note = case when _response = 'no' then left(trim(_note), 300) else '' end
    where id = c.id;
  _who := coalesce(nullif(trim(c.name), ''), (select nullif(trim(p.full_name), '') from public.profiles p where p.id = c.member_id), 'Človek z posádky');
  insert into public.notifications (user_id, company_id, title, body, url)
  select m.user_id, c.company_id,
    left(_who || case when _response = 'yes' then ' potvrdil(a) ' else ' nemôže na ' end || e.name, 120),
    case when _response = 'no' then left(trim(_note), 300) else '' end,
    '/events/' || e.id || '?tab=crew'
  from public.company_members m
  where m.company_id = c.company_id and public.user_can(c.company_id, m.user_id, 'events.edit');
end;
$$;
revoke execute on function public.respond_crew_invite(uuid, text, text) from public;
grant execute on function public.respond_crew_invite(uuid, text, text) to anon, authenticated;
