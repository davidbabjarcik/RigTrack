-- RigTrack: zariadenia členov (mobily, notebooky, tablety) s MAC adresou.
-- Každý člen si zapisuje svoje vlastné zariadenia. Vidieť a spravovať všetky môže, kto má
-- staff.manage (predvolene admin a skladník) – napr. kvôli povoleniu v sieti na akcii.
-- MAC sa ukladá jednotne ako AA:BB:CC:DD:EE:FF; v jednej firme sa nesmie opakovať.

create table public.member_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null default 'phone' check (kind in ('phone', 'laptop', 'tablet', 'other')),
  name text not null check (char_length(trim(name)) between 1 and 80),
  mac text not null check (mac ~ '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  unique (company_id, mac)
);
create index member_devices_user_idx on public.member_devices (company_id, user_id);

alter table public.member_devices enable row level security;

create policy member_devices_select on public.member_devices for select to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'staff.manage'));
create policy member_devices_insert on public.member_devices for insert to authenticated
  with check (user_id = auth.uid() and public.is_company_member(company_id));
create policy member_devices_update on public.member_devices for update to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'staff.manage'))
  with check ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'staff.manage'));
create policy member_devices_delete on public.member_devices for delete to authenticated
  using ((user_id = auth.uid() and public.is_company_member(company_id)) or public.can(company_id, 'staff.manage'));

revoke all on public.member_devices from anon, authenticated;
grant select, insert, delete on public.member_devices to authenticated;
grant update (kind, name, mac, note) on public.member_devices to authenticated;
