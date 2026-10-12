-- RigTrack: kontroly obsahu cases. Každá kontrola je samostatný záznam (história),
-- nedá sa upraviť ani zmazať. Kontrolovať môže admin, skladník a technik.

create table public.case_checks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  case_id uuid not null,
  checked_at timestamptz not null default now(),
  checked_by uuid references public.profiles (id) on delete set null,
  -- Meno v čase kontroly; ostane čitateľné aj po odchode človeka z firmy.
  checked_by_name text not null default '',
  note text not null default '' check (char_length(note) <= 500),
  foreign key (company_id, case_id) references public.cases (company_id, id) on delete cascade
);
create index case_checks_case_idx on public.case_checks (case_id, checked_at desc);

-- Kto a kedy kontroloval určuje server, nie klient.
create function public.stamp_case_check()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.checked_at := now();
  new.checked_by := auth.uid();
  new.checked_by_name := coalesce(
    (select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()),
    ''
  );
  return new;
end;
$$;

create trigger case_checks_stamp
  before insert on public.case_checks
  for each row execute function public.stamp_case_check();

alter table public.case_checks enable row level security;

create policy case_checks_select on public.case_checks for select to authenticated
  using (public.is_company_member(company_id));
create policy case_checks_insert on public.case_checks for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik', 'technik'));

revoke all on public.case_checks from anon, authenticated;
grant select, insert (company_id, case_id, note) on public.case_checks to authenticated;
revoke execute on function public.stamp_case_check() from public, anon;

-- Posledná kontrola každého case.
create view public.case_last_checks with (security_invoker = true) as
select distinct on (case_id) company_id, case_id, checked_at, checked_by_name, note
from public.case_checks
order by case_id, checked_at desc;

revoke all on public.case_last_checks from anon, authenticated;
grant select on public.case_last_checks to authenticated;
