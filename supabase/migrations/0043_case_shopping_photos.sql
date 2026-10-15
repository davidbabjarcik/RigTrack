-- RigTrack: fotky ku cases a k položkám na nákup („kúpiť“ a „chceme časom“).
-- Fotka sa ukladá do bucketu equipment-photos v priečinku firmy ako ostatné fotky
-- a pri odstránení ide do koša (funkcie z 0036–0038, rozšírené o nové miesta).

alter table public.cases
  add column photo_path text not null default '' check (char_length(photo_path) <= 300);
grant update (photo_path) on public.cases to authenticated;

alter table public.shopping_items
  add column photo_path text not null default '' check (char_length(photo_path) <= 300);
grant update (photo_path) on public.shopping_items to authenticated;

alter table public.trashed_photos drop constraint if exists trashed_photos_owner_table_check;
alter table public.trashed_photos
  add constraint trashed_photos_owner_table_check
  check (owner_table in ('equipment', 'vehicles', 'cases', 'orders', 'case_photo', 'shopping_items'));

create or replace function public.trash_photo(_owner_table text, _owner_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _company uuid;
  _path text;
  _label text;
begin
  if _owner_table = 'equipment' then
    select company_id, photo_path, name into _company, _path, _label from public.equipment
    where id = _owner_id and deleted_at is null and public.can(company_id, 'equipment.edit');
  elsif _owner_table = 'vehicles' then
    select company_id, photo_path, plate into _company, _path, _label from public.vehicles
    where id = _owner_id and public.can(company_id, 'vehicles.edit');
  elsif _owner_table = 'cases' then
    select company_id, label_photo_path, name into _company, _path, _label from public.cases
    where id = _owner_id and deleted_at is null and public.can(company_id, 'cases.edit');
  elsif _owner_table = 'orders' then
    select company_id, photo_path, supplier into _company, _path, _label from public.orders
    where id = _owner_id and public.can(company_id, 'orders.edit');
  elsif _owner_table = 'case_photo' then
    select company_id, photo_path, name into _company, _path, _label from public.cases
    where id = _owner_id and deleted_at is null and public.can(company_id, 'cases.edit');
  elsif _owner_table = 'shopping_items' then
    select company_id, photo_path, name into _company, _path, _label from public.shopping_items
    where id = _owner_id and public.can(company_id, 'shopping.edit');
  end if;
  if _company is null or coalesce(_path, '') = '' then
    raise exception 'Fotku sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;

  insert into public.trashed_photos (company_id, owner_table, owner_id, path, label, deleted_by_name)
  values (_company, _owner_table, _owner_id, _path, _label, public.actor_name());
  if _owner_table = 'equipment' then
    update public.equipment set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'vehicles' then
    update public.vehicles set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'orders' then
    update public.orders set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'case_photo' then
    update public.cases set photo_path = '' where id = _owner_id;
  elsif _owner_table = 'shopping_items' then
    update public.shopping_items set photo_path = '' where id = _owner_id;
  else
    update public.cases set label_photo_path = '' where id = _owner_id;
  end if;
end;
$$;

create or replace function public.recycle_bin_items(_company_id uuid)
returns table (kind text, id uuid, label text, detail text, deleted_at timestamptz, deleted_by_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kôš môže otvoriť iba admin' using errcode = 'insufficient_privilege';
  end if;
  return query
    select case when e.kind = 'consumable' then 'consumable' else 'equipment' end, e.id, e.name,
      concat_ws(' · ', nullif(trim(e.manufacturer || ' ' || e.model), ''), nullif(e.inventory_number, ''), e.quantity || ' ks'),
      e.deleted_at, e.deleted_by_name
    from public.equipment e where e.company_id = _company_id and e.deleted_at is not null
    union all
    select 'case', c.id, c.name,
      concat_ws(' · ', nullif(c.inventory_number, ''), 'položiek v obsahu: ' || cardinality(c.trashed_content)),
      c.deleted_at, c.deleted_by_name
    from public.cases c where c.company_id = _company_id and c.deleted_at is not null
    union all
    select 'event_document', d.id, d.name,
      case when d.is_photo then 'fotka eventu: ' else 'dokument eventu: ' end || coalesce(ev.name, ''), d.deleted_at, d.deleted_by_name
    from public.event_documents d left join public.events ev on ev.id = d.event_id
    where d.company_id = _company_id and d.deleted_at is not null
    union all
    select 'attachment', a.id, a.name, case a.entity_type when 'service' then 'príloha servisného záznamu' else 'príloha vozidla' end,
      a.deleted_at, a.deleted_by_name
    from public.attachments a where a.company_id = _company_id and a.deleted_at is not null
    union all
    select 'photo', p.id, p.label,
      case p.owner_table when 'equipment' then 'fotka techniky' when 'vehicles' then 'fotka vozidla'
        when 'orders' then 'fotka nákupu' when 'case_photo' then 'fotka case'
        when 'shopping_items' then 'fotka položky na nákup' else 'fotka na štítku case' end,
      p.deleted_at, p.deleted_by_name
    from public.trashed_photos p where p.company_id = _company_id
    order by 5 desc;
end;
$$;

create or replace function public.restore_bin_item(_company_id uuid, _kind text, _id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  _photo public.trashed_photos;
  _restored integer;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Z koša môže obnovovať iba admin' using errcode = 'insufficient_privilege';
  end if;

  if _kind in ('equipment', 'consumable') then
    update public.equipment set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'case' then
    update public.cases set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
    get diagnostics _restored = row_count;
    -- Obsah sa vráti, pokiaľ ho medzitým niekto nedal do iného case.
    update public.equipment e set case_id = _id
    from public.cases c
    where c.id = _id and _restored = 1 and e.id = any (c.trashed_content) and e.case_id is null and e.company_id = _company_id;
    update public.cases set trashed_content = '{}' where id = _id and _restored = 1;
    if _restored = 0 then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    return;
  elsif _kind = 'event_document' then
    update public.event_documents set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'attachment' then
    update public.attachments set deleted_at = null, deleted_by_name = ''
    where id = _id and company_id = _company_id and deleted_at is not null;
  elsif _kind = 'photo' then
    select * into _photo from public.trashed_photos where id = _id and company_id = _company_id;
    if not found then
      raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
    end if;
    -- Fotka sa vráti len na prázdne miesto; novšiu fotku neprepíše.
    if _photo.owner_table = 'equipment' then
      update public.equipment set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'vehicles' then
      update public.vehicles set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'orders' then
      update public.orders set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'case_photo' then
      update public.cases set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    elsif _photo.owner_table = 'shopping_items' then
      update public.shopping_items set photo_path = _photo.path where id = _photo.owner_id and photo_path = '';
    else
      update public.cases set label_photo_path = _photo.path where id = _photo.owner_id and label_photo_path = '';
    end if;
    if not found then
      raise exception 'Fotku nemožno obnoviť: záznam už má inú fotku alebo neexistuje' using errcode = 'check_violation';
    end if;
    delete from public.trashed_photos where id = _id;
    return;
  else
    raise exception 'Neznámy druh položky' using errcode = 'check_violation';
  end if;

  if not found then
    raise exception 'Položka v koši už nie je' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Pri trvalom zmazaní case zanikne aj jeho fotka.
create or replace function public.purge_bin(_company_id uuid, _mode text, _kind text default null, _id uuid default null)
returns table (bucket text, path text)
language plpgsql security definer set search_path = '' as $$
declare
  _before timestamptz := case when _mode = 'expired' then now() - interval '30 days' else 'infinity'::timestamptz end;
begin
  if not public.has_role(_company_id, 'admin') then
    raise exception 'Kôš môže vyprázdniť iba admin' using errcode = 'insufficient_privilege';
  end if;
  if _mode not in ('expired', 'all', 'one') or (_mode = 'one' and (_kind is null or _id is null)) then
    raise exception 'Neplatná požiadavka' using errcode = 'check_violation';
  end if;

  create temporary table if not exists _purged_files (bucket text, path text) on commit drop;
  delete from _purged_files;

  -- Technika: s ňou zanikne jej fotka aj prílohy naviazaných záznamov riešia kaskády.
  with gone as (
    delete from public.equipment e
    where e.company_id = _company_id and e.deleted_at is not null and e.deleted_at < _before
      and (_mode <> 'one' or (_kind in ('equipment', 'consumable') and e.id = _id))
    returning e.photo_path
  )
  insert into _purged_files select 'equipment-photos', g.photo_path from gone g where g.photo_path <> '';

  with gone as (
    delete from public.cases c
    where c.company_id = _company_id and c.deleted_at is not null and c.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'case' and c.id = _id))
    returning c.label_photo_path, c.photo_path
  )
  insert into _purged_files
  select 'equipment-photos', p from gone g, unnest(array[g.label_photo_path, g.photo_path]) p where p <> '';

  with gone as (
    delete from public.event_documents d
    where d.company_id = _company_id and d.deleted_at is not null and d.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'event_document' and d.id = _id))
    returning d.path
  )
  insert into _purged_files select 'event-documents', g.path from gone g;

  with gone as (
    delete from public.attachments a
    where a.company_id = _company_id and a.deleted_at is not null and a.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'attachment' and a.id = _id))
    returning a.path
  )
  insert into _purged_files select 'attachments', g.path from gone g;

  with gone as (
    delete from public.trashed_photos p
    where p.company_id = _company_id and p.deleted_at < _before
      and (_mode <> 'one' or (_kind = 'photo' and p.id = _id))
    returning p.path
  )
  insert into _purged_files select 'equipment-photos', g.path from gone g;

  return query select f.bucket, f.path from _purged_files f;
end;
$$;
