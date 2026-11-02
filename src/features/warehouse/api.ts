import { getSupabase } from '@/lib/supabase/client'
import type { RackBay, Spot, SpotKind, Warehouse } from './model'

export const warehouseKeys = {
  plan: (companyId: string) => ['company', companyId, 'warehouse'] as const,
  bays: (companyId: string) => ['company', companyId, 'warehouse', 'case-bays'] as const,
}

type SpotRow = { id: string; name: string; kind: SpotKind; x: number; y: number; length: number; width: number; levels: number; level_height_cm?: number | null; note?: string; bays?: RackBay[] | null }

/** Rozmery skladu (null, kým ich nikto nezadal) a všetky miesta na pláne. */
export async function fetchWarehouse(companyId: string): Promise<{ warehouse: Warehouse | null; spots: Spot[] }> {
  const db = getSupabase()
  const [warehouse, spots] = await Promise.all([
    db.from('warehouses').select('length_cm, width_cm').eq('company_id', companyId).maybeSingle(),
    db.from('warehouse_spots').select('id, name, kind, x, y, length, width, levels, level_height_cm, note, bays').eq('company_id', companyId).order('created_at'),
  ])
  // Bez migrácie 0124 nie sú polia regála, bez 0119 ani výška poschodia a poznámka.
  let rows: { data: unknown[] | null; error: { message: string } | null } = spots
  if (rows.error && /bays/.test(rows.error.message)) rows = await db.from('warehouse_spots').select('id, name, kind, x, y, length, width, levels, level_height_cm, note').eq('company_id', companyId).order('created_at')
  if (rows.error && /level_height_cm|note/.test(rows.error.message)) rows = await db.from('warehouse_spots').select('id, name, kind, x, y, length, width, levels').eq('company_id', companyId).order('created_at')
  const error = warehouse.error ?? rows.error
  if (error) throw error
  const size = warehouse.data as { length_cm: number; width_cm: number } | null
  return {
    warehouse: size && { lengthCm: size.length_cm, widthCm: size.width_cm },
    spots: (rows.data as SpotRow[]).map(({ level_height_cm, note, bays, ...spot }) => ({ ...spot, levelHeightCm: level_height_cm ?? null, note: note ?? '', bays: Array.isArray(bays) ? bays : [] })),
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
  const { error } = await getSupabase().from('warehouse_spots').insert({ ...spot, company_id: companyId })
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

/** Uloží case na miesto (a poschodie), alebo ho z plánu vyberie (`spotId = null`). */
export async function placeCase(companyId: string, caseId: string, spotId: string | null, level: number | null, bay: number | null = null) {
  const write = (row: Record<string, unknown>) => getSupabase().from('cases').update(row).eq('company_id', companyId).eq('id', caseId).select('id')
  const row = { spot_id: spotId, spot_level: spotId ? level : null }
  let { data, error } = await write({ ...row, spot_bay: spotId ? bay : null })
  // Bez migrácie 0124 sa pole neuloží.
  if (error && /spot_bay/.test(error.message)) ({ data, error } = await write(row))
  if (error) throw error
  if (!data || data.length === 0) throw new Error('Not updated')
}

/** Pole regála, v ktorom case leží (case id → číslo poľa); bez migrácie 0124 prázdne. */
export async function fetchCaseBays(companyId: string): Promise<Map<string, number>> {
  const { data, error } = await getSupabase().from('cases').select('id, spot_bay').eq('company_id', companyId).not('spot_bay', 'is', null)
  if (error) return new Map()
  return new Map((data as { id: string; spot_bay: number }[]).map((row) => [row.id, row.spot_bay]))
}
