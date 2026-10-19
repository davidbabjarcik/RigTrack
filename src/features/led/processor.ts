/** Zapojenie LED stien na procesor (napr. Novastar) a rozloženie stien do vstupného obrazu (Full HD). */

export type Processor = {
  name: string
  /** Počet ethernet výstupov (portov) na panely. */
  outputs: number
  /** Koľko pixelov utiahne jeden výstup (1 Gbit ≈ 650 000). */
  pixelsPerOutput: number
  /** Počet HDMI / DVI vstupov a ich rozlíšenie. */
  inputs: number
  inputW: number
  inputH: number
}

export const PROCESSOR_PRESETS: Processor[] = [
  { name: 'Novastar 4 výstupy (napr. VX400)', outputs: 4, pixelsPerOutput: 650_000, inputs: 2, inputW: 1920, inputH: 1080 },
  { name: 'Novastar 6 výstupov (napr. VX600)', outputs: 6, pixelsPerOutput: 650_000, inputs: 2, inputW: 1920, inputH: 1080 },
  { name: 'Novastar 8 výstupov (napr. VX1000 / MCTRL)', outputs: 8, pixelsPerOutput: 650_000, inputs: 2, inputW: 1920, inputH: 1080 },
  { name: 'Novastar 16 výstupov (napr. VX2000 4K)', outputs: 16, pixelsPerOutput: 650_000, inputs: 2, inputW: 3840, inputH: 2160 },
]

export type WallForWiring = { name: string; columns: number; rows: number; panelPxW: number; panelPxH: number }

export type PortRun = { port: number; wall: string; fromColumn: number; toColumn: number; panels: number; pixels: number }

/**
 * Porty pre jednu stenu: káble idú po celých stĺpcoch (had hore–dole), koľko stĺpcov sa zmestí na port.
 * Keď sa nezmestí ani jeden stĺpec, delí sa stĺpec po riadkoch.
 */
export function wireWall(wall: WallForWiring, pixelsPerOutput: number, firstPort = 1): PortRun[] {
  const panelPixels = wall.panelPxW * wall.panelPxH
  const panelsPerPort = Math.max(1, Math.floor(pixelsPerOutput / panelPixels))
  const runs: PortRun[] = []
  let port = firstPort
  const columnsPerPort = Math.floor(panelsPerPort / wall.rows)
  if (columnsPerPort >= 1) {
    for (let column = 1; column <= wall.columns; column += columnsPerPort) {
      const to = Math.min(wall.columns, column + columnsPerPort - 1)
      const panels = (to - column + 1) * wall.rows
      runs.push({ port: port++, wall: wall.name, fromColumn: column, toColumn: to, panels, pixels: panels * panelPixels })
    }
  } else {
    for (let column = 1; column <= wall.columns; column++) {
      for (let left = wall.rows; left > 0; left -= panelsPerPort) {
        const panels = Math.min(panelsPerPort, left)
        runs.push({ port: port++, wall: wall.name, fromColumn: column, toColumn: column, panels, pixels: panels * panelPixels })
      }
    }
  }
  return runs
}

export type Placement = { wall: string; canvas: number; x: number; y: number; w: number; h: number; tilesX: number; tilesY: number }

/**
 * Poukladá steny do vstupných obrazov (napr. 1920×1080) po radoch od najvyššej: koľko sa zmestí do jedného
 * obrazu, zvyšok do ďalšieho vstupu (HDMI 2 = druhý obraz). Stena väčšia ako vstup sa rozdelí na dlaždice.
 */
export function packCanvases(walls: { name: string; w: number; h: number }[], inputW: number, inputH: number) {
  const placements: Placement[] = []
  const order = [...walls].sort((a, b) => Math.min(b.h, inputH) - Math.min(a.h, inputH) || b.w - a.w)
  let canvas = 0
  let x = 0
  let y = 0
  let rowH = 0
  let used = false
  const next = () => {
    canvas += 1
    x = 0
    y = 0
    rowH = 0
    used = false
  }
  for (const wall of order) {
    if (wall.w > inputW || wall.h > inputH) {
      // Väčšia ako vstup: vlastné obrazy (dlaždice), potom sa pokračuje v ďalšom obraze.
      if (used) next()
      const tilesX = Math.ceil(wall.w / inputW)
      const tilesY = Math.ceil(wall.h / inputH)
      placements.push({ wall: wall.name, canvas, x: 0, y: 0, w: wall.w, h: wall.h, tilesX, tilesY })
      canvas += tilesX * tilesY - 1
      next()
      continue
    }
    if (x + wall.w > inputW) {
      x = 0
      y += rowH
      rowH = 0
    }
    if (y + wall.h > inputH) next()
    placements.push({ wall: wall.name, canvas, x, y, w: wall.w, h: wall.h, tilesX: 1, tilesY: 1 })
    used = true
    x += wall.w
    rowH = Math.max(rowH, wall.h)
  }
  const canvases = placements.length === 0 ? 0 : Math.max(...placements.map((place) => place.canvas + place.tilesX * place.tilesY))
  return { placements, canvases }
}

export type ProcessorPlan = {
  runs: PortRun[]
  ports: number
  processors: number
  canvases: number
  placements: Placement[]
  /** Vstupov treba viac, ako má procesor (spolu za všetky procesory). */
  inputsShort: boolean
}

export function planProcessors(walls: WallForWiring[], processor: Processor): ProcessorPlan {
  const runs: PortRun[] = []
  for (const wall of walls) runs.push(...wireWall(wall, processor.pixelsPerOutput, runs.length + 1))
  const ports = runs.length
  const pack = packCanvases(
    walls.map((wall) => ({ name: wall.name, w: wall.columns * wall.panelPxW, h: wall.rows * wall.panelPxH })),
    processor.inputW,
    processor.inputH,
  )
  const processors = Math.max(1, Math.ceil(ports / processor.outputs))
  return { runs, ports, processors, canvases: pack.canvases, placements: pack.placements, inputsShort: pack.canvases > processors * processor.inputs }
}
