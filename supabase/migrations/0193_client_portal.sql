-- 0193: Jeden odkaz pre klienta k akcii (k/:token): názov, termín, miesto, logo firmy a odkazy na to, čo mu firma
-- už zdieľala – cenové ponuky a zmluvy s vlastným odkazom a po akcii hodnotenie. Nič nezdieľané sa neukáže.
-- Odkaz vytvorí a zruší len ten, kto upravuje eventy.

alter table public.events add column if not exists client_token uuid;
create unique index if not exists events_client_token_idx on public.events (client_token) where client_token is not null;

create or replace function public.share_event_client(_event_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _token uuid;
begin
  select company_id, client_token into _company, _token from public.events where id = _event_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Event neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _token is null then
    _token := gen_random_uuid();
    update public.events set client_token = _token where id = _event_id;
  end if;
  return _token;
end;
$$;
revoke execute on function public.share_event_client(uuid) from public, anon;
grant execute on function public.share_event_client(uuid) to authenticated;

create or replace function public.unshare_event_client(_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
begin
  select company_id into _company from public.events where id = _event_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Event neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  update public.events set client_token = null where id = _event_id;
end;
$$;
revoke execute on function public.unshare_event_client(uuid) from public, anon;
grant execute on function public.unshare_event_client(uuid) to authenticated;

-- Pre klienta: len údaje akcie a odkazy na už zdieľané dokumenty (ich tokeny), nič iné.
create or replace function public.get_event_client(_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'event', e.name, 'startsOn', e.starts_on, 'endsOn', e.ends_on, 'venue', e.venue, 'status', e.status,
    'companyName', co.name, 'logoPath', co.logo_path, 'logoStyle', co.logo_style,
    'offers', coalesce((
      select jsonb_agg(jsonb_build_object('title', q.title, 'number', q.number, 'status', q.status, 'token', q.share_token) order by q.created_at)
      from public.quotes q
      where q.company_id = e.company_id and q.event_id = e.id and q.share_token is not null
    ), '[]'::jsonb),
    'contracts', coalesce((
      select jsonb_agg(jsonb_build_object('number', c.number, 'signed', c.client_signature is not null, 'token', c.share_token) order by c.created_at)
      from public.event_contracts c
      where c.company_id = e.company_id and c.event_id = e.id and c.share_token is not null
    ), '[]'::jsonb),
    'rating', (
      select jsonb_build_object('token', r.token, 'rated', r.rated_at is not null)
      from public.event_ratings r where r.company_id = e.company_id and r.event_id = e.id
    )
  )
  from public.events e
  join public.companies co on co.id = e.company_id
  where _token is not null and e.client_token = _token and e.status <> 'cancelled';
$$;
revoke execute on function public.get_event_client(uuid) from public;
grant execute on function public.get_event_client(uuid) to anon, authenticated;

-- Logo firmy sa ukáže aj na stránke pre klienta (nielen pri hodnotení).
create or replace function public.is_rating_logo(_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.companies c
    where c.logo_path <> '' and c.logo_path = _path
      and (
        exists (select 1 from public.event_ratings r where r.company_id = c.id)
        or exists (select 1 from public.events e where e.company_id = c.id and e.client_token is not null)
      )
  )
$$;
revoke execute on function public.is_rating_logo(text) from public;
grant execute on function public.is_rating_logo(text) to anon, authenticated;
