// Plán skladu: pôdorys s miestami (regál, paleta, zóna) a cases, ktoré na nich ležia.
// Zodpovedá 0032_warehouse.sql. Súradnice v cm, x zľava doprava, y zhora nadol.

export const SPOT_KINDS = ['rack', 'pallet', 'zone'] as const
export type SpotKind = (typeof SPOT_KINDS)[number]

export const SPOT_KIND_LABELS: Record<SpotKind, string> = { rack: 'Regál', pallet: 'Paleta', zone: 'Zóna' }
export const SPOT_KIND_FILLS: Record<SpotKind, string> = { rack: '#1d4ed8', pallet: '#a16207', zone: '#4d7c0f' }

export type Warehouse = { lengthCm: number; widthCm: number }

export type Spot = {
  id: string
  name: string
  kind: SpotKind
  x: number
  y: number
  length: number
  width: number
  /** Počet poschodí; viac než jedno má zmysel len pri regáli. */
  levels: number
}

/** Case tak, ako ho potrebuje plán. */
export type PlacedCase = { id: string; name: string; spotId: string | null; spotLevel: number | null }

/** Cases podľa miesta; kľúč je id miesta. Cases bez miesta tu nie sú. */
export function casesBySpot<T extends PlacedCase>(cases: T[]) {
  const map = new Map<string, T[]>()
  for (const item of cases) {
    if (item.spotId) map.set(item.spotId, [...(map.get(item.spotId) ?? []), item])
  }
  return map
}

/** Cases jedného miesta rozdelené po poschodiach zhora nadol; bez poschodia idú na koniec (level = null). */
export function byLevel<T extends PlacedCase>(spot: Pick<Spot, 'levels'>, cases: T[]) {
  const groups: { level: number | null; cases: T[] }[] = []
  for (let level = spot.levels; level >= 1; level--) {
    const onLevel = cases.filter((item) => item.spotLevel === level)
    if (onLevel.length > 0 || spot.levels > 1) groups.push({ level, cases: onLevel })
  }
  const loose = cases.filter((item) => item.spotLevel === null || item.spotLevel > spot.levels || item.spotLevel < 1)
  if (loose.length > 0) groups.push({ level: null, cases: loose })
  return groups
}

/** „Regál A, 2. poschodie“ */
export function describeSpot(spot: Pick<Spot, 'name' | 'levels'>, level: number | null) {
  return spot.levels > 1 && level ? `${spot.name}, ${level}. poschodie` : spot.name
}

/** Cases, ktorých názov obsahuje hľadaný text (bez ohľadu na veľkosť písmen a diakritiku). */
export function findCases<T extends PlacedCase>(cases: T[], search: string) {
  const plain = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const wanted = plain(search.trim())
  return wanted ? cases.filter((item) => plain(item.name).includes(wanted)) : []
}

/** Rozmer v metroch na jedno desatinné miesto: 1250 → „12,5 m“. */
export const metres = (cm: number) => `${String(Math.round(cm / 10) / 10).replace('.', ',')} m`

/** Meno pre nové miesto, ktoré na pláne ešte nie je: „Miesto 3“. */
export function nextSpotName(spots: Pick<Spot, 'name'>[]) {
  for (let number = spots.length + 1; ; number++) {
    const name = `Miesto ${number}`
    if (!spots.some((spot) => spot.name === name)) return name
  }
}
