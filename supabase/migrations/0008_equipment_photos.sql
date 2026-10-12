-- RigTrack: fotka techniky v súkromnom Storage buckete.
-- Cesta súboru je {company_id}/{názov}; prvý priečinok určuje firmu a podľa neho
-- sa overuje prístup. Čítať môže člen firmy, nahrávať a mazať admin, skladník a technik.

alter table public.equipment
  add column photo_path text not null default '' check (char_length(photo_path) <= 200);
grant update (photo_path) on public.equipment to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipment-photos', 'equipment-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy equipment_photos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'equipment-photos'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

create policy equipment_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'equipment-photos'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );

create policy equipment_photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'equipment-photos'
    and public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
  );
