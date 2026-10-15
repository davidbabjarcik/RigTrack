import { getSupabase } from '@/lib/supabase/client'
import { readStageConfig, type StageConfig } from './model'

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
