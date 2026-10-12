-- RigTrack: výpožičky techniky.
-- Priebeh: rezervované → vydané → vrátené (alebo vrátené s poškodením).
-- Čítať môže každý člen firmy; vytvárať, vydávať a prijímať späť admin, skladník a technik;
-- mazať admin a skladník, ale nie výpožičku, ktorá je práve vydaná.

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  borrower text not null check (char_length(trim(borrower)) between 1 and 120),
  contact text not null default '' check (char_length(contact) <= 120),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'reserved' check (status in ('reserved', 'issued', 'returned', 'damaged')),
  note text not null default '' check (char_length(note) <= 2000),
  issued_at timestamptz,
  returned_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (company_id, id)
);
create index loans_company_idx on public.loans (company_id, starts_on desc);

create table public.loan_items (
  company_id uuid not null,
  loan_id uuid not null,
  equipment_id uuid not null,
  quantity integer not null check (quantity between 1 and 100000),
  damaged boolean not null default false,
  primary key (loan_id, equipment_id),
  foreign key (company_id, loan_id) references public.loans (company_id, id) on delete cascade,
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade
);
create index loan_items_equipment_idx on public.loan_items (equipment_id);

alter table public.loans enable row level security;
alter table public.loan_items enable row level security;

create policy loans_select on public.loans for select to authenticated
  using (public.is_company_member(company_id));
create policy loans_insert on public.loans for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy loans_update on public.loans for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy loans_delete on public.loans for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik') and status <> 'issued');

create policy loan_items_select on public.loan_items for select to authenticated
  using (public.is_company_member(company_id));
create policy loan_items_insert on public.loan_items for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy loan_items_update on public.loan_items for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

revoke all on public.loans, public.loan_items from anon, authenticated;
grant select, insert, delete on public.loans to authenticated;
grant update (borrower, contact, note, status, issued_at, returned_at) on public.loans to authenticated;
grant select, insert, update (damaged) on public.loan_items to authenticated;

-- ---------------------------------------------------------------------------
-- Funkcie (SECURITY INVOKER: všetko prechádza cez RLS volajúceho)
-- ---------------------------------------------------------------------------

-- Vytvorí rezerváciu. Každý kus overí proti iným rezerváciám a výpožičkám v tom istom
-- termíne; pri kolízii nevznikne nič. Vydaná výpožička po termíne blokuje techniku,
-- až kým sa nevráti.
create function public.create_loan(_company_id uuid, _loan jsonb, _items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  _loan_id uuid;
  _starts date := (_loan ->> 'starts_on')::date;
  _ends date := (_loan ->> 'ends_on')::date;
  _item jsonb;
  _equipment public.equipment;
  _qty integer;
  _busy integer;
begin
  if jsonb_typeof(_items) is distinct from 'array' or jsonb_array_length(_items) = 0 then
    raise exception 'Výpožička musí mať aspoň jednu položku' using errcode = 'check_violation';
  end if;

  insert into public.loans (company_id, borrower, contact, starts_on, ends_on, note)
  values (
    _company_id, trim(_loan ->> 'borrower'), coalesce(trim(_loan ->> 'contact'), ''),
    _starts, _ends, coalesce(trim(_loan ->> 'note'), '')
  )
  returning id into _loan_id;

  for _item in select * from jsonb_array_elements(_items) loop
    _qty := (_item ->> 'quantity')::integer;
    select * into _equipment from public.equipment e
    where e.company_id = _company_id and e.id = (_item ->> 'equipment_id')::uuid;
    if not found then
      raise exception 'Technika neexistuje' using errcode = 'no_data_found';
    end if;
    if _equipment.status = 'retired' then
      raise exception 'Technika „%“ je vyradená', _equipment.name using errcode = 'check_violation';
    end if;

    select coalesce(sum(li.quantity), 0) into _busy
    from public.loan_items li
    join public.loans l on l.id = li.loan_id
    where li.equipment_id = _equipment.id
      and l.status in ('reserved', 'issued')
      and l.starts_on <= _ends
      and (case when l.status = 'issued' and l.ends_on < current_date then 'infinity'::date else l.ends_on end) >= _starts;

    if _busy + _qty > _equipment.quantity then
      raise exception 'Technika „%“ nie je v tomto termíne voľná (voľné % z % ks)',
        _equipment.name, greatest(_equipment.quantity - _busy, 0), _equipment.quantity
        using errcode = 'check_violation';
    end if;

    insert into public.loan_items (company_id, loan_id, equipment_id, quantity)
    values (_company_id, _loan_id, _equipment.id, _qty);
  end loop;

  return _loan_id;
end;
$$;

-- Vydanie: technika, ktorej sa požičiava celý počet kusov, prejde do stavu „vypožičaná“.
create function public.issue_loan(_loan_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.loans set status = 'issued', issued_at = now()
  where id = _loan_id and status = 'reserved';
  if not found then
    raise exception 'Výpožičku nemožno vydať' using errcode = 'check_violation';
  end if;

  update public.equipment e set status = 'loaned'
  from public.loan_items li
  where li.loan_id = _loan_id and li.equipment_id = e.id
    and e.status = 'available' and li.quantity >= e.quantity;
end;
$$;

-- Vrátenie: poškodené kusy prejdú do stavu „poškodená“, ostatné späť na „dostupná“.
create function public.return_loan(_loan_id uuid, _damaged uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
declare
  _any_damaged boolean;
begin
  update public.loan_items set damaged = (equipment_id = any (coalesce(_damaged, '{}')))
  where loan_id = _loan_id;
  select coalesce(bool_or(damaged), false) into _any_damaged from public.loan_items where loan_id = _loan_id;

  update public.loans
  set status = case when _any_damaged then 'damaged' else 'returned' end, returned_at = now()
  where id = _loan_id and status = 'issued';
  if not found then
    raise exception 'Výpožičku nemožno vrátiť' using errcode = 'check_violation';
  end if;

  update public.equipment e
  set status = case when li.damaged then 'damaged'::public.equipment_status else 'available'::public.equipment_status end
  from public.loan_items li
  where li.loan_id = _loan_id and li.equipment_id = e.id
    and (li.damaged or e.status = 'loaned');
end;
$$;

revoke execute on function
  public.create_loan(uuid, jsonb, jsonb), public.issue_loan(uuid), public.return_loan(uuid, uuid[])
  from public, anon;
grant execute on function
  public.create_loan(uuid, jsonb, jsonb), public.issue_loan(uuid), public.return_loan(uuid, uuid[])
  to authenticated;
