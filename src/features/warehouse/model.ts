// Plán skladu: pôdorys s miestami (regál, paleta, zóna) a cases, ktoré na nich ležia.
// Zodpovedá 0032_warehouse.sql. Súradnice v cm, x zľava doprava, y zhora nadol.

export const SPOT_KINDS = ['rack', 'pallet', 'zone', 'column', 'wall', 'door', 'window'] as const
export type SpotKind = (typeof SPOT_KINDS)[number]

export const SPOT_KIND_LABELS: Record<SpotKind, string> = {
  rack: 'Regál',
  pallet: 'Paleta',
  zone: 'Zóna',
  column: 'Stĺp',
  wall: 'Stena / priečka',
  door: 'Dvere / brána',
  window: 'Okno',
}
export const SPOT_KIND_FILLS: Record<SpotKind, string> = {
  rack: '#1d4ed8',
  pallet: '#a16207',
  zone: '#4d7c0f',
  column: '#52525b',
  wall: '#27272a',
  door: '#ea580c',
  window: '#0ea5e9',
}

/** Stavebné prvky (stĺp, stena, dvere, okno) – nie sú miestom na cases. */
export const isStructure = (kind: SpotKind) => kind === 'column' || kind === 'wall' || kind === 'door' || kind === 'window'

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
  /** Výška jedného poschodia regála (cm) – na kontrolu, či sa case zmestí na výšku. */
  levelHeightCm?: number | null
  note?: string
}

/** Case tak, ako ho potrebuje plán (rozmery v cm na výpočet, koľko sa kam zmestí). */
export type PlacedCase = {
  id: string
  name: string
  spotId: string | null
  spotLevel: number | null
  inventoryNumber?: string
  labelNumber?: string
  oldNumbers?: string
  widthCm?: number | null
  lengthCm?: number | null
  depthCm?: number | null
}

/**
 * Obsadenosť poschodia: plocha, ktorú zaberajú cases (šírka × dĺžka), oproti ploche miesta, a ktoré cases sú
 * vyššie (hĺbka case) ako poschodie. Cases bez rozmerov sa len spočítajú.
 */
export function levelUsage(spot: Pick<Spot, 'length' | 'width' | 'levelHeightCm'>, cases: PlacedCase[]) {
  const area = spot.length * spot.width
  const sized = cases.filter((item) => item.widthCm && item.lengthCm)
  const used = sized.reduce((sum, item) => sum + item.widthCm! * item.lengthCm!, 0)
  const tooTall = spot.levelHeightCm ? cases.filter((item) => item.depthCm && item.depthCm > spot.levelHeightCm!) : []
  return {
    percent: area > 0 ? Math.round((used / area) * 100) : 0,
    freeM2: Math.max(0, (area - used) / 10_000),
    unknown: cases.length - sized.length,
    tooTall,
  }
}

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
  if (!wanted) return []
  // Názov, označenie, číslo na štítku aj staré čísla; číslo musí sedieť celé (napr. „4“ nenájde „14“).
  const numberHit = (value: string | undefined) => (value ?? '').split(/[\s,;/]+/).some((part) => part && plain(part) === wanted)
  return cases.filter((item) => plain(item.name).includes(wanted) || numberHit(item.inventoryNumber) || numberHit(item.labelNumber) || numberHit(item.oldNumbers))
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
