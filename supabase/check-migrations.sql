-- RigTrack: ktoré migrácie databáza má.
-- Spustite v Supabase SQL Editore (nič nemení, len číta). Riadky s „chýba“ treba doplniť:
-- súbory 0020–0048 sú v supabase/upgrade/, 0049 a vyššie v supabase/migrations/. Spúšťajte ich podľa čísla,
-- od najnižšej chýbajúcej; 0053 samostatne pred 0054, 0062 samostatne pred 0063.
-- Ak hlášky v appke hovoria „column … does not exist“ (migrácia prebehla v staršej verzii), spustite
-- opravu 0071_repair_all_columns.sql – doplní všetky chýbajúce stĺpce; pri „violates check constraint“ alebo
-- starších funkciách potom 0072_repair_checks_functions.sql. Obe sa dajú spustiť aj viackrát.

with checks (migration, ok) as (
  values
    ('0021 odmeny a prevádzkové hodiny', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'equipment' and column_name = 'operating_hours')),
    ('0022 servis – počet kusov', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_records' and column_name = 'quantity')),
    ('0023 servis – čísla kusov', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_records' and column_name = 'unit_numbers')),
    ('0024 výpožičky – cases', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'loan_items' and column_name = 'case_id')),
    ('0025 evidencia po kusoch', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'equipment' and column_name = 'track_units')),
    ('0027 ceny prenájmu', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'equipment' and column_name = 'rental_price')),
    ('0028 úprava výpožičky', exists (select 1 from pg_proc where proname = 'add_loan_items')),
    ('0029 eventy – cases', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'event_equipment' and column_name = 'case_id')),
    ('0030 oprávnenia', to_regclass('public.role_permissions') is not null),
    ('0031 nákladný priestor', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vehicles' and column_name = 'payload_kg')),
    ('0032 sklad', to_regclass('public.warehouse_spots') is not null),
    ('0033 vlastné čísla kusov', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'equipment' and column_name = 'unit_ids')),
    ('0034 šablóny cases', to_regclass('public.case_templates') is not null),
    ('0035 mená pri vydaní / vrátení', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'loans' and column_name = 'issued_by_name')),
    ('0036 kôš', exists (select 1 from pg_proc where proname = 'recycle_bin_items')),
    ('0037 nákupy z bazárov', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'source')),
    ('0038 detaily eventu', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'events' and column_name = 'organizer')),
    ('0039 nastavenia pódia', to_regclass('public.stage_settings') is not null),
    ('0040 aliasy (import z Capture)', to_regclass('public.equipment_aliases') is not null),
    ('0041 demo firma', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'companies' and column_name = 'demo_owner')),
    ('0042 farby, príjmy z akcií', to_regclass('public.event_payments') is not null),
    ('0043 fotky cases a nákupov', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cases' and column_name = 'photo_path')),
    ('0044 pripomienky pri eventoch', to_regclass('public.event_rules') is not null),
    ('0045 balíky techniky', to_regclass('public.equipment_packages') is not null),
    ('0046 zamestnanci', to_regclass('public.staff') is not null),
    ('0047 miesto a elektrina', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'events' and column_name = 'power')),
    ('0048 hlásenia chýb', to_regclass('public.bug_reports') is not null),
    ('0049 servisní technici', to_regclass('public.service_technicians') is not null),
    ('0050 zmazanie firmy', exists (select 1 from pg_proc where proname = 'delete_company')),
    ('0051 zariadenia členov', to_regclass('public.member_devices') is not null),
    ('0052 účty, vlastníci, karty', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'equipment' and column_name = 'owner_staff_id')
      and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'member_devices' and column_name = 'networks')),
    ('0053 rola CEO (typ)', exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'app_role' and e.enumlabel = 'ceo')),
    ('0054 rola CEO (práva)', exists (select 1 from pg_proc where proname = 'can' and prosrc like '%ceo%')),
    ('0055 Wi-Fi siete (ak chýba, stačí oprava 0070)', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'wifi_networks' and column_name = 'dhcp_end')),
    ('0056 registrácia na pozvánku', exists (select 1 from pg_proc where proname = 'hook_require_invitation')),
    ('0057 ľudia (narodeniny, novinky)', to_regclass('public.company_news') is not null),
    ('0058 bohatšie demo', exists (select 1 from pg_proc where proname = 'seed_demo_extras')),
    ('0059 eventy (program, doprava)', to_regclass('public.event_days') is not null),
    ('0060 technika a objednávky', to_regclass('public.service_requests') is not null),
    ('0061 kancelária, škody, úlohy', to_regclass('public.incidents') is not null),
    ('0062 rola helper (typ)', exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'app_role' and e.enumlabel = 'helper')),
    ('0063 rola helper (práva)', exists (select 1 from pg_proc where proname = 'is_helper')),
    ('0064 ročná správa, partnerské firmy', exists (select 1 from pg_proc where proname = 'create_partner_company')),
    ('0065 prepojené firmy', to_regclass('public.company_links') is not null),
    ('0066 patch listy', to_regclass('public.event_patch') is not null),
    ('0067 žiadosti o servis pre autá', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'service_requests' and column_name = 'vehicle_id')),
    ('0068 druhy IT a spotrebiče', exists (select 1 from pg_constraint where conname = 'equipment_kind_check' and pg_get_constraintdef(oid) like '%appliance%')),
    ('0073 úrovne kontroly', to_regclass('public.company_check_levels') is not null),
    ('0074 pack list eventu', to_regclass('public.event_pack_checks') is not null),
    ('0075 podpisy výpožičiek', to_regclass('public.loan_signatures') is not null),
    ('0076 stretávky a dochádzka', to_regclass('public.event_attendance') is not null),
    ('0077 činnosti pri eventoch', to_regclass('public.event_duties') is not null),
    ('0078 údaje po kusoch', exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'equipment' and column_name = 'unit_info')),
    ('0079 skupiny ľudí v oprávneniach', to_regclass('public.permission_groups') is not null),
    ('0080 dochádzka na firme a doma', to_regclass('public.work_sessions') is not null)
)
select migration, case when ok then 'OK' else 'chýba' end as stav
from checks
order by migration;
