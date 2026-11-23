import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

/** Výstupy akcie: monitory (wedge / IEM), PA, sub, delay, nahrávanie, efekty… s mixom a cieľom. */
export const OUTPUT_KINDS = ['wedge', 'iem', 'sidefill', 'pa', 'sub', 'delay', 'fill', 'rec', 'fx', 'other'] as const
export type OutputKind = (typeof OUTPUT_KINDS)[number]
export const OUTPUT_KIND_LABELS: Record<OutputKind, string> = {
  wedge: 'Wedge (monitor)',
  iem: 'IEM (do uší)',
  sidefill: 'Sidefill',
  pa: 'PA',
  sub: 'Sub',
  delay: 'Delay',
  fill: 'Front / out fill',
  rec: 'Nahrávanie',
  fx: 'Efekt',
  other: 'Iné',
}

export type OutputLine = {
  id: string
  number: number
  name: string
  kind: OutputKind
  mix: string
  destination: string
  equipmentId: string | null
  stereo: boolean
  note: string
}
export type OutputFields = Omit<OutputLine, 'id'>

export const outputKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'outputs'] as const }

type Row = { id: string; number: number; name: string; kind: OutputKind; mix: string; destination: string; equipment_id: string | null; stereo: boolean; note: string }

export async function fetchOutputs(companyId: string, eventId: string): Promise<OutputLine[] | null> {
  const { data, error } = await getSupabase()
    .from('event_outputs')
    .select('id, number, name, kind, mix, destination, equipment_id, stereo, note')
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .order('number')
  // Bez migrácie 0197 výstupy nie sú.
  if (error) return null
  return (data as Row[]).map((row) => ({ id: row.id, number: row.number, name: row.name, kind: row.kind, mix: row.mix, destination: row.destination, equipmentId: row.equipment_id, stereo: row.stereo, note: row.note }))
}

export function useOutputs(companyId: string, eventId: string) {
  return useQuery({ queryKey: outputKeys.ofEvent(companyId, eventId), queryFn: () => fetchOutputs(companyId, eventId), retry: false })
}

const toRow = (fields: OutputFields) => ({
  number: fields.number,
  name: fields.name.trim(),
  kind: fields.kind,
  mix: fields.mix.trim(),
  destination: fields.destination.trim(),
  equipment_id: fields.equipmentId,
  stereo: fields.stereo,
  note: fields.note.trim(),
})

export async function saveOutput(companyId: string, eventId: string, id: string | null, fields: OutputFields) {
  const table = getSupabase().from('event_outputs')
  const { error } = id ? await table.update(toRow(fields)).eq('id', id) : await table.insert({ ...toRow(fields), company_id: companyId, event_id: eventId })
  if (error) throw error
}

export async function deleteOutput(id: string) {
  const { error } = await getSupabase().from('event_outputs').delete().eq('id', id)
  if (error) throw error
}

/** Uloží verziu input / output listu (snímka); vráti číslo verzie. */
export async function saveIoVersion(eventId: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('save_iolist_version', { _event_id: eventId })
  if (error) throw error
  return data as number
}

export async function fetchIoVersionCount(companyId: string, eventId: string): Promise<number> {
  const { count, error } = await getSupabase().from('doc_versions').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('doc_type', 'iolist').eq('doc_id', eventId)
  if (error) return 0
  return count ?? 0
}
