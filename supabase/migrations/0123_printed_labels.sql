-- RigTrack 5.18: čo už má vytlačený štítok (QR, páska, štítok case, obsah). Zapíše sa pri „Vytlačené – vyprázdniť“
-- v tlačovej fronte alebo ručne („už je olepené“); tlačová fronta podľa toho ukáže, čo štítok ešte nemá.

create table if not exists public.printed_labels (
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('equipment', 'case')),
  target_id uuid not null,
  label text not null default 'qr' check (label in ('qr', 'tape', 'case_label', 'content')),
  printed_by uuid default auth.uid() references public.profiles (id) on delete set null,
  printed_at timestamptz not null default now(),
  primary key (company_id, kind, target_id, label)
);
alter table public.printed_labels enable row level security;
revoke all on public.printed_labels from anon, authenticated;
grant select, delete on public.printed_labels to authenticated;
grant insert (company_id, kind, target_id, label) on public.printed_labels to authenticated;

drop policy if exists printed_labels_select on public.printed_labels;
create policy printed_labels_select on public.printed_labels for select to authenticated using (public.is_company_member(company_id));
drop policy if exists printed_labels_insert on public.printed_labels;
create policy printed_labels_insert on public.printed_labels for insert to authenticated
  with check (public.is_company_member(company_id) and (public.can(company_id, 'equipment.view') or public.can(company_id, 'cases.view')));
drop policy if exists printed_labels_delete on public.printed_labels;
create policy printed_labels_delete on public.printed_labels for delete to authenticated using (public.is_company_member(company_id));
