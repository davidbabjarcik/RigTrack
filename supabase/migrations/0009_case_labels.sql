-- RigTrack: rozmery, hmotnosť a kategória cases + podklady pre flight case štítok
-- (logo firmy a kontaktný riadok).

alter table public.cases
  add column weight_kg numeric(7, 2) check (weight_kg > 0),
  add column width_cm numeric(7, 1) check (width_cm > 0),
  add column length_cm numeric(7, 1) check (length_cm > 0),
  add column depth_cm numeric(7, 1) check (depth_cm > 0),
  add column category_id uuid,
  add foreign key (company_id, category_id) references public.equipment_categories (company_id, id)
    on delete set null (category_id);
grant update (weight_kg, width_cm, length_cm, depth_cm, category_id) on public.cases to authenticated;

-- Meniť smie iba admin (policy companies_update z 0001).
alter table public.companies
  add column logo_path text not null default '' check (char_length(logo_path) <= 200),
  add column label_footer text not null default '' check (char_length(label_footer) <= 200);
grant update (logo_path, label_footer) on public.companies to authenticated;

-- Logo: súkromný bucket, cesta {company_id}/{názov}. Vidí ho člen firmy, mení admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-logos', 'company-logos', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy company_logos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'company-logos'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

create policy company_logos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin')
  );

create policy company_logos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'company-logos'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin')
  );
