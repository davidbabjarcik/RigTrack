import { nextSpotName, palletTypesOf, rackLengthCm, snapToPerimeter, type Spot, type SpotKind, type Warehouse } from './model'

/** Miesta na veci (regál, miesto, paleta) a zvlášť stavebné prvky. Na „Miesto“ sa dávajú cases aj hliník. */
export type Choice = 'rack' | 'place' | 'pallet' | 'room' | 'door' | 'window' | 'column' | 'wall'
export const PLACES: Choice[] = ['rack', 'place', 'pallet']
export const BUILDING: Choice[] = ['room', 'door', 'window', 'column', 'wall']
export const CHOICE_LABELS: Record<Choice, string> = { rack: 'Regál', place: 'Miesto', pallet: 'Paleta', room: 'Miestnosť', door: 'Dvere', window: 'Okno', column: 'Stĺp', wall: 'Stena' }

/** Čo je hore vybrané na pridanie (platí aj pre kreslenie ťahaním v pláne). */
export type AddSelection = { choice: Choice; rackType: string; palletType: string }
export const DEFAULT_ADD: AddSelection = { choice: 'rack', rackType: '', palletType: '' }

export const selectionKind = (selection: AddSelection): SpotKind => (selection.choice === 'place' ? 'zone' : selection.choice)

/** Predvolená veľkosť nového prvku (cm) a ako sa volá. */
const DEFAULTS: Partial<Record<SpotKind, { length: number; width: number; name: string }>> = {
  zone: { length: 300, width: 200, name: 'Miesto' },
  room: { length: 400, width: 300, name: 'Miestnosť' },
  door: { length: 120, width: 15, name: 'Dvere' },
  window: { length: 150, width: 15, name: 'Okno' },
  column: { length: 40, width: 40, name: 'Stĺp' },
  wall: { length: 300, width: 15, name: 'Stena' },
}

const nameFor = (spots: Pick<Spot, 'name'>[], base: string) => nextSpotName(spots).replace('Miesto', base)

type Rect = { x: number; y: number; length: number; width: number }

/**
 * Nové miesto podľa výberu: bez obdĺžnika doprostred v predvolenej veľkosti (regál a paleta podľa typu), s obdĺžnikom
 * (nakreslený ťahaním) v jeho veľkosti. Dvere a okno majú hrúbku 15 cm a idú k stene.
 */
export function buildSpot(selection: AddSelection, warehouse: Warehouse, spots: Pick<Spot, 'name'>[], rect?: Rect): Omit<Spot, 'id'> | null {
  const kind = selectionKind(selection)
  const rackTypes = warehouse.rackTypes ?? []
  const palletTypes = palletTypesOf(warehouse)
  const rackType = rackTypes.find((type) => type.id === selection.rackType) ?? rackTypes[0]
  const palletType = palletTypes.find((type) => type.id === selection.palletType) ?? palletTypes[0]
  const center = (length: number, width: number) => ({
    length: Math.min(length, warehouse.lengthCm),
    width: Math.min(width, warehouse.widthCm),
    x: Math.max(0, Math.round((warehouse.lengthCm - length) / 2)),
    y: Math.max(0, Math.round((warehouse.widthCm - width) / 2)),
  })
  if (kind === 'rack') {
    if (!rackType) return { name: nameFor(spots, 'Regál'), kind, ...(rect ?? center(280, 110)), levels: 1 }
    return {
      name: nameFor(spots, 'Regál'),
      kind,
      ...(rect ?? center(rackLengthCm(rackType.bays), rackType.depthCm)),
      levels: Math.min(20, Math.max(...rackType.bays.map((bay) => bay.levels.length))),
      bays: rackType.bays,
    }
  }
  if (kind === 'pallet') {
    if (!palletType) return null
    return { name: nameFor(spots, 'Paleta'), kind, ...(rect ?? center(palletType.length, palletType.width)), levels: 1, material: palletType.material }
  }
  const preset = DEFAULTS[kind]
  if (!preset) return null
  if (kind === 'door' || kind === 'window') {
    // Hrúbka 15 cm pozdĺž dlhšej strany nakresleného obdĺžnika, prichytené k stene.
    const base = rect ? (rect.length >= rect.width ? { ...rect, width: preset.width } : { ...rect, length: preset.width }) : { ...center(preset.length, preset.width), y: 0 }
    return { name: nameFor(spots, preset.name), kind, ...snapToPerimeter(base, warehouse), levels: 1 }
  }
  return { name: nameFor(spots, preset.name), kind, ...(rect ?? center(preset.length, preset.width)), levels: 1 }
}
