import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import { readPowerPlan, type PowerPlan } from './powerPlan'

export const powerPlanKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'power-plan'] as const }

/** Plán elektriky po miestach (0166); bez migrácie alebo bez plánu prázdny. */
export async function fetchPowerPlan(companyId: string, eventId: string): Promise<PowerPlan & { saved: boolean }> {
  const { data, error } = await getSupabase().from('event_power_plans').select('plan').eq('company_id', companyId).eq('event_id', eventId).maybeSingle()
  if (error) throw error
  return { ...readPowerPlan((data as { plan: unknown } | null)?.plan), saved: Boolean(data) }
}

export function usePowerPlan(companyId: string, eventId: string) {
  return useQuery({ queryKey: powerPlanKeys.ofEvent(companyId, eventId), queryFn: () => fetchPowerPlan(companyId, eventId), retry: false })
}

/** Najprv úprava, až potom vloženie: upsert by menil aj stĺpce kľúča, na ktoré nie je UPDATE. */
export async function savePowerPlan(companyId: string, eventId: string, plan: PowerPlan) {
  const updated = await getSupabase().from('event_power_plans').update({ plan }).eq('company_id', companyId).eq('event_id', eventId).select('event_id')
  if (updated.error) throw updated.error
  if (updated.data.length > 0) return
  const { error } = await getSupabase().from('event_power_plans').insert({ company_id: companyId, event_id: eventId, plan })
  if (error) throw error
}
