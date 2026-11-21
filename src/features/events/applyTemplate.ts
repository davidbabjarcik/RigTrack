import { addEventCase, addEventCrew, addEventEquipment, setEventEquipmentQuantity } from './api'
import type { TemplateData } from './templates'

/**
 * Pridá na nový event techniku a posádku zo šablóny. Celé cases idú ako case, ostatné kusy jednotlivo.
 * Čo sa pridať nedá (predaná alebo archívna technika, bývalý člen…), databáza odmietne a preskočí sa.
 */
export async function applyTemplate(companyId: string, eventId: string, data: TemplateData) {
  let skipped = 0
  const cases = new Map<string, { equipmentId: string; quantity: number }[]>()
  for (const line of data.equipment) {
    if (line.caseId) cases.set(line.caseId, [...(cases.get(line.caseId) ?? []), { equipmentId: line.equipmentId, quantity: line.quantity }])
  }
  for (const [caseId, content] of cases) await addEventCase(companyId, eventId, caseId, content).catch(() => (skipped += content.length))
  for (const line of data.equipment.filter((item) => !item.caseId)) {
    try {
      await addEventEquipment(companyId, eventId, line.equipmentId)
      if (line.quantity > 1) await setEventEquipmentQuantity(eventId, line.equipmentId, line.quantity)
    } catch {
      skipped += 1
    }
  }
  for (const person of data.crew) await addEventCrew(companyId, eventId, person).catch(() => (skipped += 1))
  return skipped
}
