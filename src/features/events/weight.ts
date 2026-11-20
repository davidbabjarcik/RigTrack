import type { EventEquipment } from './model'

type Item = { id: string; attributes: { weightKg?: number } }
type Case = { id: string; weightKg: number | null }

/**
 * Celková váha techniky na evente: váha kusu × počet a k tomu prázdne cases, v ktorých technika ide.
 * Položky bez zadanej váhy sa len spočítajú, aby bolo vidno, že číslo je skôr dolný odhad.
 */
export function eventWeight(lines: EventEquipment[], items: Item[], cases: Case[]) {
  let kg = 0
  let missing = 0
  for (const line of lines) {
    const weight = items.find((item) => item.id === line.equipmentId)?.attributes.weightKg
    if (weight && weight > 0) kg += weight * line.quantity
    else missing += 1
  }
  for (const caseId of new Set(lines.map((line) => line.caseId).filter((id): id is string => Boolean(id)))) {
    const weight = cases.find((box) => box.id === caseId)?.weightKg
    if (weight && weight > 0) kg += weight
  }
  return { kg: Math.round(kg * 10) / 10, missing }
}

/** „1 234,5 kg“ alebo „1,2 t“ pri veľkej váhe. */
export function formatTotalWeight(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toLocaleString('sk-SK', { maximumFractionDigits: 2 })} t`
  return `${kg.toLocaleString('sk-SK', { maximumFractionDigits: 1 })} kg`
}
