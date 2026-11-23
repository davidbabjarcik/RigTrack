-- 0197: Input / output listy akcie (rozšírenie patch listov).
--   event_patch: insert (napr. komp, gate) a farba kanála (farby scribble stripu pultu).
--   event_outputs: výstupy – monitory (wedge / IEM), PA, sub, delay, nahrávanie, efekty… s mixom a cieľom.
--   doc_versions: aj typ 'iolist' (snímka input + output listu akcie, doc_id = id akcie).

alter table public.event_patch add column if not exists insert_note text not null default '' check (char_length(insert_note) <= 60);
alter table public.event_patch add column if not exists color text not null default '' check (color in ('', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'));
grant update (insert_note, color) on public.event_patch to authenticated;

create table if not exists public.event_outputs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  number integer not null check (number between 1 and 128),
  name text not null default '' check (char_length(name) <= 80),
  kind text not null default 'wedge' check (kind in ('wedge', 'iem', 'sidefill', 'pa', 'sub', 'delay', 'fill', 'rec', 'fx', 'other')),
  mix text not null default '' check (char_length(mix) <= 40),
  destination text not null default '' check (char_length(destination) <= 60),
  equipment_id uuid,
  stereo boolean not null default false,
  note text not null default '' check (char_length(note) <= 200),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade,
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete set null (equipment_id)
);
create index if not exists event_outputs_event_idx on public.event_outputs (company_id, event_id, number);
create index if not exists event_outputs_equipment_idx on public.event_outputs (company_id, equipment_id);
alter table public.event_outputs enable row level security;
drop policy if exists event_outputs_select on public.event_outputs;
create policy event_outputs_select on public.event_outputs for select to authenticated using (public.can(company_id, 'events.view'));
drop policy if exists event_outputs_insert on public.event_outputs;
create policy event_outputs_insert on public.event_outputs for insert to authenticated with check (public.can(company_id, 'events.edit'));
drop policy if exists event_outputs_update on public.event_outputs;
create policy event_outputs_update on public.event_outputs for update to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
drop policy if exists event_outputs_delete on public.event_outputs;
create policy event_outputs_delete on public.event_outputs for delete to authenticated using (public.can(company_id, 'events.edit'));
drop policy if exists mfa_required on public.event_outputs;
create policy mfa_required on public.event_outputs as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
revoke all on public.event_outputs from anon, authenticated;
grant select, insert, delete on public.event_outputs to authenticated;
grant update (number, name, kind, mix, destination, equipment_id, stereo, note) on public.event_outputs to authenticated;

-- Verzie input / output listu.
alter table public.doc_versions drop constraint if exists doc_versions_doc_type_check;
alter table public.doc_versions add constraint doc_versions_doc_type_check check (doc_type in ('rack', 'iolist')) not valid;
drop policy if exists doc_versions_select on public.doc_versions;
create policy doc_versions_select on public.doc_versions for select to authenticated
  using (case doc_type when 'rack' then public.can(company_id, 'racks.view') else public.can(company_id, 'events.view') end);

-- Uloží verziu input / output listu akcie (snímka); vráti číslo verzie.
create or replace function public.save_iolist_version(_event_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _next integer;
begin
  select company_id into _company from public.events where id = _event_id;
  if _company is null or not public.can(_company, 'events.edit') then
    raise exception 'Akcia neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  select coalesce(max(version), 0) + 1 into _next from public.doc_versions where doc_type = 'iolist' and doc_id = _event_id;
  insert into public.doc_versions (company_id, doc_type, doc_id, version, data)
  values (_company, 'iolist', _event_id, _next, jsonb_build_object(
    'inputs', coalesce((select jsonb_agg(to_jsonb(p) - 'company_id' - 'event_id' order by p.channel) from public.event_patch p where p.company_id = _company and p.event_id = _event_id), '[]'::jsonb),
    'outputs', coalesce((select jsonb_agg(to_jsonb(o) - 'company_id' - 'event_id' order by o.number) from public.event_outputs o where o.company_id = _company and o.event_id = _event_id), '[]'::jsonb)));
  return _next;
end;
$$;
revoke execute on function public.save_iolist_version(uuid) from public, anon;
grant execute on function public.save_iolist_version(uuid) to authenticated;
