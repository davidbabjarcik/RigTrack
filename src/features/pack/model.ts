import { caseTitle, type Case } from '@/features/cases/model'
import type { Equipment } from '@/features/equipment/model'
import type { EventEquipment } from '@/features/events/model'
import type { PackCheck, PackPhase } from './api'

/** Riadok pack listu: celý case (s počtom kusov techniky v ňom) alebo technika mimo case. */
export type PackRow = {
  key: string
  equipmentId?: string
  caseId?: string
  name: string
  detail: string
  quantity: number
  /** Pri case: čo v ňom je (ako na hárku s obsahom) – obsah a zvlášť príslušenstvo. */
  contents?: { name: string; quantity: number; accessory: boolean }[]
}

/** Pack list z techniky eventu: najprv cases, potom technika bez case (podľa názvu). */
export function packRows(lines: EventEquipment[], equipment: Equipment[], cases: Case[]): PackRow[] {
  const byCase = new Map<string, number>()
  const loose: PackRow[] = []
  for (const line of lines) {
    if (line.caseId) {
      byCase.set(line.caseId, (byCase.get(line.caseId) ?? 0) + line.quantity)
      continue
    }
    const item = equipment.find((candidate) => candidate.id === line.equipmentId)
    loose.push({
      key: `e:${line.equipmentId}`,
      equipmentId: line.equipmentId,
      name: item?.name ?? 'Technika',
      detail: [item?.manufacturer, item?.inventoryNumber && `inv. ${item.inventoryNumber}`].filter(Boolean).join(' · '),
      quantity: line.quantity,
    })
  }
  const caseRows: PackRow[] = [...byCase.entries()].map(([caseId, pieces]) => {
    const box = cases.find((candidate) => candidate.id === caseId)
    // Obsah case ako na hárku: rovnaké názvy spolu, príslušenstvo zvlášť.
    const totals = new Map<string, { quantity: number; accessory: boolean }>()
    for (const item of equipment.filter((candidate) => candidate.caseId === caseId)) {
      const found = totals.get(item.name)
      totals.set(item.name, { quantity: (found?.quantity ?? 0) + item.quantity, accessory: Boolean(item.attributes.sheetAccessory) })
    }
    const contents = [...totals.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => Number(a.accessory) - Number(b.accessory) || a.name.localeCompare(b.name, 'sk', { numeric: true }))
    return {
      key: `c:${caseId}`,
      caseId,
      name: box ? caseTitle(box) : 'Case',
      detail: `${pieces} ks techniky${box?.inventoryNumber ? ` · ${box.inventoryNumber}` : ''}`,
      quantity: 1,
      ...(contents.length > 0 ? { contents } : {}),
    }
  })
  const byName = (a: PackRow, b: PackRow) => a.name.localeCompare(b.name, 'sk')
  return [...caseRows.sort(byName), ...loose.sort(byName)]
}

/** Odškrtnutie riadku v danej fáze, ak existuje. */
export function checkOf(row: PackRow, checks: PackCheck[], phase: PackPhase) {
  return checks.find((check) => check.phase === phase && (row.caseId ? check.caseId === row.caseId : check.equipmentId === row.equipmentId))
}

export function packProgress(rows: PackRow[], checks: PackCheck[], phase: PackPhase) {
  const done = rows.filter((row) => checkOf(row, checks, phase)).length
  return { done, total: rows.length }
}
