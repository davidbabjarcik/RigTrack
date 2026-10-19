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
