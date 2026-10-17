import { z } from 'zod'
import type { Equipment } from '@/features/equipment/model'

// Balíky techniky: vopred poskladané sady (technika s počtami a celé cases), napr. „Malý zvukový balík“.

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)

export const packageSchema = z.object({
  name: text(120).min(1, 'Zadajte názov'),
  category: text(60),
  note: text(500),
  items: z
    .array(z.object({ equipmentId: z.string().min(1, 'Vyberte techniku'), quantity: z.number('Zadajte počet').int('Celé číslo').min(1, 'Aspoň 1').max(10000) }))
    .max(200),
  cases: z.array(z.string().min(1, 'Vyberte case')).max(100),
})
export type PackageValues = z.infer<typeof packageSchema>
export type EquipmentPackage = PackageValues & { id: string }

/** Kategórie, ktoré formulár ponúkne; dá sa napísať aj iná. */
export const PACKAGE_CATEGORIES = ['Zvuk', 'Svetlo', 'Pódium', 'Truss', 'Video', 'Káble']

/** Uložený obsah: poškodené položky sa vynechajú. */
export function readItems(raw: unknown): PackageValues['items'] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const parsed = packageSchema.shape.items.element.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
}

export function readCases(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && id !== '') : []
}

/**
 * Čo z balíka sa dá naozaj pridať: technika, ktorá ešte existuje a nie je vyradená, a existujúce cases.
 * Tá istá technika uvedená viackrát sa zlúči. `skipped` = koľko položiek balíka už neexistuje.
 */
export function packageAdditions(pkg: Pick<EquipmentPackage, 'items' | 'cases'>, equipment: Equipment[], cases: { id: string }[]) {
  const totals = new Map<string, number>()
  let skipped = 0
  for (const item of pkg.items) {
    const known = equipment.find((candidate) => candidate.id === item.equipmentId)
    if (!known || known.status === 'retired') {
      skipped++
      continue
    }
    totals.set(item.equipmentId, (totals.get(item.equipmentId) ?? 0) + item.quantity)
  }
  const caseIds = [...new Set(pkg.cases)].filter((id) => {
    const ok = cases.some((box) => box.id === id)
    if (!ok) skipped++
    return ok
  })
  return { items: [...totals].map(([equipmentId, quantity]) => ({ equipmentId, quantity })), cases: caseIds, skipped }
}

/** Obsah balíka jedným riadkom: „Audio case · 4× Reprobox · 4× Kábel NL4“. */
export function describePackage(pkg: Pick<EquipmentPackage, 'items' | 'cases'>, equipment: Equipment[], cases: { id: string; name: string }[]) {
  return [
    ...pkg.cases.map((id) => cases.find((box) => box.id === id)?.name ?? 'zmazaný case'),
    ...pkg.items.map((item) => `${item.quantity > 1 ? `${item.quantity}× ` : ''}${equipment.find((candidate) => candidate.id === item.equipmentId)?.name ?? 'zmazaná technika'}`),
  ].join(' · ')
}
