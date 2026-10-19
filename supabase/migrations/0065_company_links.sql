-- RigTrack: prepojené firmy (1.20).
-- Dve firmy v RigTracku sa prepoja kódom: admin jednej pošle žiadosť s kódom druhej, admin druhej ju potvrdí.
-- Každá strana sama určí, či zdieľa svoju techniku a vybrané kontakty (Firmy a kontakty → „zdieľať“).
-- Event sa dá zdieľať s prepojenou firmou ako spoločný: obe strany zapíšu, čo dodajú (aj prenájom techniky).

-- Kód firmy na prepojenie (vidí ho len admin).
create table public.company_link_codes (
  company_id uuid primary key references public.companies (id) on delete cascade,
  code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))
);
alter table public.company_link_codes enable row level security;
revoke all on public.company_link_codes from anon, authenticated;

create table public.company_links (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.companies (id) on delete cascade,
  target uuid not null references public.companies (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  requester_shares_equipment boolean not null default false,
  target_shares_equipment boolean not null default false,
  requester_shares_contacts boolean not null default false,
  target_shares_contacts boolean not null default false,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester <> target)
);
create unique index company_links_pair_idx on public.company_links (least(requester, target), greatest(requester, target));
alter table public.company_links enable row level security;
create policy company_links_select on public.company_links for select to authenticated
  using (public.is_company_member(requester) or public.is_company_member(target));
create policy company_links_delete on public.company_links for delete to authenticated
  using (public.has_role(requester, 'admin') or public.has_role(target, 'admin'));
revoke all on public.company_links from anon, authenticated;
grant select, delete on public.company_links to authenticated;

-- Sú dve firmy prepojené (potvrdene)?
create function public.linked_with(_a uuid, _b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_links l
    where l.status = 'accepted' and ((l.requester = _a and l.target = _b) or (l.requester = _b and l.target = _a))
  );
$$;
revoke execute on function public.linked_with(uuid, uuid) from public, anon;
grant execute on function public.linked_with(uuid, uuid) to authenticated;

create function public.my_link_code(_company_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  _code text;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kód vidí len admin' using errcode = 'insufficient_privilege';
  end if;
  insert into public.company_link_codes (company_id) values (_company_id) on conflict do nothing;
  select code into _code from public.company_link_codes where company_id = _company_id;
  return _code;
end;
$$;

create function public.request_company_link(_company_id uuid, _code text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  _target uuid;
  _name text;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Prepojiť firmu môže len admin' using errcode = 'insufficient_privilege';
  end if;
  select c.company_id into _target from public.company_link_codes c where c.code = upper(trim(_code));
  if _target is null then
    raise exception 'Firma s týmto kódom neexistuje' using errcode = 'no_data_found';
  end if;
  if _target = _company_id then
    raise exception 'To je kód vašej firmy' using errcode = 'check_violation';
  end if;
  insert into public.company_links (requester, target) values (_company_id, _target) on conflict do nothing;
  select name into _name from public.companies where id = _target;
  return _name;
end;
$$;

create function public.accept_company_link(_link_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.company_links set status = 'accepted', accepted_at = now()
  where id = _link_id and status = 'pending' and public.has_role(target, 'admin');
  if not found then
    raise exception 'Žiadosť neexistuje alebo ju nemôžete potvrdiť' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- Čo zdieľa moja strana prepojenia.
create function public.set_link_sharing(_link_id uuid, _company_id uuid, _equipment boolean, _contacts boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Zdieľanie nastavuje admin' using errcode = 'insufficient_privilege';
  end if;
  update public.company_links set
    requester_shares_equipment = case when requester = _company_id then _equipment else requester_shares_equipment end,
    requester_shares_contacts = case when requester = _company_id then _contacts else requester_shares_contacts end,
    target_shares_equipment = case when target = _company_id then _equipment else target_shares_equipment end,
    target_shares_contacts = case when target = _company_id then _contacts else target_shares_contacts end
  where id = _link_id and (requester = _company_id or target = _company_id);
end;
$$;

-- Prepojenia firmy s menom druhej strany a tým, kto čo zdieľa.
create function public.linked_companies(_company_id uuid)
returns table (link_id uuid, company_id uuid, name text, status text, incoming boolean, i_share_equipment boolean, they_share_equipment boolean, i_share_contacts boolean, they_share_contacts boolean)
language sql stable security definer set search_path = '' as $$
  select l.id,
    case when l.requester = _company_id then l.target else l.requester end,
    c.name, l.status, l.target = _company_id,
    case when l.requester = _company_id then l.requester_shares_equipment else l.target_shares_equipment end,
    case when l.requester = _company_id then l.target_shares_equipment else l.requester_shares_equipment end,
    case when l.requester = _company_id then l.requester_shares_contacts else l.target_shares_contacts end,
    case when l.requester = _company_id then l.target_shares_contacts else l.requester_shares_contacts end
  from public.company_links l
  join public.companies c on c.id = case when l.requester = _company_id then l.target else l.requester end
  where (l.requester = _company_id or l.target = _company_id) and public.is_company_member(_company_id)
  order by c.name;
$$;

-- Technika prepojených firiem, ktoré ju so mnou zdieľajú (bez cien, poznámok a sériových čísel).
create function public.linked_equipment(_company_id uuid)
returns table (id uuid, company_id uuid, company_name text, name text, kind text, category text, quantity integer, manufacturer text, model text, attributes jsonb, status text)
language sql stable security definer set search_path = '' as $$
  select e.id, e.company_id, c.name, e.name, e.kind, coalesce(cat.name, ''), e.quantity, e.manufacturer, e.model, e.attributes, e.status::text
  from public.company_links l
  join public.equipment e on e.company_id = case when l.requester = _company_id then l.target else l.requester end
  join public.companies c on c.id = e.company_id
  left join public.equipment_categories cat on cat.id = e.category_id
  where l.status = 'accepted'
    and (l.requester = _company_id or l.target = _company_id)
    and (case when l.requester = _company_id then l.target_shares_equipment else l.requester_shares_equipment end)
    and public.can(_company_id, 'equipment.view')
    and e.deleted_at is null and e.status <> 'retired' and e.owner_staff_id is null
  order by c.name, e.name;
$$;

-- Kontakty: firma v adresári sa zdieľa s prepojenými firmami (ktoré majú zapnuté zdieľanie kontaktov).
alter table public.partners add column shared boolean not null default false;
grant update (shared) on public.partners to authenticated;

create function public.linked_partners(_company_id uuid)
returns table (id uuid, company_name text, name text, ico text, dic text, address text, note text, contacts jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, c.name, p.name, p.ico, p.dic, p.address, p.note,
    coalesce((select jsonb_agg(jsonb_build_object('name', pc.name, 'role', pc.role, 'phone', pc.phone, 'email', pc.email) order by pc.name)
      from public.partner_contacts pc where pc.partner_id = p.id), '[]'::jsonb)
  from public.company_links l
  join public.partners p on p.company_id = case when l.requester = _company_id then l.target else l.requester end
  join public.companies c on c.id = p.company_id
  where l.status = 'accepted'
    and (l.requester = _company_id or l.target = _company_id)
    and (case when l.requester = _company_id then l.target_shares_contacts else l.requester_shares_contacts end)
    and p.shared
    and public.can(_company_id, 'events.view')
  order by c.name, p.name;
$$;

-- Spoločné eventy
create table public.event_shares (
  event_id uuid not null references public.events (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  partner_company uuid not null references public.companies (id) on delete cascade,
  -- Čo dodá vlastník eventu a čo prepojená firma (napr. „zvuk + svetlo“, „LED stena v prenájme“).
  owner_part text not null default '' check (char_length(owner_part) <= 1000),
  partner_part text not null default '' check (char_length(partner_part) <= 1000),
  created_at timestamptz not null default now(),
  primary key (event_id, partner_company)
);
alter table public.event_shares enable row level security;
create policy event_shares_select on public.event_shares for select to authenticated
  using (public.can(company_id, 'events.view') or public.can(partner_company, 'events.view'));
create policy event_shares_insert on public.event_shares for insert to authenticated
  with check (
    public.can(company_id, 'events.edit') and public.linked_with(company_id, partner_company)
    and exists (select 1 from public.events e where e.id = event_id and e.company_id = event_shares.company_id)
  );
create policy event_shares_update on public.event_shares for update to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
create policy event_shares_delete on public.event_shares for delete to authenticated
  using (public.can(company_id, 'events.edit') or public.can(partner_company, 'events.edit'));
revoke all on public.event_shares from anon, authenticated;
grant select, insert, delete on public.event_shares to authenticated;
grant update (owner_part) on public.event_shares to authenticated;

-- Eventy, ktoré so mnou zdieľajú prepojené firmy (základné údaje a program).
create function public.shared_events(_company_id uuid)
returns table (event_id uuid, owner_name text, name text, starts_on date, ends_on date, venue text, address text, status text, owner_part text, partner_part text, days jsonb)
language sql stable security definer set search_path = '' as $$
  select e.id, c.name, e.name, e.starts_on, e.ends_on, e.venue, e.address, e.status::text, s.owner_part, s.partner_part,
    coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'kind', d.kind, 'starts_at', d.starts_at, 'ends_at', d.ends_at, 'note', d.note) order by d.day)
      from public.event_days d where d.event_id = e.id), '[]'::jsonb)
  from public.event_shares s
  join public.events e on e.id = s.event_id
  join public.companies c on c.id = s.company_id
  where s.partner_company = _company_id and public.can(_company_id, 'events.view') and public.linked_with(s.company_id, _company_id)
  order by e.starts_on desc;
$$;

-- Prepojená firma zapíše, čo na spoločný event dodá.
create function public.set_partner_part(_event_id uuid, _company_id uuid, _part text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.can(_company_id, 'events.edit') then
    raise exception 'Nemáte oprávnenie upravovať eventy' using errcode = 'insufficient_privilege';
  end if;
  update public.event_shares set partner_part = left(coalesce(_part, ''), 1000)
  where event_id = _event_id and partner_company = _company_id;
end;
$$;

revoke execute on function public.my_link_code(uuid), public.request_company_link(uuid, text), public.accept_company_link(uuid),
  public.set_link_sharing(uuid, uuid, boolean, boolean), public.linked_companies(uuid), public.linked_equipment(uuid),
  public.linked_partners(uuid), public.shared_events(uuid), public.set_partner_part(uuid, uuid, text) from public, anon;
grant execute on function public.my_link_code(uuid), public.request_company_link(uuid, text), public.accept_company_link(uuid),
  public.set_link_sharing(uuid, uuid, boolean, boolean), public.linked_companies(uuid), public.linked_equipment(uuid),
  public.linked_partners(uuid), public.shared_events(uuid), public.set_partner_part(uuid, uuid, text) to authenticated;

-- Nové druhy techniky: video (LED panely, LED procesory, TV, projektory…) a DJ technika.
alter table public.equipment
  drop constraint equipment_kind_check,
  add constraint equipment_kind_check check (kind in ('general', 'cable', 'light', 'audio', 'video', 'dj', 'truss', 'stage', 'consumable'));
