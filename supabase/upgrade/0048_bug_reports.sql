-- RigTrack: nahlasovanie chýb.
-- Ktokoľvek z firmy nahlási chybu (popis, stránka, verzia, prehliadač, voliteľne screenshot).
-- Vidia ju: autor hlásenia, admin firmy a vývojári aplikácie (tabuľka app_developers).
-- Stav a odpoveď mení admin firmy alebo vývojár. E-mail posiela Edge Function notify-bug-report.
--
-- Vývojára (teba) treba pridať raz ručne v SQL Editore, napr.:
--   insert into public.app_developers (user_id) select id from auth.users where email = 'tvoj@email';

create table public.app_developers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_developers enable row level security;
revoke all on public.app_developers from anon, authenticated;
-- Žiadna politika: zoznam sa mení len v SQL Editore, aplikácia sa pýta cez is_developer().

create function public.is_developer()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_developers d where d.user_id = auth.uid())
$$;
revoke execute on function public.is_developer() from public, anon;
grant execute on function public.is_developer() to authenticated;

create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  reporter_name text not null default '',
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  page_url text not null default '' check (char_length(page_url) <= 500),
  app_version text not null default '' check (char_length(app_version) <= 40),
  user_agent text not null default '' check (char_length(user_agent) <= 400),
  screenshot_path text not null default '' check (char_length(screenshot_path) <= 300),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'wontfix')),
  response text not null default '' check (char_length(response) <= 2000),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bug_reports_company_idx on public.bug_reports (company_id, created_at desc);

-- Autora a jeho meno doplní databáza, nedá sa podvrhnúť.
create function public.stamp_bug_report()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.reporter_id := auth.uid();
  new.reporter_name := public.actor_name();
  new.status := 'new';
  new.notified_at := null;
  return new;
end;
$$;
create trigger bug_reports_stamp before insert on public.bug_reports
  for each row execute function public.stamp_bug_report();
create trigger bug_reports_touch_updated_at before update on public.bug_reports
  for each row execute function public.touch_updated_at();
revoke execute on function public.stamp_bug_report() from public, anon, authenticated;

alter table public.bug_reports enable row level security;

create policy bug_reports_select on public.bug_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_developer() or (company_id is not null and public.has_role(company_id, 'admin')));
create policy bug_reports_insert on public.bug_reports for insert to authenticated
  with check (company_id is null or public.is_company_member(company_id));
create policy bug_reports_update on public.bug_reports for update to authenticated
  using (public.is_developer() or (company_id is not null and public.has_role(company_id, 'admin')))
  with check (public.is_developer() or (company_id is not null and public.has_role(company_id, 'admin')));
create policy bug_reports_delete on public.bug_reports for delete to authenticated
  using (public.is_developer());

revoke all on public.bug_reports from anon, authenticated;
grant select, insert, delete on public.bug_reports to authenticated;
grant update (status, response) on public.bug_reports to authenticated;

-- Screenshoty: súkromný bucket, cesta {company_id}/{súbor}. Najviac 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bug-screenshots', 'bug-screenshots', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy bug_screenshots_select on storage.objects for select to authenticated
  using (
    bucket_id = 'bug-screenshots'
    and (public.is_developer() or public.has_role(((storage.foldername(name))[1])::uuid, 'admin'))
  );
create policy bug_screenshots_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'bug-screenshots' and public.is_company_member(((storage.foldername(name))[1])::uuid));
create policy bug_screenshots_delete on storage.objects for delete to authenticated
  using (bucket_id = 'bug-screenshots' and public.is_developer());
