-- 0192: Fotky pri škodách a úrazoch (napr. poškodenie nahlásené pri vrátení z eventu). Prílohy majú teraz aj druh
-- 'incident'. Vidí ich len ten, kto vidí samotnú škodu (admin, kto ju zapísal, dotknutý člen); pridať a zmazať
-- smie admin a ten, kto škodu zapísal. Ostatné prílohy (servis, vozidlá) ostávajú, ako boli.

alter table public.attachments drop constraint if exists attachments_entity_type_check;
alter table public.attachments add constraint attachments_entity_type_check check (entity_type in ('service', 'vehicle', 'incident'));

create or replace function public.can_view_incident(_incident uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.incidents i
    where i.id = _incident
      and (public.has_role(i.company_id, 'admin') or (public.is_company_member(i.company_id) and (i.member_id = auth.uid() or i.created_by = auth.uid())))
  )
$$;
revoke execute on function public.can_view_incident(uuid) from public, anon;
grant execute on function public.can_view_incident(uuid) to authenticated;

create or replace function public.can_edit_incident(_incident uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.incidents i
    where i.id = _incident and (public.has_role(i.company_id, 'admin') or i.created_by = auth.uid())
  )
$$;
revoke execute on function public.can_edit_incident(uuid) from public, anon;
grant execute on function public.can_edit_incident(uuid) to authenticated;

-- Riadky príloh.
drop policy if exists attachments_select on public.attachments;
create policy attachments_select on public.attachments for select to authenticated
  using (
    deleted_at is null
    and case entity_type
      when 'incident' then public.can_view_incident(entity_id)
      when 'service' then public.can(company_id, 'service.view')
      else public.can(company_id, 'vehicles.view')
    end
  );
drop policy if exists attachments_insert on public.attachments;
create policy attachments_insert on public.attachments for insert to authenticated
  with check (
    case entity_type
      when 'incident' then public.can_edit_incident(entity_id) and exists (select 1 from public.incidents i where i.id = entity_id and i.company_id = attachments.company_id)
      when 'service' then public.can(company_id, 'service.edit')
      else public.can(company_id, 'vehicles.log')
    end
  );
drop policy if exists attachments_delete on public.attachments;
create policy attachments_delete on public.attachments for delete to authenticated
  using (
    case entity_type
      when 'incident' then public.can_edit_incident(entity_id)
      when 'service' then public.can(company_id, 'service.edit')
      else public.can(company_id, 'vehicles.log')
    end
  );

create or replace function public.trash_attachment(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.attachments set deleted_at = now(), deleted_by_name = public.actor_name()
  where id = _id and deleted_at is null
    and case entity_type
      when 'incident' then public.can_edit_incident(entity_id)
      when 'service' then public.can(company_id, 'service.edit')
      else public.can(company_id, 'vehicles.log')
    end;
  if not found then
    raise exception 'Prílohu sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- Súbory: cesta {firma}/{druh}/{záznam}/… – pri škodách rovnaké pravidlá ako pri riadkoch, ostatné bez zmeny.
drop policy if exists attachments_files_select on storage.objects;
create policy attachments_files_select on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
    and (
      (storage.foldername(name))[2] is distinct from 'incident'
      or public.can_view_incident(((storage.foldername(name))[3])::uuid)
    )
  );
drop policy if exists attachments_files_insert on storage.objects;
create policy attachments_files_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and case
      when (storage.foldername(name))[2] = 'incident' then public.is_company_member(((storage.foldername(name))[1])::uuid) and public.can_edit_incident(((storage.foldername(name))[3])::uuid)
      else public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
    end
  );
drop policy if exists attachments_files_delete on storage.objects;
create policy attachments_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and case
      when (storage.foldername(name))[2] = 'incident' then public.can_edit_incident(((storage.foldername(name))[3])::uuid)
      else public.has_role(((storage.foldername(name))[1])::uuid, 'admin', 'skladnik', 'technik')
    end
  );
