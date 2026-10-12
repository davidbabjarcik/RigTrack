-- RigTrack: interné návrhy a nápady s komentármi.
-- Navrhnúť a komentovať môže každý člen firmy vrátane viewera.
-- Stav návrhu (nový / rieši sa / hotové) mení admin a skladník.
-- Upraviť smie autor, zmazať autor alebo admin.

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  body text not null default '' check (char_length(body) <= 4000),
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  created_by uuid references public.profiles (id) on delete set null,
  -- Meno v čase zápisu; ostane čitateľné aj po odchode človeka z firmy.
  author_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);
create index suggestions_company_idx on public.suggestions (company_id, created_at desc);

create table public.suggestion_comments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  suggestion_id uuid not null,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_by uuid references public.profiles (id) on delete set null,
  author_name text not null default '',
  created_at timestamptz not null default now(),
  foreign key (company_id, suggestion_id) references public.suggestions (company_id, id) on delete cascade
);
create index suggestion_comments_suggestion_idx on public.suggestion_comments (suggestion_id, created_at);

-- Autora a jeho meno určuje server, nie klient.
create function public.stamp_author()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.created_by := auth.uid();
  new.author_name := coalesce(
    (select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()),
    ''
  );
  return new;
end;
$$;

create trigger suggestions_stamp_author
  before insert on public.suggestions
  for each row execute function public.stamp_author();
create trigger suggestion_comments_stamp_author
  before insert on public.suggestion_comments
  for each row execute function public.stamp_author();

create trigger suggestions_touch_updated_at
  before update on public.suggestions
  for each row execute function public.touch_updated_at();

-- Autor smie upraviť text svojho návrhu, ale stav posúva iba admin a skladník.
create function public.guard_suggestion_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status and not public.has_role(new.company_id, 'admin', 'skladnik') then
    raise exception 'Stav návrhu môže zmeniť iba admin alebo skladník' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger suggestions_guard_status
  before update of status on public.suggestions
  for each row execute function public.guard_suggestion_status();

revoke execute on function public.stamp_author(), public.guard_suggestion_status() from public, anon;

alter table public.suggestions enable row level security;
alter table public.suggestion_comments enable row level security;

create policy suggestions_select on public.suggestions for select to authenticated
  using (public.is_company_member(company_id));
create policy suggestions_insert on public.suggestions for insert to authenticated
  with check (public.is_company_member(company_id));
create policy suggestions_update on public.suggestions for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik') or (created_by = (select auth.uid()) and public.is_company_member(company_id)))
  with check (public.has_role(company_id, 'admin', 'skladnik') or (created_by = (select auth.uid()) and public.is_company_member(company_id)));
create policy suggestions_delete on public.suggestions for delete to authenticated
  using (public.has_role(company_id, 'admin') or (created_by = (select auth.uid()) and public.is_company_member(company_id)));

create policy suggestion_comments_select on public.suggestion_comments for select to authenticated
  using (public.is_company_member(company_id));
create policy suggestion_comments_insert on public.suggestion_comments for insert to authenticated
  with check (public.is_company_member(company_id));
create policy suggestion_comments_delete on public.suggestion_comments for delete to authenticated
  using (public.has_role(company_id, 'admin') or (created_by = (select auth.uid()) and public.is_company_member(company_id)));

revoke all on public.suggestions, public.suggestion_comments from anon, authenticated;
grant select, insert (company_id, title, body), update (title, body, status), delete on public.suggestions to authenticated;
grant select, insert (company_id, suggestion_id, body), delete on public.suggestion_comments to authenticated;
