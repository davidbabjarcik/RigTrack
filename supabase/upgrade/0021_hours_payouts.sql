-- RigTrack: prevádzkové hodiny techniky (odčítané z počítadla zariadenia) a odmeny členov.

-- ---------------------------------------------------------------------------
-- Prevádzkové hodiny. Zariadenia ako hlavy či zosilňovače si hodiny počítajú samy;
-- eviduje sa interval, ako často ich treba odčítať, a každé odčítanie.
-- ---------------------------------------------------------------------------

alter table public.equipment
  add column hours_interval_months integer check (hours_interval_months between 1 and 120),
  -- Posledný odčítaný stav; zapisuje ho iba trigger z tabuľky odčítaní.
  add column operating_hours numeric(10, 1) check (operating_hours >= 0),
  add column hours_read_on date;
grant update (hours_interval_months) on public.equipment to authenticated;

create table public.equipment_hour_readings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  equipment_id uuid not null,
  read_on date not null default current_date,
  hours numeric(10, 1) not null check (hours >= 0),
  note text not null default '' check (char_length(note) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  author_name text not null default '',
  created_at timestamptz not null default now(),
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade
);
create index equipment_hour_readings_idx on public.equipment_hour_readings (equipment_id, read_on desc);

-- Kto odčítal, určuje server (rovnaká funkcia ako pri návrhoch).
create trigger equipment_hour_readings_stamp_author
  before insert on public.equipment_hour_readings
  for each row execute function public.stamp_author();

-- Najnovšie odčítanie sa premietne do techniky. SECURITY DEFINER: klient tieto stĺpce
-- priamo meniť nesmie, aby sa stav nedal prepísať bez záznamu o odčítaní.
create function public.apply_hour_reading()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.equipment
  set operating_hours = new.hours, hours_read_on = new.read_on
  where id = new.equipment_id and company_id = new.company_id
    and (hours_read_on is null or hours_read_on <= new.read_on);
  return new;
end;
$$;

create trigger equipment_hour_readings_apply
  after insert on public.equipment_hour_readings
  for each row execute function public.apply_hour_reading();

revoke execute on function public.apply_hour_reading() from public, anon;

alter table public.equipment_hour_readings enable row level security;

create policy equipment_hour_readings_select on public.equipment_hour_readings for select to authenticated
  using (public.is_company_member(company_id));
create policy equipment_hour_readings_insert on public.equipment_hour_readings for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy equipment_hour_readings_delete on public.equipment_hour_readings for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.equipment_hour_readings from anon, authenticated;
grant select, insert (company_id, equipment_id, read_on, hours, note), delete on public.equipment_hour_readings to authenticated;

-- ---------------------------------------------------------------------------
-- Odmeny členov. Zapisuje a vypláca ich iba admin; člen vidí len svoje záznamy.
-- ---------------------------------------------------------------------------

create table public.member_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  kind text not null default 'reward' check (kind in ('reward', 'advance', 'bonus', 'other')),
  happened_on date not null default current_date,
  event_id uuid,
  note text not null default '' check (char_length(note) <= 500),
  -- Prázdne = ešte nevyplatené.
  paid_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete set null (event_id)
);
create index member_payments_company_idx on public.member_payments (company_id, member_id, happened_on desc);

alter table public.member_payments enable row level security;

create policy member_payments_select on public.member_payments for select to authenticated
  using (
    public.has_role(company_id, 'admin')
    or (member_id = (select auth.uid()) and public.is_company_member(company_id))
  );
create policy member_payments_insert on public.member_payments for insert to authenticated
  with check (public.has_role(company_id, 'admin') and public.is_member_of(company_id, member_id));
create policy member_payments_update on public.member_payments for update to authenticated
  using (public.has_role(company_id, 'admin'))
  with check (public.has_role(company_id, 'admin'));
create policy member_payments_delete on public.member_payments for delete to authenticated
  using (public.has_role(company_id, 'admin'));

revoke all on public.member_payments from anon, authenticated;
grant select, insert, delete on public.member_payments to authenticated;
grant update (amount, kind, happened_on, event_id, note, paid_at) on public.member_payments to authenticated;
