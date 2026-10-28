// Hárok FLIGHTCASE CONTENT: A4 na výšku pri 300 dpi (2480 × 3508 px), biele pozadie.
// Káble v case sú tabuľka dĺžka × typ s farebným kódom dĺžky; ostatný obsah je zoznam pod ňou.

import { findCableColor, type CableColor } from '@/features/equipment/cableColors'
import { formatNumber, type EquipmentAttributes, type EquipmentKind } from '@/features/equipment/model'
import { contrastInk, ellipsize, fitSize, font, INK, sourceSize, type Ctx } from './canvas'

export const SHEET_WIDTH = 2480
export const SHEET_HEIGHT = 3508

type SheetItem = { name: string; kind: EquipmentKind; quantity: number; attributes: EquipmentAttributes }

export type CableMatrix = {
  /** Typy káblov (konektor), jeden stĺpec za každý. */
  columns: string[]
  rows: { lengthM: number; counts: number[] }[]
  /** Všetko, čo nie je kábel s dĺžkou: názov a počet kusov. */
  others: { name: string; quantity: number }[]
}

const NO_TYPE = 'Kábel'

/** Z obsahu case zostaví tabuľku káblov (dĺžka × typ) a zoznam ostatných vecí. */
export function buildCableMatrix(items: SheetItem[]): CableMatrix {
  const cables = items.filter((item) => item.kind === 'cable' && item.attributes.lengthM !== undefined)
  const typeOf = (item: SheetItem) => item.attributes.connector?.trim() || NO_TYPE
  const columns = [...new Set(cables.map(typeOf))].sort((a, b) => a.localeCompare(b, 'sk'))
  const lengths = [...new Set(cables.map((item) => item.attributes.lengthM!))].sort((a, b) => a - b)
  const rows = lengths.map((lengthM) => ({
    lengthM,
    counts: columns.map((column) =>
      cables
        .filter((item) => item.attributes.lengthM === lengthM && typeOf(item) === column)
        .reduce((sum, item) => sum + item.quantity, 0),
    ),
  }))

  const totals = new Map<string, number>()
  for (const item of items) {
    if (!cables.includes(item)) totals.set(item.name, (totals.get(item.name) ?? 0) + item.quantity)
  }
  const others = [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'sk', { numeric: true }))
    .map(([name, quantity]) => ({ name, quantity }))

  return { columns, rows, others }
}

export type SheetData = {
  caseName: string
  caseNumber: string
  matrix: CableMatrix
  colors: CableColor[]
  footer: string
  logo: CanvasImageSource | null
  companyName: string
}

const MARGIN = 130
const LINE = 6

function centered(ctx: Ctx, text: string, x: number, y: number, maxWidth: number, max: number, min: number) {
  const size = fitSize(ctx, text, maxWidth, max, min)
  font(ctx, size)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(ellipsize(ctx, text, maxWidth), x, y)
  ctx.textAlign = 'left'
}

/** Vycentrovaný text vo farbe dĺžky; `outline` pridá tmavý obrys pre svetlé farby. */
function coloured(ctx: Ctx, text: string, x: number, y: number, maxWidth: number, max: number, color: string, outline: boolean) {
  const size = fitSize(ctx, text, maxWidth, Math.floor(max), 22)
  font(ctx, size)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const shown = ellipsize(ctx, text, maxWidth)
  if (outline) {
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(4, size * 0.09)
    ctx.strokeStyle = INK
    ctx.strokeText(shown, x, y)
    ctx.lineWidth = LINE
  }
  ctx.fillStyle = color
  ctx.fillText(shown, x, y)
  ctx.textAlign = 'left'
}

export function drawContentSheet(canvas: HTMLCanvasElement, data: SheetData) {
  canvas.width = SHEET_WIDTH
  canvas.height = SHEET_HEIGHT
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT)
  ctx.fillStyle = INK
  ctx.strokeStyle = INK
  ctx.lineWidth = LINE

  const left = MARGIN
  const width = SHEET_WIDTH - 2 * MARGIN
  const bottom = SHEET_HEIGHT - MARGIN

  // Hlavička: veľké logo vľavo, názov hárku a case presne v strede strany.
  const HEADER = 430
  const LOGO_MAX_WIDTH = 640
  let logoWidth = 0
  if (data.logo) {
    const { width: sourceWidth, height: sourceHeight } = sourceSize(data.logo)
    const scale = Math.min(LOGO_MAX_WIDTH / sourceWidth, HEADER / sourceHeight)
    logoWidth = sourceWidth * scale
    ctx.drawImage(data.logo, left, MARGIN + (HEADER - sourceHeight * scale) / 2, logoWidth, sourceHeight * scale)
  } else if (data.companyName) {
    const size = fitSize(ctx, data.companyName, LOGO_MAX_WIDTH, 110, 40)
    font(ctx, size)
    ctx.textBaseline = 'middle'
    const name = ellipsize(ctx, data.companyName, LOGO_MAX_WIDTH)
    logoWidth = ctx.measureText(name).width
    ctx.fillText(name, left, MARGIN + HEADER / 2)
  }
  // Text je v strede strany; aby nezasahoval do loga, smie byť najviac taký široký,
  // koľko miesta ostane symetricky po oboch stranách.
  const centerX = SHEET_WIDTH / 2
  const titleWidth = width - 2 * (logoWidth + 70)
  centered(ctx, 'FLIGHTCASE CONTENT', centerX, MARGIN + HEADER * 0.36, titleWidth, 150, 50)
  const subtitle = [data.caseName, data.caseNumber && `č. ${data.caseNumber}`].filter(Boolean).join(' · ')
  centered(ctx, subtitle, centerX, MARGIN + HEADER * 0.7, titleWidth, 92, 36)

  let y = MARGIN + HEADER + 60
  const footerSpace = data.footer ? 110 : 0
  const { columns, rows, others } = data.matrix
  // Ostatný obsah: pár položiek pod sebou, dlhší zoznam v dvoch stĺpcoch.
  // Miesto preň sa odloží vopred, aby tabuľka nezabrala celú stranu.
  const OTHER_LINE = 78
  const otherColumns = others.length > 8 ? 2 : 1
  const othersHeight = others.length > 0 ? 130 + Math.ceil(others.length / otherColumns) * OTHER_LINE : 0

  if (rows.length > 0) {
    const FIRST = 520
    const HEAD_ROW = 210
    const columnWidth = (width - FIRST) / columns.length
    const available = bottom - footerSpace - othersHeight - y - HEAD_ROW - 60
    const rowHeight = Math.max(110, Math.min(330, available / rows.length))
    const tableHeight = HEAD_ROW + rows.length * rowHeight

    // Hlavička tabuľky.
    centered(ctx, 'FARBA / DĹŽKA', left + FIRST / 2, y + HEAD_ROW / 2, FIRST - 60, 70, 34)
    columns.forEach((column, index) => {
      const x = left + FIRST + index * columnWidth
      centered(ctx, column.toUpperCase(), x + columnWidth / 2, y + HEAD_ROW / 2, columnWidth - 60, 76, 30)
    })

    rows.forEach((row, rowIndex) => {
      const rowY = y + HEAD_ROW + rowIndex * rowHeight
      // Farba podľa typu kábla v prvom stĺpci, kde táto dĺžka je (XLR, powerCON, 230 V majú vlastné farby).
      const column = columns[row.counts.findIndex((count) => count > 0)]
      const color = findCableColor(data.colors, column, row.lengthM)
      const lengthText = `${formatNumber(row.lengthM)} m`
      if (color) {
        // Úzky farebný pruh na okraji a vedľa neho názov farby s dĺžkou napísané tou istou farbou.
        const STRIP = 46
        ctx.fillStyle = color.color
        ctx.fillRect(left, rowY, STRIP, rowHeight)
        // Svetlé farby (žltá, azúrová) by na bielom papieri zanikli, preto dostanú tenký tmavý obrys.
        const outline = contrastInk(color.color) === INK
        const labelX = left + STRIP + (FIRST - STRIP) / 2
        const labelWidth = FIRST - STRIP - 50
        if (color.name) {
          coloured(ctx, color.name.toUpperCase(), labelX, rowY + rowHeight * 0.3, labelWidth, Math.min(64, rowHeight * 0.27), color.color, outline)
          coloured(ctx, lengthText, labelX, rowY + rowHeight * 0.66, labelWidth, Math.min(104, rowHeight * 0.42), color.color, outline)
        } else {
          coloured(ctx, lengthText, labelX, rowY + rowHeight / 2, labelWidth, Math.min(120, rowHeight * 0.5), color.color, outline)
        }
        ctx.fillStyle = INK
      } else {
        centered(ctx, lengthText, left + FIRST / 2, rowY + rowHeight / 2, FIRST - 60, Math.min(120, rowHeight * 0.5), 40)
      }
      row.counts.forEach((count, index) => {
        if (count === 0) return
        const x = left + FIRST + index * columnWidth
        centered(ctx, `${count} ks`, x + columnWidth / 2, rowY + rowHeight / 2, columnWidth - 60, Math.min(150, rowHeight * 0.6), 40)
      })
    })

    // Mriežka až nakoniec, aby prekryla okraje farebných polí.
    ctx.strokeStyle = INK
    ctx.strokeRect(left, y, width, tableHeight)
    ctx.beginPath()
    ctx.moveTo(left + FIRST, y)
    ctx.lineTo(left + FIRST, y + tableHeight)
    for (let index = 1; index < columns.length; index++) {
      const x = left + FIRST + index * columnWidth
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + tableHeight)
    }
    for (let index = 0; index < rows.length; index++) {
      const rowY = y + HEAD_ROW + index * rowHeight
      ctx.moveTo(left, rowY)
      ctx.lineTo(left + width, rowY)
    }
    ctx.stroke()
    y += tableHeight + 80
  }

  if (others.length > 0) {
    font(ctx, 64)
    ctx.textBaseline = 'top'
    ctx.fillText(rows.length > 0 ? 'OSTATNÝ OBSAH' : 'OBSAH', left, y)
    y += 110
    const gap = 80
    const columnWidth = (width - gap * (otherColumns - 1)) / otherColumns
    const perColumn = Math.ceil(others.length / otherColumns)
    // Bez tabuľky káblov má zoznam celú stranu, preto môže byť písmo väčšie.
    const lineHeight = Math.max(52, Math.min(110, (bottom - footerSpace - y) / perColumn))
    font(ctx, Math.floor(lineHeight * 0.66), 700)
    others.forEach((item, index) => {
      const column = Math.floor(index / perColumn)
      const text = item.quantity > 1 ? `${item.quantity}× ${item.name}` : item.name
      ctx.fillText(ellipsize(ctx, text, columnWidth), left + column * (columnWidth + gap), y + (index % perColumn) * lineHeight)
    })
  }

  if (data.footer) centered(ctx, data.footer, SHEET_WIDTH / 2, bottom - 30, width, 52, 26)
}
