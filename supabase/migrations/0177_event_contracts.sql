-- 0177: uložené zmluvy k eventu.
-- Zmluva sa pri uložení očísluje (Z2026-001…) a zostane, ako bola – údaje strán a podmienky sú uložené celé,
-- aby neskoršia zmena eventu alebo kontaktu zmluvu nezmenila. K zmluve sa dá podpísať prstom (klient aj my).
-- Vidí a mení ten, kto upravuje eventy (rovnako ako stránka zmluvy).

create table if not exists public.event_contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  number text not null default '' check (char_length(number) <= 20),
  kind text not null default 'service' check (kind in ('service', 'rental')),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 60000),
  client_signer text not null default '' check (char_length(client_signer) <= 120),
  client_signature text check (client_signature is null or (client_signature like 'data:image/png;base64,%' and char_length(client_signature) <= 400000)),
  supplier_signer text not null default '' check (char_length(supplier_signer) <= 120),
  supplier_signature text check (supplier_signature is null or (supplier_signature like 'data:image/png;base64,%' and char_length(supplier_signature) <= 400000)),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, number),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists event_contracts_event_idx on public.event_contracts (company_id, event_id);
create index if not exists event_contracts_created_by_idx on public.event_contracts (created_by);

-- Číslo zmluvy: Z + rok + poradie v roku v rámci firmy (Z2026-001).
create or replace function public.number_event_contract()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _prefix text := 'Z' || to_char(now(), 'YYYY') || '-';
  _next integer;
begin
  perform pg_advisory_xact_lock(hashtext('event_contracts:' || new.company_id::text));
  select coalesce(max(nullif(substring(c.number from length(_prefix) + 1), '')::integer), 0) + 1 into _next
    from public.event_contracts c where c.company_id = new.company_id and c.number like _prefix || '%' and substring(c.number from length(_prefix) + 1) ~ '^[0-9]+$';
  new.number := _prefix || lpad(_next::text, 3, '0');
  new.created_by := auth.uid();
  return new;
end;
$$;
revoke execute on function public.number_event_contract() from public, anon;
drop trigger if exists event_contracts_number on public.event_contracts;
create trigger event_contracts_number before insert on public.event_contracts
  for each row execute function public.number_event_contract();

alter table public.event_contracts enable row level security;
drop policy if exists event_contracts_select on public.event_contracts;
drop policy if exists event_contracts_insert on public.event_contracts;
drop policy if exists event_contracts_update on public.event_contracts;
drop policy if exists event_contracts_delete on public.event_contracts;
create policy event_contracts_select on public.event_contracts for select to authenticated using (public.can(company_id, 'events.edit'));
create policy event_contracts_insert on public.event_contracts for insert to authenticated with check (public.can(company_id, 'events.edit'));
create policy event_contracts_update on public.event_contracts for update to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
create policy event_contracts_delete on public.event_contracts for delete to authenticated using (public.can(company_id, 'events.edit'));
grant select, insert, delete on public.event_contracts to authenticated;
-- Po uložení sa menia len podpisy; obsah zmluvy ostáva, ako bol.
grant update (client_signer, client_signature, supplier_signer, supplier_signature) on public.event_contracts to authenticated;

-- Bez auditu: podpisy sú obrázky a história by zbytočne rástla.
