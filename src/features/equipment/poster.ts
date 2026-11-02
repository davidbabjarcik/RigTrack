import {
  APPLIANCE_TYPE_LABELS,
  AUDIO_TYPE_LABELS,
  AUDIO_TYPES,
  DJ_TYPE_LABELS,
  formatNumber,
  IT_TYPE_LABELS,
  LIGHT_TYPE_GROUPS,
  TRUSS_SHAPE_LABELS,
  VIDEO_TYPE_LABELS,
  type Equipment,
  type EquipmentKind,
} from './model'

/** Jedna dlaždica plagátu: rovnaká technika zrátaná dokopy (aj rozdelená do viacerých cases). */
export type PosterTile = { key: string; name: string; detail: string; count: number; photoPath: string; ids: string[]; sort: number }
export type PosterSection = { key: string; title: string; tiles: PosterTile[]; total: number }

type Item = Pick<Equipment, 'id' | 'name' | 'kind' | 'attributes' | 'quantity' | 'photoPath' | 'status' | 'manufacturer' | 'model' | 'categoryId'>

/** Druhy, pre ktoré má plagát zmysel ako prvý (pódium, hliník). */
export const POSTER_KINDS: EquipmentKind[] = ['stage', 'truss', 'light', 'audio', 'video', 'dj', 'cable', 'it', 'appliance', 'general', 'consumable']

/** Predvolený nadpis plagátu podľa druhu. */
export const POSTER_TITLES: Partial<Record<EquipmentKind, string>> = {
  stage: 'Pódium – inventár',
  truss: 'Hliník – inventár',
  light: 'Svetlá – inventár',
  audio: 'Zvuk – inventár',
  video: 'Video – inventár',
}

/** Do ktorej časti plagátu technika patrí a ako sa volá. */
function sectionOf(item: Item, categoryName: (id: string | null) => string): { key: string; title: string; order: number } {
  const a = item.attributes
  const series = [item.manufacturer, item.model].filter(Boolean).join(' ')
  if (item.kind === 'truss') {
    const shape = a.trussShape
    if (a.trussType?.startsWith('point')) {
      if (shape === 'corner' || shape === 'tee' || shape === 'cross' || shape === 'box') return { key: 'corners', title: 'Rohy, T a kríže', order: 2 }
      if (shape === 'circle') return { key: 'circles', title: 'Kruhy a oblúky', order: 3 }
      // Rovné diely zvlášť podľa série (napr. tenkostenný a heavy duty).
      return { key: `straight:${series}`, title: series ? `Rovné diely – ${series}` : 'Rovné diely', order: 1 }
    }
    if (a.trussType === 'ground_support') return { key: 'ground', title: 'Ground support', order: 4 }
    if (a.trussType === 'stand_lift') return { key: 'stands', title: 'Stojany a lifty', order: 5 }
    if (a.trussType === 'accessory') return { key: 'acc', title: 'Základne, spojky a príslušenstvo', order: 6 }
    return { key: 'other', title: 'Ostatné', order: 9 }
  }
  if (item.kind === 'stage') {
    if (a.stageType === 'deck') return { key: 'decks', title: 'Pódiové platne', order: 1 }
    if (a.stageType === 'accessory') return { key: 'acc', title: 'Nohy, zábradlia, schody a spojky', order: 2 }
    return { key: 'other', title: 'Ostatné', order: 9 }
  }
  // Svetlá podľa skupín (pohyblivé, statické, efektové…), ostatné podľa typu, inak kategórie.
  if (item.kind === 'light' && a.lightType) {
    const index = LIGHT_TYPE_GROUPS.findIndex((group) => (group.types as readonly string[]).includes(a.lightType!))
    if (index >= 0) return { key: `light:${index}`, title: LIGHT_TYPE_GROUPS[index].label, order: index }
  }
  if (item.kind === 'audio' && a.audioType) return { key: `audio:${a.audioType}`, title: AUDIO_TYPE_LABELS[a.audioType], order: AUDIO_TYPES.indexOf(a.audioType) }
  const typed =
    (item.kind === 'video' && a.videoType && VIDEO_TYPE_LABELS[a.videoType]) ||
    (item.kind === 'dj' && a.djType && DJ_TYPE_LABELS[a.djType]) ||
    (item.kind === 'it' && a.itType && IT_TYPE_LABELS[a.itType]) ||
    (item.kind === 'appliance' && a.applianceType && APPLIANCE_TYPE_LABELS[a.applianceType]) ||
    (item.kind === 'cable' && a.connector)
  if (typed) return { key: `type:${typed}`, title: typed, order: 1 }
  const category = categoryName(item.categoryId)
  return { key: `cat:${category}`, title: category || 'Ostatné', order: category ? 50 : 99 }
}

/** Krátky údaj pod názvom: rozmer platne, dĺžka dielu, tvar. */
function detailOf(item: Item) {
  const a = item.attributes
  return [a.stageSize, a.lengthM !== undefined && `${formatNumber(a.lengthM)} m`, a.trussShape && a.trussShape !== 'straight' && TRUSS_SHAPE_LABELS[a.trussShape]].filter(Boolean).join(' · ')
}

/** Rozmer na triedenie: dĺžka dielu, pri platni plocha zo „2×1 m“. */
function sizeOf(item: Item) {
  const a = item.attributes
  if (a.lengthM !== undefined) return a.lengthM
  const numbers = (a.stageSize ?? '').replace(/,/g, '.').match(/\d+(\.\d+)?/g)?.map(Number) ?? []
  return numbers.length >= 2 ? numbers[0] * numbers[1] : (numbers[0] ?? 0)
}

/**
 * Časti plagátu inventára pre jeden druh techniky: rovnaká technika (názov + údaj) sa zráta dokopy,
 * vyradená sa nepočíta. Väčšie diely sú v časti prvé.
 */
export function posterSections(items: Item[], kind: EquipmentKind, categoryName: (id: string | null) => string = () => ''): PosterSection[] {
  const sections = new Map<string, PosterSection & { order: number }>()
  for (const item of items) {
    if (item.kind !== kind || item.status === 'retired' || item.quantity <= 0) continue
    const section = sectionOf(item, categoryName)
    const detail = detailOf(item)
    const tileKey = `${item.name.trim().toLowerCase()}|${detail}`
    const current = sections.get(section.key) ?? { key: section.key, title: section.title, order: section.order, tiles: [], total: 0 }
    const tile = current.tiles.find((candidate) => candidate.key === tileKey)
    if (tile) {
      tile.count += item.quantity
      tile.ids.push(item.id)
      if (!tile.photoPath) tile.photoPath = item.photoPath
    } else {
      current.tiles.push({ key: tileKey, name: item.name.trim(), detail, count: item.quantity, photoPath: item.photoPath, ids: [item.id], sort: sizeOf(item) })
    }
    current.total += item.quantity
    sections.set(section.key, current)
  }
  return [...sections.values()]
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'sk'))
    .map(({ key, title, tiles, total }) => ({ key, title, total, tiles: tiles.sort((a, b) => b.sort - a.sort || a.name.localeCompare(b.name, 'sk')) }))
}
