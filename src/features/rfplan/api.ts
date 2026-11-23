import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import { DEFAULT_SETTINGS, type RfChannel, type RfSettings } from './rf'

export type RfPlan = { channels: RfChannel[]; settings: RfSettings; excludedTv: number[]; place: string; note: string; version: number; updatedAt: string | null }
export const EMPTY_RF_PLAN: RfPlan = { channels: [], settings: DEFAULT_SETTINGS, excludedTv: [], place: '', note: '', version: 0, updatedAt: null }

export const rfKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'rf-plan'] as const }

type Row = { channels: RfChannel[]; settings: Partial<RfSettings>; excluded_tv: number[]; place: string; note: string; version: number; updated_at: string }

const num = (value: unknown) => (value === null || value === undefined ? null : Number(value))

/** HF plán akcie; null = zatiaľ neuložený. Bez migrácie 0201 chyba. */
export async function fetchRfPlan(companyId: string, eventId: string): Promise<RfPlan | null> {
  const { data, error } = await getSupabase().from('event_rf_plans').select('channels, settings, excluded_tv, place, note, version, updated_at').eq('company_id', companyId).eq('event_id', eventId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as Row
  return {
    channels: (row.channels ?? []).map((channel) => ({ ...channel, min_mhz: Number(channel.min_mhz), max_mhz: Number(channel.max_mhz), freq_mhz: num(channel.freq_mhz) })),
    settings: { ...DEFAULT_SETTINGS, ...row.settings },
    excludedTv: row.excluded_tv ?? [],
    place: row.place,
    note: row.note,
    version: row.version,
    updatedAt: row.updated_at,
  }
}

export function useRfPlan(companyId: string, eventId: string) {
  return useQuery({ queryKey: rfKeys.ofEvent(companyId, eventId), queryFn: () => fetchRfPlan(companyId, eventId), retry: false })
}

export async function saveRfPlan(eventId: string, expectedVersion: number, plan: Pick<RfPlan, 'channels' | 'settings' | 'excludedTv' | 'place' | 'note'>): Promise<number> {
  const { data, error } = await getSupabase().rpc('save_rf_plan', {
    _event_id: eventId,
    _expected_version: expectedVersion,
    _channels: plan.channels,
    _settings: plan.settings,
    _excluded_tv: plan.excludedTv,
    _place: plan.place,
    _note: plan.note,
  })
  if (error) throw error
  return data as number
}
