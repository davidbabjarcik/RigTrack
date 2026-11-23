import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { SynLink, SynNode, Synoptic } from './model'

export const synopticKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'synoptic'] as const }

type Row = { nodes: SynNode[]; links: SynLink[]; note: string; version: number; updated_at: string }

/** Synoptika akcie; null = zatiaľ neuložená. Bez migrácie 0200 chyba. */
export async function fetchSynoptic(companyId: string, eventId: string): Promise<Synoptic | null> {
  const { data, error } = await getSupabase().from('event_synoptics').select('nodes, links, note, version, updated_at').eq('company_id', companyId).eq('event_id', eventId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as Row
  return { nodes: row.nodes ?? [], links: (row.links ?? []).map((link) => ({ ...link, length_m: link.length_m === null ? null : Number(link.length_m) })), note: row.note, version: row.version, updatedAt: row.updated_at }
}

export function useSynoptic(companyId: string, eventId: string) {
  return useQuery({ queryKey: synopticKeys.ofEvent(companyId, eventId), queryFn: () => fetchSynoptic(companyId, eventId), retry: false })
}

export async function saveSynoptic(eventId: string, expectedVersion: number, value: Pick<Synoptic, 'nodes' | 'links' | 'note'>): Promise<number> {
  const { data, error } = await getSupabase().rpc('save_synoptic', {
    _event_id: eventId,
    _expected_version: expectedVersion,
    _nodes: value.nodes.map((node) => ({ ...node, x: Math.round(node.x), y: Math.round(node.y) })),
    _links: value.links,
    _note: value.note,
  })
  if (error) throw error
  return data as number
}
