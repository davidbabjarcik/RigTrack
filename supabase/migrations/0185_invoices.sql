-- RigTrack 10.15: faktúry. Zálohová a konečná faktúra z ponuky / eventu s údajmi vystavovateľa a klienta, položkami
-- a DPH. Číslo (RRRRNNNN, zároveň variabilný symbol) pridelí databáza v poradí za firmu a rok. Vystavená faktúra sa
-- už nemení – dá sa len označiť ako zaplatená alebo stornovať (nemaže sa). Vidí, kto vidí ponuky; vystavuje, kto
-- upravuje ponuky. Deň po splatnosti nezaplatenej faktúry príde upozornenie.

alter table public.quote_issuers add column if not exists iban text not null default '' check (char_length(iban) <= 40);
alter table public.quote_issuers add column if not exists register_note text not null default '' check (char_length(register_note) <= 200);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  number text not null default '' check (char_length(number) <= 20),
  kind text not null default 'final' check (kind in ('advance', 'final')),
  event_id uuid,
  offer_id uuid,
  issuer jsonb not null check (jsonb_typeof(issuer) = 'object' and pg_column_size(issuer) <= 4000),
  client jsonb not null check (jsonb_typeof(client) = 'object' and pg_column_size(client) <= 4000),
  lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 200 and pg_column_size(lines) <= 60000),
  issued_on date not null default current_date,
  delivered_on date not null default current_date,
  due_on date not null,
  total_net numeric(12, 2) not null,
  total_vat numeric(12, 2) not null,
  total numeric(12, 2) not null,
  note text not null default '' check (char_length(note) <= 1000),
  paid_on date,
  cancelled_at timestamptz,
  reminded_on date,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, number),
  unique (company_id, id),
  check (due_on >= issued_on),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete set null (event_id)
);
create index if not exists invoices_event_idx on public.invoices (company_id, event_id);
create index if not exists invoices_offer_idx on public.invoices (offer_id);
create index if not exists invoices_created_by_idx on public.invoices (created_by);
create index if not exists invoices_due_idx on public.invoices (due_on) where paid_on is null and cancelled_at is null;
do $$
begin
  alter table public.invoices drop constraint if exists invoices_offer_id_fkey;
  alter table public.invoices add constraint invoices_offer_id_fkey foreign key (offer_id) references public.quotes (id) on delete set null;
end;
$$;

create or replace function public.number_invoice()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _prefix text := to_char(new.issued_on, 'YYYY');
  _next integer;
begin
  perform pg_advisory_xact_lock(hashtext('invoices:' || new.company_id::text));
  select coalesce(max(substring(i.number from 5)::integer), 0) + 1 into _next
    from public.invoices i where i.company_id = new.company_id and i.number ~ ('^' || _prefix || '[0-9]{4,}$');
  new.number := _prefix || lpad(_next::text, 4, '0');
  new.created_by := auth.uid();
  new.paid_on := null;
  new.cancelled_at := null;
  new.reminded_on := null;
  -- Ponuka len z tej istej firmy.
  if new.offer_id is not null and not exists (select 1 from public.quotes q where q.id = new.offer_id and q.company_id = new.company_id) then
    new.offer_id := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.number_invoice() from public, anon, authenticated;
drop trigger if exists invoices_number on public.invoices;
create trigger invoices_number before insert on public.invoices for each row execute function public.number_invoice();

alter table public.invoices enable row level security;
drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated using (public.can(company_id, 'offers.view'));
drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices for insert to authenticated with check (public.can(company_id, 'offers.edit'));
drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices for update to authenticated
  using (public.can(company_id, 'offers.edit')) with check (public.can(company_id, 'offers.edit'));

revoke all on public.invoices from anon, authenticated;
grant select on public.invoices to authenticated;
grant insert (company_id, kind, event_id, offer_id, issuer, client, lines, issued_on, delivered_on, due_on, total_net, total_vat, total, note)
  on public.invoices to authenticated;
-- Po vystavení len zaplatenie a storno.
grant update (paid_on, cancelled_at) on public.invoices to authenticated;

-- Raz denne: deň po splatnosti nezaplatenej faktúry upozornenie tým, čo upravujú ponuky (každá faktúra raz).
create or replace function public.remind_overdue_invoices()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r record;
  _count integer := 0;
begin
  for r in
    select i.id, i.company_id, i.number, i.total, (i.client ->> 'name') as client
    from public.invoices i
    where i.paid_on is null and i.cancelled_at is null and i.reminded_on is null
      and i.due_on < (now() at time zone 'Europe/Bratislava')::date
  loop
    insert into public.notifications (user_id, company_id, title, body, url)
    select m.user_id, r.company_id, left('Faktúra ' || r.number || ' je po splatnosti', 120),
      left(coalesce(r.client, '') || ' · ' || to_char(r.total, 'FM999999990.00') || ' €', 300), '/invoices/' || r.id
    from public.company_members m
    where m.company_id = r.company_id and public.user_can(r.company_id, m.user_id, 'offers.edit');
    update public.invoices set reminded_on = current_date where id = r.id;
    _count := _count + 1;
  end loop;
  return _count;
end;
$$;
revoke execute on function public.remind_overdue_invoices() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'rigtrack-remind-overdue-invoices';
  perform cron.schedule('rigtrack-remind-overdue-invoices', '15 7 * * *', 'select public.remind_overdue_invoices()');
exception when others then
  raise notice 'pg_cron nie je k dispozícii – faktúry po splatnosti sa nepripomínajú';
end;
$$;
