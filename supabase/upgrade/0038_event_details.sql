-- RigTrack: podrobnosti eventu pre tlač a fotky eventu.
-- Organizátor s kontaktom, popis akcie a časy (príchod/stavba, začiatok a koniec programu).
-- Fotky eventu (pódium, miesto, príjazd…) sú súbory v buckete event-documents ako dokumenty,
-- len s príznakom is_photo; mažú sa do koša rovnako.

alter table public.events
  add column organizer text not null default '' check (char_length(organizer) <= 120),
  add column organizer_person text not null default '' check (char_length(organizer_person) <= 120),
  add column organizer_phone text not null default '' check (char_length(organizer_phone) <= 40),
  add column organizer_email text not null default '' check (char_length(organizer_email) <= 120),
  add column description text not null default '' check (char_length(description) <= 8000),
  -- Časy platia pre prvý deň eventu.
  add column get_in_time time,
  add column show_time time,
  add column show_end_time time;

grant update (organizer, organizer_person, organizer_phone, organizer_email, description, get_in_time, show_time, show_end_time)
  on public.events to authenticated;

alter table public.event_documents add column is_photo boolean not null default false;

-- Kôš rozlíši fotku eventu od dokumentu (inak rovnaká funkcia ako v 0037).
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
        when 'orders' then 'fotka nákupu' else 'fotka na štítku case' end,
      p.deleted_at, p.deleted_by_name
    from public.trashed_photos p where p.company_id = _company_id
    order by 5 desc;
end;
$$;
