-- 0191: Logo firmy na stránke hodnotenia pre klienta (bez prihlásenia). Úložisko logov ostáva súkromné – navyše
-- sa dá čítať len aktuálne logo firmy, ktorá hodnotenie od klienta používa (má aspoň jedno hodnotenie). Iné súbory
-- ani logá iných firiem nie.

create or replace function public.is_rating_logo(_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.companies c
    where c.logo_path <> '' and c.logo_path = _path
      and exists (select 1 from public.event_ratings r where r.company_id = c.id)
  )
$$;
revoke execute on function public.is_rating_logo(text) from public;
grant execute on function public.is_rating_logo(text) to anon, authenticated;

drop policy if exists company_logos_rating_select on storage.objects;
create policy company_logos_rating_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'company-logos' and public.is_rating_logo(name));

create or replace function public.get_event_rating(_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'event', e.name, 'startsOn', e.starts_on, 'endsOn', e.ends_on, 'companyName', co.name,
    'logoPath', co.logo_path, 'logoStyle', co.logo_style,
    'stars', r.stars, 'comment', r.comment, 'ratedAt', r.rated_at,
    'links', jsonb_build_object(
      'google', public.safe_review_link(co.review_links -> 'google'),
      'facebook', public.safe_review_link(co.review_links -> 'facebook'),
      'web', public.safe_review_link(co.review_links -> 'web')
    )
  )
  from public.event_ratings r
  join public.events e on e.company_id = r.company_id and e.id = r.event_id
  join public.companies co on co.id = r.company_id
  where _token is not null and r.token = _token;
$$;
revoke execute on function public.get_event_rating(uuid) from public;
grant execute on function public.get_event_rating(uuid) to anon, authenticated;
