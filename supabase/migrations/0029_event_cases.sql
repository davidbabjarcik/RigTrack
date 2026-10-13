-- RigTrack: celý case na evente.
-- Technika naplánovaná na event si pamätá case, s ktorým bola pridaná ako celok,
-- rovnako ako položky výpožičky (0024).

alter table public.event_equipment
  add column case_id uuid,
  add foreign key (company_id, case_id) references public.cases (company_id, id) on delete set null (case_id);
create index event_equipment_case_idx on public.event_equipment (case_id) where case_id is not null;
