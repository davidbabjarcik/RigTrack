-- RigTrack: push notifikácie na mobil (3.5).
-- Mobil (prehliadač) sa prihlási na upozornenia a uloží si odber (push_subscriptions). Udalosti v appke
-- (pridanie do posádky, nová úloha) zapíšu upozornenie do notifications; Supabase Database Webhook ho
-- odovzdá Edge funkcii send-push, ktorá ho pošle na všetky mobily daného človeka (Web Push, kľúče VAPID).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text not null default '' check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 300),
  url text not null default '' check (char_length(url) <= 300),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_insert on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
-- Sám sebe si človek môže poslať skúšobné upozornenie; ostatné zapisujú spúšťače.
create policy notifications_insert on public.notifications for insert to authenticated with check (user_id = auth.uid());
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant insert (user_id, title, body, url) on public.notifications to authenticated;

/** Zapíše upozornenie pre človeka (posiela ho funkcia send-push cez webhook). Samému sebe sa nič neposiela. */
create or replace function public.notify_user(_user_id uuid, _company_id uuid, _title text, _body text, _url text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if _user_id is null or _user_id = auth.uid() then return; end if;
  insert into public.notifications (user_id, company_id, title, body, url)
  values (_user_id, _company_id, left(_title, 120), left(coalesce(_body, ''), 300), left(coalesce(_url, ''), 300));
end;
$$;
revoke execute on function public.notify_user(uuid, uuid, text, text, text) from public, anon, authenticated;

-- Pridanie do posádky eventu.
create or replace function public.notify_crew_added()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  e record;
begin
  if new.member_id is null then return new; end if;
  select name, starts_on, ends_on, venue into e from public.events where id = new.event_id;
  if not found then return new; end if;
  perform public.notify_user(
    new.member_id, new.company_id,
    'Si v posádke: ' || e.name,
    concat_ws(' · ',
      to_char(e.starts_on, 'FMDD. FMMM. YYYY') || case when e.ends_on > e.starts_on then ' – ' || to_char(e.ends_on, 'FMDD. FMMM. YYYY') else '' end,
      nullif(e.venue, ''),
      nullif(new.role, '')),
    '/events/' || new.event_id
  );
  return new;
end;
$$;
revoke execute on function public.notify_crew_added() from public, anon, authenticated;
drop trigger if exists event_crew_notify on public.event_crew;
create trigger event_crew_notify after insert on public.event_crew for each row execute function public.notify_crew_added();

-- Nová úloha alebo noví riešitelia úlohy.
create or replace function public.notify_task_assigned()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  assignee uuid;
  previous uuid[] := case when tg_op = 'UPDATE' then coalesce(old.assignee_ids, '{}') || coalesce(array[old.assignee_id], '{}') else '{}' end;
begin
  for assignee in select distinct unnest(coalesce(new.assignee_ids, '{}') || coalesce(array[new.assignee_id], '{}')) loop
    if assignee is null or assignee = any (previous) then continue; end if;
    perform public.notify_user(
      assignee, new.company_id,
      'Nová úloha: ' || new.title,
      case when new.due_on is not null then 'Termín ' || to_char(new.due_on, 'FMDD. FMMM. YYYY') else '' end,
      '/todos'
    );
  end loop;
  return new;
end;
$$;
revoke execute on function public.notify_task_assigned() from public, anon, authenticated;
drop trigger if exists tasks_notify on public.tasks;
create trigger tasks_notify after insert or update of assignee_ids, assignee_id on public.tasks for each row execute function public.notify_task_assigned();

-- Osobný profil (0081): navyše sociálne siete; prenášajú sa do kariet zamestnanca ako ostatné údaje.
alter table public.personal_profiles add column if not exists socials jsonb not null default '{}'
  check (jsonb_typeof(socials) = 'object' and char_length(socials::text) <= 2000);
grant update (socials) on public.personal_profiles to authenticated;

create or replace function public.apply_personal_profile(_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.personal_profiles%rowtype;
begin
  select * into p from public.personal_profiles where user_id = _user_id;
  if not found then return; end if;
  update public.staff s
    set phone = p.phone, email = p.email, birth_date = p.birth_date, name_day = p.name_day, licences = p.licences,
        socials = case when p.socials = '{}'::jsonb then s.socials else p.socials end
    where s.member_id = _user_id and s.sync_profile;
  if p.home_address <> '' then
    insert into public.member_homes (company_id, user_id, address, lat, lon, updated_at)
      select m.company_id, _user_id, p.home_address, p.home_lat, p.home_lon, now()
      from public.company_members m where m.user_id = _user_id
    on conflict (company_id, user_id) do update set address = excluded.address, lat = excluded.lat, lon = excluded.lon, updated_at = now();
  end if;
end;
$$;
revoke execute on function public.apply_personal_profile(uuid) from public, anon, authenticated;

create or replace function public.fill_staff_from_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  p public.personal_profiles%rowtype;
begin
  if new.member_id is null or not new.sync_profile then return new; end if;
  if tg_op = 'UPDATE' and old.sync_profile then return new; end if;
  select * into p from public.personal_profiles where user_id = new.member_id;
  if found then
    new.phone := p.phone;
    new.email := p.email;
    new.birth_date := p.birth_date;
    new.name_day := p.name_day;
    new.licences := p.licences;
    if p.socials <> '{}'::jsonb then new.socials := p.socials; end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.fill_staff_from_profile() from public, anon, authenticated;
