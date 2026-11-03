-- RigTrack 7.17: vrátenie po evente. Kto uzavrel vrátenie, kedy a čo pri tom chýbalo (zoznam názvov). Zapisuje sa
-- len cez funkcie: uzavrieť smie, kto upravuje eventy, alebo člen posádky eventu; znova otvoriť len ten, kto upravuje
-- eventy. Hlásenia (incidents) majú nový druh „loss“ (strata).

create table if not exists public.event_returns (
  company_id uuid not null,
  event_id uuid not null,
  closed_at timestamptz not null default now(),
  closed_by uuid,
  closed_by_name text not null default '' check (char_length(closed_by_name) <= 120),
  missing jsonb not null default '[]'::jsonb check (jsonb_typeof(missing) = 'array' and jsonb_array_length(missing) <= 500 and pg_column_size(missing) <= 40000),
  primary key (company_id, event_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
alter table public.event_returns enable row level security;
drop policy if exists event_returns_select on public.event_returns;
create policy event_returns_select on public.event_returns for select to authenticated using (public.can(company_id, 'events.view'));
revoke all on public.event_returns from anon, authenticated;
grant select on public.event_returns to authenticated;

create or replace function public.close_event_return(_event_id uuid, _missing jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select company_id into _company from public.events where id = _event_id;
  if _company is null or not (public.can(_company, 'events.edit') or public.is_event_crew(_event_id)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if _missing is null or jsonb_typeof(_missing) <> 'array' or jsonb_array_length(_missing) > 500 then
    raise exception 'Invalid list' using errcode = '22023';
  end if;
  insert into public.event_returns (company_id, event_id, closed_at, closed_by, closed_by_name, missing)
  values (_company, _event_id, now(), auth.uid(), left(coalesce(public.actor_name(), ''), 120), _missing)
  on conflict (company_id, event_id) do update
    set closed_at = excluded.closed_at, closed_by = excluded.closed_by, closed_by_name = excluded.closed_by_name, missing = excluded.missing;
end;
$$;

create or replace function public.reopen_event_return(_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select company_id into _company from public.events where id = _event_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  delete from public.event_returns where company_id = _company and event_id = _event_id;
end;
$$;

revoke execute on function public.close_event_return(uuid, jsonb) from public, anon;
revoke execute on function public.reopen_event_return(uuid) from public, anon;
grant execute on function public.close_event_return(uuid, jsonb) to authenticated;
grant execute on function public.reopen_event_return(uuid) to authenticated;

-- Strata ako druh hlásenia.
do $$
begin
  alter table public.incidents drop constraint if exists incidents_kind_check;
  alter table public.incidents add constraint incidents_kind_check check (kind in ('damage', 'injury', 'loss'));
end;
$$;
