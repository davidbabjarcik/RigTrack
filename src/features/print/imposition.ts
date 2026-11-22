// Rozloženie na papier A4 pri 300 dpi: dva hárky A5 na jednu A4 a štítky cases v mierke, s tlačovými značkami
// na rezanie (krátke čiarky mimo orezu, aby po odrezaní nebolo nič vidieť).

/** Pixely pri 300 dpi na 1 mm. */
export const PX_PER_MM = 300 / 25.4
const px = (mm: number) => Math.round(mm * PX_PER_MM)

export const A4_MM = { width: 210, height: 297 }
/** Štítok case pri 100 % (1838 × 1500 px pri 300 dpi). */
export const LABEL_MM = { width: (1838 / 300) * 25.4, height: (1500 / 300) * 25.4 }

/** Mierka štítku v % – najväčšia, pri ktorej sa ešte zmestí na A4 na šírku s okrajmi. */
export const LABEL_SCALE_MIN = 20
export const LABEL_SCALE_MAX = 145
export const clampLabelScale = (value: number) => Math.min(LABEL_SCALE_MAX, Math.max(LABEL_SCALE_MIN, Math.round(value) || 100))

/** Rozmer štítku v cm pri danej mierke, napr. „15,6 × 12,7 cm“. */
export function labelSizeCm(scale: number) {
  const cm = (mm: number) => (Math.round((mm * clampLabelScale(scale)) / 100) / 10).toFixed(1).replace('.', ',')
  return `${cm(LABEL_MM.width)} × ${cm(LABEL_MM.height)} cm`
}

/** Okraj strany a medzera medzi štítkami (v nej sú značky na rezanie). */
const MARGIN_MM = 10
const GAP_MM = 10

export type Slot = { x: number; y: number; width: number; height: number }
export type Sheet = { landscape: boolean; slots: Slot[] }

/**
 * Koľko štítkov danej veľkosti (mm) sa zmestí na A4 a kam – vyberie orientáciu, kde ich je viac (pri zhode na výšku).
 * Mriežka je na strane vycentrovaná. Výsledok je v mm.
 */
export function labelGrid(width: number, height: number): Sheet {
  const fit = (pageW: number, pageH: number) => {
    const cols = Math.max(0, Math.floor((pageW - 2 * MARGIN_MM + GAP_MM) / (width + GAP_MM)))
    const rows = Math.max(0, Math.floor((pageH - 2 * MARGIN_MM + GAP_MM) / (height + GAP_MM)))
    return { cols, rows, count: cols * rows }
  }
  const portrait = fit(A4_MM.width, A4_MM.height)
  const landscapeFit = fit(A4_MM.height, A4_MM.width)
  const landscape = landscapeFit.count > portrait.count
  const best = landscape ? landscapeFit : portrait
  const [pageW, pageH] = landscape ? [A4_MM.height, A4_MM.width] : [A4_MM.width, A4_MM.height]
  // Nezmestí sa ani jeden (nemalo by nastať pri obmedzenej mierke): jeden do stredu.
  const cols = Math.max(1, best.cols)
  const rows = Math.max(1, best.rows)
  const left = (pageW - (cols * width + (cols - 1) * GAP_MM)) / 2
  const top = (pageH - (rows * height + (rows - 1) * GAP_MM)) / 2
  const slots: Slot[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) slots.push({ x: left + col * (width + GAP_MM), y: top + row * (height + GAP_MM), width, height })
  }
  return { landscape, slots }
}

function blankA4(landscape: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = px(landscape ? A4_MM.height : A4_MM.width)
  canvas.height = px(landscape ? A4_MM.width : A4_MM.height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return { canvas, ctx }
}

/** Značky na rezanie v rohoch obdĺžnika (px): čiarky 4 mm, 1,5 mm od orezu, mimo neho. */
export function drawCropMarks(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const offset = px(1.5)
  const length = px(4)
  ctx.save()
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = Math.max(1, px(0.2))
  ctx.setLineDash([])
  ctx.beginPath()
  for (const cx of [x, x + width]) {
    for (const cy of [y, y + height]) {
      const dx = cx === x ? -1 : 1
      const dy = cy === y ? -1 : 1
      // Vodorovná čiarka v predĺžení hornej / dolnej hrany, zvislá v predĺžení bočnej.
      ctx.moveTo(cx + dx * offset, cy)
      ctx.lineTo(cx + dx * (offset + length), cy)
      ctx.moveTo(cx, cy + dy * offset)
      ctx.lineTo(cx, cy + dy * (offset + length))
    }
  }
  ctx.stroke()
  ctx.restore()
}

export type ImposedPage = { canvas: HTMLCanvasElement; landscape: boolean; title: string }

/** Štítky cases v mierke (%) na A4 – koľko sa zmestí, so značkami na rezanie. */
export function imposeLabels(labels: { canvas: HTMLCanvasElement; title: string }[], scale: number): ImposedPage[] {
  const factor = clampLabelScale(scale) / 100
  const grid = labelGrid(LABEL_MM.width * factor, LABEL_MM.height * factor)
  const pages: ImposedPage[] = []
  for (let index = 0; index < labels.length; index += grid.slots.length) {
    const chunk = labels.slice(index, index + grid.slots.length)
    const { canvas, ctx } = blankA4(grid.landscape)
    ctx.imageSmoothingQuality = 'high'
    chunk.forEach((label, slotIndex) => {
      const slot = grid.slots[slotIndex]
      const [x, y, w, h] = [px(slot.x), px(slot.y), px(slot.width), px(slot.height)]
      ctx.drawImage(label.canvas, x, y, w, h)
      drawCropMarks(ctx, x, y, w, h)
    })
    pages.push({ canvas, landscape: grid.landscape, title: chunk.map((label) => label.title).join(' + ') })
  }
  return pages
}

/**
 * Dva hárky A5 na jednu A4 v skutočnej veľkosti: A5 na výšku vedľa seba (A4 na šírku), A5 na šírku pod sebou
 * (A4 na výšku). Rez je v strede; značky sú pri okrajoch papiera v predĺžení rezu.
 */
export function imposeA5(sheets: { canvas: HTMLCanvasElement; landscape: boolean; title: string }[]): ImposedPage[] {
  const pages: ImposedPage[] = []
  for (const landscapeA5 of [false, true]) {
    const list = sheets.filter((sheet) => sheet.landscape === landscapeA5)
    for (let index = 0; index < list.length; index += 2) {
      const pair = list.slice(index, index + 2)
      // A5 na výšku → A4 na šírku a naopak.
      const { canvas, ctx } = blankA4(!landscapeA5)
      const [halfW, halfH] = landscapeA5 ? [canvas.width, canvas.height / 2] : [canvas.width / 2, canvas.height]
      ctx.imageSmoothingQuality = 'high'
      pair.forEach((sheet, slot) => {
        const [x, y] = landscapeA5 ? [0, slot * halfH] : [slot * halfW, 0]
        ctx.drawImage(sheet.canvas, x, y, halfW, halfH)
      })
      // Značky rezu: 3–9 mm od okraja papiera (tam hárok A5 nemá text).
      ctx.save()
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = Math.max(1, px(0.2))
      ctx.beginPath()
      if (landscapeA5) {
        ctx.moveTo(px(3), halfH)
        ctx.lineTo(px(9), halfH)
        ctx.moveTo(canvas.width - px(3), halfH)
        ctx.lineTo(canvas.width - px(9), halfH)
      } else {
        ctx.moveTo(halfW, px(3))
        ctx.lineTo(halfW, px(9))
        ctx.moveTo(halfW, canvas.height - px(3))
        ctx.lineTo(halfW, canvas.height - px(9))
      }
      ctx.stroke()
      ctx.restore()
      pages.push({ canvas, landscape: !landscapeA5, title: pair.map((sheet) => sheet.title).join(' + ') })
    }
  }
  return pages
}

/** Mierka štítku case na tomto zariadení (rigtrack.label.scale, predvolene 100 %). */
export function readLabelScale() {
  try {
    return clampLabelScale(Number(localStorage.getItem('rigtrack.label.scale') ?? 100))
  } catch {
    return 100
  }
}
export function saveLabelScale(scale: number) {
  try {
    localStorage.setItem('rigtrack.label.scale', String(clampLabelScale(scale)))
  } catch {
    // Bez úložiska sa mierka len nezapamätá.
  }
}
