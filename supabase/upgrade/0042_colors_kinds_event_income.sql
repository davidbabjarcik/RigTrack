-- RigTrack: farby kategórií, nové druhy techniky a príjmy z eventov.
--
-- 1) Kategória techniky má farbu; v zozname techniky je ňou prúžok pred fotkou
--    (napr. svetlá zelené, zvuk ružový, pódium žlté, hliník/truss červený).
-- 2) Druhy techniky „Hliník / truss“ a „Pódium“ (dosky, nohy, zábradlia a ich príslušenstvo).
-- 3) Príjmy z eventu: koľko firma za akciu dostala – v hotovosti, na účet alebo faktúrou
--    (cez ktorú firmu), suma s DPH alebo bez DPH.
--    Sú to peniaze, preto ich vidí a zapisuje ten, kto spravuje odmeny (payouts.manage).

alter table public.equipment_categories
  add column color text check (color in ('green', 'pink', 'yellow', 'red', 'blue', 'purple', 'orange', 'teal', 'gray'));
grant update (color) on public.equipment_categories to authenticated;

alter table public.equipment
  drop constraint equipment_kind_check,
  add constraint equipment_kind_check check (kind in ('general', 'cable', 'light', 'audio', 'truss', 'stage', 'consumable'));

create table public.event_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  amount numeric(10, 2) not null check (amount > 0 and amount < 10000000),
  method text not null check (method in ('cash', 'account', 'invoice')),
  -- Pri faktúre: cez ktorú firmu sa fakturovalo (napr. JEF alebo JEF Production).
  invoiced_by text not null default '' check (char_length(invoiced_by) <= 120),
  -- Suma je zadaná s DPH alebo bez DPH; sadzba DPH, ak je známa.
  vat text not null default 'with' check (vat in ('with', 'without')),
  vat_rate numeric(4, 1) check (vat_rate between 0 and 50),
  received_on date not null default current_date,
  note text not null default '' check (char_length(note) <= 300),
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index event_payments_event_idx on public.event_payments (event_id);

create function public.stamp_event_payment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.created_by_name := public.actor_name();
  return new;
end;
$$;
create trigger event_payments_stamp before insert on public.event_payments
  for each row execute function public.stamp_event_payment();

alter table public.event_payments enable row level security;

create policy event_payments_select on public.event_payments for select to authenticated
  using (public.can(company_id, 'payouts.manage'));
create policy event_payments_insert on public.event_payments for insert to authenticated
  with check (public.can(company_id, 'payouts.manage'));
create policy event_payments_delete on public.event_payments for delete to authenticated
  using (public.can(company_id, 'payouts.manage'));

revoke all on public.event_payments from anon, authenticated;
grant select, insert, delete on public.event_payments to authenticated;
revoke execute on function public.stamp_event_payment() from public, anon, authenticated;
