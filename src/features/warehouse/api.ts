import { getSupabase } from '@/lib/supabase/client'
import type { Spot, SpotKind, Warehouse } from './model'

export const warehouseKeys = {
  plan: (companyId: string) => ['company', companyId, 'warehouse'] as const,
}

type SpotRow = { id: string; name: string; kind: SpotKind; x: number; y: number; length: number; width: number; levels: number }

/** Rozmery skladu (null, kým ich nikto nezadal) a všetky miesta na pláne. */
export async function fetchWarehouse(companyId: string): Promise<{ warehouse: Warehouse | null; spots: Spot[] }> {
  const db = getSupabase()
  const [warehouse, spots] = await Promise.all([
    db.from('warehouses').select('length_cm, width_cm').eq('company_id', companyId).maybeSingle(),
    db.from('warehouse_spots').select('id, name, kind, x, y, length, width, levels').eq('company_id', companyId).order('created_at'),
  ])
  const error = warehouse.error ?? spots.error
  if (error) throw error
  const size = warehouse.data as { length_cm: number; width_cm: number } | null
  return { warehouse: size && { lengthCm: size.length_cm, widthCm: size.width_cm }, spots: spots.data as SpotRow[] }
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
  const { data, error } = await getSupabase().from('warehouse_spots').update(fields).eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}

export async function deleteSpot(companyId: string, id: string) {
  const { data, error } = await getSupabase().from('warehouse_spots').delete().eq('company_id', companyId).eq('id', id).select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not deleted')
}

/** Uloží case na miesto (a poschodie), alebo ho z plánu vyberie (`spotId = null`). */
export async function placeCase(companyId: string, caseId: string, spotId: string | null, level: number | null) {
  const { data, error } = await getSupabase()
    .from('cases')
    .update({ spot_id: spotId, spot_level: spotId ? level : null })
    .eq('company_id', companyId)
    .eq('id', caseId)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Not updated')
}
