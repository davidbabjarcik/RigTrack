-- RigTrack: eventy (akcie) s technikou, posádkou a dokumentmi.
-- Čítať môže každý člen firmy; zapisovať admin, skladník a technik; event maže admin a skladník.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  client text not null default '' check (char_length(client) <= 120),
  venue text not null default '' check (char_length(venue) <= 200),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'planned' check (status in ('planned', 'confirmed', 'done', 'cancelled')),
  note text not null default '' check (char_length(note) <= 4000),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  unique (company_id, id)
);
create index events_company_idx on public.events (company_id, starts_on);

create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

create table public.event_equipment (
  company_id uuid not null,
  event_id uuid not null,
  equipment_id uuid not null,
  quantity integer not null default 1 check (quantity between 1 and 100000),
  primary key (event_id, equipment_id),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade,
  foreign key (company_id, equipment_id) references public.equipment (company_id, id) on delete cascade
);
create index event_equipment_equipment_idx on public.event_equipment (equipment_id);

-- Posádka: člen firmy alebo externista zapísaný menom.
create table public.event_crew (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  member_id uuid references public.profiles (id) on delete set null,
  name text not null default '' check (char_length(name) <= 80),
  role text not null default '' check (char_length(role) <= 80),
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index event_crew_event_idx on public.event_crew (event_id);

create table public.event_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  event_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 200),
  path text not null check (char_length(path) <= 300),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (company_id, event_id) references public.events (company_id, id) on delete cascade
);
create index event_documents_event_idx on public.event_documents (event_id);

alter table public.events enable row level security;
alter table public.event_equipment enable row level security;
alter table public.event_crew enable row level security;
alter table public.event_documents enable row level security;

create policy events_select on public.events for select to authenticated
  using (public.is_company_member(company_id));
create policy events_insert on public.events for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy events_update on public.events for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy events_delete on public.events for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

create policy event_equipment_select on public.event_equipment for select to authenticated
  using (public.is_company_member(company_id));
create policy event_equipment_insert on public.event_equipment for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy event_equipment_update on public.event_equipment for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'))
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy event_equipment_delete on public.event_equipment for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

create policy event_crew_select on public.event_crew for select to authenticated
  using (public.is_company_member(company_id));
create policy event_crew_insert on public.event_crew for insert to authenticated
  with check (
    public.has_role(company_id, 'admin', 'skladnik', 'technik')
    and (member_id is null or public.is_member_of(company_id, member_id))
    and (member_id is not null or trim(name) <> '')
  );
create policy event_crew_delete on public.event_crew for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

create policy event_documents_select on public.event_documents for select to authenticated
  using (public.is_company_member(company_id));
create policy event_documents_insert on public.event_documents for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));
create policy event_documents_delete on public.event_documents for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

revoke all on public.events, public.event_equipment, public.event_crew, public.event_documents from anon, authenticated;
grant select, insert, delete on public.events to authenticated;
grant update (name, client, venue, starts_on, ends_on, status, note) on public.events to authenticated;
grant select, insert, delete, update (quantity) on public.event_equipment to authenticated;
grant select, insert, delete on public.event_crew, public.event_documents to authenticated;

-- Dokumenty: súkromný bucket, cesta {company_id}/{event_id}/{súbor}. Najviac 10 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-documents', 'event-documents', false, 10485760,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

create policy event_documents_files_select on storage.objects for select to authenticated
  using (
    bucket_id = 'event-documents'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );
create policy event_documents_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-documents'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );
create policy event_documents_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-documents'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );
