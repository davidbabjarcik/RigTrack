-- RigTrack: história cenových ponúk a automatické prenášanie zmien vlastnej techniky (3.13).

-- 1) Uložené ponuky: presná kópia ponuky v čase uloženia (riadky, sumy, nastavenia), číslo v rámci roka
--    (2026/1, 2026/2…) a stav (poslaná, prijatá, odmietnutá).
create table if not exists public.event_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  year integer not null default extract(year from now())::integer,
  number integer not null default 0,
  total numeric(12, 2) not null default 0,
  status text not null default 'sent' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object' and char_length(data::text) <= 200000),
  note text not null default '' check (char_length(note) <= 500),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists event_quotes_event_idx on public.event_quotes (company_id, event_id, created_at desc);
create unique index if not exists event_quotes_number_idx on public.event_quotes (company_id, year, number);

-- Číslo ponuky pridelí databáza: najvyššie v roku + 1.
create or replace function public.event_quotes_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('event_quotes:' || new.company_id::text || ':' || new.year::text));
  select coalesce(max(number), 0) + 1 into new.number from public.event_quotes where company_id = new.company_id and year = new.year;
  return new;
end;
$$;
revoke execute on function public.event_quotes_number() from public, anon, authenticated;
drop trigger if exists event_quotes_number on public.event_quotes;
create trigger event_quotes_number before insert on public.event_quotes for each row execute function public.event_quotes_number();

alter table public.event_quotes enable row level security;
drop policy if exists event_quotes_select on public.event_quotes;
drop policy if exists event_quotes_insert on public.event_quotes;
drop policy if exists event_quotes_update on public.event_quotes;
drop policy if exists event_quotes_delete on public.event_quotes;
create policy event_quotes_select on public.event_quotes for select to authenticated using (public.can(company_id, 'events.view'));
create policy event_quotes_insert on public.event_quotes for insert to authenticated with check (public.can(company_id, 'events.edit'));
create policy event_quotes_update on public.event_quotes for update to authenticated using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
create policy event_quotes_delete on public.event_quotes for delete to authenticated using (public.can(company_id, 'events.edit'));
revoke all on public.event_quotes from anon, authenticated;
grant select, insert, delete on public.event_quotes to authenticated;
grant update (status, note) on public.event_quotes to authenticated;

-- 2) Vlastná technika vo viacerých firmách (0085): zmena pôvodnej položky sa do kópií prenesie sama
--    (doteraz tlačidlom „Aktualizovať kópie“).
create or replace function public.equipment_sync_copies()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.shared_from is not null then return new; end if;
  update public.equipment c
    set name = new.name, kind = new.kind, attributes = new.attributes, manufacturer = new.manufacturer, model = new.model,
        serial_number = new.serial_number, quantity = new.quantity, track_units = new.track_units, unit_ids = new.unit_ids, note = new.note
    where c.shared_from = new.id
      and (c.name, c.kind, c.attributes, c.manufacturer, c.model, c.serial_number, c.quantity, c.track_units, c.unit_ids, c.note)
          is distinct from (new.name, new.kind, new.attributes, new.manufacturer, new.model, new.serial_number, new.quantity, new.track_units, new.unit_ids, new.note);
  return new;
end;
$$;
revoke execute on function public.equipment_sync_copies() from public, anon, authenticated;
drop trigger if exists equipment_sync_copies on public.equipment;
create trigger equipment_sync_copies after update of name, kind, attributes, manufacturer, model, serial_number, quantity, track_units, unit_ids, note on public.equipment
  for each row when (new.shared_from is null) execute function public.equipment_sync_copies();
