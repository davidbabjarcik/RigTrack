// Moja (vlastná) technika vo všetkých mojich firmách: pôvodné položky a ich kópie v ďalších firmách (0085).
import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type MyItem = { id: string; companyId: string; name: string; quantity: number; sharedFrom: string | null }
export type MyGear = { original: MyItem; copies: MyItem[] }

export const myEquipmentKeys = { all: (userId: string) => ['my-equipment', userId] as const }

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
