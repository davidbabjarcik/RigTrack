-- 0176: žiadosť o archívnu techniku na event.
-- Kto upravuje eventy, môže požiadať o archívnu techniku; CEO (vo firme bez CEO admin) žiadosť schváli alebo
-- zamietne. Schválená sa sama pridá na event. CEO dostane upozornenie o žiadosti, žiadateľ o rozhodnutí.

-- Kto smie používať archívnu techniku – jedno miesto pre pravidlo z 0175.
create or replace function public.can_use_archived(_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role(_company_id, 'ceo')
    or (public.has_role(_company_id, 'admin')
        and not exists (select 1 from public.company_members m where m.company_id = _company_id and m.role = 'ceo'));
$$;
revoke execute on function public.can_use_archived(uuid) from public, anon;
grant execute on function public.can_use_archived(uuid) to authenticated;

create or replace function public.check_equipment_usable()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _status text;
begin
  select e.status::text into _status from public.equipment e where e.company_id = new.company_id and e.id = new.equipment_id;
  if _status = 'sold' then
    raise exception 'Predaná technika sa nedá pridať.' using errcode = 'check_violation';
  end if;
  if _status = 'archived' and not public.can_use_archived(new.company_id) then
    raise exception 'Archívnu techniku môže pridať len CEO firmy.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_equipment_usable() from public, anon;

create table if not exists public.equipment_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  equipment_id uuid not null,
  quantity integer not null default 1 check (quantity between 1 and 10000),
  note text not null default '' check (char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  answer text not null default '' check (char_length(answer) <= 300),
  requested_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade,
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade
);
create index if not exists equipment_requests_event_idx on public.equipment_requests (company_id, event_id);
create index if not exists equipment_requests_equipment_idx on public.equipment_requests (company_id, equipment_id);
create index if not exists equipment_requests_requested_by_idx on public.equipment_requests (requested_by);
create index if not exists equipment_requests_decided_by_idx on public.equipment_requests (decided_by);

alter table public.equipment_requests enable row level security;
drop policy if exists equipment_requests_select on public.equipment_requests;
drop policy if exists equipment_requests_insert on public.equipment_requests;
drop policy if exists equipment_requests_delete on public.equipment_requests;
-- Vidí žiadateľ, kto vidí eventy, a ten, kto rozhoduje.
create policy equipment_requests_select on public.equipment_requests for select to authenticated
  using (requested_by = (select auth.uid()) or public.can(company_id, 'events.view') or public.can_use_archived(company_id));
-- Žiadať môže, kto upravuje eventy, a len o archívnu techniku vlastnej firmy.
create policy equipment_requests_insert on public.equipment_requests for insert to authenticated
  with check (
    requested_by = (select auth.uid()) and status = 'pending' and decided_by is null and answer = ''
    and public.can(company_id, 'events.edit')
    and exists (select 1 from public.equipment e where e.company_id = equipment_requests.company_id and e.id = equipment_id and e.status = 'archived')
  );
-- Nevybavenú žiadosť môže žiadateľ zrušiť.
create policy equipment_requests_delete on public.equipment_requests for delete to authenticated
  using (requested_by = (select auth.uid()) and status = 'pending');
grant select, insert, delete on public.equipment_requests to authenticated;

-- Upozornenie tomu, kto rozhoduje (CEO, vo firme bez CEO admini).
create or replace function public.notify_equipment_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _has_ceo boolean;
  _title text;
  _item text;
begin
  select exists (select 1 from public.company_members m where m.company_id = new.company_id and m.role = 'ceo') into _has_ceo;
  select e.name into _title from public.events e where e.company_id = new.company_id and e.id = new.event_id;
  select q.name into _item from public.equipment q where q.company_id = new.company_id and q.id = new.equipment_id;
  insert into public.notifications (user_id, company_id, title, body, url)
  select m.user_id, new.company_id, 'Žiadosť o archívnu techniku',
    left(concat_ws(' · ', new.quantity || '× ' || coalesce(_item, 'technika'), _title, nullif(new.note, '')), 300),
    '/events/' || new.event_id || '?tab=gear'
  from public.company_members m
  where m.company_id = new.company_id
    and m.user_id <> new.requested_by
    and (m.role = 'ceo' or (not _has_ceo and m.role = 'admin'));
  return new;
end;
$$;
revoke execute on function public.notify_equipment_request() from public, anon;
drop trigger if exists equipment_requests_notify on public.equipment_requests;
create trigger equipment_requests_notify after insert on public.equipment_requests
  for each row execute function public.notify_equipment_request();

-- Rozhodnutie: schválená žiadosť pridá techniku na event (k už pridaným kusom sa pripočíta).
create or replace function public.decide_equipment_request(_id uuid, _approve boolean, _answer text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.equipment_requests;
  _item text;
begin
  select * into r from public.equipment_requests where id = _id for update;
  if r.id is null or not public.can_use_archived(r.company_id) then
    raise exception 'O tejto žiadosti nemôžete rozhodnúť.' using errcode = 'insufficient_privilege';
  end if;
  if r.status <> 'pending' then
    raise exception 'O žiadosti už bolo rozhodnuté.' using errcode = 'check_violation';
  end if;
  if _approve then
    insert into public.event_equipment (company_id, event_id, equipment_id, quantity)
    values (r.company_id, r.event_id, r.equipment_id, r.quantity)
    on conflict (event_id, equipment_id) do update set quantity = public.event_equipment.quantity + excluded.quantity;
  end if;
  update public.equipment_requests
    set status = case when _approve then 'approved' else 'rejected' end, decided_by = auth.uid(), decided_at = now(),
        answer = left(coalesce(_answer, ''), 300)
    where id = r.id;
  select q.name into _item from public.equipment q where q.company_id = r.company_id and q.id = r.equipment_id;
  if r.requested_by <> auth.uid() then
    insert into public.notifications (user_id, company_id, title, body, url)
    values (
      r.requested_by, r.company_id,
      case when _approve then 'Archívna technika schválená' else 'Archívna technika zamietnutá' end,
      left(concat_ws(' · ', r.quantity || '× ' || coalesce(_item, 'technika'), nullif(_answer, '')), 300),
      '/events/' || r.event_id || '?tab=gear'
    );
  end if;
end;
$$;
revoke execute on function public.decide_equipment_request(uuid, boolean, text) from public, anon;
grant execute on function public.decide_equipment_request(uuid, boolean, text) to authenticated;
