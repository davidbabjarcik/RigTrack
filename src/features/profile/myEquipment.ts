// Moja (vlastná) technika vo všetkých mojich firmách: pôvodné položky a ich kópie v ďalších firmách (0085).
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type MyItem = { id: string; companyId: string; name: string; quantity: number; sharedFrom: string | null }
export type MyGear = { original: MyItem; copies: MyItem[] }

export type MyCase = { id: string; companyId: string; name: string; items: number }

export const myEquipmentKeys = { all: (userId: string) => ['my-equipment', userId] as const, cases: (userId: string) => ['my-cases', userId] as const }

/** Pôvodná položka a jej kópie spolu; kópia, ktorej originál nevidím, sa ukáže ako samostatná položka. */
export function groupGear(items: MyItem[]): MyGear[] {
  const ids = new Set(items.map((item) => item.id))
  const originals = items.filter((item) => !item.sharedFrom || !ids.has(item.sharedFrom))
  return originals
    .map((original) => ({ original, copies: items.filter((item) => item.sharedFrom === original.id) }))
    .sort((a, b) => a.original.name.localeCompare(b.original.name, 'sk'))
}

export async function fetchMyEquipment(userId: string): Promise<MyGear[]> {
  const db = getSupabase()
  const cards = await db.from('staff').select('id').eq('member_id', userId)
  if (cards.error) throw cards.error
  const ids = (cards.data as { id: string }[]).map((row) => row.id)
  if (ids.length === 0) return []
  const { data, error } = await db.from('equipment').select('id, company_id, name, quantity, shared_from').in('owner_staff_id', ids).order('name')
  if (error) throw error
  return groupGear(
    (data as { id: string; company_id: string; name: string; quantity: number; shared_from: string | null }[]).map((row) => ({
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      quantity: row.quantity,
      sharedFrom: row.shared_from,
    })),
  )
}

export function useMyEquipment(userId: string) {
  return useQuery({ queryKey: myEquipmentKeys.all(userId), queryFn: () => fetchMyEquipment(userId), retry: false })
}

export async function shareEquipment(equipmentId: string, companyId: string) {
  const { error } = await getSupabase().rpc('share_own_equipment', { _equipment_id: equipmentId, _company_id: companyId })
  if (error) throw error
}

export async function syncEquipment(equipmentId: string) {
  const { error } = await getSupabase().rpc('sync_own_equipment', { _equipment_id: equipmentId })
  if (error) throw error
}

export async function unshareEquipment(copyId: string) {
  const { error } = await getSupabase().rpc('unshare_own_equipment', { _copy_id: copyId })
  if (error) throw error
}

/** Moje case / racky (vlastník = moja karta) vo všetkých firmách, s počtom vecí vnútri. */
export async function fetchMyCases(userId: string): Promise<MyCase[]> {
  const db = getSupabase()
  const cards = await db.from('staff').select('id').eq('member_id', userId)
  if (cards.error) throw cards.error
  const ids = (cards.data as { id: string }[]).map((row) => row.id)
  if (ids.length === 0) return []
  const { data, error } = await db.from('cases').select('id, company_id, name, equipment(count)').in('owner_staff_id', ids).is('deleted_at', null).order('name')
  if (error) throw error
  return (data as { id: string; company_id: string; name: string; equipment: { count: number }[] }[]).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    items: row.equipment[0]?.count ?? 0,
  }))
}

export function useMyCases(userId: string) {
  return useQuery({ queryKey: myEquipmentKeys.cases(userId), queryFn: () => fetchMyCases(userId), retry: false })
}

export async function createOwnEquipment(companyId: string, item: { name: string; kind: string; quantity: number; manufacturer?: string; model?: string }): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_own_equipment', {
    _company_id: companyId,
    _name: item.name,
    _kind: item.kind,
    _quantity: item.quantity,
    _manufacturer: item.manufacturer ?? '',
    _model: item.model ?? '',
  })
  if (error) throw error
  return data as string
}

export async function createOwnCase(companyId: string, name: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_own_case', { _company_id: companyId, _name: name })
  if (error) throw error
  return data as string
}

/** Založí moju techniku v prvej firme a pridá ju aj do ďalších (ako kópie). */
export async function createOwnEverywhere(companyIds: string[], item: Parameters<typeof createOwnEquipment>[1]) {
  const [first, ...rest] = companyIds
  const id = await createOwnEquipment(first, item)
  for (const companyId of rest) await shareEquipment(id, companyId)
  return id
}
