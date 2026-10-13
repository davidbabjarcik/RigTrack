import type { Case } from '@/features/cases/model'
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

/** Case ako balík na naloženie; null, kým nemá všetky rozmery. Hĺbka case je jeho výška. */
export function parcelOf(item: Case): Parcel | null {
  if (!item.lengthCm || !item.widthCm || !item.depthCm) return null
  return { id: item.id, name: item.name, length: item.lengthCm, width: item.widthCm, height: item.depthCm, weightKg: item.weightKg ?? 0 }
}

/** Vozidlá s najväčším priestorom prvé: veľké sa plnia skôr, menšie sa priberú až podľa potreby. */
export function byCapacity(spaces: CargoSpace[]) {
  const size = (space: CargoSpace) => space.length * space.width * space.height
  return [...spaces].sort((a, b) => size(b) - size(a) || a.name.localeCompare(b.name, 'sk'))
}
