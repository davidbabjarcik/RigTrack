// Kolízie naprieč firmami (0091): kto z ľudí a koľko kusov vlastnej techniky je v termíne obsadených v inej firme.
// Firma sa nedozvie, kde – len že sú obsadení (a od–do).
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type BusyMember = { memberId: string; events: number; startsOn: string; endsOn: string }
export type BusyGear = { equipmentId: string; quantity: number; startsOn: string; endsOn: string }

export const elsewhereKeys = {
  crew: (companyId: string, from: string, to: string) => ['company', companyId, 'elsewhere', 'crew', from, to] as const,
  gear: (companyId: string, from: string, to: string) => ['company', companyId, 'elsewhere', 'gear', from, to] as const,
}

export async function fetchCrewBusyElsewhere(companyId: string, from: string, to: string): Promise<BusyMember[]> {
  const { data, error } = await getSupabase().rpc('crew_busy_elsewhere', { _company_id: companyId, _from: from, _to: to })
  if (error) throw error
  return (data as { member_id: string; events: number; starts_on: string; ends_on: string }[]).map((row) => ({ memberId: row.member_id, events: row.events, startsOn: row.starts_on, endsOn: row.ends_on }))
}

export async function fetchGearBusyElsewhere(companyId: string, from: string, to: string): Promise<BusyGear[]> {
  const { data, error } = await getSupabase().rpc('gear_busy_elsewhere', { _company_id: companyId, _from: from, _to: to })
  if (error) throw error
  return (data as { equipment_id: string; quantity: number; starts_on: string; ends_on: string }[]).map((row) => ({ equipmentId: row.equipment_id, quantity: row.quantity, startsOn: row.starts_on, endsOn: row.ends_on }))
}

/** Bez migrácie 0091 prázdne (nič sa neukáže). */
export function useCrewBusyElsewhere(companyId: string, from: string, to: string) {
  return useQuery({ queryKey: elsewhereKeys.crew(companyId, from, to), queryFn: () => fetchCrewBusyElsewhere(companyId, from, to), retry: false, staleTime: 60_000 })
}

export function useGearBusyElsewhere(companyId: string, from: string, to: string) {
  return useQuery({ queryKey: elsewhereKeys.gear(companyId, from, to), queryFn: () => fetchGearBusyElsewhere(companyId, from, to), retry: false, staleTime: 60_000 })
}
