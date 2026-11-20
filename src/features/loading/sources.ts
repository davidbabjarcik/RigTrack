import type { Case } from '@/features/cases/model'
import type { EventEquipment } from '@/features/events/model'
import type { Vehicle } from '@/features/vehicles/model'
import type { CargoSpace, Parcel } from './model'

/** Nákladný priestor vozidla; null, kým nemá zapísané všetky tri rozmery. */
export function cargoSpaceOf(vehicle: Vehicle): CargoSpace | null {
  if (!vehicle.cargoLengthCm || !vehicle.cargoWidthCm || !vehicle.cargoHeightCm) return null
  return {
    id: vehicle.id,
    name: [vehicle.plate, vehicle.model].filter(Boolean).join(' · '),
    payloadKg: vehicle.payloadKg,
    length: vehicle.cargoLengthCm,
    width: vehicle.cargoWidthCm,
    height: vehicle.cargoHeightCm,
    obstacles: vehicle.cargoObstacles.map((obstacle) => ({ ...obstacle, z: 0 })),
  }
}

/**
 * Case ako balík na naloženie; null, kým nemá všetky rozmery. Hĺbka case je jeho výška.
 * Hmotnosť: prázdny case a k tomu technika, ktorá v ňom ide (`contentKg`).
 */
export function parcelOf(item: Case, contentKg = 0): Parcel | null {
  if (!item.lengthCm || !item.widthCm || !item.depthCm) return null
  return { id: item.id, name: item.name, length: item.lengthCm, width: item.widthCm, height: item.depthCm, weightKg: Math.round(((item.weightKg ?? 0) + contentKg) * 10) / 10 }
}

/** Najviac kusov jednej položky v pláne (aby sa výpočet nezasekol pri stovkách kusov). */
const MAX_PIECES = 60

type LooseItem = { id: string; name: string; attributes: { boxWidthCm?: number; boxDepthCm?: number; boxHeightCm?: number; weightKg?: number } }

/**
 * Technika mimo cases s rozmermi boxu (repro, sub…): každý kus ako balík. Id má tvar „eq:<id>#<kus>“.
 * Vracia aj technikou bez rozmerov, aby sa dala vypísať.
 */
export function looseParcels(lines: EventEquipment[], items: LooseItem[]) {
  const parcels: Parcel[] = []
  const withoutSize: LooseItem[] = []
  for (const line of lines) {
    if (line.caseId) continue
    const item = items.find((candidate) => candidate.id === line.equipmentId)
    if (!item) continue
    const { boxWidthCm, boxDepthCm, boxHeightCm, weightKg } = item.attributes
    if (!boxWidthCm || !boxDepthCm || !boxHeightCm) {
      withoutSize.push(item)
      continue
    }
    const count = Math.min(line.quantity, MAX_PIECES)
    for (let piece = 1; piece <= count; piece++) {
      parcels.push({
        id: `eq:${item.id}#${piece}`,
        name: count > 1 ? `${item.name} (${piece}/${count})` : item.name,
        length: boxWidthCm,
        width: boxDepthCm,
        height: boxHeightCm,
        weightKg: weightKg ?? 0,
      })
    }
  }
  return { parcels, withoutSize }
}

/** Hmotnosť techniky v jednotlivých cases na evente (váha kusu × počet). */
export function contentWeights(lines: EventEquipment[], items: LooseItem[]) {
  const weights = new Map<string, number>()
  for (const line of lines) {
    if (!line.caseId) continue
    const kg = items.find((item) => item.id === line.equipmentId)?.attributes.weightKg ?? 0
    weights.set(line.caseId, (weights.get(line.caseId) ?? 0) + kg * line.quantity)
  }
  return weights
}

/** Kam vedie položka plánu: case alebo technika. */
export const placementLink = (id: string) => (id.startsWith('eq:') ? `/equipment/${id.slice(3).split('#')[0]}` : `/cases/${id}`)

/** Vozidlá s najväčším priestorom prvé: veľké sa plnia skôr, menšie sa priberú až podľa potreby. */
export function byCapacity(spaces: CargoSpace[]) {
  const size = (space: CargoSpace) => space.length * space.width * space.height
  return [...spaces].sort((a, b) => size(b) - size(a) || a.name.localeCompare(b.name, 'sk'))
}
