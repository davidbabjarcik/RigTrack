import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import { fromRow, type StageItem, type StagePlot } from './model'

export const stagePlotKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'stage-plot'] as const }

/** Stage plán akcie; null = zatiaľ neuložený, undefined chyba = bez migrácie 0199. */
export async function fetchStagePlot(companyId: string, eventId: string): Promise<StagePlot | null> {
  const { data, error } = await getSupabase().from('stage_plots').select('width_m, depth_m, items, note, version, updated_at').eq('company_id', companyId).eq('event_id', eventId).maybeSingle()
  if (error) throw error
  return data ? fromRow(data as Parameters<typeof fromRow>[0]) : null
}

export function useStagePlot(companyId: string, eventId: string) {
  return useQuery({ queryKey: stagePlotKeys.ofEvent(companyId, eventId), queryFn: () => fetchStagePlot(companyId, eventId), retry: false })
}

/** Uloží plán; ak ho medzitým uložil niekto iný, hodí chybu. Vráti novú verziu. */
export async function saveStagePlot(eventId: string, expectedVersion: number, plot: { widthM: number; depthM: number; items: StageItem[]; note: string }): Promise<number> {
  const { data, error } = await getSupabase().rpc('save_stage_plot', {
    _event_id: eventId,
    _expected_version: expectedVersion,
    _width: plot.widthM,
    _depth: plot.depthM,
    _items: plot.items.map((item) => ({ ...item, rot: Math.round(item.rot) })),
    _note: plot.note,
  })
  if (error) throw error
  return data as number
}
