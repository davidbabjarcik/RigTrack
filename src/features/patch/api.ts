import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { Connector, PatchFields, PatchLine, PatchSource, Stand } from './model'

export const patchKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'patch'] as const }

type Row = {
  id: string
  channel: number
  name: string
  stagebox: string
  stagebox_input: number | null
  source: PatchSource
  equipment_id: string | null
  capsule_id: string | null
  connector: Connector | ''
  stand: Stand | ''
  phantom: boolean
  note: string
}

const COLUMNS = 'id, channel, name, stagebox, stagebox_input, source, equipment_id, capsule_id, connector, stand, phantom, note'

const toLine = (row: Row): PatchLine => ({
  id: row.id,
  channel: row.channel,
  name: row.name,
  stagebox: row.stagebox,
  stageboxInput: row.stagebox_input,
  source: row.source,
  equipmentId: row.equipment_id,
  capsuleId: row.capsule_id,
  connector: row.connector,
  stand: row.stand,
  phantom: row.phantom,
  note: row.note,
})

const toRow = (fields: PatchFields) => ({
  channel: fields.channel,
  name: fields.name.trim(),
  stagebox: fields.stagebox.trim(),
  stagebox_input: fields.stageboxInput,
  source: fields.source,
  // Kábel (port) nemá techniku; kapsula len pri bezdrôtovom.
  equipment_id: fields.source === 'port' ? null : fields.equipmentId,
  capsule_id: fields.source === 'wireless' ? fields.capsuleId : null,
  connector: fields.source === 'port' ? fields.connector : '',
  stand: fields.stand,
  phantom: fields.phantom,
  note: fields.note.trim(),
})

export async function fetchPatch(companyId: string, eventId: string): Promise<PatchLine[]> {
  const { data, error } = await getSupabase().from('event_patch').select(COLUMNS).eq('company_id', companyId).eq('event_id', eventId).order('channel')
  if (error) throw error
  return (data as Row[]).map(toLine)
}

export function usePatch(companyId: string, eventId: string) {
  return useQuery({ queryKey: patchKeys.ofEvent(companyId, eventId), queryFn: () => fetchPatch(companyId, eventId), retry: false })
}

export async function savePatchLine(companyId: string, eventId: string, id: string | null, fields: PatchFields) {
  const table = getSupabase().from('event_patch')
  const { error } = id ? await table.update(toRow(fields)).eq('id', id) : await table.insert({ ...toRow(fields), company_id: companyId, event_id: eventId })
  if (error) throw error
}

export async function deletePatchLine(id: string) {
  const { error } = await getSupabase().from('event_patch').delete().eq('id', id)
  if (error) throw error
}

/** Skopíruje patch list z iného eventu (nahradí doterajší). */
export async function copyPatch(companyId: string, fromEventId: string, toEventId: string) {
  const lines = await fetchPatch(companyId, fromEventId)
  const db = getSupabase()
  const removed = await db.from('event_patch').delete().eq('event_id', toEventId)
  if (removed.error) throw removed.error
  if (lines.length === 0) return 0
  const { error } = await db.from('event_patch').insert(lines.map((line) => ({ ...toRow(line), company_id: companyId, event_id: toEventId })))
  if (error) throw error
  return lines.length
}
