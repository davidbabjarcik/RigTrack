import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

// Turné: séria akcií s rovnakými podkladmi (input list, stage plán, synoptika, HF plán, harmonogram).

export type Tour = { id: string; name: string; note: string; createdAt: string }
export const tourKeys = { list: (companyId: string) => ['company', companyId, 'tours'] as const, events: (companyId: string) => ['company', companyId, 'tour-events'] as const }

export const SHOW_DOCS = ['iolist', 'stageplot', 'synoptic', 'rfplan', 'schedule'] as const
export type ShowDoc = (typeof SHOW_DOCS)[number]
export const SHOW_DOC_LABELS: Record<ShowDoc, string> = {
  iolist: 'Input / output list',
  stageplot: 'Stage plán',
  synoptic: 'Synoptika',
  rfplan: 'HF plán (bez frekvencií – miesto je iné)',
  schedule: 'Harmonogram (posunutý podľa dátumu)',
}

/** Turné firmy; bez migrácie 0203 null. */
export async function fetchTours(companyId: string): Promise<Tour[] | null> {
  const { data, error } = await getSupabase().from('tours').select('id, name, note, created_at').eq('company_id', companyId).order('created_at', { ascending: false })
  if (error) return null
  return (data as { id: string; name: string; note: string; created_at: string }[]).map((row) => ({ id: row.id, name: row.name, note: row.note, createdAt: row.created_at }))
}

export function useTours(companyId: string) {
  return useQuery({ queryKey: tourKeys.list(companyId), queryFn: () => fetchTours(companyId), retry: false })
}

/** Priradenie akcií k turné (event id → tour id). */
export async function fetchTourAssignments(companyId: string): Promise<Map<string, string>> {
  const { data, error } = await getSupabase().from('events').select('id, tour_id').eq('company_id', companyId).not('tour_id', 'is', null)
  if (error) return new Map()
  return new Map((data as { id: string; tour_id: string }[]).map((row) => [row.id, row.tour_id]))
}

export function useTourAssignments(companyId: string) {
  return useQuery({ queryKey: tourKeys.events(companyId), queryFn: () => fetchTourAssignments(companyId), retry: false })
}

export async function createTour(companyId: string, name: string, note: string): Promise<string> {
  const { data, error } = await getSupabase().from('tours').insert({ company_id: companyId, name: name.trim(), note: note.trim() }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function updateTour(id: string, name: string, note: string) {
  const { error } = await getSupabase().from('tours').update({ name: name.trim(), note: note.trim() }).eq('id', id)
  if (error) throw error
}

export async function deleteTour(id: string) {
  const { error } = await getSupabase().from('tours').delete().eq('id', id)
  if (error) throw error
}

export async function setEventTour(eventId: string, tourId: string | null) {
  const { error } = await getSupabase().from('events').update({ tour_id: tourId }).eq('id', eventId)
  if (error) throw error
}

/** Skopíruje podklady z jednej akcie do druhej (cieľové sa nahradia); vráti počet skopírovaných druhov. */
export async function copyShowDocs(fromEvent: string, toEvent: string, what: ShowDoc[]): Promise<number> {
  const { data, error } = await getSupabase().rpc('copy_show_docs', { _from_event: fromEvent, _to_event: toEvent, _what: what })
  if (error) throw error
  return data as number
}
