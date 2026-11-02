-- RigTrack 6.2: chyby v appke sa ukladajú samy (spadnutá stránka, neošetrená chyba v prehliadači).
-- Zapisuje sa len cez report_app_error(): rovnaká chyba toho istého človeka sa zráta do jedného riadku
-- (count, last_at) a jeden človek zapíše najviac 200 rôznych chýb za deň. Čítajú a riešia ich len vývojári (app_developers).

create table if not exists public.app_errors (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null check (char_length(fingerprint) <= 300),
  user_id uuid references public.profiles (id) on delete set null,
  user_email text not null default '',
  company_id uuid references public.companies (id) on delete set null,
  source text not null default 'error' check (source in ('render', 'error', 'promise')),
  message text not null check (char_length(message) <= 1000),
  stack text not null default '' check (char_length(stack) <= 8000),
  page_url text not null default '' check (char_length(page_url) <= 500),
  app_version text not null default '' check (char_length(app_version) <= 40),
  user_agent text not null default '' check (char_length(user_agent) <= 400),
  count int not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists app_errors_last_at_idx on public.app_errors (last_at desc);
create index if not exists app_errors_user_fp_idx on public.app_errors (user_id, fingerprint) where resolved_at is null;

alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;
grant select, delete on public.app_errors to authenticated;
grant update (resolved_at) on public.app_errors to authenticated;

drop policy if exists app_errors_select on public.app_errors;
create policy app_errors_select on public.app_errors for select to authenticated using (public.is_developer());
drop policy if exists app_errors_update on public.app_errors;
create policy app_errors_update on public.app_errors for update to authenticated using (public.is_developer()) with check (public.is_developer());
drop policy if exists app_errors_delete on public.app_errors;
create policy app_errors_delete on public.app_errors for delete to authenticated using (public.is_developer());

create or replace function public.report_app_error(
  _message text,
  _stack text default '',
  _source text default 'error',
  _page_url text default '',
  _app_version text default '',
  _user_agent text default '',
  _company_id uuid default null
)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  msg text := left(coalesce(nullif(trim(_message), ''), 'Neznáma chyba'), 1000);
  -- Rovnaká chyba = rovnaká správa a prvý riadok zásobníka (bez čísel riadkov sa líšiť nesmie).
  fp text := left(md5(msg || '|' || coalesce(split_part(_stack, E'\n', 2), '')), 300);
  company uuid := null;
begin
  if uid is null then
    return;
  end if;
  -- Firmu uložíme, len ak v nej človek naozaj je.
  if _company_id is not null and exists (select 1 from public.company_members m where m.company_id = _company_id and m.user_id = uid) then
    company := _company_id;
  end if;

  update public.app_errors e
     set count = e.count + 1, last_at = now(), page_url = left(coalesce(_page_url, ''), 500),
         app_version = left(coalesce(_app_version, ''), 40), company_id = coalesce(company, e.company_id)
   where e.user_id = uid and e.fingerprint = fp and e.resolved_at is null;
  if found then
    return;
  end if;

  if (select count(*) from public.app_errors e where e.user_id = uid and e.first_at > now() - interval '1 day') >= 200 then
    return;
  end if;

  insert into public.app_errors (fingerprint, user_id, user_email, company_id, source, message, stack, page_url, app_version, user_agent)
  values (
    fp, uid, coalesce((select u.email from auth.users u where u.id = uid), ''), company,
    case when _source in ('render', 'error', 'promise') then _source else 'error' end,
    msg, left(coalesce(_stack, ''), 8000), left(coalesce(_page_url, ''), 500),
    left(coalesce(_app_version, ''), 40), left(coalesce(_user_agent, ''), 400)
  );
end;
$$;
revoke execute on function public.report_app_error(text, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.report_app_error(text, text, text, text, text, text, uuid) to authenticated;

-- Staré vyriešené chyby (90 dní) sa zmažú samy.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'rigtrack-clean-app-errors';
  perform cron.schedule('rigtrack-clean-app-errors', '30 3 * * *',
    $job$delete from public.app_errors where resolved_at < now() - interval '90 days' or last_at < now() - interval '180 days'$job$);
exception when others then
  raise notice 'pg_cron nie je k dispozícii – staré chyby sa nemažú samy';
end;
$$;
