-- RigTrack 7.0: záznam o súhlase s ukladaním v prehliadači (GDPR – preukázanie súhlasu). Prihlásený používateľ
-- si zapíše svoju voľbu (verzia pravidiel, čas, kategórie); vidí len svoje záznamy, nikto ich nemení.
-- Neprihlásený návštevník má záznam len v prehliadači. Záznamy sa mažú s účtom.

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  version text not null check (char_length(version) between 1 and 20),
  functional boolean not null,
  analytics boolean not null default false,
  marketing boolean not null default false,
  given_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists consent_records_user_idx on public.consent_records (user_id, created_at desc);

alter table public.consent_records enable row level security;
revoke all on public.consent_records from anon, authenticated;
grant select, insert on public.consent_records to authenticated;

drop policy if exists consent_records_select on public.consent_records;
create policy consent_records_select on public.consent_records for select to authenticated using (user_id = auth.uid());
drop policy if exists consent_records_insert on public.consent_records;
create policy consent_records_insert on public.consent_records for insert to authenticated
  with check (user_id = auth.uid() and analytics = false and marketing = false and given_at <= now() + interval '1 minute');
