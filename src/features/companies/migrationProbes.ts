import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

/** Migrácia a tabuľka / stĺpec, podľa ktorého sa dá zistiť, či je v databáze. */
export const MIGRATION_PROBES: { migration: string; label: string; table: string; column: string }[] = [
  { migration: '0041', label: 'demo firma', table: 'companies', column: 'demo_owner' },
  { migration: '0043', label: 'fotky cases a nákupov', table: 'cases', column: 'photo_path' },
  { migration: '0045', label: 'balíky techniky', table: 'equipment_packages', column: 'id' },
  { migration: '0046', label: 'zamestnanci', table: 'staff', column: 'id' },
  { migration: '0048', label: 'hlásenia chýb', table: 'bug_reports', column: 'id' },
  { migration: '0049', label: 'servisní technici', table: 'service_technicians', column: 'id' },
  { migration: '0051', label: 'zariadenia členov', table: 'member_devices', column: 'id' },
  { migration: '0052', label: 'vlastníci techniky', table: 'equipment', column: 'owner_staff_id' },
  { migration: '0069', label: 'oprava zariadení (Wi-Fi siete, ethernet MAC)', table: 'member_devices', column: 'networks' },
  { migration: '0070', label: 'Wi-Fi siete (oprava 0055)', table: 'wifi_networks', column: 'dhcp_end' },
  { migration: '0057', label: 'narodeniny, novinky', table: 'company_news', column: 'id' },
  { migration: '0059', label: 'program eventu, firmy a kontakty', table: 'event_days', column: 'id' },
  { migration: '0060', label: 'kapsule, žiadosti o servis', table: 'service_requests', column: 'id' },
  { migration: '0061', label: 'kancelária, škody, úlohy', table: 'incidents', column: 'id' },
  { migration: '0064', label: 'ročná správa, partnerské firmy', table: 'partners', column: 'linked_company_id' },
  { migration: '0065', label: 'prepojené firmy, video a DJ technika', table: 'company_links', column: 'id' },
  { migration: '0066', label: 'patch listy', table: 'event_patch', column: 'id' },
  { migration: '0073', label: 'úrovne kontroly', table: 'company_check_levels', column: 'company_id' },
  { migration: '0074', label: 'pack list eventu', table: 'event_pack_checks', column: 'id' },
  { migration: '0075', label: 'podpisy výpožičiek', table: 'loan_signatures', column: 'id' },
  { migration: '0076', label: 'stretávky a dochádzka', table: 'event_attendance', column: 'wait_minutes' },
  { migration: '0077', label: 'činnosti pri eventoch', table: 'event_duties', column: 'id' },
  { migration: '0078', label: 'údaje po kusoch, staré čísla cases', table: 'cases', column: 'old_numbers' },
  { migration: '0079', label: 'skupiny ľudí v oprávneniach', table: 'permission_groups', column: 'id' },
  { migration: '0080', label: 'dochádzka na firme a doma', table: 'work_sessions', column: 'id' },
  { migration: '0081', label: 'osobný profil pre všetky firmy', table: 'personal_profiles', column: 'user_id' },
  { migration: '0082', label: 'šoféri pri eventoch', table: 'event_drives', column: 'id' },
  { migration: '0083', label: 'faktúry ku kusom techniky', table: 'order_item_equipment', column: 'unit_numbers' },
  { migration: '0084', label: 'push upozornenia, sociálne siete v profile', table: 'push_subscriptions', column: 'id' },
  { migration: '0085', label: 'vlastná technika vo viacerých firmách', table: 'equipment', column: 'shared_from' },
  { migration: '0086', label: 'moja fotka, vlastná technika z Vyberte firmu, zariadenia hostí', table: 'guest_devices', column: 'id' },
  { migration: '0087', label: 'zručnosti v osobnom profile', table: 'personal_profiles', column: 'skills' },
  { migration: '0088', label: 'Firmy a kontakty (obchodné meno, CEO, prepojenie), zobrazenie loga, push bez webhooku', table: 'partners', column: 'legal_name' },
  { migration: '0089', label: 'zodpovedné osoby', table: 'responsibilities', column: 'id' },
  { migration: '0090', label: 'zvonček s upozorneniami, viac upozornení', table: 'notifications', column: 'read_at' },
  { migration: '0092', label: 'hodinové sadzby a mesačný výkaz', table: 'member_rates', column: 'member_id' },
  { migration: '0093', label: 'história cenových ponúk', table: 'event_quotes', column: 'id' },
  { migration: '0094', label: 'zakladanie firiem so schválením', table: 'company_requests', column: 'id' },
  { migration: '0095', label: 'plán pódia k eventu', table: 'event_stage_plans', column: 'event_id' },
  { migration: '0096', label: 'cenové ponuky, vystavovatelia a oprávnenia', table: 'quotes', column: 'id' },
  { migration: '0097', label: 'odkaz na ponuku pre klienta, s.r.o. / živnosť, pripnuté firmy na účet', table: 'company_pins', column: 'company_id' },
  { migration: '0098', label: 'úloha z políčka cez @todo s odkazom späť', table: 'tasks', column: 'link' },
  { migration: '0099', label: 'case alebo rack (U), úlohy bez priority, nastavenia účtu', table: 'user_prefs', column: 'prefs' },
  { migration: '0102', label: 'právna forma pri firmách a kontaktoch', table: 'partners', column: 'legal_form' },
  { migration: '0103', label: 'oprávnenia sietí a kontrol, Wi-Fi firmy', table: 'wifi_networks', column: 'scope' },
  { migration: '0104', label: 'šablóny patch listov, DMX patch list pri evente', table: 'event_dmx_patch', column: 'universe' },
  { migration: '0067', label: 'žiadosti o servis pre autá', table: 'service_requests', column: 'vehicle_id' },
]

/** Ktoré migrácie v databáze chýbajú (tabuľka alebo stĺpec neexistuje). Prístup cez RLS nevadí – prázdny výsledok nie je chyba. */
export async function fetchMissingMigrations() {
  const db = getSupabase()
  const results = await Promise.all(
    MIGRATION_PROBES.map(async (probe) => {
      const { error } = await db.from(probe.table).select(probe.column, { head: true }).limit(1)
      return error ? probe : null
    }),
  )
  return results.filter((probe): probe is (typeof MIGRATION_PROBES)[number] => probe !== null)
}

export function useMissingMigrations(enabled = true) {
  return useQuery({ queryKey: ['migration-status'], queryFn: fetchMissingMigrations, enabled, staleTime: 10 * 60_000, retry: false })
}
