import { getSupabase } from '@/lib/supabase/client'
import { isMissingTable } from '@/lib/supabase/errors'
import type { StoredLink } from './links'
import type { RackDesign, RackFields, RackSlot } from './model'

export const rackKeys = {
  list: (companyId: string) => ['company', companyId, 'racks'] as const,
  slots: (companyId: string, rackId: string) => ['company', companyId, 'racks', rackId, 'slots'] as const,
}

const COLUMNS = 'id, name, rack_type, units, depth_mm, rails, max_load_kg, own_weight_kg, note, case_id, event_id, is_template, version, updated_at'

type Row = {
  id: string
  name: string
  rack_type: RackDesign['rackType']
  units: number
  depth_mm: number | null
  rails: RackDesign['rails']
  max_load_kg: number | null
  own_weight_kg: number | null
  note: string
  case_id: string | null
  event_id: string | null
  is_template: boolean
  version: number
  updated_at: string
  links?: StoredLink[] | null
}

const toRack = (row: Row): RackDesign => ({
  id: row.id,
  name: row.name,
  rackType: row.rack_type,
  units: row.units,
  depthMm: row.depth_mm,
  rails: row.rails,
  maxLoadKg: row.max_load_kg === null ? null : Number(row.max_load_kg),
  ownWeightKg: row.own_weight_kg === null ? null : Number(row.own_weight_kg),
  note: row.note,
  caseId: row.case_id,
  eventId: row.event_id,
  isTemplate: row.is_template,
  version: row.version,
  updatedAt: row.updated_at,
  links: Array.isArray(row.links) ? row.links : [],
})

const toRow = (fields: RackFields) => ({
  name: fields.name.trim(),
  rack_type: fields.rackType,
  units: fields.units,
  depth_mm: fields.depthMm,
  rails: fields.rails,
  max_load_kg: fields.maxLoadKg,
  own_weight_kg: fields.ownWeightKg,
  note: fields.note.trim(),
  case_id: fields.caseId,
  event_id: fields.eventId,
  is_template: fields.isTemplate,
})

/** Racky firmy; bez migrácie 0195 null (modul ešte nie je pripravený). */
export async function fetchRacks(companyId: string): Promise<RackDesign[] | null> {
  const load = (columns: string) => getSupabase().from('rack_designs').select(columns).eq('company_id', companyId).order('name')
  let { data, error } = await load(`${COLUMNS}, links`)
  if (isMissingTable(error, 'rack_designs')) return null
  // Bez migrácie 0208 (prepojenia) stĺpec links chýba – racky sa načítajú bez neho.
  if (error) ({ data, error } = await load(COLUMNS))
  if (error) throw error
  return (data as unknown as Row[]).map(toRack)
}

export async function createRack(companyId: string, fields: RackFields): Promise<string> {
  const { data, error } = await getSupabase().from('rack_designs').insert({ company_id: companyId, ...toRow(fields) }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function updateRack(companyId: string, id: string, fields: RackFields) {
  const { data, error } = await getSupabase().from('rack_designs').update(toRow(fields)).eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function deleteRack(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('rack_designs').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

type SlotRow = {
  id: string
  side: RackSlot['side']
  bottom_u: number
  height_u: number
  width: RackSlot['width']
  col: number
  equipment_id: string | null
  unit: number | null
  catalog_id: string | null
  accessory: RackSlot['accessory']
  label: string
  depth_mm: number | null
  weight_kg: number | null
  power_w: number | null
  rear_support: boolean | null
}

export async function fetchSlots(companyId: string, rackId: string): Promise<RackSlot[]> {
  const { data, error } = await getSupabase()
    .from('rack_slots')
    .select('id, side, bottom_u, height_u, width, col, equipment_id, unit, catalog_id, accessory, label, depth_mm, weight_kg, power_w, rear_support')
    .eq('company_id', companyId)
    .eq('rack_id', rackId)
    .order('sort')
  if (error) throw error
  return (data as SlotRow[]).map((row) => ({
    id: row.id,
    side: row.side,
    bottomU: row.bottom_u,
    heightU: row.height_u,
    width: row.width,
    col: row.col,
    equipmentId: row.equipment_id,
    unit: row.unit,
    catalogId: row.catalog_id,
    accessory: row.accessory,
    label: row.label,
    depthMm: row.depth_mm,
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    powerW: row.power_w,
    rearSupport: row.rear_support,
  }))
}

/** Uloží celé osadenie naraz; vráti novú verziu. Ak medzitým uložil niekto iný, hodí chybu. */
export async function saveSlots(rackId: string, expectedVersion: number, slots: Omit<RackSlot, 'id'>[], links: StoredLink[] = []): Promise<number> {
  let { data, error } = await getSupabase().rpc('save_rack', { _rack_id: rackId, _expected_version: expectedVersion, _slots: slots, _links: links })
  // Databáza bez migrácie 0208: bez prepojení sa uloží osadenie; s prepojeniami radšej chyba než ich strata.
  if (error?.code === 'PGRST202') {
    if (links.length > 0) throw new Error('Prepojenia ešte nie sú v databáze pripravené (migrácia 0208).')
    ;({ data, error } = await getSupabase().rpc('save_rack', { _rack_id: rackId, _expected_version: expectedVersion, _slots: slots }))
  }
  if (error) throw error
  return data as number
}

/** Kópia racku s osadením – ako šablóna alebo do akcie (vtedy sa kusy pridajú do techniky akcie). Vráti id. */
export async function copyRack(rackId: string, name: string, asTemplate: boolean, eventId: string | null): Promise<string> {
  const { data, error } = await getSupabase().rpc('copy_rack', { _rack_id: rackId, _name: name, _as_template: asTemplate, _event_id: eventId })
  if (error) throw error
  return data as string
}

/** Kusy z racku do techniky jeho akcie (pack list, rezervácia). Vráti počet položiek. */
export async function rackToEvent(rackId: string): Promise<number> {
  const { data, error } = await getSupabase().rpc('rack_to_event', { _rack_id: rackId })
  if (error) throw error
  return data as number
}
