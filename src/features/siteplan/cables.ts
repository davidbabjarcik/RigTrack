import { addEventEquipment, setEventEquipmentQuantity } from '@/features/events/api'
import type { CompanyEvent } from '@/features/events/model'
import { cablePieces, routeLength } from './geo'
import type { SiteRoute } from './model'

type Cable = { id: string; name: string; quantity: number; attributes: { lengthM?: number } }

/** Pri každej trase dĺžka (s rezervou) a koľko kusov vybraného kábla treba; súčet kusov podľa kábla. */
export function cableNeeds(routes: SiteRoute[], equipment: Cable[]) {
  const rows = routes.map((route) => {
    const length = routeLength(route.points, route.slack_pct)
    const item = route.equipment_id ? equipment.find((piece) => piece.id === route.equipment_id) : undefined
    return { route, length, item, pieces: item ? cablePieces(length.withSlack, item.attributes.lengthM) : null }
  })
  const totals = new Map<string, number>()
  for (const row of rows) if (row.item && row.pieces) totals.set(row.item.id, (totals.get(row.item.id) ?? 0) + row.pieces)
  return { rows, totals, meters: rows.reduce((sum, row) => sum + row.length.withSlack, 0) }
}

/** Doplní káble do techniky akcie (pack list): chýbajúce pridá, nízke počty zvýši; nič neuberie. Vráti počet zmien. */
export async function addCablesToEvent(companyId: string, event: Pick<CompanyEvent, 'id' | 'equipment'>, totals: Map<string, number>, equipment: Cable[]) {
  let changed = 0
  for (const [id, count] of totals) {
    const item = equipment.find((piece) => piece.id === id)
    const want = Math.min(count, item ? Math.max(1, item.quantity) : count)
    const existing = event.equipment.find((line) => line.equipmentId === id)
    if (!existing) {
      await addEventEquipment(companyId, event.id, id)
      if (want > 1) await setEventEquipmentQuantity(event.id, id, want)
      changed++
    } else if (existing.quantity < want) {
      await setEventEquipmentQuantity(event.id, id, want)
      changed++
    }
  }
  return changed
}
