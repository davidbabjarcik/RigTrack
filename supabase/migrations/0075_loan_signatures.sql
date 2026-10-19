-- RigTrack: podpisy odovzdávacieho protokolu výpožičky na mobile (2.13).
-- Pri vydaní aj pri vrátení sa podpíše vypožičiavateľ aj firma; podpis je malý PNG obrázok.

create table if not exists public.loan_signatures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  loan_id uuid not null,
  phase text not null check (phase in ('issue', 'return')),
  -- borrower = vypožičiavateľ, lender = firma (kto techniku odovzdal / prevzal späť)
  role text not null check (role in ('borrower', 'lender')),
  signer_name text not null default '' check (char_length(signer_name) <= 120),
  image text not null check (image like 'data:image/png;base64,%' and char_length(image) <= 400000),
  signed_by uuid default auth.uid() references public.profiles (id) on delete set null,
  signed_at timestamptz not null default now(),
  foreign key (company_id, loan_id) references public.loans (company_id, id) on delete cascade
);
create unique index if not exists loan_signatures_slot_idx on public.loan_signatures (loan_id, phase, role);

create or replace function public.stamp_loan_signature()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.signed_by := auth.uid();
  new.signed_at := now();
  return new;
end;
$$;
revoke execute on function public.stamp_loan_signature() from public, anon, authenticated;
drop trigger if exists loan_signatures_stamp on public.loan_signatures;
create trigger loan_signatures_stamp before insert on public.loan_signatures
  for each row execute function public.stamp_loan_signature();

alter table public.loan_signatures enable row level security;
drop policy if exists loan_signatures_select on public.loan_signatures;
drop policy if exists loan_signatures_insert on public.loan_signatures;
drop policy if exists loan_signatures_delete on public.loan_signatures;
create policy loan_signatures_select on public.loan_signatures for select to authenticated using (public.can(company_id, 'loans.view'));
create policy loan_signatures_insert on public.loan_signatures for insert to authenticated with check (public.can(company_id, 'loans.edit'));
create policy loan_signatures_delete on public.loan_signatures for delete to authenticated using (public.can(company_id, 'loans.edit'));
revoke all on public.loan_signatures from anon, authenticated;
grant select, delete on public.loan_signatures to authenticated;
grant insert (company_id, loan_id, phase, role, signer_name, image) on public.loan_signatures to authenticated;
