import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { DmxFields, DmxLine } from './dmx'
import { sortDmx } from './dmx'
import { fetchPatch, patchKeys } from './api'
import type { PatchFields } from './model'

// DMX patch list eventu a šablóny patch listov (0104).

export const dmxKeys = {
  ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'dmx'] as const,
  templates: (companyId: string) => ['company', companyId, 'patch-templates'] as const,
}

type DmxRow = { id: string; universe: string; address: number | null; channels: number; name: string; equipment_id: string | null; unit: number | null; mode: string; note: string }
const DMX_COLUMNS = 'id, universe, address, channels, name, equipment_id, unit, mode, note'

const toDmx = (row: DmxRow): DmxLine => ({ id: row.id, universe: row.universe, address: row.address, channels: row.channels, name: row.name, equipmentId: row.equipment_id, unit: row.unit, mode: row.mode, note: row.note })
const dmxRow = (fields: DmxFields) => ({
  universe: fields.universe.trim(),
  address: fields.address,
  channels: Math.max(1, Math.min(512, fields.channels || 1)),
  name: fields.name.trim().slice(0, 80),
  equipment_id: fields.equipmentId,
  unit: fields.unit,
  mode: fields.mode.trim().slice(0, 40),
  note: fields.note.trim().slice(0, 200),
})

export async function fetchDmxPatch(companyId: string, eventId: string): Promise<DmxLine[]> {
  const { data, error } = await getSupabase().from('event_dmx_patch').select(DMX_COLUMNS).eq('company_id', companyId).eq('event_id', eventId)
  if (error) throw error
  return sortDmx((data as DmxRow[]).map(toDmx))
}

/** Bez migrácie 0104 chyba – sekcia sa neukáže. */
export function useDmxPatch(companyId: string, eventId: string) {
  return useQuery({ queryKey: dmxKeys.ofEvent(companyId, eventId), queryFn: () => fetchDmxPatch(companyId, eventId), retry: false })
}

export async function saveDmxLine(companyId: string, eventId: string, id: string | null, fields: DmxFields) {
  const table = getSupabase().from('event_dmx_patch')
  const { error } = id ? await table.update(dmxRow(fields)).eq('id', id) : await table.insert({ ...dmxRow(fields), company_id: companyId, event_id: eventId })
  if (error) throw error
}

export async function deleteDmxLine(id: string) {
  const { error } = await getSupabase().from('event_dmx_patch').delete().eq('id', id)
  if (error) throw error
}

/** Nahradí (alebo doplní) DMX patch list eventu danými riadkami. */
export async function writeDmxPatch(companyId: string, eventId: string, lines: DmxFields[], replace: boolean) {
  const db = getSupabase()
  if (replace) {
    const removed = await db.from('event_dmx_patch').delete().eq('event_id', eventId)
    if (removed.error) throw removed.error
  }
  if (lines.length === 0) return
  const { error } = await db.from('event_dmx_patch').insert(lines.map((line) => ({ ...dmxRow(line), company_id: companyId, event_id: eventId })))
  if (error) throw error
}

// --- Šablóny ---------------------------------------------------------------

export type PatchTemplate =
  | { id: string; kind: 'sound'; name: string; note: string; lines: PatchFields[]; updatedAt: string }
  | { id: string; kind: 'dmx'; name: string; note: string; lines: DmxFields[]; updatedAt: string }

export async function fetchPatchTemplates(companyId: string): Promise<PatchTemplate[]> {
  const { data, error } = await getSupabase().from('patch_templates').select('id, kind, name, note, lines, updated_at').eq('company_id', companyId).order('name')
  if (error) throw error
  return (data as { id: string; kind: 'sound' | 'dmx'; name: string; note: string; lines: unknown[]; updated_at: string }[]).map(
    (row) => ({ id: row.id, kind: row.kind, name: row.name, note: row.note, lines: row.lines, updatedAt: row.updated_at }) as PatchTemplate,
  )
}

export function usePatchTemplates(companyId: string) {
  return useQuery({ queryKey: dmxKeys.templates(companyId), queryFn: () => fetchPatchTemplates(companyId), retry: false })
}

export async function savePatchTemplate(companyId: string, id: string | null, template: { kind: 'sound' | 'dmx'; name: string; note?: string; lines: (PatchFields | DmxFields)[] }) {
  const table = getSupabase().from('patch_templates')
  const row = { name: template.name.trim().slice(0, 80), note: (template.note ?? '').trim().slice(0, 300), lines: template.lines, updated_at: new Date().toISOString() }
  const { error } = id ? await table.update(row).eq('company_id', companyId).eq('id', id) : await table.insert({ ...row, kind: template.kind, company_id: companyId })
  if (error) throw error
}

export async function deletePatchTemplate(companyId: string, id: string) {
  const { error } = await getSupabase().from('patch_templates').delete().eq('company_id', companyId).eq('id', id)
  if (error) throw error
}

/** Zvukový patch list eventu zo šablóny (nahradí doterajší). */
export async function applySoundTemplate(companyId: string, eventId: string, lines: PatchFields[]) {
  const db = getSupabase()
  const removed = await db.from('event_patch').delete().eq('event_id', eventId)
  if (removed.error) throw removed.error
  if (lines.length === 0) return
  const { error } = await db.from('event_patch').insert(
    lines.map((line) => ({
      channel: line.channel,
      name: line.name,
      stagebox: line.stagebox,
      stagebox_input: line.stageboxInput,
      source: line.source,
      equipment_id: line.equipmentId,
      capsule_id: line.capsuleId,
      connector: line.connector,
      stand: line.stand,
      phantom: line.phantom,
      note: line.note,
      company_id: companyId,
      event_id: eventId,
    })),
  )
  if (error) throw error
}

/** Riadky zvukového patch listu eventu bez id – na uloženie ako šablóna. */
export async function soundLinesOf(companyId: string, eventId: string): Promise<PatchFields[]> {
  return (await fetchPatch(companyId, eventId)).map((line) => {
    const fields: Partial<typeof line> = { ...line }
    delete fields.id
    return fields as PatchFields
  })
}

export { patchKeys }
