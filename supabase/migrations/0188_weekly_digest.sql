-- 0188: Týždenný e-mail – v pondelok ráno prehľad: akcie na najbližší týždeň, faktúry po splatnosti, servis
-- a revízie, moje úlohy. Každý si ho zapne sám (Nastavenia → Účet); obsah je podľa jeho oprávnení vo firme.
-- E-mail posiela Edge Function weekly-digest (Resend), databáza ju raz týždenne zavolá cez pg_net.

alter table public.notification_prefs add column if not exists email_weekly boolean not null default false;

-- Podklady pre e-maily: jeden riadok na človeka a firmu, len kto si e-mail zapol, je stále členom a má čo čítať.
-- Volá ho len Edge Function (service_role); prihlásený používateľ ani anon ho nespustí.
create or replace function public.weekly_digest()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  _today date := (now() at time zone 'Europe/Bratislava')::date;
  _result jsonb := '[]'::jsonb;
  r record;
  _events jsonb;
  _invoices jsonb;
  _maintenance jsonb;
  _tasks jsonb;
begin
  for r in
    select p.company_id, p.user_id, pr.email, coalesce(pr.full_name, '') as full_name, c.name as company
    from public.notification_prefs p
    join public.company_members m on m.company_id = p.company_id and m.user_id = p.user_id
    join public.profiles pr on pr.id = p.user_id
    join public.companies c on c.id = p.company_id
    where p.email_weekly and coalesce(pr.email, '') <> ''
  loop
    _events := '[]'::jsonb;
    _invoices := '[]'::jsonb;
    _maintenance := '[]'::jsonb;
    _tasks := '[]'::jsonb;

    if public.user_can(r.company_id, r.user_id, 'events.view') then
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'startsOn', e.starts_on, 'endsOn', e.ends_on, 'venue', e.venue) order by e.starts_on, e.name), '[]'::jsonb)
      into _events
      from (
        select * from public.events e
        where e.company_id = r.company_id and e.status <> 'cancelled' and e.starts_on <= _today + 7 and e.ends_on >= _today
        order by e.starts_on limit 30
      ) e;
    end if;

    if public.user_can(r.company_id, r.user_id, 'offers.view') then
      select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'number', i.number, 'client', i.client ->> 'name', 'total', i.total, 'dueOn', i.due_on) order by i.due_on), '[]'::jsonb)
      into _invoices
      from (
        select * from public.invoices i
        where i.company_id = r.company_id and i.paid_on is null and i.cancelled_at is null and i.due_on < _today
        order by i.due_on limit 30
      ) i;
    end if;

    if public.user_can(r.company_id, r.user_id, 'maintenance.manage') then
      select coalesce(jsonb_agg(jsonb_build_object('equipmentId', x.equipment_id, 'name', x.name, 'rule', x.rule, 'unit', x.unit, 'state', x.state, 'dueOn', x.due_on)), '[]'::jsonb)
      into _maintenance
      from (
        select d.equipment_id, e.name, ru.name as rule, d.unit, d.state, d.due_on
        from public.maintenance_due(r.company_id) d
        join public.equipment e on e.id = d.equipment_id and e.deleted_at is null
        join public.maintenance_rules ru on ru.id = d.rule_id
        where d.state in ('overdue', 'failed', 'soon')
        order by (d.state = 'soon'), d.due_on nulls last, e.name
        limit 30
      ) x;
    end if;

    select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'dueOn', t.due_on, 'priority', t.priority) order by t.due_on), '[]'::jsonb)
    into _tasks
    from (
      select * from public.tasks t
      where t.company_id = r.company_id and t.status <> 'done' and t.due_on is not null and t.due_on <= _today + 7
        and (t.assignee_id = r.user_id or r.user_id = any (t.assignee_ids))
      order by t.due_on limit 30
    ) t;

    if jsonb_array_length(_events) + jsonb_array_length(_invoices) + jsonb_array_length(_maintenance) + jsonb_array_length(_tasks) > 0 then
      _result := _result || jsonb_build_array(jsonb_build_object(
        'email', r.email, 'name', r.full_name, 'company', r.company, 'companyId', r.company_id, 'today', _today,
        'events', _events, 'invoices', _invoices, 'maintenance', _maintenance, 'tasks', _tasks));
    end if;
  end loop;
  return _result;
end;
$$;
revoke execute on function public.weekly_digest() from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.weekly_digest() to service_role;
  end if;
end;
$$;

-- Raz týždenne zavolá Edge Function weekly-digest. Adresa a tajomstvo z Vault: vlastné (weekly_digest_url,
-- weekly_digest_secret), inak tie isté ako pri push (send-push → weekly-digest, push_webhook_secret).
create or replace function public.send_weekly_digest()
returns void language plpgsql security definer set search_path = '' as $$
declare
  _url text;
  _secret text;
  _push text;
begin
  begin
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into _url using 'weekly_digest_url';
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into _secret using 'weekly_digest_secret';
    if coalesce(_url, '') = '' then
      execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into _push using 'push_function_url';
      _url := regexp_replace(coalesce(_push, ''), '/send-push/?$', '/weekly-digest');
    end if;
    if coalesce(_secret, '') = '' then
      execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into _secret using 'push_webhook_secret';
    end if;
    if coalesce(_url, '') = '' or coalesce(_secret, '') = '' or _url !~ '^https://' then return; end if;
    execute 'select net.http_post(url := $1, headers := $2, body := $3)'
      using _url, jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', _secret), '{}'::jsonb;
  exception when others then
    -- Chýba Vault alebo pg_net: týždenný e-mail sa len nepošle.
    return;
  end;
end;
$$;
revoke execute on function public.send_weekly_digest() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'rigtrack-weekly-digest';
  -- Pondelok 6:00 UTC (7:00 v zime, 8:00 v lete v Bratislave).
  perform cron.schedule('rigtrack-weekly-digest', '0 6 * * 1', 'select public.send_weekly_digest()');
exception when others then
  raise notice 'pg_cron nie je k dispozícii – týždenný e-mail sa neposiela';
end;
$$;
