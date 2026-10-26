-- RigTrack: oprava Wi-Fi sietí pre databázy, kde 0055 nebola spustená alebo prebehla v staršej verzii
-- (stránka Siete hlási „Siete sa nepodarilo načítať“). Dá sa spustiť kedykoľvek aj viackrát – doplní len to, čo chýba.

create table if not exists public.wifi_networks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  ssid text not null check (char_length(ssid) between 1 and 32),
  created_at timestamptz not null default now()
);

alter table public.wifi_networks
  add column if not exists password text not null default '' check (char_length(password) <= 63),
  add column if not exists security text not null default 'WPA' check (security in ('WPA', 'WEP', 'nopass')),
  add column if not exists hidden boolean not null default false,
  add column if not exists subnet text not null default '' check (char_length(subnet) <= 43),
  add column if not exists router_ip text not null default '' check (char_length(router_ip) <= 45),
  add column if not exists management_ip text not null default '' check (char_length(management_ip) <= 45),
  add column if not exists router_model text not null default '' check (char_length(router_model) <= 80),
  add column if not exists dhcp boolean not null default true,
  add column if not exists dhcp_start text not null default '' check (char_length(dhcp_start) <= 45),
  add column if not exists dhcp_end text not null default '' check (char_length(dhcp_end) <= 45),
  add column if not exists equipment_id uuid,
  add column if not exists place text not null default '' check (char_length(place) <= 120),
  add column if not exists note text not null default '' check (char_length(note) <= 1000);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wifi_networks_equipment_fk') and not exists (
    select 1 from pg_constraint c where c.conrelid = 'public.wifi_networks'::regclass and c.contype = 'f' and pg_get_constraintdef(c.oid) like '%equipment%'
  ) then
    alter table public.wifi_networks add constraint wifi_networks_equipment_fk
      foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete set null (equipment_id);
  end if;
end;
$$;
create index if not exists wifi_networks_company_idx on public.wifi_networks (company_id, ssid);

alter table public.wifi_networks enable row level security;
drop policy if exists wifi_networks_select on public.wifi_networks;
drop policy if exists wifi_networks_insert on public.wifi_networks;
drop policy if exists wifi_networks_update on public.wifi_networks;
drop policy if exists wifi_networks_delete on public.wifi_networks;
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
-- Čítanie po stĺpcoch: heslo a adresy siete sa čítajú len cez wifi_passwords() / network_addresses() (0103, 0107),
-- aby opätovné spustenie tejto opravy nesprístupnilo heslá a adresy všetkým.
grant insert, delete on public.wifi_networks to authenticated;
grant select (id, company_id, ssid, security, hidden, router_model, dhcp, equipment_id, place, note, created_at) on public.wifi_networks to authenticated;
do $$
begin
  -- Druh siete (0103), ak už existuje.
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wifi_networks' and column_name = 'scope') then
    grant select (scope) on public.wifi_networks to authenticated;
  end if;
end;
$$;
grant update (ssid, password, security, hidden, subnet, router_ip, management_ip, router_model, dhcp, dhcp_start, dhcp_end, equipment_id, place, note) on public.wifi_networks to authenticated;

drop trigger if exists wifi_networks_audit on public.wifi_networks;
create trigger wifi_networks_audit after insert or update or delete on public.wifi_networks
  for each row execute function public.write_audit();

create table if not exists public.wifi_router_logins (
  network_id uuid primary key references public.wifi_networks (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  username text not null default '' check (char_length(username) <= 80),
  password text not null default '' check (char_length(password) <= 128)
);
alter table public.wifi_router_logins enable row level security;
drop policy if exists wifi_router_logins_all on public.wifi_router_logins;
create policy wifi_router_logins_all on public.wifi_router_logins for all to authenticated
  using (public.can(company_id, 'equipment.edit'))
  with check (
    public.can(company_id, 'equipment.edit')
    and exists (select 1 from public.wifi_networks n where n.id = network_id and n.company_id = wifi_router_logins.company_id)
  );
revoke all on public.wifi_router_logins from anon, authenticated;
grant select, insert, delete on public.wifi_router_logins to authenticated;
grant update (username, password) on public.wifi_router_logins to authenticated;
