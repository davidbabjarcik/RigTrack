import { getSupabase } from '@/lib/supabase/client'
import type { PalletMaterial, RackBay, RackType, Spot, SpotKind, Warehouse } from './model'
import { cleanTrussLayout, type TrussLayout } from './truss'

export const warehouseKeys = {
  plan: (companyId: string) => ['company', companyId, 'warehouse'] as const,
  bays: (companyId: string) => ['company', companyId, 'warehouse', 'case-bays'] as const,
}

type SpotRow = { id: string; name: string; kind: SpotKind; x: number; y: number; length: number; width: number; levels: number; level_height_cm?: number | null; note?: string; bays?: RackBay[] | null; material?: PalletMaterial | null }

/** Rozmery skladu (null, kým ich nikto nezadal) a všetky miesta na pláne. */
export async function fetchWarehouse(companyId: string): Promise<{ warehouse: Warehouse | null; spots: Spot[] }> {
  const db = getSupabase()
  const [warehouse, spots] = await Promise.all([
    db.from('warehouses').select('length_cm, width_cm, rack_types').eq('company_id', companyId).maybeSingle(),
    db.from('warehouse_spots').select('id, name, kind, x, y, length, width, levels, level_height_cm, note, bays, material').eq('company_id', companyId).order('created_at'),
  ])
  // Bez migrácie 0129 nie je materiál palety, bez 0124 polia regála, bez 0119 ani výška poschodia a poznámka.
  let rows: { data: unknown[] | null; error: { message: string } | null } = spots
  if (rows.error && /material/.test(rows.error.message)) rows = await db.from('warehouse_spots').select('id, name, kind, x, y, length, width, levels, level_height_cm, note, bays').eq('company_id', companyId).order('created_at')
  if (rows.error && /bays/.test(rows.error.message)) rows = await db.from('warehouse_spots').select('id, name, kind, x, y, length, width, levels, level_height_cm, note').eq('company_id', companyId).order('created_at')
  if (rows.error && /level_height_cm|note/.test(rows.error.message)) rows = await db.from('warehouse_spots').select('id, name, kind, x, y, length, width, levels').eq('company_id', companyId).order('created_at')
  // Bez migrácie 0126 nie sú typy regálov.
  let house: { data: unknown; error: { message: string } | null } = warehouse
  if (house.error && /rack_types/.test(house.error.message)) house = await db.from('warehouses').select('length_cm, width_cm').eq('company_id', companyId).maybeSingle()
  const error = house.error ?? rows.error
  if (error) throw error
  const size = house.data as { length_cm: number; width_cm: number; rack_types?: RackType[] } | null
  return {
    warehouse: size && { lengthCm: size.length_cm, widthCm: size.width_cm, rackTypes: Array.isArray(size.rack_types) ? size.rack_types : [] },
    spots: (rows.data as SpotRow[]).map(({ level_height_cm, note, bays, material, ...spot }) => ({
      ...spot,
      levelHeightCm: level_height_cm ?? null,
      note: note ?? '',
      bays: Array.isArray(bays) ? bays : [],
      material: material ?? null,
    })),
  }
}

/** Uloží rozmery skladu. Najprv úprava, až potom vloženie: upsert by menil stĺpec kľúča, na ktorý nie je UPDATE. */
export async function saveWarehouse(companyId: string, size: Warehouse) {
  const table = getSupabase().from('warehouses')
  const fields = { length_cm: size.lengthCm, width_cm: size.widthCm }
  const updated = await table.update(fields).eq('company_id', companyId).select('company_id')
  if (updated.error) throw updated.error
  if (updated.data.length > 0) return
  const { error } = await table.insert({ ...fields, company_id: companyId })
  if (error) throw error
}

export async function addSpot(companyId: string, spot: Omit<Spot, 'id'>) {
  const { material, ...rest } = spot
  const insert = (row: Record<string, unknown>) => getSupabase().from('warehouse_spots').insert({ ...row, company_id: companyId })
  let { error } = await insert(material ? { ...rest, material } : rest)
  // Bez migrácie 0129 sa materiál neuloží.
  if (error && /material/.test(error.message)) ({ error } = await insert(rest))
  if (error) throw error
}

export async function updateSpot(companyId: string, id: string, fields: Partial<Omit<Spot, 'id'>>) {
  const { levelHeightCm, ...rest } = fields
  const row = { ...rest, ...(levelHeightCm !== undefined ? { level_height_cm: levelHeightCm } : {}) }
  const { data, error } = await getSupabase().from('warehouse_spots').update(row).eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function deleteSpot(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('warehouse_spots').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

/** Uloží case na miesto (poschodie, pole, paletu), alebo ho z plánu vyberie (`spotId = null`). */
export async function placeCase(companyId: string, caseId: string, spotId: string | null, level: number | null, bay: number | null = null, pallet: number | null = null) {
  const write = (row: Record<string, unknown>) => getSupabase().from('cases').update(row).eq('company_id', companyId).eq('id', caseId).select('id')
  const row = { spot_id: spotId, spot_level: spotId ? level : null }
  let { data, error } = await write({ ...row, spot_bay: spotId ? bay : null, spot_pallet: spotId ? pallet : null })
  // Bez migrácie 0128 sa paleta neuloží, bez 0124 ani pole.
  if (error && /spot_pallet/.test(error.message)) ({ data, error } = await write({ ...row, spot_bay: spotId ? bay : null }))
  if (error && /spot_bay/.test(error.message)) ({ data, error } = await write(row))
  if (error) throw error
  if (!data || data.length === 0) throw new Error('Not updated')
}

/** Ručne zvolená paleta case (null = automaticky). */
export async function setCasePallet(companyId: string, caseId: string, pallet: number | null) {
  const { data, error } = await getSupabase().from('cases').update({ spot_pallet: pallet }).eq('company_id', companyId).eq('id', caseId).select('id')
  if (error) throw /spot_pallet/.test(error.message) ? new Error('Palety ešte databáza nepozná – spustite migráciu 0128 (supabase/update-all.sql).') : error
  if (!data || data.length === 0) throw new Error('Not updated')
}

/** Rozmery case priamo zo skladu: dĺžka = spredu, šírka = dozadu, hĺbka = na výšku (cm). */
export async function setCaseSize(companyId: string, caseId: string, size: { lengthCm: number | null; widthCm: number | null; depthCm: number | null }) {
  const { data, error } = await getSupabase()
    .from('cases')
    .update({ length_cm: size.lengthCm, width_cm: size.widthCm, depth_cm: size.depthCm })
    .eq('company_id', companyId)
    .eq('id', caseId)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('Not updated')
}

/** Pole a paleta, kde case leží (case id → pole, paleta); bez migrácií 0124 / 0128 prázdne. */
export async function fetchCaseBays(companyId: string): Promise<Map<string, { bay: number | null; pallet: number | null }>> {
  const select = (columns: string) => getSupabase().from('cases').select(columns).eq('company_id', companyId).not('spot_id', 'is', null)
  let { data, error } = await select('id, spot_bay, spot_pallet')
  if (error) ({ data, error } = await select('id, spot_bay'))
  if (error || !data) return new Map()
  return new Map((data as unknown as { id: string; spot_bay: number | null; spot_pallet?: number | null }[]).map((row) => [row.id, { bay: row.spot_bay, pallet: row.spot_pallet ?? null }]))
}

/** Uloží typy regálov firmy (sklad už musí mať rozmery). */
export async function saveRackTypes(companyId: string, types: RackType[]) {
  const { data, error } = await getSupabase().from('warehouses').update({ rack_types: types }).eq('company_id', companyId).select('company_id')
  if (error) throw error
  if (data.length === 0) throw new Error('Najprv zadajte rozmery skladu.')
}

export const trussKeys = { layout: (companyId: string) => ['company', companyId, 'warehouse', 'truss'] as const }

/** Hliník v sklade (mriežka a stohy); bez migrácie 0130 alebo bez skladu prázdne. */
export async function fetchTrussLayout(companyId: string): Promise<{ layout: TrussLayout; ready: boolean }> {
  const { data, error } = await getSupabase().from('warehouses').select('truss_layout').eq('company_id', companyId).maybeSingle()
  if (error) return { layout: cleanTrussLayout(null), ready: false }
  return { layout: cleanTrussLayout((data as { truss_layout?: unknown } | null)?.truss_layout), ready: Boolean(data) }
}

export async function saveTrussLayout(companyId: string, layout: TrussLayout) {
  const { data, error } = await getSupabase().from('warehouses').update({ truss_layout: layout }).eq('company_id', companyId).select('company_id')
  if (error) throw /truss_layout/.test(error.message) ? new Error('Hliník ešte databáza nepozná – spustite migráciu 0130 (supabase/update-all.sql).') : error
  if (data.length === 0) throw new Error('Najprv zadajte rozmery skladu, alebo nemáte oprávnenie spravovať sklad.')
}
