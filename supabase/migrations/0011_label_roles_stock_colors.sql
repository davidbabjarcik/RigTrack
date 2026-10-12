-- RigTrack: hlavný a vedľajší prvok na štítku, zásoby spotrebného materiálu
-- a farebný kód dĺžok káblov pre hárok FLIGHTCASE CONTENT.

-- ---------------------------------------------------------------------------
-- Štítok: jeden hlavný prvok case (s fotkou) a ľubovoľne veľa vedľajších.
-- Nahrádza stĺpec on_label z 0010.
-- ---------------------------------------------------------------------------

alter table public.equipment
  add column label_role text check (label_role in ('main', 'secondary'));
update public.equipment set label_role = 'secondary' where on_label;

drop trigger equipment_reset_on_label on public.equipment;
drop function public.reset_on_label();
alter table public.equipment drop column on_label;

create unique index equipment_one_main_per_case on public.equipment (case_id) where label_role = 'main';
grant update (label_role) on public.equipment to authenticated;

-- Rola patrí ku konkrétnemu case: po presune alebo vybratí zaniká.
-- Nový hlavný prvok nahradí doterajší hlavný prvok toho istého case.
create function public.maintain_label_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.case_id is null or new.case_id is distinct from old.case_id then
    new.label_role := null;
  end if;
  if new.label_role = 'main' and old.label_role is distinct from 'main' then
    update public.equipment set label_role = null
    where case_id = new.case_id and label_role = 'main' and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger equipment_maintain_label_role
  before update of case_id, label_role on public.equipment
  for each row execute function public.maintain_label_role();

revoke execute on function public.maintain_label_role() from public, anon;

-- ---------------------------------------------------------------------------
-- Zásoby: spotrebný materiál (napr. kvapalina do hazera) môže klesnúť na nulu
-- a pri dosiahnutí min_quantity sa objaví v zozname „treba kúpiť“.
-- ---------------------------------------------------------------------------

alter table public.equipment
  drop constraint equipment_quantity_check,
  add constraint equipment_quantity_check check (quantity between 0 and 100000),
  drop constraint equipment_kind_check,
  add constraint equipment_kind_check check (kind in ('general', 'cable', 'light', 'audio', 'consumable')),
  add column min_quantity integer check (min_quantity between 0 and 100000);
grant update (min_quantity) on public.equipment to authenticated;

-- ---------------------------------------------------------------------------
-- Farebný kód dĺžok káblov: každá dĺžka má vo firme svoju farbu.
-- ---------------------------------------------------------------------------

create table public.cable_colors (
  company_id uuid not null references public.companies (id) on delete cascade,
  length_m numeric(6, 2) not null check (length_m > 0),
  name text not null default '' check (char_length(name) <= 40),
  color text not null check (color ~ '^#[0-9a-f]{6}$'),
  primary key (company_id, length_m)
);

alter table public.cable_colors enable row level security;

create policy cable_colors_select on public.cable_colors for select to authenticated
  using (public.is_company_member(company_id));
create policy cable_colors_insert on public.cable_colors for insert to authenticated
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy cable_colors_update on public.cable_colors for update to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'))
  with check (public.has_role(company_id, 'admin', 'skladnik'));
create policy cable_colors_delete on public.cable_colors for delete to authenticated
  using (public.has_role(company_id, 'admin', 'skladnik'));

revoke all on public.cable_colors from anon, authenticated;
grant select, insert, delete, update (name, color) on public.cable_colors to authenticated;
