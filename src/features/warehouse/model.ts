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

export type Warehouse = { lengthCm: number; widthCm: number; rackTypes?: RackType[] }

/** Typ regálu, ktorý firma používa (Nastavenia → Sklad): hĺbka a polia s policami. */
export type RackType = { id: string; name: string; depthCm: number; bays: RackBay[] }

/** Stojka medzi poliami (cm) – dĺžka regála = polia + stojky. */
export const POST_CM = 9
export const rackLengthCm = (bays: RackBay[]) => bays.reduce((sum, bay) => sum + bay.widthCm, 0) + POST_CM * (bays.length + 1)
export const rackHeightCm = (bays: RackBay[]) => Math.max(...bays.map((bay) => bay.levels.reduce((sum, level) => sum + level.heightCm + 12, 0)))

/** Miesto otočené o 90° okolo stredu (dĺžka ↔ šírka), aby ostalo v sklade. */
export function rotated(spot: Pick<Spot, 'x' | 'y' | 'length' | 'width'>, warehouse: Pick<Warehouse, 'lengthCm' | 'widthCm'>) {
  const length = spot.width
  const width = spot.length
  const x = Math.round(spot.x + (spot.length - length) / 2)
  const y = Math.round(spot.y + (spot.width - width) / 2)
  return {
    length,
    width,
    x: Math.max(0, Math.min(x, warehouse.lengthCm - length)),
    y: Math.max(0, Math.min(y, warehouse.widthCm - width)),
  }
}

/** Polica v poli regála (zdola nahor): svetlá výška a voliteľne koľko paliet na nej stojí. */
export type RackLevel = { heightCm: number; pallets?: number; palletAlign?: PalletAlign }
/** Palety rozložené rovnomerne, alebo natesno vedľa seba zľava / sprava (voľné miesto ostane na druhom kraji). */
export type PalletAlign = 'spread' | 'left' | 'right'
export const PALLET_ALIGN_LABELS: Record<PalletAlign, string> = { spread: 'rozložené', left: 'natesno zľava', right: 'natesno sprava' }

/** Ľavé okraje paliet na polici (cm od ľavej stojky). */
export function palletPositions(widthCm: number, level: RackLevel) {
  const count = level.pallets ?? 0
  if (count === 0) return []
  if (level.palletAlign === 'left') return Array.from({ length: count }, (_, index) => index * PALLET_CM)
  if (level.palletAlign === 'right') return Array.from({ length: count }, (_, index) => widthCm - (count - index) * PALLET_CM)
  const gap = Math.max(0, (widthCm - count * PALLET_CM) / (count + 1))
  return Array.from({ length: count }, (_, index) => gap + index * (PALLET_CM + gap))
}
/** Pole regála medzi dvoma stojkami (napr. 267 cm) s vlastnými policami. */
export type RackBay = { widthCm: number; levels: RackLevel[] }

/** Šírka europalety spredu (dlhšou stranou dozadu). */
export const PALLET_CM = 80
export const MAX_BAYS = 30
export const MAX_BAY_LEVELS = 10

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
  /** Polia regála (pohľad spredu); prázdne = jedno pole cez celú dĺžku s rovnakými policami. */
  bays?: RackBay[]
}

/** Case tak, ako ho potrebuje plán (rozmery v cm na výpočet, koľko sa kam zmestí). */
export type PlacedCase = {
  id: string
  name: string
  spotId: string | null
  spotLevel: number | null
  /** Pole regála (1, 2…); prázdne = prvé pole. */
  spotBay?: number | null
  /** Paleta na polici (1 = prvá zľava); prázdne = poskladá sa automaticky. */
  spotPallet?: number | null
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

/** „Regál A, 2. poschodie“, pri regáli s viacerými poliami „Regál A, pole 2, 3. polica“. */
export function describeSpot(spot: Pick<Spot, 'name' | 'levels' | 'bays'>, level: number | null, bay?: number | null) {
  if ((spot.bays?.length ?? 0) > 1) return [spot.name, `pole ${bay ?? 1}`, level && `${level}. polica`].filter(Boolean).join(', ')
  return spot.levels > 1 && level ? `${spot.name}, ${level}. poschodie` : spot.name
}

/** Polia regála; starý regál bez polí = jedno pole cez celú dĺžku s rovnakými policami. */
export function rackBays(spot: Pick<Spot, 'length' | 'levels' | 'levelHeightCm' | 'bays'>): RackBay[] {
  if (spot.bays && spot.bays.length > 0) return spot.bays
  return [{ widthCm: spot.length, levels: Array.from({ length: Math.max(1, spot.levels) }, () => ({ heightCm: spot.levelHeightCm ?? 100 })) }]
}

/** Upratané polia na uloženie (rozumné rozmery, aspoň jedna polica). */
export function cleanBays(bays: RackBay[]): RackBay[] {
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(value) || min)))
  return bays.slice(0, MAX_BAYS).map((bay) => ({
    widthCm: clamp(bay.widthCm, 20, 2000),
    levels: (bay.levels.length > 0 ? bay.levels : [{ heightCm: 100 }]).slice(0, MAX_BAY_LEVELS).map((level) => ({
      heightCm: clamp(level.heightCm, 5, 1000),
      ...(level.pallets ? { pallets: clamp(level.pallets, 0, 20) } : {}),
      ...(level.pallets && level.palletAlign && level.palletAlign !== 'spread' ? { palletAlign: level.palletAlign } : {}),
    })),
  }))
}

/** Cases na jednej polici jedného poľa. */
export function casesInCell<T extends PlacedCase>(cases: T[], bay: number, level: number) {
  return cases.filter((item) => (item.spotBay ?? 1) === bay && item.spotLevel === level)
}

/** Šírka case spredu (dĺžka pozdĺž police); bez rozmerov null. */
export const caseFrontCm = (item: Pick<PlacedCase, 'lengthCm' | 'widthCm'>) => item.lengthCm ?? item.widthCm ?? null

/**
 * Koľko miesta na polici zaberajú palety a cases spredu a koľko ostáva; koľko europaliet sa zmestí
 * (napr. 267 cm → 3 palety a 27 cm navyše) a čo je vyššie ako polica.
 */
export function cellUsage(bay: RackBay, level: RackLevel, cases: PlacedCase[]) {
  const casesCm = cases.reduce((sum, item) => sum + (caseFrontCm(item) ?? 0), 0)
  const palletsCm = (level.pallets ?? 0) * PALLET_CM
  // Cases na paletách sú na nich, inak vedľa seba na polici.
  const usedCm = Math.max(casesCm, palletsCm)
  return {
    usedCm,
    freeCm: bay.widthCm - usedCm,
    palletFit: Math.floor(bay.widthCm / PALLET_CM),
    palletRest: bay.widthCm - Math.floor(bay.widthCm / PALLET_CM) * PALLET_CM,
    unknown: cases.filter((item) => caseFrontCm(item) === null).length,
    tooTall: cases.filter((item) => item.depthCm && item.depthCm > level.heightCm),
  }
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

/** Výška europalety (cm). */
export const PALLET_H_CM = 14
/** Case bez rozmerov sa kreslí takto veľký (cm spredu). */
export const UNKNOWN_FRONT_CM = 60

/** Case poskladaný na polici: x zľava od stojky, bottom od nosníka nahor (cm), na ktorej palete. */
export type CellBox<T extends PlacedCase = PlacedCase> = {
  item: T
  x: number
  bottom: number
  w: number
  h: number
  pallet: number | null
  /** Rozmery case sú zadané. */
  known: boolean
  /** Nezmestí sa (presahuje paletu, policu alebo je vyšší ako polica). */
  bad: boolean
}

type Slot = { x: number; w: number; base: number; pallet: number | null; rows: { y: number; h: number; used: number }[] }

/**
 * Poskladá cases na polici: na palety (ručne zvolenú, inak prvú, kde je miesto), keď sa nezmestia, tak vedľa paliet;
 * na polici bez paliet zľava doprava. Keď je rad plný, ďalšie cases idú na ne (ak to výška police dovolí).
 */
export function layoutCell<T extends PlacedCase>(bay: RackBay, level: RackLevel, cases: T[]) {
  const positions = palletPositions(bay.widthCm, level)
  const slots: Slot[] = positions.map((x, index) => ({ x, w: PALLET_CM, base: PALLET_H_CM, pallet: index + 1, rows: [] }))
  // Miesto vedľa paliet (aspoň 20 cm), na polici bez paliet celá šírka.
  const edges = [0, ...positions.flatMap((x) => [x, x + PALLET_CM]), bay.widthCm]
  for (let index = 0; index < edges.length; index += 2) {
    const width = edges[index + 1] - edges[index]
    if (width >= 20) slots.push({ x: edges[index], w: width, base: 0, pallet: null, rows: [] })
  }
  if (slots.length === 0) slots.push({ x: 0, w: bay.widthCm, base: 0, pallet: null, rows: [] })

  const size = (item: T) => {
    const front = caseFrontCm(item)
    return { w: front ?? UNKNOWN_FRONT_CM, h: item.depthCm ?? Math.min(50, Math.max(10, level.heightCm * 0.5)), known: front !== null }
  }
  // Skúsi case položiť do slotu: do posledného radu, inak nový rad navrch.
  const tryPut = (slot: Slot, w: number, h: number) => {
    if (w > slot.w) return null
    const row = slot.rows.at(-1)
    if (row && row.used + w <= slot.w && slot.base + row.y + h <= level.heightCm) {
      const box = { x: slot.x + row.used, bottom: slot.base + row.y }
      row.used += w
      row.h = Math.max(row.h, h)
      return box
    }
    const y = row ? row.y + row.h : 0
    if (slot.base + y + h > level.heightCm) return null
    slot.rows.push({ y, h, used: w })
    return { x: slot.x, bottom: slot.base + y }
  }
  // Keď sa nikde nezmestí: navrch slotu, vycentrované, označené.
  const force = (slot: Slot, w: number, h: number) => {
    const row = slot.rows.at(-1)
    const y = row ? row.y + row.h : 0
    slot.rows.push({ y, h, used: slot.w })
    return { x: slot.x + (slot.w - w) / 2, bottom: slot.base + y }
  }

  const boxes: CellBox<T>[] = []
  const failed: { item: T; slot: Slot }[] = []
  const manual = cases.filter((item) => item.spotPallet && item.spotPallet <= positions.length)
  for (const item of [...manual, ...cases.filter((item) => !manual.includes(item))]) {
    const { w, h, known } = size(item)
    const candidates = manual.includes(item) ? [slots[item.spotPallet! - 1]] : slots
    const slot = candidates.find((candidate) => {
      const put = tryPut(candidate, w, h)
      if (put) boxes.push({ item, ...put, w, h, pallet: candidate.pallet, known, bad: false })
      return Boolean(put)
    })
    if (!slot) failed.push({ item, slot: manual.includes(item) ? candidates[0] : slots.reduce((best, candidate) => (candidate.rows.length < best.rows.length ? candidate : best)) })
  }
  // Čo sa nezmestilo, ide navrch až nakoniec, aby nezabralo miesto ostatným.
  for (const { item, slot } of failed) {
    const { w, h, known } = size(item)
    boxes.push({ item, ...force(slot, w, h), w, h, pallet: slot.pallet, known, bad: true })
  }
  boxes.sort((a, b) => cases.indexOf(a.item) - cases.indexOf(b.item))
  // Voľné miesto spredu: čo ostalo v spodnom rade na paletách a vedľa nich.
  const freeCm = Math.round(slots.reduce((sum, slot) => sum + slot.w - (slot.rows[0]?.used ?? 0), 0))
  return { boxes, pallets: positions, freeCm, notFit: boxes.filter((box) => box.bad).map((box) => box.item) }
}
