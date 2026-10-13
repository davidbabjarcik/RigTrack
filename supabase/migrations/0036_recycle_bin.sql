-- RigTrack: kôš.
-- Zmazanie techniky (zariadenie, položka, spotrebný materiál), case, fotky alebo dokumentu
-- záznam nezničí, len ho označí ako zmazaný. Bežné dotazy ho potom nevidia (stráži to RLS),
-- história, výpožičky aj servis ostávajú. Admin ho môže 30 dní obnoviť, alebo zmazať natrvalo.
--
-- Do koša sa hádže cez funkcie trash_*: kontrolujú tie isté oprávnenia ako doterajšie mazanie.
-- Sú SECURITY DEFINER, lebo riadok po označení prestane byť pre volajúceho viditeľný.

alter table public.equipment
  add column deleted_at timestamptz,
  add column deleted_by_name text not null default '';
alter table public.cases
  add column deleted_at timestamptz,
  add column deleted_by_name text not null default '',
  -- Čo v case bolo, keď išiel do koša; pri obnove sa to doň vráti.
  add column trashed_content uuid[] not null default '{}';
alter table public.event_documents
  add column deleted_at timestamptz,
  add column deleted_by_name text not null default '';
alter table public.attachments
  add column deleted_at timestamptz,
  add column deleted_by_name text not null default '';

-- Fotka nie je samostatný záznam, len cesta v riadku majiteľa; v koši preto má vlastný riadok.
create table public.trashed_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  owner_table text not null check (owner_table in ('equipment', 'vehicles', 'cases')),
  owner_id uuid not null,
  path text not null check (char_length(path) <= 300),
  label text not null default '',
  deleted_at timestamptz not null default now(),
  deleted_by_name text not null default ''
);
create index trashed_photos_company_idx on public.trashed_photos (company_id, deleted_at);
alter table public.trashed_photos enable row level security;
revoke all on public.trashed_photos from anon, authenticated;
-- Žiadna politika ani grant: k tabuľke sa pristupuje len cez funkcie nižšie.

create index equipment_deleted_idx on public.equipment (company_id, deleted_at) where deleted_at is not null;
create index cases_deleted_idx on public.cases (company_id, deleted_at) where deleted_at is not null;

-- Zmazaný záznam nesmie blokovať označenie pre nový; obnova s kolíziou zlyhá s jasnou chybou.
drop index public.equipment_inventory_number_idx;
create unique index equipment_inventory_number_idx on public.equipment (company_id, lower(inventory_number))
  where inventory_number <> '' and deleted_at is null;
drop index public.cases_inventory_number_idx;
create unique index cases_inventory_number_idx on public.cases (company_id, lower(inventory_number))
  where inventory_number <> '' and deleted_at is null;

-- Zmazané záznamy nevidí nikto, ani admin: kôš sa číta funkciou recycle_bin_items().
alter policy equipment_select on public.equipment
  using (public.can(company_id, 'equipment.view') and deleted_at is null);
alter policy cases_select on public.cases
  using (public.can(company_id, 'cases.view') and deleted_at is null);
alter policy event_documents_select on public.event_documents
  using (public.can(company_id, 'events.view') and deleted_at is null);
alter policy attachments_select on public.attachments
  using (
    public.can(company_id, case entity_type when 'service' then 'service.view' else 'vehicles.view' end)
    and deleted_at is null
  );

create function public.actor_name()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select coalesce(nullif(trim(p.full_name), ''), p.email) from public.profiles p where p.id = auth.uid()), '');
$$;
revoke execute on function public.actor_name() from public, anon;

-- ---------------------------------------------------------------------------
-- Hodenie do koša
-- ---------------------------------------------------------------------------

create function public.trash_equipment(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.equipment set deleted_at = now(), deleted_by_name = public.actor_name()
  where id = _id and deleted_at is null and public.can(company_id, 'equipment.delete');
  if not found then
    raise exception 'Techniku sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- Case si zapamätá svoj obsah a technika sa z neho vyberie, aby neostala „v case, ktorý nie je“.
create function public.trash_case(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.cases c
  set deleted_at = now(), deleted_by_name = public.actor_name(),
      trashed_content = array(select e.id from public.equipment e where e.case_id = c.id)
  where c.id = _id and c.deleted_at is null and public.can(c.company_id, 'cases.delete');
  if not found then
    raise exception 'Case sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
  update public.equipment set case_id = null where case_id = _id;
end;
$$;

create function public.trash_event_document(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.event_documents set deleted_at = now(), deleted_by_name = public.actor_name()
  where id = _id and deleted_at is null and public.can(company_id, 'events.edit');
  if not found then
    raise exception 'Dokument sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

create function public.trash_attachment(_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.attachments set deleted_at = now(), deleted_by_name = public.actor_name()
  where id = _id and deleted_at is null
    and public.can(company_id, case entity_type when 'service' then 'service.edit' else 'vehicles.log' end);
  if not found then
    raise exception 'Prílohu sa nepodarilo zmazať' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- Fotka techniky, vozidla alebo vlastná fotka na štítku case: cesta sa presunie do koša.
create function public.trash_photo(_owner_table text, _owner_id uuid)
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
  else
    update public.cases set label_photo_path = '' where id = _owner_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Kôš: prehľad, obnova a trvalé zmazanie. Iba admin firmy.
-- ---------------------------------------------------------------------------

create function public.recycle_bin_items(_company_id uuid)
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
    select 'event_document', d.id, d.name, 'dokument eventu: ' || coalesce(ev.name, ''), d.deleted_at, d.deleted_by_name
    from public.event_documents d left join public.events ev on ev.id = d.event_id
    where d.company_id = _company_id and d.deleted_at is not null
    union all
    select 'attachment', a.id, a.name, case a.entity_type when 'service' then 'príloha servisného záznamu' else 'príloha vozidla' end,
      a.deleted_at, a.deleted_by_name
    from public.attachments a where a.company_id = _company_id and a.deleted_at is not null
    union all
    select 'photo', p.id, p.label,
      case p.owner_table when 'equipment' then 'fotka techniky' when 'vehicles' then 'fotka vozidla' else 'fotka na štítku case' end,
      p.deleted_at, p.deleted_by_name
    from public.trashed_photos p where p.company_id = _company_id
    order by 5 desc;
end;
$$;

create function public.restore_bin_item(_company_id uuid, _kind text, _id uuid)
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

-- Natrvalo zmaže položky z koša a vráti súbory, ktoré po nich treba odstrániť zo Storage
-- (to databáza sama nevie). _mode: 'expired' = staršie než 30 dní, 'all' = celý kôš,
-- 'one' = jedna položka (_kind, _id).
create function public.purge_bin(_company_id uuid, _mode text, _kind text default null, _id uuid default null)
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
    returning c.label_photo_path
  )
  insert into _purged_files select 'equipment-photos', g.label_photo_path from gone g where g.label_photo_path <> '';

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

revoke execute on function
  public.trash_equipment(uuid), public.trash_case(uuid), public.trash_event_document(uuid), public.trash_attachment(uuid),
  public.trash_photo(text, uuid), public.recycle_bin_items(uuid), public.restore_bin_item(uuid, text, uuid),
  public.purge_bin(uuid, text, text, uuid)
  from public, anon;
grant execute on function
  public.trash_equipment(uuid), public.trash_case(uuid), public.trash_event_document(uuid), public.trash_attachment(uuid),
  public.trash_photo(text, uuid), public.recycle_bin_items(uuid), public.restore_bin_item(uuid, text, uuid),
  public.purge_bin(uuid, text, text, uuid)
  to authenticated;
