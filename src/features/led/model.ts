/** LED stena: panely, rozmer, rozlíšenie, váha, prúd a hliník s rigging materiálom. */

export type Panel = {
  name: string
  widthMm: number
  heightMm: number
  /** Pixely na panel (šírka × výška). */
  pxW: number
  pxH: number
  weightKg: number
  /** Príkon panela: maximálny a priemerný (W). */
  maxW: number
  avgW: number
}

export const PANEL_PRESETS: Panel[] = [
  { name: 'P2.6 500×500', widthMm: 500, heightMm: 500, pxW: 192, pxH: 192, weightKg: 7.5, maxW: 180, avgW: 60 },
  { name: 'P2.9 500×500', widthMm: 500, heightMm: 500, pxW: 168, pxH: 168, weightKg: 7.5, maxW: 200, avgW: 70 },
  { name: 'P3.9 500×500', widthMm: 500, heightMm: 500, pxW: 128, pxH: 128, weightKg: 7.5, maxW: 200, avgW: 70 },
  { name: 'P3.9 500×1000', widthMm: 500, heightMm: 1000, pxW: 128, pxH: 256, weightKg: 13, maxW: 400, avgW: 140 },
  { name: 'P4.8 500×1000 outdoor', widthMm: 500, heightMm: 1000, pxW: 104, pxH: 208, weightKg: 14, maxW: 450, avgW: 150 },
]

export type Truss = { name: string; kgPerM: number }
export const TRUSS_PRESETS: Truss[] = [
  { name: 'F34 / 4-bodový 290 mm', kgPerM: 4.5 },
  { name: 'F44 / 4-bodový 400 mm', kgPerM: 6.5 },
  { name: 'H30V / 3-bodový 290 mm', kgPerM: 4 },
]

/** Ako sa stena postaví: zavesená na truss s motormi, na hliníkovej bráne od zeme (goalpost), alebo stohovaná na zemi. */
export const MOUNTS = ['flown', 'goalpost', 'stacked'] as const
export type Mount = (typeof MOUNTS)[number]
export const MOUNT_LABELS: Record<Mount, string> = {
  flown: 'Zavesená na truss (motory)',
  goalpost: 'Hliníková brána od zeme',
  stacked: 'Stohovaná na zemi (ground stack)',
}

export type Rounding = 'nearest' | 'down' | 'up'

export type LedInput = {
  panel: Panel
  /** Želaný rozmer steny (m). */
  widthM: number
  heightM: number
  rounding: Rounding
  mount: Mount
  truss: Truss
  /** Dĺžky dielov hliníka, ktoré máme (m), napr. [3, 2, 1, 0.5]. */
  trussLengths: number[]
  /** Truss presahuje stenu na každej strane (m). */
  overhangM: number
  /** Brána: stena začína nad zemou (m). */
  clearanceM: number
  /** Zavesená: najväčší rozostup závesných bodov (m) a nosnosť motora (kg). */
  pointSpacingM: number
  hoistKg: number
  /** Závesná lišta panelov: váha (kg) a koľko úväzov / shacklov na lištu. */
  barKg: number
  slingsPerBar: number
  shacklesPerBar: number
  /** Na závesný bod: úväzy, topy (steel s 2 nekonečnými okami) a shackle. */
  slingsPerPoint: number
  steelsPerPoint: number
  shacklesPerPoint: number
  /** Spoj trussu: koľko kónusov (kociek), čapov a závlačiek. */
  conesPerJoint: number
  pinsPerJoint: number
  clipsPerJoint: number
  /** Koľko pixelov utiahne jeden port procesora (≈ 650 000 pri 1 Gbit). */
  pixelsPerPort: number
  /** Bezpečný príkon na jeden 16 A okruh (W). */
  wattsPerCircuit: number
}

export const DEFAULT_INPUT: LedInput = {
  panel: PANEL_PRESETS[2],
  widthM: 6,
  heightM: 3.5,
  rounding: 'nearest',
  mount: 'flown',
  truss: TRUSS_PRESETS[0],
  trussLengths: [3, 2, 1, 0.5],
  overhangM: 0.5,
  clearanceM: 0.5,
  pointSpacingM: 2,
  hoistKg: 500,
  barKg: 5,
  slingsPerBar: 1,
  shacklesPerBar: 2,
  slingsPerPoint: 1,
  steelsPerPoint: 1,
  shacklesPerPoint: 2,
  conesPerJoint: 4,
  pinsPerJoint: 8,
  clipsPerJoint: 8,
  pixelsPerPort: 650_000,
  wattsPerCircuit: 3200,
}

/** Koľko panelov na rozmer: najbližší, alebo nikdy menej / nikdy viac ako želaný rozmer (aspoň 1). */
export function fit(sizeM: number, panelMm: number, rounding: Rounding) {
  const exact = (sizeM * 1000) / panelMm
  const count = rounding === 'down' ? Math.floor(exact + 1e-9) : rounding === 'up' ? Math.ceil(exact - 1e-9) : Math.round(exact)
  return Math.max(1, count)
}

/** Rozdelí dĺžku na diely, ktoré máme (od najdlhšieho); dĺžka sa zaokrúhli hore na najkratší diel. */
export function splitTruss(lengthM: number, available: number[]) {
  const sizes = [...new Set(available.filter((size) => size > 0))].sort((a, b) => b - a)
  if (sizes.length === 0 || lengthM <= 0) return { pieces: [] as number[], totalM: 0 }
  const step = sizes[sizes.length - 1]
  let rest = Math.ceil(lengthM / step - 1e-9) * step
  const pieces: number[] = []
  for (const size of sizes) {
    while (rest >= size - 1e-9) {
      pieces.push(size)
      rest = Math.round((rest - size) * 1000) / 1000
    }
  }
  return { pieces, totalM: Math.round(pieces.reduce((sum, size) => sum + size, 0) * 1000) / 1000 }
}

/** „3 m × 2, 1 m × 1“ */
export function describePieces(pieces: number[]) {
  const counts = new Map<number, number>()
  for (const piece of pieces) counts.set(piece, (counts.get(piece) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([size, count]) => `${String(size).replace('.', ',')} m × ${count}`)
    .join(', ')
}

export type LedResult = {
  columns: number
  rows: number
  panels: number
  widthM: number
  heightM: number
  areaM2: number
  resolution: { w: number; h: number; total: number }
  aspect: string
  screenKg: number
  power: { maxW: number; avgW: number; ampsSingle: number; ampsPerPhase: number; circuits: number; panelsPerCircuit: number }
  ports: number
  /** Hliník (bez stohovania): diely, metre, váha a spoje. */
  truss: {
    runs: { label: string; pieces: number[]; totalM: number }[]
    /** Koľko dielov akej dĺžky treba spolu (aj obe veže). */
    needs: { lengthM: number; count: number }[]
    totalM: number
    weightKg: number; joints: number; cones: number; pins: number; clips: number; cornerCubes: number; basePlates: number } | null
  rigging: { bars: number; barsKg: number; points: number; slings: number; steels: number; shackles: number; totalKg: number; kgPerPoint: number; overload: boolean } | null
  stack: { baseBars: number; braces: number } | null
  warnings: string[]
}

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

export function calculateLed(input: LedInput): LedResult {
  const { panel } = input
  const columns = fit(input.widthM, panel.widthMm, input.rounding)
  const rows = fit(input.heightM, panel.heightMm, input.rounding)
  const panels = columns * rows
  const widthM = (columns * panel.widthMm) / 1000
  const heightM = (rows * panel.heightMm) / 1000
  const pxW = columns * panel.pxW
  const pxH = rows * panel.pxH
  const divisor = gcd(pxW, pxH) || 1
  const screenKg = round(panels * panel.weightKg, 1)
  const maxW = panels * panel.maxW
  const avgW = panels * panel.avgW
  const panelsPerCircuit = Math.max(1, Math.floor(input.wattsPerCircuit / panel.maxW))
  const warnings: string[] = []

  let truss: LedResult['truss'] = null
  let rigging: LedResult['rigging'] = null
  let stack: LedResult['stack'] = null

  if (input.mount === 'stacked') {
    stack = { baseBars: columns, braces: Math.ceil(columns / 2) }
    if (heightM > 4) warnings.push('Stohovaná stena vyššia ako 4 m – zvážte zavesenie alebo istenie zozadu a záťaž.')
  } else {
    const topLength = widthM + 2 * input.overhangM
    const runs: { label: string; pieces: number[]; totalM: number }[] = []
    const top = splitTruss(topLength, input.trussLengths)
    runs.push({ label: input.mount === 'goalpost' ? 'Horný truss brány' : 'Truss na zavesenie', ...top })
    let cornerCubes = 0
    let basePlates = 0
    // Spoje: medzi dielmi v každom behu; pri bráne aj diel ↔ kocka a veža ↔ podstava.
    let joints = Math.max(0, top.pieces.length - 1)
    if (input.mount === 'goalpost') {
      const towerHeight = heightM + input.clearanceM + 0.5
      const tower = splitTruss(towerHeight, input.trussLengths)
      runs.push({ label: 'Veža (2×)', ...tower })
      runs.push({ label: 'Veža', ...tower })
      cornerCubes = 2
      basePlates = 2
      joints += 2 + 2 * (Math.max(0, tower.pieces.length - 1) + 2)
    }
    const totalM = round(runs.reduce((sum, run) => sum + run.totalM, 0), 2)
    const counts = new Map<number, number>()
    for (const piece of runs.flatMap((run) => run.pieces)) counts.set(piece, (counts.get(piece) ?? 0) + 1)
    truss = {
      runs: input.mount === 'goalpost' ? [runs[0], runs[1]] : runs,
      needs: [...counts.entries()].sort((a, b) => b[0] - a[0]).map(([lengthM, count]) => ({ lengthM, count })),
      totalM,
      weightKg: round(totalM * input.truss.kgPerM, 1),
      joints,
      cones: joints * input.conesPerJoint,
      pins: joints * input.pinsPerJoint,
      clips: joints * input.clipsPerJoint,
      cornerCubes,
      basePlates,
    }
    const bars = columns
    const barsKg = round(bars * input.barKg, 1)
    const points = input.mount === 'flown' ? Math.max(2, Math.ceil(top.totalM / input.pointSpacingM - 1e-9) + 1) : 2
    const totalKg = round(screenKg + barsKg + (input.mount === 'flown' ? truss.weightKg : 0), 1)
    const kgPerPoint = round(totalKg / points, 1)
    const overload = input.mount === 'flown' && kgPerPoint > input.hoistKg
    rigging = {
      bars,
      barsKg,
      points,
      slings: bars * input.slingsPerBar + (input.mount === 'flown' ? points * input.slingsPerPoint : 0),
      steels: input.mount === 'flown' ? points * input.steelsPerPoint : 0,
      shackles: bars * input.shacklesPerBar + (input.mount === 'flown' ? points * input.shacklesPerPoint : 0),
      totalKg,
      kgPerPoint,
      overload,
    }
    if (overload) warnings.push(`Na jeden bod ide ${String(kgPerPoint).replace('.', ',')} kg – viac ako nosnosť motora. Pridajte body (menší rozostup).`)
    if (input.mount === 'goalpost' && heightM + input.clearanceM > 6) warnings.push('Brána vyššia ako 6 m – overte nosnosť trussu a stabilitu (outriggery, záťaž).')
    if (input.mount === 'goalpost') warnings.push('Nosnosť hornej časti brány overte v tabuľke výrobcu trussu pre danú dĺžku.')
  }

  return {
    columns,
    rows,
    panels,
    widthM,
    heightM,
    areaM2: round(widthM * heightM, 2),
    resolution: { w: pxW, h: pxH, total: pxW * pxH },
    aspect: `${pxW / divisor}:${pxH / divisor}`,
    screenKg,
    power: {
      maxW,
      avgW,
      ampsSingle: round(maxW / 230, 1),
      ampsPerPhase: round(maxW / (3 * 230), 1),
      circuits: Math.ceil(panels / panelsPerCircuit),
      panelsPerCircuit,
    },
    ports: Math.max(1, Math.ceil((pxW * pxH) / input.pixelsPerPort)),
    truss,
    rigging,
    stack,
    warnings,
  }
}
