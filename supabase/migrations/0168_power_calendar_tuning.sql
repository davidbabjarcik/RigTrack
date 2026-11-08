-- 0168: doladenie tabuliek z 0166 a 0167 podľa pravidiel z 0143.
-- • auth.uid() sa v pravidlách vyhodnotí raz za dotaz, • čítanie a zápis majú oddelené pravidlá,
-- • cudzie kľúče majú index, • funkcia triggera sa nedá zavolať cez API.

drop policy if exists calendar_feeds_select on public.calendar_feeds;
drop policy if exists calendar_feeds_delete on public.calendar_feeds;
create policy calendar_feeds_select on public.calendar_feeds for select to authenticated using (user_id = (select auth.uid()));
create policy calendar_feeds_delete on public.calendar_feeds for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists event_power_plans_write on public.event_power_plans;
drop policy if exists event_power_plans_insert on public.event_power_plans;
drop policy if exists event_power_plans_update on public.event_power_plans;
drop policy if exists event_power_plans_delete on public.event_power_plans;
create policy event_power_plans_insert on public.event_power_plans for insert to authenticated
  with check (public.can(company_id, 'events.edit'));
create policy event_power_plans_update on public.event_power_plans for update to authenticated
  using (public.can(company_id, 'events.edit')) with check (public.can(company_id, 'events.edit'));
create policy event_power_plans_delete on public.event_power_plans for delete to authenticated
  using (public.can(company_id, 'events.edit'));

create index if not exists event_power_plans_company_event_idx on public.event_power_plans (company_id, event_id);
create index if not exists event_power_plans_updated_by_idx on public.event_power_plans (updated_by);

revoke execute on function public.event_power_plans_touch() from public, anon, authenticated;
