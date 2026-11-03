-- RigTrack 7.0: GDPR – moje údaje. Každý si stiahne svoje osobné údaje (čl. 15, 20) a môže zmazať svoj účet (čl. 17).
-- Firmu, v ktorej je jediný admin a sú v nej aj iní ľudia, treba najprv odovzdať inému adminovi; firmu, kde je sám,
-- najprv zmazať – účet sa nezmaže omylom spolu s dátami celej firmy.

/** Všetky moje osobné údaje naprieč firmami (JSON na stiahnutie). */
create or replace function public.export_my_data()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Nie ste prihlásený' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'exported_at', now(),
    'account', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'personal_profile', (select to_jsonb(pp) - 'user_id' from public.personal_profiles pp where pp.user_id = uid),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('company', c.name, 'role', m.role)) from public.company_members m join public.companies c on c.id = m.company_id where m.user_id = uid), '[]'::jsonb),
    'staff_cards', coalesce((select jsonb_agg(to_jsonb(s) - 'member_id') from public.staff s where s.member_id = uid), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(to_jsonb(d) - 'user_id') from public.member_devices d where d.user_id = uid), '[]'::jsonb),
    'home_addresses', coalesce((select jsonb_agg(to_jsonb(h) - 'user_id') from public.member_homes h where h.user_id = uid), '[]'::jsonb),
    'event_attendance', coalesce((select jsonb_agg(to_jsonb(a) - 'user_id') from public.event_attendance a where a.user_id = uid), '[]'::jsonb),
    'work_sessions', coalesce((select jsonb_agg(to_jsonb(w) - 'user_id') from public.work_sessions w where w.user_id = uid), '[]'::jsonb),
    'event_work_logs', coalesce((select jsonb_agg(to_jsonb(l) - 'user_id') from public.event_work_logs l where l.user_id = uid), '[]'::jsonb),
    'push_subscriptions', coalesce((select jsonb_agg(jsonb_build_object('user_agent', ps.user_agent, 'created_at', ps.created_at)) from public.push_subscriptions ps where ps.user_id = uid), '[]'::jsonb),
    'consent_records', coalesce((select jsonb_agg(to_jsonb(cr) - 'user_id') from public.consent_records cr where cr.user_id = uid), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

/**
 * Zmaže môj účet (po potvrdení e-mailom): osobný profil, zariadenia, dochádzka, odbery upozornení a pod. sa zmažú;
 * záznamy, ktoré patria firme (karta zamestnanca, výkazy, história zmien), ostanú bez prepojenia na účet – za ne zodpovedá firma.
 */
create or replace function public.delete_my_account(_confirm_email text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  my_email text;
  blocking text;
begin
  if uid is null then
    raise exception 'Nie ste prihlásený' using errcode = 'insufficient_privilege';
  end if;
  select lower(email) into my_email from auth.users where id = uid;
  if my_email is null or lower(trim(coalesce(_confirm_email, ''))) <> my_email then
    raise exception 'Pre potvrdenie napíšte svoj e-mail' using errcode = 'check_violation';
  end if;
  -- Firmy, kde som jediný admin: s ďalšími členmi → odovzdať admina; sám → najprv firmu zmazať.
  select string_agg(c.name, ', ') into blocking
  from public.company_members m
  join public.companies c on c.id = m.company_id
  where m.user_id = uid and m.role = 'admin'
    and not exists (select 1 from public.company_members o where o.company_id = m.company_id and o.role = 'admin' and o.user_id <> uid);
  if blocking is not null then
    raise exception 'Ste jediný admin vo firme: %. Najprv určite iného admina alebo firmu zmažte.', blocking using errcode = 'check_violation';
  end if;
  -- Karta zamestnanca vo firme ostane (je to záznam firmy), len už bez prepojenia na účet – musí mať meno.
  update public.staff s
     set name = coalesce(nullif(trim(s.name), ''), nullif(trim((select p.full_name from public.profiles p where p.id = uid)), ''), 'Bývalý člen')
   where s.member_id = uid;
  delete from auth.users where id = uid;
end;
$$;
revoke execute on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;
