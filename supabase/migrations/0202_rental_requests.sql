-- 0202: Dopyty na prenájom techniky k akcii. Firma vyberie, čo jej chýba (z techniky akcie alebo vlastné položky),
-- pošle každému dodávateľovi vlastný odkaz (r/:token) a dodávateľ bez prihlásenia odpovie po riadkoch: koľko kusov
-- má a za akú cenu. Firma odpovede porovná. Dodávateľ vidí len dopyt (názov, termín, položky), nie klienta ani ostatných.
--   rental_requests, rental_request_items, rental_request_suppliers, rental_quotes.

create table if not exists public.rental_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  note text not null default '' check (char_length(note) <= 1000),
  needed_from date not null,
  needed_to date not null check (needed_to >= needed_from),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index if not exists rental_requests_event_idx on public.rental_requests (company_id, event_id);
create index if not exists rental_requests_created_by_idx on public.rental_requests (created_by);

create table if not exists public.rental_request_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  request_id uuid not null,
  equipment_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 120),
  quantity integer not null check (quantity between 1 and 10000),
  note text not null default '' check (char_length(note) <= 200),
  sort smallint not null default 0,
  unique (company_id, id),
  foreign key (company_id, request_id) references public.rental_requests (company_id, id) on delete cascade,
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete set null (equipment_id)
);
create index if not exists rental_request_items_request_idx on public.rental_request_items (company_id, request_id);
create index if not exists rental_request_items_equipment_idx on public.rental_request_items (company_id, equipment_id);

create table if not exists public.rental_request_suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  request_id uuid not null,
  partner_id uuid,
  supplier_name text not null check (char_length(trim(supplier_name)) between 1 and 120),
  email text not null default '' check (char_length(email) <= 120),
  token text not null unique check (char_length(token) >= 40),
  revoked_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz,
  message text not null default '' check (char_length(message) <= 1000),
  unique (company_id, id),
  foreign key (company_id, request_id) references public.rental_requests (company_id, id) on delete cascade,
  foreign key (partner_id) references public.partners (id) on delete set null
);
create index if not exists rental_request_suppliers_request_idx on public.rental_request_suppliers (company_id, request_id);
create index if not exists rental_request_suppliers_partner_idx on public.rental_request_suppliers (partner_id);

create table if not exists public.rental_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  supplier_id uuid not null,
  item_id uuid not null,
  available integer not null default 0 check (available between 0 and 10000),
  unit_price numeric(10, 2) check (unit_price is null or (unit_price >= 0 and unit_price < 10000000)),
  note text not null default '' check (char_length(note) <= 200),
  unique (supplier_id, item_id),
  foreign key (company_id, supplier_id) references public.rental_request_suppliers (company_id, id) on delete cascade,
  foreign key (company_id, item_id) references public.rental_request_items (company_id, id) on delete cascade
);
create index if not exists rental_quotes_company_idx on public.rental_quotes (company_id, supplier_id);
create index if not exists rental_quotes_item_idx on public.rental_quotes (company_id, item_id);

-- Čítanie: kto vidí akcie. Zmeny: kto upravuje akcie (dopyt, položky, zrušenie odkazu, uzavretie). Odpovede len cez RPC.
do $$
declare
  t text;
begin
  foreach t in array array['rental_requests', 'rental_request_items', 'rental_request_suppliers', 'rental_quotes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.can(company_id, ''events.view''))', t || '_select', t);
    execute format('drop policy if exists mfa_required on public.%I', t);
    execute format('create policy mfa_required on public.%I as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()))', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  foreach t in array array['rental_requests', 'rental_request_items', 'rental_request_suppliers'] loop
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can(company_id, ''events.edit'')) with check (public.can(company_id, ''events.edit''))', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can(company_id, ''events.edit''))', t || '_delete', t);
    execute format('grant delete on public.%I to authenticated', t);
  end loop;
end;
$$;
grant update (title, note, needed_from, needed_to, status) on public.rental_requests to authenticated;
grant update (name, quantity, note) on public.rental_request_items to authenticated;
grant update (revoked_at) on public.rental_request_suppliers to authenticated;

-- Nový dopyt s položkami a dodávateľmi (každý dostane vlastný odkaz); vráti id dopytu.
create or replace function public.create_rental_request(_event_id uuid, _title text, _note text, _from date, _to date, _items jsonb, _suppliers jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _id uuid;
  _item jsonb;
  _supplier jsonb;
  _sort integer := 0;
begin
  select company_id into _company from public.events where id = _event_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Akcia neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) not between 1 and 200 then
    raise exception 'Dopyt musí mať 1 až 200 položiek' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(_suppliers) <> 'array' or jsonb_array_length(_suppliers) > 30 then
    raise exception 'Najviac 30 dodávateľov' using errcode = 'check_violation';
  end if;
  insert into public.rental_requests (company_id, event_id, title, note, needed_from, needed_to)
  values (_company, _event_id, trim(_title), coalesce(_note, ''), _from, _to) returning id into _id;
  for _item in select * from jsonb_array_elements(_items) loop
    insert into public.rental_request_items (company_id, request_id, equipment_id, name, quantity, note, sort)
    values (_company, _id,
      (select e.id from public.equipment e where e.company_id = _company and e.id::text = _item ->> 'equipment_id'),
      trim(_item ->> 'name'), (_item ->> 'quantity')::integer, coalesce(_item ->> 'note', ''), _sort);
    _sort := _sort + 1;
  end loop;
  for _supplier in select * from jsonb_array_elements(_suppliers) loop
    insert into public.rental_request_suppliers (company_id, request_id, partner_id, supplier_name, email, token)
    values (_company, _id,
      (select p.id from public.partners p where p.company_id = _company and p.id::text = _supplier ->> 'partner_id'),
      trim(_supplier ->> 'name'), coalesce(trim(_supplier ->> 'email'), ''),
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
  end loop;
  return _id;
end;
$$;
revoke execute on function public.create_rental_request(uuid, text, text, date, date, jsonb, jsonb) from public, anon;
grant execute on function public.create_rental_request(uuid, text, text, date, date, jsonb, jsonb) to authenticated;

-- Ďalší dodávateľ k existujúcemu dopytu; vráti token.
create or replace function public.add_rental_supplier(_request_id uuid, _name text, _email text, _partner_id uuid default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  select company_id into _company from public.rental_requests where id = _request_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Dopyt neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if (select count(*) from public.rental_request_suppliers where request_id = _request_id) >= 30 then
    raise exception 'Najviac 30 dodávateľov' using errcode = 'check_violation';
  end if;
  insert into public.rental_request_suppliers (company_id, request_id, partner_id, supplier_name, email, token)
  values (_company, _request_id, (select p.id from public.partners p where p.company_id = _company and p.id = _partner_id), trim(_name), coalesce(trim(_email), ''), _token);
  return _token;
end;
$$;
revoke execute on function public.add_rental_supplier(uuid, text, text, uuid) from public, anon;
grant execute on function public.add_rental_supplier(uuid, text, text, uuid) to authenticated;

-- Pre dodávateľa (bez prihlásenia): firma, dopyt, termín, mesto/miesto akcie, položky a jeho doterajšia odpoveď.
create or replace function public.get_rental_request(_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.rental_request_suppliers;
  r public.rental_requests;
begin
  if _token is null or char_length(_token) < 40 then return null; end if;
  select * into s from public.rental_request_suppliers where token = _token and revoked_at is null;
  if not found then return null; end if;
  select * into r from public.rental_requests where id = s.request_id;
  update public.rental_request_suppliers set viewed_at = coalesce(viewed_at, now()) where id = s.id;
  return (
    select jsonb_build_object(
      'title', r.title, 'note', r.note, 'from', r.needed_from, 'to', r.needed_to, 'open', r.status = 'open',
      'supplier', s.supplier_name, 'message', s.message, 'respondedAt', s.responded_at,
      'companyName', co.name, 'logoPath', co.logo_path, 'logoStyle', co.logo_style, 'contact', co.label_footer, 'venue', ev.venue,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'quantity', i.quantity, 'note', i.note,
          'available', q.available, 'price', q.unit_price, 'answer', coalesce(q.note, '')) order by i.sort, i.name)
        from public.rental_request_items i
        left join public.rental_quotes q on q.item_id = i.id and q.supplier_id = s.id
        where i.request_id = r.id
      ), '[]'::jsonb))
    from public.companies co
    left join public.events ev on ev.company_id = r.company_id and ev.id = r.event_id
    where co.id = r.company_id
  );
end;
$$;
revoke execute on function public.get_rental_request(text) from public;
grant execute on function public.get_rental_request(text) to anon, authenticated;

-- Odpoveď dodávateľa: po riadkoch koľko kusov a cena za kus za celé obdobie; dá sa meniť, kým je dopyt otvorený.
create or replace function public.answer_rental_request(_token text, _answers jsonb, _message text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.rental_request_suppliers;
  _open boolean;
  _answer jsonb;
  _item uuid;
begin
  if _token is null or char_length(_token) < 40 then raise exception 'Odkaz neplatí' using errcode = 'insufficient_privilege'; end if;
  select * into s from public.rental_request_suppliers where token = _token and revoked_at is null;
  if not found then raise exception 'Odkaz neplatí' using errcode = 'insufficient_privilege'; end if;
  select status = 'open' into _open from public.rental_requests where id = s.request_id;
  if not _open then raise exception 'Dopyt je už uzavretý' using errcode = 'check_violation'; end if;
  if jsonb_typeof(_answers) <> 'array' or jsonb_array_length(_answers) > 200 then
    raise exception 'Neplatná odpoveď' using errcode = 'check_violation';
  end if;
  for _answer in select * from jsonb_array_elements(_answers) loop
    select i.id into _item from public.rental_request_items i where i.request_id = s.request_id and i.id::text = _answer ->> 'item_id';
    if _item is null then continue; end if;
    insert into public.rental_quotes (company_id, supplier_id, item_id, available, unit_price, note)
    values (s.company_id, s.id, _item,
      greatest(0, least(10000, coalesce(case when (_answer ->> 'available') ~ '^\d{1,5}$' then (_answer ->> 'available')::integer end, 0))),
      case when (_answer ->> 'price') ~ '^\d{1,7}(\.\d{1,2})?$' then (_answer ->> 'price')::numeric end,
      left(coalesce(_answer ->> 'note', ''), 200))
    on conflict (supplier_id, item_id) do update set available = excluded.available, unit_price = excluded.unit_price, note = excluded.note;
  end loop;
  update public.rental_request_suppliers set responded_at = now(), message = left(coalesce(_message, ''), 1000) where id = s.id;
end;
$$;
revoke execute on function public.answer_rental_request(text, jsonb, text) from public;
grant execute on function public.answer_rental_request(text, jsonb, text) to anon, authenticated;

-- Logo firmy aj na stránke dopytu pre dodávateľa.
create or replace function public.is_rating_logo(_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.companies c
    where c.logo_path <> '' and c.logo_path = _path
      and (
        exists (select 1 from public.event_ratings r where r.company_id = c.id)
        or exists (select 1 from public.events e where e.company_id = c.id and e.client_token is not null)
        or exists (select 1 from public.doc_shares s where s.company_id = c.id and s.revoked_at is null)
        or exists (select 1 from public.rental_request_suppliers s where s.company_id = c.id and s.revoked_at is null)
      )
  )
$$;
revoke execute on function public.is_rating_logo(text) from public;
grant execute on function public.is_rating_logo(text) to anon, authenticated;
