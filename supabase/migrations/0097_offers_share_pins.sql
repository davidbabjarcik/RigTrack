-- RigTrack: ponuky pre klienta odkazom, s.r.o. / živnosť pri firme, pripnuté firmy na účet (3.18).

-- 1) Vystavovateľ ponuky = firma ako s.r.o. alebo živnosť (nastavuje sa pri údajoch o firme).
alter table public.quote_issuers add column if not exists kind text not null default 'other' check (kind in ('sro', 'zivnost', 'other'));

-- 2) Odkaz pre klienta: ponuku si pozrie bez prihlásenia a potvrdí alebo odmietne (aj s poznámkou).
alter table public.quotes add column if not exists share_token uuid unique;
alter table public.quotes add column if not exists responded_at timestamptz;
alter table public.quotes add column if not exists response_note text not null default '' check (char_length(response_note) <= 1000);

/** Vytvorí (alebo vráti) odkaz na ponuku pre klienta; ponuka sa označí ako poslaná. */
create or replace function public.share_offer(_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _token uuid;
begin
  select company_id, share_token into _company, _token from public.quotes where id = _id;
  if _company is null or not public.can(_company, 'offers.edit') then
    raise exception 'Ponuka neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  if _token is null then
    _token := gen_random_uuid();
    update public.quotes set share_token = _token, status = case when status = 'draft' then 'sent' else status end where id = _id;
  end if;
  return _token;
end;
$$;
revoke execute on function public.share_offer(uuid) from public, anon;
grant execute on function public.share_offer(uuid) to authenticated;

/** Zruší odkaz (klient ho už neotvorí). */
create or replace function public.unshare_offer(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
begin
  select company_id into _company from public.quotes where id = _id;
  if _company is null or not public.can(_company, 'offers.edit') then
    raise exception 'Ponuka neexistuje alebo nemáte oprávnenie' using errcode = 'insufficient_privilege';
  end if;
  update public.quotes set share_token = null where id = _id;
end;
$$;
revoke execute on function public.unshare_offer(uuid) from public, anon;
grant execute on function public.unshare_offer(uuid) to authenticated;

/** Ponuka podľa odkazu – len to, čo je na papieri (bez interných údajov ako rozpočet). */
create or replace function public.get_shared_offer(_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'number', q.number, 'status', q.status, 'client', q.client, 'issuer', q.issuer, 'title', q.title, 'place', q.place,
    'serviceDates', q.service_dates, 'issuedOn', q.issued_on, 'sections', q.sections, 'vatMode', q.vat_mode, 'vatPct', q.vat_pct,
    'totalOverride', q.total_override, 'notes', q.notes, 'authorName', q.author_name, 'respondedAt', q.responded_at,
    'responseNote', q.response_note, 'companyName', c.name
  )
  from public.quotes q join public.companies c on c.id = q.company_id
  where _token is not null and q.share_token = _token;
$$;
revoke execute on function public.get_shared_offer(uuid) from public;
grant execute on function public.get_shared_offer(uuid) to anon, authenticated;

/** Klient ponuku potvrdí alebo odmietne; tomu, kto ju vytvoril, príde upozornenie. */
create or replace function public.respond_shared_offer(_token uuid, _accept boolean, _note text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare
  q public.quotes%rowtype;
begin
  select * into q from public.quotes where _token is not null and share_token = _token;
  if not found then
    raise exception 'Ponuka sa nenašla' using errcode = 'no_data_found';
  end if;
  if q.responded_at is not null then
    raise exception 'Na ponuku už bolo odpovedané' using errcode = 'check_violation';
  end if;
  update public.quotes
    set status = case when _accept then 'accepted' else 'rejected' end, responded_at = now(), response_note = left(coalesce(_note, ''), 1000)
    where id = q.id;
  if q.created_by is not null then
    insert into public.notifications (user_id, company_id, title, body, url)
    values (
      q.created_by, q.company_id,
      left((case when _accept then 'Ponuka prijatá: ' else 'Ponuka odmietnutá: ' end) || coalesce(nullif(q.title, ''), q.number), 120),
      left(concat_ws(' · ', nullif(q.client ->> 'name', ''), nullif(_note, '')), 300),
      '/offers/' || q.id
    );
  end if;
end;
$$;
revoke execute on function public.respond_shared_offer(uuid, boolean, text) from public;
grant execute on function public.respond_shared_offer(uuid, boolean, text) to anon, authenticated;

-- 3) Pripnuté firmy na „Vyberte firmu“ – pre účet (rovnaké na každom zariadení).
create table if not exists public.company_pins (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);
alter table public.company_pins enable row level security;
drop policy if exists company_pins_own on public.company_pins;
create policy company_pins_own on public.company_pins for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.company_pins from anon, authenticated;
grant select, insert, delete on public.company_pins to authenticated;
