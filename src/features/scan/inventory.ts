// Inventúra skenovaním: čo má byť v sklade, čo sa naskenovalo a čo chýba alebo je práve vonku (event, výpožička).
import type { Scanned } from './bulkMove'

type CaseLike = { id: string; spotId: string | null }
type PieceLike = { id: string; caseId: string | null; status: string; kind: string; trackUnits: boolean; quantity: number; unitIds: number[] }

export type Expected = { key: string; kind: 'case' | 'equipment'; id: string; unit: number | null }

const gone = (status: string) => status === 'sold' || status === 'retired'
const units = (piece: PieceLike) => (piece.unitIds.length > 0 ? piece.unitIds : Array.from({ length: piece.quantity }, (_, index) => index + 1))

/**
 * Čo sa má pri inventúre nájsť. Celý sklad: všetky cases a technika mimo cases (bez predanej, vyradenej a spotrebného
 * materiálu); technika po kusoch po jednotlivých kusoch. Miesto v sklade: len cases na tom mieste.
 */
export function expectedItems(cases: CaseLike[], equipment: PieceLike[], spotId: string): Expected[] {
  const boxes = cases.filter((box) => !spotId || box.spotId === spotId).map((box) => ({ key: `case:${box.id}`, kind: 'case' as const, id: box.id, unit: null }))
  if (spotId) return boxes
  const loose = equipment
    .filter((piece) => !piece.caseId && !gone(piece.status) && piece.kind !== 'consumable')
    .flatMap((piece): Expected[] =>
      piece.trackUnits
        ? units(piece).map((unit) => ({ key: `eq:${piece.id}#${unit}`, kind: 'equipment' as const, id: piece.id, unit }))
        : [{ key: `eq:${piece.id}`, kind: 'equipment' as const, id: piece.id, unit: null }],
    )
  return [...boxes, ...loose]
}

/** Kľúče naskenovaného. Technika po kusoch naskenovaná štítkom celej položky sa počíta za všetky jej kusy. */
export function scannedKeys(scanned: Scanned[], equipment: PieceLike[]) {
  const keys = new Set<string>()
  for (const item of scanned) {
    if (item.kind === 'case') keys.add(`case:${item.id}`)
    else if (item.units.length > 0) for (const unit of item.units) keys.add(`eq:${item.id}#${unit}`)
    else {
      keys.add(`eq:${item.id}`)
      const piece = equipment.find((candidate) => candidate.id === item.id)
      if (piece?.trackUnits) for (const unit of units(piece)) keys.add(`eq:${item.id}#${unit}`)
    }
  }
  return keys
}

/**
 * Výsledok: nájdené, chýbajúce, vonku (nenaskenované, ale sú na prebiehajúcom evente alebo vo výpožičke) a navyše
 * (naskenované, ale na tomto mieste nemajú byť).
 */
export function inventoryReport(expected: Expected[], scanned: Set<string>, out: Set<string>) {
  const expectedKeys = new Set(expected.map((item) => item.key))
  const isOut = (item: Expected) => out.has(item.kind === 'case' ? `case:${item.id}` : `eq:${item.id}`)
  // Štítok celej položky pri technike po kusoch nie je „navyše“ – zarátal sa za jej kusy.
  const covered = (key: string) => expectedKeys.has(key) || (key.startsWith('eq:') && !key.includes('#') && expected.some((item) => item.key.startsWith(`${key}#`)))
  return {
    found: expected.filter((item) => scanned.has(item.key)),
    missing: expected.filter((item) => !scanned.has(item.key) && !isOut(item)),
    out: expected.filter((item) => !scanned.has(item.key) && isOut(item)),
    extra: [...scanned].filter((key) => !covered(key)),
  }
}

type Gig = { startsOn: string; endsOn: string; status: string; equipment: { equipmentId: string; caseId: string | null }[] }
type Lend = { status: string; items: { equipmentId: string; caseId: string | null }[] }

/** Čo je práve vonku: na evente, ktorý dnes prebieha, alebo na vydanej výpožičke (cases aj technika). */
export function outNow(events: Gig[], loans: Lend[], today: string) {
  const out = new Set<string>()
  const lines = [
    ...events.filter((event) => event.status !== 'cancelled' && event.startsOn <= today && event.endsOn >= today).flatMap((event) => event.equipment),
    ...loans.filter((loan) => loan.status === 'issued').flatMap((loan) => loan.items),
  ]
  for (const line of lines) {
    out.add(`eq:${line.equipmentId}`)
    if (line.caseId) out.add(`case:${line.caseId}`)
  }
  return out
}
