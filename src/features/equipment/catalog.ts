import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'
import type { EquipmentAttributes, EquipmentKind } from './model'

// Spoločný katalóg techniky (0146): oficiálne značky a modely s technickými údajmi. Firma, ktorá zadá model mimo
// katalógu, pošle návrh; vývojár ho overí. Do katalógu idú len údaje modelu, nikdy kusa ani firmy.

export type CatalogEntry = { id: string; kind: EquipmentKind; manufacturer: string; model: string; attributes: EquipmentAttributes }
export type CatalogReviewItem = CatalogEntry & { name: string; companies: number; submittedAt: string }

/** Druhy techniky, pri ktorých sa ponúka výber značky a modelu z katalógu. */
export const CATALOG_KINDS: EquipmentKind[] = ['audio', 'light', 'video', 'dj', 'truss', 'it', 'appliance']

/**
 * Technické údaje modelu, ktoré sa smú dostať do katalógu (a z neho späť do formulára). Bez ceny, sériových čísel,
 * IP adries, poznámok, servisu, farby, stavu a ďalších údajov konkrétneho kusa alebo firmy.
 */
export const CATALOG_KEYS = [
  'connector', 'powerW', 'lightSource', 'lightType', 'cableVariant', 'dipSwitches', 'nodeProtocols', 'nodePorts',
  'trussType', 'trussShape', 'stageType', 'stageSize', 'audioType', 'djType', 'videoType', 'cameraSensor', 'hdmiOut',
  'itType', 'applianceType', 'ampKind', 'ampPresetSlots', 'mixerKind', 'mixerChannels', 'micKind', 'cableType',
  'rfRange', 'micType', 'wirelessRx', 'wirelessTxs', 'powered', 'rmsW', 'peakW', 'woofer', 'maxSplDb', 'connectors',
  'poleMount', 'subDesign', 'programW', 'maxSplPeakDb', 'sensitivityDb', 'impedanceOhm', 'freqRange', 'freqResponse',
  'coverage', 'crossover', 'biamp', 'hfDriver', 'weightKg', 'boxWidthCm', 'boxDepthCm', 'boxHeightCm', 'dmxModes',
  'ledPanel', 'ledProcessor', 'display',
] as const

/** Polia formulára, ktoré katalóg vyplní (rovnaké názvy ako vo formulári techniky). */
export const CATALOG_FORM_KEYS = [
  ...CATALOG_KEYS.filter((key) => key !== 'ledPanel' && key !== 'ledProcessor' && key !== 'display'),
  'isLedPanel', 'ledPitchMm', 'ledWidthMm', 'ledHeightMm', 'ledPxW', 'ledPxH', 'ledWeightKg', 'ledMaxW', 'ledAvgW',
  'isLedProcessor', 'isDisplay', 'displayType', 'displayResW', 'displayResH', 'displayDiagonalIn', 'displayLumens',
  'procOutputs', 'procPixels', 'procInputs', 'procChip', 'procControl', 'procHdmi', 'procDvi', 'procSdi', 'procDp',
  'procVga', 'procInputW', 'procInputH',
] as const

/** Len technické údaje modelu (podľa CATALOG_KEYS), prázdne vynechané. */
export function catalogAttributes(attributes: EquipmentAttributes): EquipmentAttributes {
  const source = attributes as Record<string, unknown>
  const picked: Record<string, unknown> = {}
  for (const key of CATALOG_KEYS) {
    const value = source[key]
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) continue
    picked[key] = value
  }
  return picked as EquipmentAttributes
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Značky katalógu pre druh techniky (abecedne). */
export function catalogBrands(catalog: CatalogEntry[], kind: EquipmentKind) {
  const brands = new Map<string, string>()
  for (const entry of catalog) if (entry.kind === kind && !brands.has(entry.manufacturer.toLowerCase())) brands.set(entry.manufacturer.toLowerCase(), entry.manufacturer)
  return [...brands.values()].sort((a, b) => a.localeCompare(b, 'sk', { numeric: true }))
}

/** Modely značky v katalógu (abecedne). */
export function catalogModels(catalog: CatalogEntry[], kind: EquipmentKind, brand: string) {
  return catalog.filter((entry) => entry.kind === kind && same(entry.manufacturer, brand) && entry.model).sort((a, b) => a.model.localeCompare(b.model, 'sk', { numeric: true }))
}

export function findCatalogEntry(catalog: CatalogEntry[], kind: EquipmentKind, brand: string, model: string) {
  return catalog.find((entry) => entry.kind === kind && same(entry.manufacturer, brand) && same(entry.model, model))
}

export const catalogKeys = {
  all: ['equipment-catalog'] as const,
  review: ['equipment-catalog', 'review'] as const,
}

type Row = { id: string; kind: EquipmentKind; manufacturer: string; model: string; attributes: EquipmentAttributes | null }

/** Celý katalóg; bez migrácie 0146 prázdny. */
export async function fetchCatalog(): Promise<CatalogEntry[]> {
  const { data, error } = await getSupabase().from('equipment_catalog').select('id, kind, manufacturer, model, attributes').order('manufacturer').limit(10000)
  if (error) return []
  return (data as Row[]).map((row) => ({ ...row, attributes: row.attributes ?? {} }))
}

export function useCatalog(enabled = true) {
  return useQuery({ queryKey: catalogKeys.all, queryFn: fetchCatalog, enabled, staleTime: 10 * 60_000, retry: false })
}

/** Návrh do katalógu (model, ktorý tam nie je). Chyba sa ignoruje – technika firmy je uložená tak či tak. */
export async function submitCatalogEntry(companyId: string, entry: { kind: EquipmentKind; manufacturer: string; model: string; name: string; attributes: EquipmentAttributes }) {
  await getSupabase().rpc('submit_catalog_entry', {
    _company_id: companyId,
    _kind: entry.kind,
    _manufacturer: entry.manufacturer.trim(),
    _model: entry.model.trim(),
    _name: entry.name.trim(),
    _attributes: catalogAttributes(entry.attributes),
  })
}

// Vývojár: overovanie návrhov a správa katalógu.

export async function fetchReviewQueue(): Promise<CatalogReviewItem[]> {
  const { data, error } = await getSupabase().rpc('catalog_review_queue')
  if (error) throw error
  type ReviewRow = Row & { name: string; companies: number; submitted_at: string }
  return (data as ReviewRow[]).map((row) => ({ id: row.id, kind: row.kind, manufacturer: row.manufacturer, model: row.model, attributes: row.attributes ?? {}, name: row.name, companies: Number(row.companies), submittedAt: row.submitted_at }))
}

export async function approveCatalogEntry(submissionId: string, entry: Pick<CatalogEntry, 'kind' | 'manufacturer' | 'model' | 'attributes'>) {
  const { error } = await getSupabase().rpc('approve_catalog_entry', {
    _submission_id: submissionId,
    _kind: entry.kind,
    _manufacturer: entry.manufacturer.trim(),
    _model: entry.model.trim(),
    _attributes: catalogAttributes(entry.attributes),
  })
  if (error) throw error
}

export async function rejectCatalogEntry(submissionId: string, note: string) {
  const { error } = await getSupabase().rpc('reject_catalog_entry', { _submission_id: submissionId, _note: note })
  if (error) throw error
}

export async function deleteCatalogEntry(id: string) {
  const { error } = await getSupabase().rpc('delete_catalog_entry', { _id: id })
  if (error) throw error
}
