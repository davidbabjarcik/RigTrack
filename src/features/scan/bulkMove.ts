// Hromadný presun: naskenované cases a technika sa naraz presunú do skladu, na event alebo do servisu.
import type { EventEquipment } from '@/features/events/model'
import { autoCell, rackBays, type PlacedCase, type Spot } from '@/features/warehouse/model'
import type { QrTarget } from './qr'

/** Naskenovaný case alebo technika; pri technike po kusoch čísla kusov, inak počet naskenovaní. */
export type Scanned = { kind: 'case' | 'equipment'; id: string; units: number[]; count: number }

/** Pridá sken do zoznamu. Vráti nový zoznam a či šlo o nový záznam (ten istý case / kus druhýkrát nie). */
export function addScan(list: Scanned[], target: QrTarget): { list: Scanned[]; added: boolean } {
  if (target.kind === 'spot') return { list, added: false }
  const existing = list.find((item) => item.kind === target.kind && item.id === target.id)
  if (target.kind === 'case') return existing ? { list, added: false } : { list: [...list, { kind: 'case', id: target.id, units: [], count: 1 }], added: true }
  if (existing) {
    if (target.unit !== undefined) {
      if (existing.units.includes(target.unit)) return { list, added: false }
      return { list: list.map((item) => (item === existing ? { ...item, units: [...item.units, target.unit!].sort((a, b) => a - b), count: item.count + 1 } : item)), added: true }
    }
    return { list: list.map((item) => (item === existing ? { ...item, count: item.count + 1 } : item)), added: true }
  }
  return { list: [...list, { kind: 'equipment', id: target.id, units: target.unit !== undefined ? [target.unit] : [], count: 1 }], added: true }
}

type Piece = { id: string; caseId: string | null; quantity: number }

/**
 * Čo pribudne na event: celé cases s obsahom (ak tam ešte nie sú) a technika navyše.
 * Technika z naskenovaného case sa nezráta dvakrát.
 */
export function eventAdditions(scanned: Scanned[], equipment: Piece[], lines: EventEquipment[]) {
  const scannedCases = new Set(scanned.filter((item) => item.kind === 'case').map((item) => item.id))
  const onEvent = new Set(lines.map((line) => line.caseId).filter(Boolean))
  const cases = [...scannedCases]
    .filter((caseId) => !onEvent.has(caseId))
    .map((caseId) => ({ caseId, content: equipment.filter((item) => item.caseId === caseId && item.quantity > 0).map((item) => ({ equipmentId: item.id, quantity: item.quantity })) }))
  const items = scanned
    .filter((item) => item.kind === 'equipment')
    .flatMap((item) => {
      const piece = equipment.find((candidate) => candidate.id === item.id)
      if (!piece || (piece.caseId && scannedCases.has(piece.caseId))) return []
      const existing = lines.find((line) => line.equipmentId === item.id)
      return [{ equipmentId: item.id, quantity: (existing?.quantity ?? 0) + item.count, isNew: !existing }]
    })
  return { cases, items }
}

/**
 * Kam na miesto pôjde ktorý case: regál s poľami po jednom do prvého voľného poľa a police,
 * inak na zvolené poschodie (pri jednom poschodí bez neho).
 */
export function placements<T extends PlacedCase>(spot: Spot, inSpot: T[], moving: T[], level: number | null) {
  const multiBay = spot.kind === 'rack' && ((spot.bays?.length ?? 0) > 0 || rackBays(spot).length > 1)
  const placed: T[] = inSpot.filter((item) => !moving.some((other) => other.id === item.id))
  return moving.map((item) => {
    if (!multiBay) return { caseId: item.id, level: spot.levels > 1 ? Math.min(Math.max(level ?? 1, 1), spot.levels) : null, bay: null }
    const cell = autoCell(rackBays(spot), placed, item)
    placed.push({ ...item, spotId: spot.id, spotBay: cell.bay, spotLevel: cell.level, spotPallet: null })
    return { caseId: item.id, level: cell.level, bay: cell.bay }
  })
}
