import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type PackPhase = 'out' | 'back'
export type PackCheck = { id: string; equipmentId: string | null; caseId: string | null; phase: PackPhase; checkedByName: string; checkedAt: string }

export const packKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'pack'] as const }

export async function fetchPackChecks(companyId: string, eventId: string): Promise<PackCheck[]> {
  const { data, error } = await getSupabase()
    .from('event_pack_checks')
    .select('id, equipment_id, case_id, phase, checked_by_name, checked_at')
    .eq('company_id', companyId)
    .eq('event_id', eventId)
  if (error) throw error
  return (data as { id: string; equipment_id: string | null; case_id: string | null; phase: PackPhase; checked_by_name: string; checked_at: string }[]).map((row) => ({
    id: row.id,
    equipmentId: row.equipment_id,
    caseId: row.case_id,
    phase: row.phase,
    checkedByName: row.checked_by_name,
    checkedAt: row.checked_at,
  }))
}

export function usePackChecks(companyId: string, eventId: string) {
  return useQuery({ queryKey: packKeys.ofEvent(companyId, eventId), queryFn: () => fetchPackChecks(companyId, eventId), retry: false, refetchInterval: 15_000 })
}

/** Odškrtne (alebo zruší odškrtnutie) techniky či case pri nakladaní / návrate. */
export async function setPackCheck(companyId: string, eventId: string, item: { equipmentId?: string; caseId?: string }, phase: PackPhase, checked: boolean, existingId?: string) {
  const db = getSupabase().from('event_pack_checks')
  if (!checked) {
    if (!existingId) return
    const { error } = await db.delete().eq('id', existingId)
    if (error) throw error
    return
  }
  const { error } = await db.insert({ company_id: companyId, event_id: eventId, equipment_id: item.equipmentId ?? null, case_id: item.caseId ?? null, phase })
  // Niekto iný ho medzitým odškrtol – to je v poriadku.
  if (error && error.code !== '23505') throw error
}

// Naskenované jednotlivé kusy (0108): QR kusu „Beam 7R #7“. Bez migrácie prázdne.
export type PackUnit = { equipmentId: string; unit: number; phase: PackPhase }
export const packUnitKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'pack-units'] as const }

export async function fetchPackUnits(companyId: string, eventId: string): Promise<PackUnit[]> {
  const { data, error } = await getSupabase().from('event_pack_units').select('equipment_id, unit, phase').eq('company_id', companyId).eq('event_id', eventId)
  if (error) return []
  return (data as { equipment_id: string; unit: number; phase: PackPhase }[]).map((row) => ({ equipmentId: row.equipment_id, unit: row.unit, phase: row.phase }))
}

export function usePackUnits(companyId: string, eventId: string) {
  return useQuery({ queryKey: packUnitKeys.ofEvent(companyId, eventId), queryFn: () => fetchPackUnits(companyId, eventId), retry: false, refetchInterval: 15_000 })
}

export async function addPackUnit(companyId: string, eventId: string, equipmentId: string, unit: number, phase: PackPhase) {
  const { error } = await getSupabase().from('event_pack_units').insert({ company_id: companyId, event_id: eventId, equipment_id: equipmentId, unit, phase })
  if (error && error.code !== '23505') throw error
}
