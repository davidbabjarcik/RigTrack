-- RigTrack: siete firmy.
-- Wi-Fi siete (napr. každý mix má svoj router): názov (SSID), heslo, zabezpečenie, IP rozsah, IP routera,
-- k akej technike patrí (mix / router), model routera, IP pre správu a gateway, a kde je. Z údajov sa ukáže QR kód na pripojenie.
-- Vidia ich všetci členovia firmy (aj heslo Wi-Fi – kvôli pripojeniu na akcii); spravuje, kto smie upravovať techniku.
-- Prihlásenie do správy routera je v samostatnej tabuľke a vidí ho len ten, kto smie upravovať techniku.

create table public.wifi_networks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  ssid text not null check (char_length(ssid) between 1 and 32),
  password text not null default '' check (char_length(password) <= 63),
  security text not null default 'WPA' check (security in ('WPA', 'WEP', 'nopass')),
  hidden boolean not null default false,
  -- napr. 192.168.1.0/24; podľa neho sa k sieti priradia IP adresy techniky a zariadení
  subnet text not null default '' check (char_length(subnet) <= 43),
  -- gateway siete (zvyčajne router) a adresa, na ktorej sa router spravuje
  router_ip text not null default '' check (char_length(router_ip) <= 45),
  management_ip text not null default '' check (char_length(management_ip) <= 45),
  router_model text not null default '' check (char_length(router_model) <= 80),
  -- DHCP: router prideľuje adresy sám (v rozsahu od–do); pevné IP dávajte mimo neho
  dhcp boolean not null default true,
  dhcp_start text not null default '' check (char_length(dhcp_start) <= 45),
  dhcp_end text not null default '' check (char_length(dhcp_end) <= 45),
  equipment_id uuid,
  place text not null default '' check (char_length(place) <= 120),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete set null (equipment_id)
);
create index wifi_networks_company_idx on public.wifi_networks (company_id, ssid);

alter table public.wifi_networks enable row level security;

create policy wifi_networks_select on public.wifi_networks for select to authenticated
  using (public.is_company_member(company_id));
create policy wifi_networks_insert on public.wifi_networks for insert to authenticated
  with check (public.can(company_id, 'equipment.edit'));
create policy wifi_networks_update on public.wifi_networks for update to authenticated
  using (public.can(company_id, 'equipment.edit'))
  with check (public.can(company_id, 'equipment.edit'));
create policy wifi_networks_delete on public.wifi_networks for delete to authenticated
  using (public.can(company_id, 'equipment.edit'));

revoke all on public.wifi_networks from anon, authenticated;
grant select, insert, delete on public.wifi_networks to authenticated;
grant update (ssid, password, security, hidden, subnet, router_ip, management_ip, router_model, dhcp, dhcp_start, dhcp_end, equipment_id, place, note) on public.wifi_networks to authenticated;

create trigger wifi_networks_audit after insert or update or delete on public.wifi_networks
  for each row execute function public.write_audit();

-- Prihlásenie do správy routera (len pre tých, čo smú upravovať techniku).
create table public.wifi_router_logins (
  network_id uuid primary key references public.wifi_networks (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  username text not null default '' check (char_length(username) <= 80),
  password text not null default '' check (char_length(password) <= 128)
);

alter table public.wifi_router_logins enable row level security;

create policy wifi_router_logins_all on public.wifi_router_logins for all to authenticated
  using (public.can(company_id, 'equipment.edit'))
  with check (
    public.can(company_id, 'equipment.edit')
    and exists (select 1 from public.wifi_networks n where n.id = network_id and n.company_id = wifi_router_logins.company_id)
  );

revoke all on public.wifi_router_logins from anon, authenticated;
grant select, insert, delete on public.wifi_router_logins to authenticated;
grant update (username, password) on public.wifi_router_logins to authenticated;
