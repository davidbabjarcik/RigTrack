import type { EquipmentKind } from '@/features/equipment/model'
import { getSupabase } from '@/lib/supabase/client'
import { addEventEquipment, setEventEquipmentQuantity } from '../api'
import type { CompanyEvent } from '../model'

export const aliasKeys = {
  list: (companyId: string) => ['company', companyId, 'equipment-aliases'] as const,
}

/** Zapamätané názvy z cudzích zoznamov: normalizovaný názov → technika. */
export async function fetchAliases(companyId: string): Promise<Map<string, string>> {
  const { data, error } = await getSupabase().from('equipment_aliases').select('alias, equipment_id').eq('company_id', companyId)
  if (error) throw error
  return new Map((data as { alias: string; equipment_id: string }[]).map((row) => [row.alias, row.equipment_id]))
}

/** Uloží priradenia; staré priradenie toho istého názvu nahradí. */
export async function rememberAliases(companyId: string, pairs: { alias: string; equipmentId: string }[]) {
  if (pairs.length === 0) return
  const table = () => getSupabase().from('equipment_aliases')
  const removed = await table()
    .delete()
    .eq('company_id', companyId)
    .in(
      'alias',
      pairs.map((pair) => pair.alias),
    )
  if (removed.error) throw removed.error
  const { error } = await table().insert(pairs.map((pair) => ({ company_id: companyId, alias: pair.alias, equipment_id: pair.equipmentId })))
  if (error) throw error
}

/** Založí techniku, ktorú report pozná a my ešte nie. */
export async function createImportedEquipment(companyId: string, item: { name: string; kind: EquipmentKind; quantity: number }) {
  const { data, error } = await getSupabase()
    .from('equipment')
    .insert({ company_id: companyId, name: item.name.slice(0, 120), kind: item.kind, quantity: item.quantity })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

/** Zapíše počty na event: novú techniku pridá, pri technike, ktorá už na evente je, nastaví počet. */
export async function writeToEvent(companyId: string, event: CompanyEvent, quantities: Map<string, number>) {
  for (const [equipmentId, quantity] of quantities) {
    if (!event.equipment.some((item) => item.equipmentId === equipmentId)) await addEventEquipment(companyId, event.id, equipmentId)
    await setEventEquipmentQuantity(event.id, equipmentId, quantity)
  }
}
