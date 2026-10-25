import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import { readStageConfig, type StageConfig, type StageRequest } from './model'

export const stageKeys = {
  config: (companyId: string) => ['company', companyId, 'stage-settings'] as const,
}

export async function fetchStageConfig(companyId: string): Promise<StageConfig> {
  const { data, error } = await getSupabase().from('stage_settings').select('config').eq('company_id', companyId).maybeSingle()
  if (error) throw error
  return readStageConfig(data?.config)
}

/** Najprv úprava, až potom vloženie: upsert by menil stĺpec kľúča, na ktorý nie je UPDATE. */
export async function saveStageConfig(companyId: string, config: StageConfig) {
  const table = getSupabase().from('stage_settings')
  const updated = await table.update({ config }).eq('company_id', companyId).select('company_id')
  if (updated.error) throw updated.error
  if (updated.data.length > 0) return
  const { error } = await getSupabase().from('stage_settings').insert({ company_id: companyId, config })
  if (error) throw error
}

export const stagePlanKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'stage-plan'] as const }

export type SavedStagePlan = { request: Partial<StageRequest>; updatedAt: string }

/** Plán pódia uložený k eventu (0095); null = nie je. */
export async function fetchEventStagePlan(companyId: string, eventId: string): Promise<SavedStagePlan | null> {
  const { data, error } = await getSupabase().from('event_stage_plans').select('request, updated_at').eq('company_id', companyId).eq('event_id', eventId).maybeSingle()
  if (error) throw error
  return data ? { request: (data as { request: Partial<StageRequest> }).request, updatedAt: (data as { updated_at: string }).updated_at } : null
}

export function useEventStagePlan(companyId: string, eventId: string) {
  return useQuery({ queryKey: stagePlanKeys.ofEvent(companyId, eventId), queryFn: () => fetchEventStagePlan(companyId, eventId), enabled: Boolean(eventId), retry: false })
}

export async function saveEventStagePlan(companyId: string, eventId: string, request: StageRequest) {
  const { error } = await getSupabase()
    .from('event_stage_plans')
    .upsert({ company_id: companyId, event_id: eventId, request, updated_at: new Date().toISOString() }, { onConflict: 'event_id' })
  if (error) throw error
}

export async function deleteEventStagePlan(companyId: string, eventId: string) {
  const { error } = await getSupabase().from('event_stage_plans').delete().eq('company_id', companyId).eq('event_id', eventId)
  if (error) throw error
}
