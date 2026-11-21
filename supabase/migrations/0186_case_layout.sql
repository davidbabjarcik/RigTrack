-- RigTrack 10.16: priehradky v case. Case sa rozdelí na mriežku (napr. 2 × 3) a pri každej priehradke sa zapíše,
-- čo v nej je (kus techniky, pri technike po kusoch konkrétny kus) a poznámka. Mení, kto upravuje cases (platí
-- existujúce pravidlo pre úpravu cases); obsah je len malý zoznam s obmedzenou veľkosťou.

alter table public.cases add column if not exists layout jsonb not null default '{}'::jsonb;
do $$
begin
  alter table public.cases drop constraint if exists cases_layout_check;
  alter table public.cases add constraint cases_layout_check check (jsonb_typeof(layout) = 'object' and pg_column_size(layout) <= 20000);
end;
$$;
grant update (layout) on public.cases to authenticated;
