-- RigTrack 7.15: rýchlosť a upratanie databázy podľa Supabase Advisors. Oprávnenia sa nemenia – kto čo smel vidieť
-- a meniť, smie aj po migrácii. Všetko je napísané všeobecne (podľa katalógu), takže opakované spustenie
-- supabase/update-all.sql staršie pravidlá opäť upraví a nič sa nezdvojí.
--
-- 1) Tabuľky s pravidlom „_select“ a pravidlom „for all“ (zápis): pri čítaní sa kontrolovali obe. Podmienka zápisu
--    sa pridá do pravidla na čítanie (OR – rovnaký výsledok) a pravidlo „for all“ sa rozdelí na insert / update /
--    delete s rovnakými podmienkami.
-- 2) auth.uid() v pravidlách → (select auth.uid()): vyhodnotí sa raz na dopyt, nie pri každom riadku.
-- 3) Indexy pre cudzie kľúče, ktoré žiadny index nepokrýva (rýchlejšie spojenia a mazanie).
-- 4) Funkcie triggerov sa nedajú volať cez API (spúšťa ich len databáza; oprávnenie pri spustení triggera netreba).
-- 5) Rozšírenie pg_net zo schémy public do schémy extensions. Funkcie net.* vlastní v Supabase supabase_admin,
--    takže ich oprávnenia ostávajú podľa Supabase; schéma net nie je vystavená cez API.

-- 1) Zlúčenie pravidiel na čítanie.
do $$
declare
  t record;
  a record;
  s record;
  _roles text;
  _check text;
begin
  for t in
    select tablename from pg_policies
    where schemaname = 'public' and permissive = 'PERMISSIVE'
    group by tablename
    having count(*) filter (where cmd = 'ALL') = 1 and count(*) filter (where cmd = 'SELECT') = 1
  loop
    select * into a from pg_policies where schemaname = 'public' and tablename = t.tablename and permissive = 'PERMISSIVE' and cmd = 'ALL';
    select * into s from pg_policies where schemaname = 'public' and tablename = t.tablename and permissive = 'PERMISSIVE' and cmd = 'SELECT';
    if a.roles is distinct from s.roles or a.qual is null or s.qual is null then
      continue;
    end if;
    select string_agg(quote_ident(r), ', ') into _roles from unnest(a.roles) r;
    _check := coalesce(a.with_check, a.qual);
    if position(a.qual in s.qual) = 0 then
      execute format('alter policy %I on public.%I using ((%s) or (%s))', s.policyname, t.tablename, s.qual, a.qual);
    end if;
    execute format('drop policy if exists %I on public.%I', a.policyname || '_insert', t.tablename);
    execute format('drop policy if exists %I on public.%I', a.policyname || '_update', t.tablename);
    execute format('drop policy if exists %I on public.%I', a.policyname || '_delete', t.tablename);
    execute format('create policy %I on public.%I for insert to %s with check (%s)', a.policyname || '_insert', t.tablename, _roles, _check);
    execute format('create policy %I on public.%I for update to %s using (%s) with check (%s)', a.policyname || '_update', t.tablename, _roles, a.qual, _check);
    execute format('create policy %I on public.%I for delete to %s using (%s)', a.policyname || '_delete', t.tablename, _roles, a.qual);
    execute format('drop policy %I on public.%I', a.policyname, t.tablename);
  end loop;
end;
$$;

-- 2) auth.uid() raz na dopyt.
create or replace function public.rt_wrap_uid(_expr text)
returns text language sql immutable set search_path = '' as $$
  select replace(replace(replace(_expr, '( SELECT auth.uid() AS uid)', '__rt_uid__'), 'auth.uid()', '( SELECT auth.uid() AS uid)'), '__rt_uid__', '( SELECT auth.uid() AS uid)')
$$;
revoke execute on function public.rt_wrap_uid(text) from public, anon, authenticated;

do $$
declare
  p record;
  _using text;
  _check text;
  _sql text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public'
      and (replace(coalesce(qual, ''), '( SELECT auth.uid() AS uid)', '') like '%auth.uid()%'
        or replace(coalesce(with_check, ''), '( SELECT auth.uid() AS uid)', '') like '%auth.uid()%')
  loop
    _using := public.rt_wrap_uid(p.qual);
    _check := public.rt_wrap_uid(p.with_check);
    _sql := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if _using is not null then
      _sql := _sql || ' using (' || _using || ')';
    end if;
    if _check is not null then
      _sql := _sql || ' with check (' || _check || ')';
    end if;
    execute _sql;
  end loop;
end;
$$;

-- 3) Indexy pre cudzie kľúče.
do $$
declare
  fk record;
  _cols text;
  _name text;
begin
  for fk in
    select c.conrelid, rel.relname, c.conkey
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where c.contype = 'f' and n.nspname = 'public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] @> c.conkey
          and (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] <@ c.conkey
      )
  loop
    select string_agg(quote_ident(att.attname), ', ' order by k.ord), string_agg(att.attname, '_' order by k.ord)
    into _cols, _name
    from unnest(fk.conkey) with ordinality k(attnum, ord)
    join pg_attribute att on att.attrelid = fk.conrelid and att.attnum = k.attnum;
    _name := left(fk.relname || '_' || _name, 56) || '_fk_idx';
    execute format('create index if not exists %I on public.%I (%s)', _name, fk.relname, _cols);
  end loop;
end;
$$;

-- 4) Funkcie triggerov nie sú pre API.
do $$
declare
  f record;
  _roles text := 'public';
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    _roles := _roles || ', anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    _roles := _roles || ', authenticated';
  end if;
  for f in
    select p.oid::regprocedure as fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from %s', f.fn, _roles);
  end loop;
end;
$$;

-- 5) pg_net do schémy extensions (rozšírenie sa nedá presunúť – zmaže sa a vytvorí znova; rozpracované požiadavky
--    sa stratia, nové upozornenia idú hneď ďalej).
do $$
declare
  f record;
begin
  if exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_net' and n.nspname = 'public') then
    create schema if not exists extensions;
    drop extension pg_net;
    create extension pg_net with schema extensions;
  end if;
  if exists (select 1 from pg_namespace where nspname = 'net') then
    -- Volať smie databáza (postgres – push), service_role a Database Webhooky (supabase_functions_admin).
    for f in select p.oid::regprocedure as fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'net' loop
      execute format('grant execute on function %s to postgres, service_role', f.fn);
      if exists (select 1 from pg_roles where rolname = 'supabase_functions_admin') then
        execute format('grant execute on function %s to supabase_functions_admin', f.fn);
      end if;
      execute format('revoke execute on function %s from public, anon, authenticated', f.fn);
    end loop;
    grant usage on schema net to postgres, service_role;
  end if;
exception when others then
  raise notice 'pg_net sa nepodarilo presunúť: %', sqlerrm;
end;
$$;
