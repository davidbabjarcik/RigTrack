-- RigTrack 7.0: ochrana prihlásenia pred hádaním hesiel. Prihlásenie ide cez Edge Function `login`, ktorá pred
-- overením hesla skontroluje blokovanie a po neúspechu ho zapíše. Všetko je na serveri (čas, počítadlá) – obnovenie
-- stránky ani nová karta ho neresetuje.
--
-- Kľúče (e-mail aj IP sú len ako HMAC odtlačok, nie čitateľne):
--   ei:<email>:<ip>  5 zlých pokusov za 15 min → blok 5 min (bežný prípad – jeden človek / jeden útočník),
--   e:<email>        20 zlých pokusov z rôznych IP za 15 min → blok 5 min (útok na účet z mnohých IP),
--   i:<ip>           30 zlých pokusov na rôzne účty za 15 min → blok 5 min (skúšanie mnohých účtov z jednej IP).
-- Cudzí účet sa tak nedá zablokovať 5 pokusmi z inej siete; na blok celého účtu treba 20 pokusov z rôznych IP.

create table if not exists public.login_guard (
  key text primary key check (char_length(key) <= 200),
  failures integer not null default 0,
  window_start timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.login_guard enable row level security;
revoke all on public.login_guard from public, anon, authenticated;

-- Bezpečnostné udalosti (bez hesiel, tokenov a čitateľných e-mailov / IP); mažú sa po 30 dňoch.
create table if not exists public.login_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  email_hash text not null check (char_length(email_hash) <= 100),
  ip_hash text not null check (char_length(ip_hash) <= 100),
  outcome text not null check (outcome in ('success', 'failure', 'locked'))
);
create index if not exists login_events_at_idx on public.login_events (at);
alter table public.login_events enable row level security;
revoke all on public.login_events from public, anon, authenticated;

/** Do kedy je prihlásenie z tejto IP (a pre tento e-mail) zablokované; null = nie je. */
create or replace function public.login_guard_status(_email_hash text, _ip_hash text)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select max(g.locked_until)
  from public.login_guard g
  where g.locked_until > now()
    and g.key in (
      'i:' || _ip_hash,
      case when _email_hash <> '' then 'e:' || _email_hash end,
      case when _email_hash <> '' then 'ei:' || _email_hash || ':' || _ip_hash end
    );
$$;

/** Blokovanie celej IP (veľa účtov z jednej siete) – pri otvorení prihlasovacej stránky, keď e-mail ešte nepoznáme. */
create or replace function public.login_guard_ip_status(_ip_hash text)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select max(g.locked_until)
  from public.login_guard g
  where g.locked_until > now() and g.key = 'i:' || _ip_hash;
$$;

/** Zapíše neúspešný pokus (atomicky – aj pri súbežných požiadavkách) a vráti, do kedy je blok, ak vznikol. */
create or replace function public.login_guard_fail(_email_hash text, _ip_hash text)
returns timestamptz language plpgsql volatile security definer set search_path = '' as $$
declare
  rule record;
  until timestamptz;
  result timestamptz := null;
begin
  for rule in
    select * from (values
      ('ei:' || _email_hash || ':' || _ip_hash, 5),
      ('e:' || _email_hash, 20),
      ('i:' || _ip_hash, 30)
    ) as r(key, max_failures)
  loop
    insert into public.login_guard as g (key, failures, window_start, updated_at)
    values (rule.key, 1, now(), now())
    on conflict (key) do update set
      -- Nové okno 15 min, ak staré vypršalo (a blok už neplatí).
      failures = case when g.window_start < now() - interval '15 minutes' and coalesce(g.locked_until, '-infinity') <= now() then 1 else g.failures + 1 end,
      window_start = case when g.window_start < now() - interval '15 minutes' and coalesce(g.locked_until, '-infinity') <= now() then now() else g.window_start end,
      updated_at = now()
    returning case when g.failures >= rule.max_failures and coalesce(g.locked_until, '-infinity') <= now() then now() + interval '5 minutes' end into until;
    if until is not null then
      update public.login_guard set locked_until = until, failures = 0, window_start = now() where key = rule.key;
      result := greatest(coalesce(result, until), until);
    end if;
  end loop;
  insert into public.login_events (email_hash, ip_hash, outcome) values (_email_hash, _ip_hash, case when result is null then 'failure' else 'locked' end);
  return result;
end;
$$;

/** Po úspešnom prihlásení vynuluje počítadlá pre tento e-mail (a e-mail z tejto IP). */
create or replace function public.login_guard_success(_email_hash text, _ip_hash text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  delete from public.login_guard where key in ('ei:' || _email_hash || ':' || _ip_hash, 'e:' || _email_hash) and coalesce(locked_until, '-infinity') <= now();
  insert into public.login_events (email_hash, ip_hash, outcome) values (_email_hash, _ip_hash, 'success');
end;
$$;

-- Volá ich len Edge Function (service role), nie appka.
revoke execute on function public.login_guard_status(text, text) from public, anon, authenticated;
revoke execute on function public.login_guard_ip_status(text) from public, anon, authenticated;
revoke execute on function public.login_guard_fail(text, text) from public, anon, authenticated;
revoke execute on function public.login_guard_success(text, text) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.login_guard_status(text, text) to service_role;
    grant execute on function public.login_guard_ip_status(text) to service_role;
    grant execute on function public.login_guard_fail(text, text) to service_role;
    grant execute on function public.login_guard_success(text, text) to service_role;
  end if;
end;
$$;

-- Spúšťače nemajú byť volateľné cez API (advisor: security definer pre anon).
do $$
begin
  revoke execute on function public.company_notes_stamp() from public, anon;
  revoke execute on function public.create_member_staff_card() from public, anon;
  revoke execute on function public.equipment_move_addresses() from public, anon;
exception when undefined_function then null;
end;
$$;

-- Upratovanie: staré záznamy o pokusoch a udalosti po 30 dňoch.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'rigtrack-clean-login-guard';
  perform cron.schedule('rigtrack-clean-login-guard', '15 4 * * *',
    $job$delete from public.login_guard where updated_at < now() - interval '1 day' and coalesce(locked_until, '-infinity') < now();
         delete from public.login_events where at < now() - interval '30 days'$job$);
exception when others then
  raise notice 'pg_cron nie je k dispozícii – záznamy o prihlásení sa nemažú samy';
end;
$$;
