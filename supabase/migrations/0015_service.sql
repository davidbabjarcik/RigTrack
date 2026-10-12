-- RigTrack: servisné záznamy techniky (oprava / kontrola / údržba).
-- Čítať môže každý člen firmy; zapisovať admin, skladník a technik; mazať admin a skladník.
-- Otvorený záznam prepne techniku do stavu „v servise“, dokončený ju vráti medzi dostupnú
-- a zapíše dátum posledného servisu (od neho sa počíta servisný interval).

create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  equipment_id uuid not null,
  kind text not null default 'repair' check (kind in ('repair', 'inspection', 'maintenance')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  happened_on date not null default current_date,
  problem text not null default '' check (char_length(problem) <= 2000),
  work_done text not null default '' check (char_length(work_done) <= 2000),
  hours numeric(6, 2) check (hours >= 0),
  cost numeric(10, 2) check (cost >= 0),
  technician text not null default '' check (char_length(technician) <= 80),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade
);
create index service_records_company_idx on public.service_records (company_id, happened_on desc);
create index service_records_equipment_idx on public.service_records (equipment_id, happened_on desc);

create trigger service_records_touch_updated_at
  before update on public.service_records
  for each row execute function public.touch_updated_at();

-- Stav záznamu sa premieta do stavu techniky.
create function public.apply_service_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    update public.equipment
    set
      status = case when status = 'in_service' then 'available'::public.equipment_status else status end,
      last_service_on = greatest(coalesce(last_service_on, new.happened_on), new.happened_on)
    where id = new.equipment_id and company_id = new.company_id;
  elsif new.status <> 'done' and (tg_op = 'INSERT' or old.status = 'done') then
    update public.equipment set status = 'in_service'
    where id = new.equipment_id and company_id = new.company_id and status in ('available', 'damaged');
  end if;
  return new;
end;
$$;

create trigger service_records_apply_status
  after insert or update of status on public.service_records
  for each row execute function public.apply_service_status();

revoke execute on function public.apply_service_status() from public, anon;

alter table public.service_records enable row level security;

create policy service_records_select on public.service_records for select to authenticated
  using (public.is_company_member(company_id));
create policy service_records_insert on public.service_records for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy service_records_update on public.service_records for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy service_records_delete on public.service_records for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.service_records from anon, authenticated;
grant select, insert, delete on public.service_records to authenticated;
grant update (kind, status, happened_on, problem, work_done, hours, cost, technician) on public.service_records to authenticated;
