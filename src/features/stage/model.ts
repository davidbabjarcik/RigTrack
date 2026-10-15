import { z } from 'zod'

// ---------------------------------------------------------------------------
// Nastavenie pódiového systému (Nivtec): z čoho sa pódium skladá a ku ktorej
// technike v evidencii patrí každý diel. Prázdne equipmentId = diel sa ráta,
// ale nepáruje sa s technikou (nedá sa skontrolovať, koľko ho máme).
//
// Ako Nivtec funguje (podľa výrobcu a praxe):
// - dosky sa spájajú do seba perom a drážkou s brzdou, spojky netreba;
//   pero má smerovať dozadu a doprava pri pohľade zhora, aby do seba zapadli,
// - nohy sú v rohoch dosiek a susedné dosky sa delia o spoločnú nohu
//   (tabuľka nôh: pole 2 × 1 m → (šírka + 1) × (hĺbka / 2 + 1) nôh),
// - na okrajoch sú lišty: na strane s perom (vzadu, vpravo) iné ako na strane s drážkou
//   (vpredu, vľavo); lišta musí sedieť na jednu dosku, 2 m lišta nejde cez dve 1 m dosky,
// - schody sú stupne z dosiek (napr. 1 × 0,5 m), každý o 20 cm vyšší,
// - od výšky 80 cm treba diagonálne výstuhy („vrtule“).
// ---------------------------------------------------------------------------

const part = z.object({ equipmentId: z.string() })
const ratio = z.number().min(0).max(50)
const meters = z.number().min(0.25).max(10)

export const ACCESSORY_BASES = ['deck', 'leg', 'railing', 'railingJoint', 'railingCorner', 'stairs', 'stage'] as const
export type AccessoryBasis = (typeof ACCESSORY_BASES)[number]
export const BASIS_LABELS: Record<AccessoryBasis, string> = {
  deck: 'na dosku',
  leg: 'na nohu',
  railing: 'na diel zábradlia',
  railingJoint: 'na spoj zábradlia',
  railingCorner: 'na roh zábradlia',
  stairs: 'na schody',
  stage: 'na celé pódium',
}

/** Profil hrany dosky: pero (vzadu a vpravo) alebo drážka (vpredu a vľavo). */
export const PROFILES = ['tongue', 'groove'] as const
export type Profile = (typeof PROFILES)[number]
export const PROFILE_LABELS: Record<Profile, string> = { tongue: 'na pero', groove: 'na drážku' }

const deckShape = part.extend({
  id: z.string().min(1).max(40),
  label: z.string().trim().max(60),
  /** Rozmer v metroch; šírka je dlhšia strana. */
  widthM: meters,
  depthM: meters,
  /** Trojuholník sa do obdĺžnika neskladá; pridáva sa ručne ako ďalšia doska. */
  triangle: z.boolean(),
  /** Koľko nôh potrebuje doska, keď stojí samostatne (trojuholník 3). */
  legs: z.number().int().min(1).max(8),
})
export type DeckType = z.infer<typeof deckShape>

const configShape = {
  name: z.string().trim().max(60),
  /** Druhy dosiek; prvá obdĺžniková je hlavná (ňou sa pokrýva väčšina pódia). */
  decks: z.array(deckShape).min(1).max(20),
  /** Nohy podľa výslednej výšky (pódia alebo stupňa schodov). */
  legs: z.array(part.extend({ heightCm: z.number().int().min(1).max(500) })).max(30),
  /** Plachty podľa toho, akú dĺžku hrany kryjú (2 m / 1 m); výška 0 = na každú výšku. */
  skirts: z.array(part.extend({ coversM: meters, heightCm: z.number().int().min(0).max(500) })).max(20),
  /** Štipce (lístky) na plachtu: koľko na meter plachty. */
  skirtClip: part.extend({ perMeter: ratio }),
  /** Lišty na okraje podľa profilu a dĺžky. */
  laths: z.array(part.extend({ profile: z.enum(PROFILES), lengthM: meters, label: z.string().trim().max(60) })).max(20),
  /** Diely zábradlia podľa dĺžky hrany, ktorú kryjú (napr. 185 × 100 kryje 2 m). */
  railings: z.array(part.extend({ coversM: meters, label: z.string().trim().max(40) })).max(20),
  /** Diagonálne výstuhy („vrtule“) podľa dĺžky poľa a rozsahu výšky pódia. */
  diagonals: z
    .array(
      part.extend({
        fieldM: meters,
        minHeightCm: z.number().int().min(0).max(500),
        maxHeightCm: z.number().int().min(0).max(500),
        label: z.string().trim().max(60),
      }),
    )
    .max(20),
  /** Výstuha do každého N-tého poľa po obvode (1 = každé pole). */
  diagonalEvery: z.number().int().min(1).max(10),
  stairs: z.object({
    /** Z ktorej dosky sú stupne (id z decks). */
    stepDeckId: z.string(),
    stairLeg: part,
    railing: part,
    /** Spojky schodov k pódiu, keď posledný stupeň končí pod úrovňou pódia (110 mm). */
    connector: part.extend({ perStairs: ratio }),
  }),
  /** Pojazdný rizer: namiesto nohy noha s kolieskom (jedna v každom rohu dosiek). */
  riserWheel: part.extend({ label: z.string().trim().max(60) }),
  /** Ďalšie drobnosti (čapové spojky, podložky, rohové spojky…) a podľa čoho sa rátajú. */
  accessories: z
    .array(part.extend({ label: z.string().trim().min(1).max(80), basis: z.enum(ACCESSORY_BASES), quantity: ratio }))
    .max(40),
}
export const stageConfigSchema = z.object(configShape)
export type StageConfig = z.infer<typeof stageConfigSchema>

const none = { equipmentId: '' }
const deck = (id: string, label: string, widthM: number, depthM: number, triangle = false): DeckType => ({
  id,
  label,
  widthM,
  depthM,
  triangle,
  legs: triangle ? 3 : 4,
  equipmentId: '',
})

export const DEFAULT_STAGE_CONFIG: StageConfig = {
  name: 'Nivtec',
  decks: [
    deck('d2x1', 'Doska 2 × 1 m', 2, 1),
    deck('d1x1', 'Doska 1 × 1 m', 1, 1),
    deck('d1x05', 'Doska 1 × 0,5 m', 1, 0.5),
    deck('tri', 'Trojuholník', 2, 1, true),
  ],
  legs: [20, 40, 60, 80, 100].map((heightCm) => ({ heightCm, equipmentId: '' })),
  skirts: [
    { coversM: 2, heightCm: 0, equipmentId: '' },
    { coversM: 1, heightCm: 0, equipmentId: '' },
  ],
  skirtClip: { equipmentId: '', perMeter: 3 },
  laths: [
    { profile: 'groove', lengthM: 2, label: 'Výplňová lišta pre drážku 2 m', equipmentId: '' },
    { profile: 'groove', lengthM: 1, label: 'Výplňová lišta pre drážku 1 m', equipmentId: '' },
    { profile: 'tongue', lengthM: 2, label: 'Adaptérová lišta pre pero 2 m', equipmentId: '' },
    { profile: 'tongue', lengthM: 1, label: 'Adaptérová lišta pre pero 1 m', equipmentId: '' },
  ],
  railings: [
    { coversM: 2, label: '185 × 100', equipmentId: '' },
    { coversM: 1, label: '85 × 100', equipmentId: '' },
  ],
  diagonals: [
    { fieldM: 2, minHeightCm: 80, maxHeightCm: 100, label: 'Výstuha pole 200/185, výška 80–100', equipmentId: '' },
    { fieldM: 2, minHeightCm: 101, maxHeightCm: 140, label: 'Výstuha pole 200/185, výška 100–140', equipmentId: '' },
    { fieldM: 1, minHeightCm: 80, maxHeightCm: 100, label: 'Výstuha pole 100/85, výška 80–100', equipmentId: '' },
    { fieldM: 1, minHeightCm: 101, maxHeightCm: 140, label: 'Výstuha pole 100/85, výška 100–140', equipmentId: '' },
  ],
  diagonalEvery: 1,
  stairs: { stepDeckId: 'd1x05', stairLeg: none, railing: none, connector: { equipmentId: '', perStairs: 2 } },
  riserWheel: { equipmentId: '', label: 'Noha s kolieskom' },
  accessories: [
    { label: 'Čapová spojka pre zábradlie', basis: 'railing', quantity: 2, equipmentId: '' },
    { label: 'Podložka pre čapovú spojku', basis: 'railing', quantity: 2, equipmentId: '' },
    { label: 'Vložka so závitom pre čapovú spojku', basis: 'railing', quantity: 2, equipmentId: '' },
    { label: 'Spojka pre zábradlie', basis: 'railingJoint', quantity: 1, equipmentId: '' },
    { label: 'Rohová spojka pre zábradlie', basis: 'railingCorner', quantity: 2, equipmentId: '' },
  ],
}

/**
 * Uložené nastavenie doplnené o predvolené hodnoty. Každá časť sa overuje zvlášť,
 * takže poškodená alebo zastaraná časť sa nahradí predvolenou a ostatné ostanú.
 * Staršie nastavenie s doskami deck2x1/deck1x1 sa prevedie na zoznam dosiek.
 */
export function readStageConfig(raw: unknown): StageConfig {
  const source = { ...(raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) }
  if (!source.decks && (source.deck2x1 || source.deck1x1)) {
    const id = (key: string) => ((source[key] as { equipmentId?: unknown } | undefined)?.equipmentId as string) ?? ''
    source.decks = DEFAULT_STAGE_CONFIG.decks.map((item) =>
      item.id === 'd2x1' ? { ...item, equipmentId: id('deck2x1') } : item.id === 'd1x1' ? { ...item, equipmentId: id('deck1x1') } : item,
    )
  }
  const result: Record<string, unknown> = {}
  for (const [key, schema] of Object.entries(configShape)) {
    const parsed = schema.safeParse(source[key])
    result[key] = parsed.success ? parsed.data : DEFAULT_STAGE_CONFIG[key as keyof StageConfig]
  }
  return result as StageConfig
}

/** Nové id druhu dosky, ktoré ešte nie je v zozname. */
export function newDeckId(decks: DeckType[]) {
  let n = decks.length + 1
  while (decks.some((item) => item.id === `deck${n}`)) n++
  return `deck${n}`
}

// ---------------------------------------------------------------------------
// Výpočet
// ---------------------------------------------------------------------------

export const SIDES = ['front', 'back', 'left', 'right'] as const
export type Side = (typeof SIDES)[number]
export const SIDE_LABELS: Record<Side, string> = { front: 'predná', back: 'zadná', left: 'ľavá', right: 'pravá' }
/** Pero smeruje dozadu a doprava, drážka je vpredu a vľavo. */
export const SIDE_PROFILE: Record<Side, Profile> = { back: 'tongue', right: 'tongue', front: 'groove', left: 'groove' }

export type Orientation = 'auto' | 'wide' | 'deep'

/** Schody: na ktorej strane a kde (metre od ľavého, resp. predného rohu). */
export type Stairs = { side: Side; positionM: number }

/** Molo: výbežok z pódia (napr. dopredu do publika) v rovnakej výške. */
export type Catwalk = { side: Side; positionM: number; widthM: number; lengthM: number; skirt: boolean }

/** Rizer: menšie vyvýšenie na pódiu (napr. pre bicie), pevné na nohách alebo na kolieskach. */
export type Riser = { widthM: number; depthM: number; heightCm: number; wheels: boolean; skirt: boolean; xM: number; yM: number }

export type StageRequest = {
  /** Šírka (pozdĺž prednej hrany) a hĺbka v metroch, po 0,5 m. */
  widthM: number
  depthM: number
  heightCm: number
  orientation: Orientation
  skirtSides: Side[]
  railingSides: Side[]
  /** Strany, na ktoré idú lišty (profil podľa strany). */
  lathSides: Side[]
  stairs: Stairs[]
  /** Posledný stupeň na úrovni pódia (inak o 20 cm nižšie, pripojený spojkami). */
  stairsToTop: boolean
  /** Zábradlie na schodoch: 0, 1 alebo 2 strany. */
  stairsRailingSides: number
  /** Dosky navyše, ktoré sa do obdĺžnika neskladajú (trojuholníky a pod.). */
  extraDecks: { deckId: string; count: number }[]
  catwalk: Catwalk | null
  risers: Riser[]
}

/** Doska v pôdoryse; x doprava od ľavého predného rohu, y dozadu, v metroch. */
export type Deck = { x: number; y: number; w: number; d: number; typeId: string }
/** Úsek hrany pódia (od–do v metroch pozdĺž strany). */
export type Segment = { side: Side; fromM: number; toM: number }

export type StageLine = { key: string; label: string; quantity: number; equipmentId: string; group: string }

export type StagePlan = {
  decks: Deck[]
  orientation: 'wide' | 'deep'
  lines: StageLine[]
  warnings: string[]
  tips: string[]
  skirtSegments: Segment[]
  railingSegments: Segment[]
  lathEdges: Segment[]
  stairs: (Stairs & { steps: number; widthM: number; stepDepthM: number })[]
  /** Dosky mola v súradniciach pódia (môžu byť mimo neho, napr. pred prednou hranou). */
  catwalkDecks: Deck[]
  risers: (Riser & { decks: Deck[] })[]
  skirtMeters: number
  railingMeters: number
}

export const MAX_STAGE_M = 30
export const STEP_RISE_CM = 20
const GRID = 0.5
const EPS = 1e-9

/** Obdĺžnikové dosky od najväčšej; hlavná je prvá obdĺžniková v nastavení. */
function rectDecks(config: StageConfig) {
  const rects = config.decks.filter((item) => !item.triangle)
  const [main, ...rest] = rects
  return { main, fillers: rest.sort((a, b) => b.widthM * b.depthM - a.widthM * a.depthM) }
}

/**
 * Rozloženie dosiek na mriežke po 0,5 m: v každom voľnom mieste (odpredu, zľava) sa položí
 * najväčšia doska, ktorá sa zmestí. Hlavná doska je vždy otočená rovnako (kvôli peru),
 * menšie dosky sa môžu otočiť.
 */
function layout(widthM: number, depthM: number, orientation: 'wide' | 'deep', config: StageConfig): Deck[] {
  const { main, fillers } = rectDecks(config)
  if (!main) return []
  const nx = Math.round(widthM / GRID)
  const ny = Math.round(depthM / GRID)
  const taken: boolean[][] = Array.from({ length: nx }, () => Array<boolean>(ny).fill(false))
  const decks: Deck[] = []
  const long = (item: DeckType) => Math.max(item.widthM, item.depthM)
  const short = (item: DeckType) => Math.min(item.widthM, item.depthM)
  const oriented = (item: DeckType, wide: boolean) => (wide ? [long(item), short(item)] : [short(item), long(item)])
  const candidates: [DeckType, number, number][] = [
    [main, ...oriented(main, orientation === 'wide')] as [DeckType, number, number],
    ...fillers.flatMap((item) => [
      [item, ...oriented(item, orientation === 'wide')] as [DeckType, number, number],
      [item, ...oriented(item, orientation !== 'wide')] as [DeckType, number, number],
    ]),
  ]
  const fits = (cx: number, cy: number, w: number, d: number) => {
    const cw = Math.round(w / GRID)
    const cd = Math.round(d / GRID)
    if (cx + cw > nx || cy + cd > ny) return false
    for (let x = cx; x < cx + cw; x++) for (let y = cy; y < cy + cd; y++) if (taken[x][y]) return false
    return true
  }
  for (let cy = 0; cy < ny; cy++) {
    for (let cx = 0; cx < nx; cx++) {
      if (taken[cx][cy]) continue
      const choice = candidates.find(([, w, d]) => fits(cx, cy, w, d))
      if (!choice) continue
      const [type, w, d] = choice
      for (let x = cx; x < cx + Math.round(w / GRID); x++) for (let y = cy; y < cy + Math.round(d / GRID); y++) taken[x][y] = true
      decks.push({ x: cx * GRID, y: cy * GRID, w, d, typeId: type.id })
    }
  }
  return decks
}

const isMain = (deck: Deck, config: StageConfig) => deck.typeId === rectDecks(config).main?.id
const fillerCount = (decks: Deck[], config: StageConfig) => decks.filter((deck) => !isMain(deck, config)).length
const covered = (decks: Deck[]) => decks.reduce((sum, deck) => sum + deck.w * deck.d, 0)

/** Nohy: v každom rohu dosky jedna, susedné dosky sa o spoločný roh delia. */
export function legPoints(decks: Pick<Deck, 'x' | 'y' | 'w' | 'd'>[]) {
  const points = new Set<string>()
  for (const deck of decks) {
    for (const [x, y] of [
      [deck.x, deck.y],
      [deck.x + deck.w, deck.y],
      [deck.x, deck.y + deck.d],
      [deck.x + deck.w, deck.y + deck.d],
    ]) {
      points.add(`${x},${y}`)
    }
  }
  return points.size
}

/** Hrany dosiek po obvode pódia: strana, poloha a dĺžka každej (pole pre výstuhu, miesto pre lištu). */
export function perimeterEdges(decks: Deck[], widthM: number, depthM: number): Segment[] {
  const edges: Segment[] = []
  for (const deck of decks) {
    if (deck.y < EPS) edges.push({ side: 'front', fromM: deck.x, toM: deck.x + deck.w })
    if (Math.abs(deck.y + deck.d - depthM) < EPS) edges.push({ side: 'back', fromM: deck.x, toM: deck.x + deck.w })
    if (deck.x < EPS) edges.push({ side: 'left', fromM: deck.y, toM: deck.y + deck.d })
    if (Math.abs(deck.x + deck.w - widthM) < EPS) edges.push({ side: 'right', fromM: deck.y, toM: deck.y + deck.d })
  }
  return edges
}

/** Pokrytie dĺžky dielmi: od najdlhšieho, zvyšok najkratším dielom, ktorý stačí. */
export function coverLength(lengthM: number, sizes: number[]): Map<number, number> {
  const sorted = [...new Set(sizes)].filter((size) => size > 0).sort((a, b) => b - a)
  const pieces = new Map<number, number>()
  if (sorted.length === 0 || lengthM <= EPS) return pieces
  let rest = lengthM
  for (const size of sorted) {
    const count = Math.floor((rest + EPS) / size)
    if (count > 0) {
      pieces.set(size, (pieces.get(size) ?? 0) + count)
      rest -= count * size
    }
  }
  if (rest > EPS) {
    const fit = [...sorted].reverse().find((size) => size >= rest) ?? sorted[0]
    pieces.set(fit, (pieces.get(fit) ?? 0) + 1)
  }
  return pieces
}

/** Presné poskladanie dĺžky z kratších kusov (bez presahu); null, ak sa nedá. */
export function exactPieces(lengthM: number, sizes: number[]): Map<number, number> | null {
  const sorted = [...new Set(sizes)].filter((size) => size > 0 && size <= lengthM + EPS).sort((a, b) => b - a)
  const pieces = new Map<number, number>()
  let rest = lengthM
  for (const size of sorted) {
    const count = Math.floor((rest + EPS) / size)
    if (count > 0) {
      pieces.set(size, count)
      rest -= count * size
    }
  }
  return rest > EPS ? null : pieces
}

export const sideLength = (side: Side, widthM: number, depthM: number) => (side === 'front' || side === 'back' ? widthM : depthM)

/** Strana bez otvorov pre schody: zvyšné úseky. */
export function openSegments(side: Side, length: number, stairs: (Stairs & { widthM: number })[]): Segment[] {
  const gaps = stairs
    .filter((item) => item.side === side)
    .map((item) => [item.positionM, item.positionM + item.widthM] as const)
    .sort((a, b) => a[0] - b[0])
  const segments: Segment[] = []
  let from = 0
  for (const [start, end] of gaps) {
    if (start > from + EPS) segments.push({ side, fromM: from, toM: Math.min(start, length) })
    from = Math.max(from, end)
  }
  if (length > from + EPS) segments.push({ side, fromM: from, toM: length })
  return segments
}

/** Ktoré rohy patria ku ktorým stranám: [strana A, koniec A, strana B, koniec B]. */
const CORNERS: [Side, 'start' | 'end', Side, 'start' | 'end'][] = [
  ['front', 'start', 'left', 'start'],
  ['front', 'end', 'right', 'start'],
  ['back', 'start', 'left', 'end'],
  ['back', 'end', 'right', 'end'],
]

const formatM = (value: number) => `${String(value).replace('.', ',')} m`

/** Celý výpočet pódia: rozloženie dosiek, nohy, lišty, plachty, zábradlie, schody, výstuhy a drobnosti. */
export function planStage(request: StageRequest, config: StageConfig): StagePlan {
  const { widthM, depthM, heightCm } = request
  const warnings: string[] = []
  const wide = layout(widthM, depthM, 'wide', config)
  const deep = layout(widthM, depthM, 'deep', config)
  const orientation =
    request.orientation === 'auto' ? (fillerCount(deep, config) < fillerCount(wide, config) ? 'deep' : 'wide') : request.orientation
  const decks = orientation === 'wide' ? wide : deep
  if (Math.abs(covered(decks) - widthM * depthM) > EPS) warnings.push('Z nastavených dosiek sa celé pódium poskladať nedá; pridajte menšiu dosku.')
  const lines: StageLine[] = []
  const add = (key: string, group: string, label: string, quantity: number, equipmentId: string) => {
    if (quantity <= 0) return
    const existing = lines.find((line) => line.key === key)
    if (existing) existing.quantity += Math.ceil(quantity - EPS)
    else lines.push({ key, group, label, quantity: Math.ceil(quantity - EPS), equipmentId })
  }
  const legItem = (height: number) => config.legs.find((leg) => leg.heightCm === height)
  const addLegs = (height: number, count: number) => {
    if (!legItem(height) && config.legs.length > 0) warnings.push(`V nastavení nie sú nohy ${height} cm.`)
    add(`leg-${height}`, 'Nohy', `Noha ${height} cm`, count, legItem(height)?.equipmentId ?? '')
  }
  const deckType = (id: string) => config.decks.find((item) => item.id === id)

  // Molo: rozloženie dosiek v jeho vlastnom smere (dlhšou stranou von z pódia), potom do súradníc pódia.
  const catwalk = request.catwalk
  let catwalkDecks: Deck[] = []
  let catwalkFields: number[] = []
  if (catwalk) {
    const along = sideLength(catwalk.side, widthM, depthM)
    if (catwalk.positionM < 0 || catwalk.positionM + catwalk.widthM > along + EPS) warnings.push('Molo je mimo hrany pódia.')
    const local = layout(catwalk.widthM, catwalk.lengthM, 'deep', config)
    if (Math.abs(covered(local) - catwalk.widthM * catwalk.lengthM) > EPS) warnings.push('Z nastavených dosiek sa molo poskladať nedá.')
    const p = catwalk.positionM
    catwalkDecks = local.map((deck) => {
      if (catwalk.side === 'front') return { ...deck, x: p + deck.x, y: -(deck.y + deck.d) }
      if (catwalk.side === 'back') return { ...deck, x: p + deck.x, y: depthM + deck.y }
      if (catwalk.side === 'left') return { ...deck, x: -(deck.y + deck.d), y: p + deck.x, w: deck.d, d: deck.w }
      return { ...deck, x: widthM + deck.y, y: p + deck.x, w: deck.d, d: deck.w }
    })
    // Polia po obvode mola okrem strany pripojenej k pódiu.
    catwalkFields = perimeterEdges(local, catwalk.widthM, catwalk.lengthM)
      .filter((edge) => edge.side !== 'front')
      .map((edge) => edge.toM - edge.fromM)
  }

  // Rizery: vlastné malé pódiá na pódiu.
  const risers = request.risers.map((riser) => {
    if (riser.xM < 0 || riser.yM < 0 || riser.xM + riser.widthM > widthM + EPS || riser.yM + riser.depthM > depthM + EPS) {
      warnings.push('Rizer presahuje pódium.')
    }
    const riserDecks = layout(riser.widthM, riser.depthM, 'wide', config).map((deck) => ({ ...deck, x: riser.xM + deck.x, y: riser.yM + deck.y }))
    if (Math.abs(covered(riserDecks) - riser.widthM * riser.depthM) > EPS) warnings.push('Z nastavených dosiek sa rizer poskladať nedá.')
    return { ...riser, decks: riserDecks }
  })

  // Dosky a nohy (pódium aj molo stoja na spoločných nohách, rizery majú vlastné)
  const allDecks = [...decks, ...catwalkDecks, ...risers.flatMap((riser) => riser.decks)]
  for (const type of config.decks) {
    add(`deck-${type.id}`, 'Dosky', type.label || `Doska ${formatM(type.widthM)} × ${formatM(type.depthM)}`, allDecks.filter((item) => item.typeId === type.id).length, type.equipmentId)
  }
  const stageLegs = legPoints([...decks, ...catwalkDecks])
  addLegs(heightCm, stageLegs)
  let legs = stageLegs
  for (const riser of risers) {
    const points = legPoints(riser.decks)
    legs += points
    if (riser.wheels) add('riserWheel', 'Rizery', config.riserWheel.label || 'Noha s kolieskom', points, config.riserWheel.equipmentId)
    else addLegs(riser.heightCm, points)
  }
  let extraDecks = 0
  for (const extra of request.extraDecks) {
    const type = deckType(extra.deckId)
    if (!type || extra.count < 1) continue
    extraDecks += extra.count
    add(`deck-${type.id}`, 'Dosky', type.label, extra.count, type.equipmentId)
    // Doska navyše stojí pri pódiu a s ním sa delí o nohy na jednej hrane.
    addLegs(heightCm, extra.count * Math.max(1, type.legs - 2))
  }

  // Schody: stupne z vybranej dosky po 20 cm; prvý stojí na 4 nohách 20 cm, ďalšie na 2 nohách
  // svojej výšky a 2 schodiskových nohách zavesených na predchádzajúcom stupni.
  const step = deckType(config.stairs.stepDeckId) ?? rectDecks(config).fillers.at(-1) ?? rectDecks(config).main
  const stepWidth = step ? Math.max(step.widthM, step.depthM) : 1
  const stepDepth = step ? Math.min(step.widthM, step.depthM) : 0.5
  const placed = request.stairs.filter((item) => item.positionM >= 0 && item.positionM + stepWidth <= sideLength(item.side, widthM, depthM) + EPS)
  if (placed.length < request.stairs.length) warnings.push('Niektoré schody sú mimo hrany pódia, nerátajú sa.')
  const steps = Math.floor(heightCm / STEP_RISE_CM) - (request.stairsToTop ? 0 : 1)
  if (placed.length > 0 && steps < 1) warnings.push('Pódium je také nízke, že schody netreba.')
  const stairs = steps >= 1 ? placed.map((item) => ({ ...item, steps, widthM: stepWidth, stepDepthM: stepDepth })) : []
  stairs.forEach(() => {
    if (step) add(`deck-${step.id}`, 'Dosky', step.label, steps, step.equipmentId)
    addLegs(STEP_RISE_CM, 4)
    for (let level = 2; level <= steps; level++) addLegs(level * STEP_RISE_CM, 2)
    add('stairLeg', 'Schody', 'Schodisková noha', (steps - 1) * 2, config.stairs.stairLeg.equipmentId)
    add('stairRailing', 'Schody', 'Zábradlie schodov', request.stairsRailingSides, config.stairs.railing.equipmentId)
    if (!request.stairsToTop) add('stairConnector', 'Schody', 'Spojka schodov k pódiu (110 mm)', config.stairs.connector.perStairs, config.stairs.connector.equipmentId)
  })

  // Kde sú pripojené schody alebo molo, nejde lišta, plachta ani zábradlie.
  const gaps = [...stairs, ...(catwalk ? [{ side: catwalk.side, positionM: catwalk.positionM, widthM: catwalk.widthM }] : [])]

  // Lišty: na každú hranu dosky na zvolenej strane lišta jej dĺžky (alebo kratšie, nie cez dve dosky).
  const underStairs = (edge: Segment) =>
    gaps.some((item) => item.side === edge.side && item.positionM < edge.toM - EPS && item.positionM + item.widthM > edge.fromM + EPS)
  const lathEdges = perimeterEdges(decks, widthM, depthM).filter((edge) => request.lathSides.includes(edge.side) && !underStairs(edge))
  for (const edge of lathEdges) {
    const profile = SIDE_PROFILE[edge.side]
    const options = config.laths.filter((lath) => lath.profile === profile)
    const pieces = exactPieces(edge.toM - edge.fromM, options.map((lath) => lath.lengthM))
    if (!pieces) {
      warnings.push(`Chýba lišta ${PROFILE_LABELS[profile]} pre hranu ${formatM(edge.toM - edge.fromM)}.`)
      continue
    }
    for (const [length, count] of pieces) {
      const lath = options.find((candidate) => candidate.lengthM === length)!
      add(`lath-${profile}-${length}`, 'Lišty', lath.label || `Lišta ${PROFILE_LABELS[profile]} ${formatM(length)}`, count, lath.equipmentId)
    }
  }

  // Plachta: zvolené strany pódia okrem schodov a mola, obvod mola a rizerov, ak ju chcú.
  const skirtSegments = request.skirtSides.flatMap((side) => openSegments(side, sideLength(side, widthM, depthM), gaps))
  const skirtRuns: { lengthM: number; heightCm: number }[] = skirtSegments.map((segment) => ({ lengthM: segment.toM - segment.fromM, heightCm }))
  if (catwalk?.skirt) skirtRuns.push(...[catwalk.lengthM, catwalk.lengthM, catwalk.widthM].map((lengthM) => ({ lengthM, heightCm })))
  for (const riser of risers) {
    if (riser.skirt) skirtRuns.push(...[riser.widthM, riser.widthM, riser.depthM, riser.depthM].map((lengthM) => ({ lengthM, heightCm: riser.heightCm })))
  }
  const skirtMeters = skirtRuns.reduce((sum, run) => sum + run.lengthM, 0)
  for (const height of [...new Set(skirtRuns.map((run) => run.heightCm))]) {
    const skirts = config.skirts.filter((skirt) => skirt.heightCm === 0 || skirt.heightCm === height)
    if (skirts.length === 0) warnings.push(`Pre výšku ${height} cm nie sú v nastavení plachty.`)
    const pieces = new Map<number, number>()
    for (const run of skirtRuns.filter((candidate) => candidate.heightCm === height)) {
      for (const [size, count] of coverLength(run.lengthM, skirts.map((skirt) => skirt.coversM))) pieces.set(size, (pieces.get(size) ?? 0) + count)
    }
    for (const [size, count] of [...pieces].sort((a, b) => b[0] - a[0])) {
      const skirt = skirts.find((candidate) => candidate.coversM === size && candidate.heightCm === height) ?? skirts.find((candidate) => candidate.coversM === size)
      const own = height === heightCm
      add(own ? `skirt-${size}` : `skirt-${size}-${height}`, 'Plachta', `Plachta na ${formatM(size)}${own ? '' : ` (rizer ${height} cm)`}`, count, skirt?.equipmentId ?? '')
    }
  }
  if (skirtMeters > 0) add('skirtClip', 'Plachta', 'Štipec na plachtu', skirtMeters * config.skirtClip.perMeter, config.skirtClip.equipmentId)

  // Zábradlie: zvolené strany bez otvorov pre schody; spoje medzi dielmi a rohy.
  const railingSegments = request.railingSides.flatMap((side) => openSegments(side, sideLength(side, widthM, depthM), gaps))
  const railingMeters = railingSegments.reduce((sum, segment) => sum + segment.toM - segment.fromM, 0)
  let railingPieces = 0
  let joints = 0
  let corners = 0
  if (railingSegments.length > 0) {
    if (config.railings.length === 0) warnings.push('V nastavení nie sú zábradlia.')
    const pieces = new Map<number, number>()
    for (const segment of railingSegments) {
      const segmentPieces = coverLength(segment.toM - segment.fromM, config.railings.map((railing) => railing.coversM))
      const count = [...segmentPieces.values()].reduce((sum, n) => sum + n, 0)
      railingPieces += count
      joints += Math.max(0, count - 1)
      for (const [size, n] of segmentPieces) pieces.set(size, (pieces.get(size) ?? 0) + n)
    }
    for (const [size, count] of [...pieces].sort((a, b) => b[0] - a[0])) {
      const railing = config.railings.find((candidate) => candidate.coversM === size)
      add(`railing-${size}`, 'Zábradlie', `Zábradlie ${railing?.label || `na ${formatM(size)}`}`, count, railing?.equipmentId ?? '')
    }
    const touches = (side: Side, end: 'start' | 'end') => {
      const length = sideLength(side, widthM, depthM)
      return railingSegments.some((segment) => segment.side === side && (end === 'start' ? segment.fromM < EPS : Math.abs(segment.toM - length) < EPS))
    }
    corners = CORNERS.filter(([a, aEnd, b, bEnd]) => touches(a, aEnd) && touches(b, bEnd)).length
  }

  // Výstuhy („vrtule“) od výšky, pre ktorú sú v nastavení.
  const needsDiagonals = config.diagonals.some((item) => heightCm >= item.minHeightCm)
  if (needsDiagonals) {
    const fields = [...perimeterEdges(decks, widthM, depthM).map((edge) => edge.toM - edge.fromM), ...catwalkFields]
    for (const fieldM of [...new Set(fields)].sort((a, b) => b - a)) {
      const count = Math.ceil(fields.filter((field) => field === fieldM).length / config.diagonalEvery)
      const item = config.diagonals.find((candidate) => candidate.fieldM === fieldM && heightCm >= candidate.minHeightCm && heightCm <= candidate.maxHeightCm)
      if (!item) warnings.push(`V nastavení nie je výstuha pre pole ${formatM(fieldM)} a výšku ${heightCm} cm.`)
      add(`diagonal-${fieldM}`, 'Výstuhy', item?.label || `Výstuha pole ${formatM(fieldM)}`, count, item?.equipmentId ?? '')
    }
  }

  // Drobnosti podľa toho, na čo sa viažu.
  const basisCount: Record<AccessoryBasis, number> = {
    deck: allDecks.length + extraDecks,
    leg: legs,
    railing: railingPieces,
    railingJoint: joints,
    railingCorner: corners,
    stairs: stairs.length,
    stage: 1,
  }
  config.accessories.forEach((accessory, index) => {
    add(`accessory-${index}`, 'Príslušenstvo', accessory.label, basisCount[accessory.basis] * accessory.quantity, accessory.equipmentId)
  })

  const tips = [
    'Dosky sa spájajú do seba brzdou, spojky medzi doskami netreba.',
    'Pero dosiek otočte dozadu a doprava (pri pohľade zhora), aby do seba pekne zapadli.',
  ]
  if (needsDiagonals) tips.push('Od výšky 80 cm pódium vystužte diagonálami (vrtuľami).')

  return {
    decks,
    orientation,
    lines,
    warnings: [...new Set(warnings)],
    tips,
    skirtSegments,
    railingSegments,
    lathEdges,
    stairs,
    catwalkDecks,
    risers,
    skirtMeters,
    railingMeters,
  }
}

/** Počty podľa techniky: viac riadkov môže patriť tej istej položke. */
export function quantitiesByEquipment(lines: StageLine[]) {
  const totals = new Map<string, number>()
  for (const line of lines) if (line.equipmentId) totals.set(line.equipmentId, (totals.get(line.equipmentId) ?? 0) + line.quantity)
  return totals
}
