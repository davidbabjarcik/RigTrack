-- RigTrack 10.18: kontrola case po položkách. Pri kontrole sa odškrtá, čo v case je (technika po kusoch po kusoch,
-- ostatná s počtom), a uloží sa, koľko sa malo nájsť a koľko sa našlo. Kto a kedy kontroloval, dopĺňa databáza ako
-- doteraz. Zoznam je malý a s obmedzenou veľkosťou.

alter table public.case_checks add column if not exists items jsonb not null default '[]'::jsonb;
do $$
begin
  alter table public.case_checks drop constraint if exists case_checks_items_check;
  alter table public.case_checks add constraint case_checks_items_check
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 500 and pg_column_size(items) <= 40000);
end;
$$;
create index if not exists case_checks_checked_by_idx on public.case_checks (company_id, checked_by, checked_at desc);
grant insert (items) on public.case_checks to authenticated;
