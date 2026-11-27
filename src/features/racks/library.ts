import type { EquipmentAttributes, EquipmentKind } from '@/features/equipment/model'

// Knižnica prístrojov do racku: kategórie (podľa údajov modelu) a údaje do racku z databázy techniky, keď ich
// technika firmy nemá zadané (výška v U, šírka, hmotnosť, príkon, hĺbka).

export const RACK_CATEGORIES = [
  { id: 'stagebox', label: 'Stageboxy' },
  { id: 'mixer', label: 'Mixy' },
  { id: 'amp', label: 'Zosilňovače' },
  { id: 'processor', label: 'Procesory' },
  { id: 'wireless', label: 'HF prijímače' },
  { id: 'iem', label: 'In-ear vysielače' },
  { id: 'antenna', label: 'Antény a rozbočovače' },
  { id: 'charger', label: 'Nabíjačky' },
  { id: 'power', label: 'Napájanie' },
  { id: 'network', label: 'Sieť' },
  { id: 'video', label: 'Video' },
  { id: 'light', label: 'Svetlo' },
  { id: 'other', label: 'Ostatné' },
] as const

export type RackCategory = (typeof RACK_CATEGORIES)[number]['id']

const IDS = new Set<string>(RACK_CATEGORIES.map((category) => category.id))
const AUDIO: Record<string, RackCategory> = { stagebox: 'stagebox', mixer: 'mixer', amplifier: 'amp', processor: 'processor', wireless: 'wireless', iem: 'iem' }

/** Kategória v knižnici: výslovná (rackRole z databázy) alebo podľa druhu a typu techniky. */
export function rackCategory(kind: EquipmentKind | string, attributes: EquipmentAttributes): RackCategory {
  const role = attributes.rackRole
  if (role && IDS.has(role)) return role as RackCategory
  if (kind === 'audio' || kind === 'dj') return AUDIO[attributes.audioType ?? ''] ?? 'other'
  if (kind === 'it') return attributes.itType === 'network' ? 'network' : 'other'
  if (kind === 'video') return 'video'
  if (kind === 'light') return 'light'
  return 'other'
}

const RACK_KEYS = ['rackU', 'rackWidth', 'depthMm', 'weightKg', 'powerW', 'rearSupport', 'rackRole'] as const

type Model = { kind?: string; manufacturer: string; model: string; attributes: EquipmentAttributes }
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Model z databázy techniky k technike firmy (rovnaká značka a model). */
export function catalogMatch<T extends Model>(item: { kind?: string; manufacturer: string; model: string }, catalog: T[]): T | undefined {
  if (!item.manufacturer.trim() || !item.model.trim()) return undefined
  return catalog.find((entry) => (!entry.kind || !item.kind || entry.kind === item.kind) && same(entry.manufacturer, item.manufacturer) && same(entry.model, item.model))
}

/** Údaje do racku: zadané pri technike majú prednosť, chýbajúce doplní model z databázy. */
export function withCatalog(attributes: EquipmentAttributes, entry: Model | undefined): EquipmentAttributes {
  if (!entry) return attributes
  const filled: Record<string, unknown> = { ...attributes }
  for (const key of RACK_KEYS) if (filled[key] === undefined && entry.attributes[key] !== undefined) filled[key] = entry.attributes[key]
  return filled as EquipmentAttributes
}
