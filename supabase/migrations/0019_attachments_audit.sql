-- RigTrack: prílohy k servisným záznamom a vozidlám + história zmien (audit log).

-- ---------------------------------------------------------------------------
-- Prílohy. Jedna tabuľka pre viac druhov záznamov; entity_type hovorí, k čomu patrí.
-- Čítať môže člen firmy; nahrávať a mazať admin, skladník a technik.
-- ---------------------------------------------------------------------------

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  entity_type text not null check (entity_type in ('service', 'vehicle')),
  entity_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 200),
  path text not null check (char_length(path) <= 300),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index attachments_entity_idx on public.attachments (company_id, entity_type, entity_id);

alter table public.attachments enable row level security;

create policy attachments_select on public.attachments for select to authenticated
  using (public.is_company_member(company_id));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy attachments_delete on public.attachments for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

revoke all on public.attachments from anon, authenticated;
grant select, insert, delete on public.attachments to authenticated;

-- Keď zanikne záznam, zaniknú aj riadky jeho príloh (súbory upratuje aplikácia).
create function public.drop_attachments()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.attachments where entity_type = tg_argv[0] and entity_id = old.id;
  return old;
end;
$$;

create trigger service_records_drop_attachments
  after delete on public.service_records
  for each row execute function public.drop_attachments('service');
create trigger vehicles_drop_attachments
  after delete on public.vehicles
  for each row execute function public.drop_attachments('vehicle');

revoke execute on function public.drop_attachments() from public, anon;

-- Súbory: súkromný bucket, cesta {company_id}/{druh}/{id záznamu}/{súbor}. Najviac 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments', 'attachments', false, 10485760,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

create policy attachments_files_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy attachments_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );
create policy attachments_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );

-- ---------------------------------------------------------------------------
-- História zmien. Zapisuje ju výhradne trigger; čítať ju smie iba admin
-- a nikto ju nemôže upraviť ani zmazať.
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  -- Meno v čase zmeny; ostane čitateľné aj po odchode človeka z firmy.
  actor_name text not null default '',
  action text not null check (action in ('insert', 'update', 'delete')),
  entity text not null,
  entity_id uuid,
  label text not null default '',
  -- Pri úprave názvy stĺpcov, ktoré sa zmenili.
  changed text[],
  created_at timestamptz not null default now()
);
create index audit_log_company_idx on public.audit_log (company_id, created_at desc);

alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log for select to authenticated
  using (public.has_role(company_id, 'admin'));

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create function public.write_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _row jsonb;
  _old jsonb;
  _changed text[];
  _company uuid;
begin
  if tg_op = 'DELETE' then
    _row := to_jsonb(old);
  else
    _row := to_jsonb(new);
  end if;
  _company := (_row ->> 'company_id')::uuid;

  -- Pri mazaní celej firmy (cascade) už rodič neexistuje; históriu niet kam zapísať.
  if not exists (select 1 from public.companies c where c.id = _company) then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    _old := to_jsonb(old);
    select array_agg(e.key order by e.key) into _changed
    from jsonb_each(_row) e
    where e.key <> 'updated_at' and e.value is distinct from _old -> e.key;
    if _changed is null then
      return new;
    end if;
  end if;

  insert into public.audit_log (company_id, actor_id, actor_name, action, entity, entity_id, label, changed)
  values (
    _company,
    auth.uid(),
    coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), ''),
    lower(tg_op),
    tg_table_name,
    (_row ->> 'id')::uuid,
    left(coalesce(_row ->> 'name', _row ->> 'title', _row ->> 'plate', _row ->> 'borrower', _row ->> 'supplier', ''), 200),
    _changed
  );
  return coalesce(new, old);
end;
$$;

revoke execute on function public.write_audit() from public, anon;

create trigger equipment_audit after insert or update or delete on public.equipment
  for each row execute function public.write_audit();
create trigger cases_audit after insert or update or delete on public.cases
  for each row execute function public.write_audit();
create trigger loans_audit after insert or update or delete on public.loans
  for each row execute function public.write_audit();
create trigger orders_audit after insert or update or delete on public.orders
  for each row execute function public.write_audit();
create trigger vehicles_audit after insert or update or delete on public.vehicles
  for each row execute function public.write_audit();
create trigger service_records_audit after insert or update or delete on public.service_records
  for each row execute function public.write_audit();
create trigger events_audit after insert or update or delete on public.events
  for each row execute function public.write_audit();
