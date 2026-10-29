-- RigTrack 5.12: firemné poznámky – zdieľané pre celú firmu, s pripnutím a označenými ľuďmi (dostanú upozornenie).

create table if not exists public.company_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 10000),
  pinned boolean not null default false,
  people uuid[] not null default '{}',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  author_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists company_notes_company_idx on public.company_notes (company_id, updated_at desc);

alter table public.company_notes enable row level security;
revoke all on public.company_notes from anon, authenticated;
grant select, delete on public.company_notes to authenticated;
grant insert (company_id, title, body, pinned, people) on public.company_notes to authenticated;
grant update (title, body, pinned, people) on public.company_notes to authenticated;

-- Čítať a upravovať môže každý člen firmy (zdieľané poznámky); zmazať autor alebo admin.
drop policy if exists company_notes_select on public.company_notes;
create policy company_notes_select on public.company_notes for select to authenticated using (public.is_company_member(company_id));
drop policy if exists company_notes_insert on public.company_notes;
create policy company_notes_insert on public.company_notes for insert to authenticated
  with check (public.is_company_member(company_id) and public.all_members_of(company_id, people));
drop policy if exists company_notes_update on public.company_notes;
create policy company_notes_update on public.company_notes for update to authenticated
  using (public.is_company_member(company_id)) with check (public.is_company_member(company_id) and public.all_members_of(company_id, people));
drop policy if exists company_notes_delete on public.company_notes;
create policy company_notes_delete on public.company_notes for delete to authenticated
  using (created_by = auth.uid() or public.has_role(company_id, 'admin'));

-- Autor a čas úpravy určuje server; novo označení ľudia dostanú upozornenie.
create or replace function public.company_notes_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _person uuid;
  _name text;
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    select coalesce(nullif(p.full_name, ''), p.email, '') into new.author_name from public.profiles p where p.id = auth.uid();
    new.author_name := coalesce(new.author_name, '');
  else
    new.created_by := old.created_by;
    new.author_name := old.author_name;
  end if;
  new.updated_at := now();
  select coalesce(nullif(p.full_name, ''), p.email, 'Niekto') into _name from public.profiles p where p.id = auth.uid();
  foreach _person in array new.people loop
    if _person <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      and (tg_op = 'INSERT' or not (_person = any (old.people))) then
      insert into public.notifications (user_id, company_id, title, body, url)
      values (_person, new.company_id, left(coalesce(_name, 'Niekto') || ' vás označil v poznámke', 120), left(coalesce(nullif(new.title, ''), left(new.body, 120)), 300), '/notes');
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists company_notes_stamp on public.company_notes;
create trigger company_notes_stamp before insert or update on public.company_notes
  for each row execute function public.company_notes_stamp();
