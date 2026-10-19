import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase/client'

export type OfficeItem = { id: string; name: string; unit: string; quantity: number; minQuantity: number | null }
export const PACK_UNITS = ['kg', 'g', 'l', 'ml', 'ks'] as const
export type PackUnit = (typeof PACK_UNITS)[number]

/** Spolu v balení: 3 × 1 kg = 3 kg; g a ml sa prepočítajú na kg a l. */
export function packTotal(purchase: Pick<OfficePurchase, 'quantity' | 'packAmount' | 'packUnit'>) {
  if (!purchase.packAmount || !purchase.packUnit) return null
  const amount = purchase.quantity * purchase.packAmount
  if (purchase.packUnit === 'g') return { amount: amount / 1000, unit: 'kg' }
  if (purchase.packUnit === 'ml') return { amount: amount / 1000, unit: 'l' }
  return { amount, unit: purchase.packUnit }
}

export type OfficePurchase = {
  id: string
  itemId: string
  quantity: number
  price: number
  /** Veľkosť balenia, napr. 1 kg kávy. */
  packAmount: number | null
  packUnit: PackUnit | ''
  boughtOn: string
  boughtBy: string | null
  boughtByName: string
  note: string
}

/** Čo sa v kancelárii bežne minie; ponúkne sa na jedno kliknutie. */
export const COMMON_OFFICE_ITEMS: { name: string; unit: string }[] = [
  { name: 'Voda', unit: 'bal' },
  { name: 'Káva', unit: 'bal' },
  { name: 'Poháre', unit: 'bal' },
  { name: 'Cukor', unit: 'bal' },
  { name: 'Mlieko', unit: 'l' },
  { name: 'Čaj', unit: 'bal' },
]

export const officeKeys = {
  items: (companyId: string) => ['company', companyId, 'office', 'items'] as const,
  purchases: (companyId: string) => ['company', companyId, 'office', 'purchases'] as const,
}

export async function fetchOfficeItems(companyId: string): Promise<OfficeItem[]> {
  const { data, error } = await getSupabase().from('office_items').select('id, name, unit, quantity, min_quantity').eq('company_id', companyId).order('name')
  if (error) throw error
  return (data as { id: string; name: string; unit: string; quantity: number | string; min_quantity: number | string | null }[]).map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    quantity: Number(row.quantity),
    minQuantity: row.min_quantity === null ? null : Number(row.min_quantity),
  }))
}

export async function fetchOfficePurchases(companyId: string): Promise<OfficePurchase[]> {
  const { data, error } = await getSupabase()
    .from('office_purchases')
    .select('id, item_id, quantity, price, pack_amount, pack_unit, bought_on, bought_by, bought_by_name, note')
    .eq('company_id', companyId)
    .order('bought_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(2000)
  if (error) throw error
  return (
    data as {
      id: string
      item_id: string
      quantity: number | string
      price: number | string
      pack_amount: number | string | null
      pack_unit: PackUnit | ''
      bought_on: string
      bought_by: string | null
      bought_by_name: string
      note: string
    }[]
  ).map((row) => ({
    id: row.id,
    itemId: row.item_id,
    quantity: Number(row.quantity),
    price: Number(row.price),
    packAmount: row.pack_amount === null ? null : Number(row.pack_amount),
    packUnit: row.pack_unit,
    boughtOn: row.bought_on,
    boughtBy: row.bought_by,
    boughtByName: row.bought_by_name,
    note: row.note,
  }))
}

export function useOffice(companyId: string) {
  const items = useQuery({ queryKey: officeKeys.items(companyId), queryFn: () => fetchOfficeItems(companyId), retry: false })
  const purchases = useQuery({ queryKey: officeKeys.purchases(companyId), queryFn: () => fetchOfficePurchases(companyId), retry: false })
  return { items, purchases }
}

export async function addOfficeItems(companyId: string, items: { name: string; unit: string; minQuantity?: number | null }[]) {
  const { error } = await getSupabase()
    .from('office_items')
    .upsert(
      items.map((item) => ({ company_id: companyId, name: item.name.trim(), unit: item.unit.trim() || 'ks', min_quantity: item.minQuantity ?? null })),
      { onConflict: 'company_id,name', ignoreDuplicates: true },
    )
  if (error) throw error
}

export async function updateOfficeItem(id: string, patch: { quantity?: number; minQuantity?: number | null }) {
  const row: Record<string, unknown> = {}
  if (patch.quantity !== undefined) row.quantity = Math.max(0, patch.quantity)
  if (patch.minQuantity !== undefined) row.min_quantity = patch.minQuantity
  const { error } = await getSupabase().from('office_items').update(row).eq('id', id)
  if (error) throw error
}

export async function deleteOfficeItem(id: string) {
  const { error } = await getSupabase().from('office_items').delete().eq('id', id)
  if (error) throw error
}

/** Nákup sa pripočíta na sklad (rieši databáza). Kto kúpil: prázdne = ja. */
export async function addOfficePurchase(
  companyId: string,
  purchase: { itemId: string; quantity: number; price: number; packAmount: number | null; packUnit: PackUnit | ''; boughtOn: string; boughtBy: string; note: string },
) {
  const { error } = await getSupabase()
    .from('office_purchases')
    .insert({
      company_id: companyId,
      item_id: purchase.itemId,
      quantity: purchase.quantity,
      price: purchase.price,
      pack_amount: purchase.packAmount && purchase.packUnit ? purchase.packAmount : null,
      pack_unit: purchase.packAmount && purchase.packUnit ? purchase.packUnit : '',
      bought_on: purchase.boughtOn,
      ...(purchase.boughtBy ? { bought_by: purchase.boughtBy } : {}),
      note: purchase.note.trim(),
    })
  if (error) throw error
}

export async function deleteOfficePurchase(id: string) {
  const { error } = await getSupabase().from('office_purchases').delete().eq('id', id)
  if (error) throw error
}

export type OfficeStats = {
  total: number
  byPerson: { id: string | null; name: string; total: number; count: number }[]
  /** Podľa človeka a položky: koľko čoho kto kúpil. */
  /** packs: spolu v baleniach podľa jednotky, napr. { kg: 4 }. */
  byItem: { itemId: string; quantity: number; total: number; packs: Record<string, number> }[]
}

/** Kto koľko minul a čoho sa koľko kúpilo za obdobie (rok „2026“ alebo mesiac „2026-10“; prázdne = všetko). */
export function officeStats(purchases: OfficePurchase[], period = ''): OfficeStats {
  const chosen = purchases.filter((purchase) => purchase.boughtOn.startsWith(period))
  const people = new Map<string, OfficeStats['byPerson'][number]>()
  const items = new Map<string, OfficeStats['byItem'][number]>()
  let total = 0
  for (const purchase of chosen) {
    total += purchase.price
    const key = purchase.boughtBy ?? `name:${purchase.boughtByName}`
    const person = people.get(key) ?? { id: purchase.boughtBy, name: purchase.boughtByName, total: 0, count: 0 }
    person.total += purchase.price
    person.count += 1
    people.set(key, person)
    const item = items.get(purchase.itemId) ?? { itemId: purchase.itemId, quantity: 0, total: 0, packs: {} }
    item.quantity += purchase.quantity
    item.total += purchase.price
    const pack = packTotal(purchase)
    if (pack) item.packs[pack.unit] = Math.round(((item.packs[pack.unit] ?? 0) + pack.amount) * 1000) / 1000
    items.set(purchase.itemId, item)
  }
  const round = (value: number) => Math.round(value * 100) / 100
  return {
    total: round(total),
    byPerson: [...people.values()].map((row) => ({ ...row, total: round(row.total) })).sort((a, b) => b.count - a.count || b.total - a.total),
    byItem: [...items.values()].map((row) => ({ ...row, total: round(row.total) })).sort((a, b) => b.total - a.total),
  }
}
