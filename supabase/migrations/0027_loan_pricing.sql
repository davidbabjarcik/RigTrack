-- RigTrack: ceny výpožičiek.
-- Technika má cenu prenájmu za deň; výpožička si pri vzniku zapíše cenu každej položky,
-- počet účtovaných dní, prípadnú dohodnutú cenu, kauciu a fakturačné údaje vypožičiavateľa.

-- Fotka vozidla (pôvodne 0026). Zopakované tu, aby stĺpec vznikol, aj keby 0026 nebežala.
alter table public.vehicles
  add column if not exists photo_path text not null default '' check (char_length(photo_path) <= 300);
grant update (photo_path) on public.vehicles to authenticated;

alter table public.equipment add column rental_price numeric(10, 2) check (rental_price >= 0);
grant update (rental_price) on public.equipment to authenticated;

alter table public.loans
  add column borrower_ico text not null default '' check (char_length(borrower_ico) <= 20),
  add column borrower_address text not null default '' check (char_length(borrower_address) <= 200),
  -- Prázdne = účtujú sa kalendárne dni od–do vrátane.
  add column billed_days integer check (billed_days between 1 and 3650),
  -- Prázdne = platí vypočítaná cena (súčet položiek × dni).
  add column price numeric(10, 2) check (price >= 0),
  add column deposit numeric(10, 2) check (deposit >= 0);
alter table public.loan_items
  -- Cena za kus a deň v čase výpožičky; neskoršia zmena cenníka ju nemení.
  add column unit_price numeric(10, 2) check (unit_price >= 0);

grant update (borrower_ico, borrower_address, billed_days, price, deposit) on public.loans to authenticated;
grant update (unit_price) on public.loan_items to authenticated;

-- Vytvorí výpožičku cez create_loan (všetky kontroly dostupnosti) a v tej istej transakcii
-- k nej zapíše ceny a fakturačné údaje.
create function public.create_priced_loan(_company_id uuid, _loan jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _loan_id uuid;
begin
  _loan_id := public.create_loan(_company_id, _loan, _items);

  update public.loans
  set
    borrower_ico = coalesce(trim(_loan ->> 'borrower_ico'), ''),
    borrower_address = coalesce(trim(_loan ->> 'borrower_address'), ''),
    billed_days = (_loan ->> 'billed_days')::integer,
    price = (_loan ->> 'price')::numeric,
    deposit = (_loan ->> 'deposit')::numeric
  where id = _loan_id;

  update public.loan_items li
  set unit_price = (i.value ->> 'unit_price')::numeric
  from jsonb_array_elements(_items) i
  where li.loan_id = _loan_id and li.equipment_id = (i.value ->> 'equipment_id')::uuid;

  return _loan_id;
end;
$$;

revoke execute on function public.create_priced_loan(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_priced_loan(uuid, jsonb, jsonb) to authenticated;
