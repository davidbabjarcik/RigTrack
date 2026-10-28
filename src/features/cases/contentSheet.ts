// Hárok FLIGHTCASE CONTENT: A4 na výšku pri 300 dpi (2480 × 3508 px), biele pozadie.
// Káble v case sú tabuľka dĺžka × typ s farebným kódom dĺžky; príslušenstvo (redukcie, adaptéry…) sú karty
// s fotkou a počtom pod ňou, pri veľa položkách zoznam.

import { findCableColor, type CableColor } from '@/features/equipment/cableColors'
import { formatNumber, type EquipmentAttributes, type EquipmentKind } from '@/features/equipment/model'
import { ellipsize, fitSize, font, INK, sourceSize, type Ctx } from './canvas'

export const SHEET_WIDTH = 2480
export const SHEET_HEIGHT = 3508

type SheetItem = { name: string; kind: EquipmentKind; quantity: number; attributes: EquipmentAttributes; photoPath?: string }

export type CableMatrix = {
  /** Typy káblov (konektor), jeden stĺpec za každý. */
  columns: string[]
  /** Riadok = dĺžka; počty po stĺpcoch a pri variantoch (stereo, silent…) ich rozpis, napr. „2× STEREO“. */
  rows: { lengthM: number; counts: number[]; variants?: string[] }[]
  /** Všetko, čo nie je kábel s dĺžkou: názov, počet kusov a fotka (na kartu). */
  others: { name: string; quantity: number; photoPath?: string }[]
}

const NO_TYPE = 'Kábel'

/** Z obsahu case zostaví tabuľku káblov (dĺžka × typ) a zoznam ostatných vecí. */
export function buildCableMatrix(items: SheetItem[]): CableMatrix {
  // Káble označené ako príslušenstvo idú medzi karty, nie do tabuľky dĺžok.
  const cables = items.filter((item) => item.kind === 'cable' && item.attributes.lengthM !== undefined && !item.attributes.sheetAccessory)
  const typeOf = (item: SheetItem) => item.attributes.connector?.trim() || NO_TYPE
  const columns = [...new Set(cables.map(typeOf))].sort((a, b) => a.localeCompare(b, 'sk'))
  const lengths = [...new Set(cables.map((item) => item.attributes.lengthM!))].sort((a, b) => a - b)
  const rows = lengths.map((lengthM) => {
    const inCell = (column: string) => cables.filter((item) => item.attributes.lengthM === lengthM && typeOf(item) === column)
    // Varianty (stereo, silent…) sa rátajú do počtu typu a vypíšu sa pod ním.
    const variants = columns.map((column) => {
      const byVariant = new Map<string, number>()
      for (const item of inCell(column)) {
        const variant = item.attributes.cableVariant?.trim()
        if (variant) byVariant.set(variant.toUpperCase(), (byVariant.get(variant.toUpperCase()) ?? 0) + item.quantity)
      }
      const list = [...byVariant.entries()].map(([name, count]) => `${count}× ${name}`).join(', ')
      // Keď sú v políčku aj obyčajné káble: „z toho 2× STEREO“; keď len varianty: „3× STEREO“.
      const plain = inCell(column).some((item) => !item.attributes.cableVariant?.trim())
      return list && plain ? `z toho ${list}` : list
    })
    return {
      lengthM,
      counts: columns.map((column) => inCell(column).reduce((sum, item) => sum + item.quantity, 0)),
      ...(variants.some(Boolean) ? { variants } : {}),
    }
  })

  const totals = new Map<string, { quantity: number; photoPath?: string }>()
  for (const item of items) {
    if (cables.includes(item)) continue
    const found = totals.get(item.name)
    totals.set(item.name, { quantity: (found?.quantity ?? 0) + item.quantity, photoPath: found?.photoPath || item.photoPath || undefined })
  }
  const others = [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'sk', { numeric: true }))
    .map(([name, value]) => ({ name, quantity: value.quantity, ...(value.photoPath ? { photoPath: value.photoPath } : {}) }))

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
  /** Fotky príslušenstva podľa cesty k fotke (karty pod tabuľkou káblov). */
  photos?: Map<string, CanvasImageSource>
  /** QR kód case (otvorí obsah v appke). */
  qr?: CanvasImageSource | null
  /** Súhrn dole: kusov spolu a hmotnosť (case a známe hmotnosti techniky). */
  totalPieces?: number
  weightKg?: number | null
  /** Viac typov káblov: v jednej tabuľke (predvolené), alebo každý typ vo vlastnej tabuľke pod sebou. */
  layout?: SheetLayout
}

/** Ako dať na hárok viac typov káblov: spolu, pod sebou, alebo každý typ na vlastný hárok. */
export const SHEET_LAYOUTS = ['together', 'stacked', 'pages'] as const
export type SheetLayout = (typeof SHEET_LAYOUTS)[number]
export const SHEET_LAYOUT_LABELS: Record<SheetLayout, string> = { together: 'V jednej tabuľke', stacked: 'Každý typ zvlášť pod sebou', pages: 'Každý typ na vlastnom hárku' }

/** Poradie typov káblov (stĺpcov / tabuliek) podľa voľby; typy mimo zoznamu ostanú za nimi v pôvodnom poradí. */
export function orderColumns(matrix: CableMatrix, order: string[]): CableMatrix {
  const rank = (column: string) => {
    const index = order.indexOf(column)
    return index === -1 ? order.length + matrix.columns.indexOf(column) : index
  }
  const sorted = [...matrix.columns].sort((a, b) => rank(a) - rank(b))
  const from = sorted.map((column) => matrix.columns.indexOf(column))
  return { ...matrix, columns: sorted, rows: matrix.rows.map((row) => ({ ...row, counts: from.map((index) => row.counts[index]), ...(row.variants ? { variants: from.map((index) => row.variants![index]) } : {}) })) }
}

/** Pre „každý typ na vlastnom hárku“: tabuľka iba s jedným typom; ostatný obsah je len na prvom hárku. */
export function matrixPages(matrix: CableMatrix): CableMatrix[] {
  if (matrix.columns.length <= 1) return [matrix]
  return matrix.columns.map((column, index) => ({
    columns: [column],
    rows: matrix.rows.filter((row) => row.counts[index] > 0).map((row) => ({ lengthM: row.lengthM, counts: [row.counts[index]], ...(row.variants?.[index] ? { variants: [row.variants[index]] } : {}) })),
    others: index === 0 ? matrix.others : [],
  }))
}

/** Karty príslušenstva: najviac 6 v rade; pri viac ako 18 položkách sa namiesto nich vypíše zoznam. */
const CARD_LIMIT = 18
const CARD_GAP = 40
export const cardColumns = (count: number) => Math.min(6, Math.max(3, count))

/** Text na kartu do najviac troch riadkov, vycentrovaný. */
function wrapped(ctx: Ctx, text: string, x: number, y: number, maxWidth: number, max: number) {
  const words = text.split(/\s+/)
  // Najdlhšie slovo (napr. „PowerCON“) sa musí zmestiť celé – písmo sa podľa neho zmenší.
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '')
  const size = fitSize(ctx, longest, maxWidth, max, 22)
  font(ctx, size)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !line) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  const shown = lines.length > 3 ? [lines[0], lines[1], ellipsize(ctx, lines.slice(2).join(' '), maxWidth)] : lines
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  shown.forEach((value, index) => ctx.fillText(ellipsize(ctx, value, maxWidth), x, y + index * size * 1.15))
  ctx.textAlign = 'left'
  return y + shown.length * size * 1.15
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

/**
 * Farba textu pre farbu dĺžky: svetlé farby (žltá, béžová) by na bielom papieri zanikli, preto dostanú tmavší
 * odtieň tej istej farby (bez obrysu). Tmavé farby ostanú.
 */
export function textShade(hex: string) {
  let [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
  const luminance = () => (r * 299 + g * 587 + b * 114) / 1000
  while (luminance() > 135) {
    r = Math.round(r * 0.9)
    g = Math.round(g * 0.9)
    b = Math.round(b * 0.9)
  }
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

/** Vycentrovaný text vo farbe dĺžky (svetlé farby v tmavšom odtieni). */
function coloured(ctx: Ctx, text: string, x: number, y: number, maxWidth: number, max: number, color: string) {
  const size = fitSize(ctx, text, maxWidth, Math.floor(max), 22)
  font(ctx, size)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = textShade(color)
  ctx.fillText(ellipsize(ctx, text, maxWidth), x, y)
  ctx.textAlign = 'left'
}

/** Svetlé pozadie riadkov a rámčekov; tenké čiary mriežky. */
const SOFT = '#f1f3f6'
const GRID = '#9aa1ab'
const MUTED = '#5b626d'

/** Zaoblený obdĺžnik (cesta). */
function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Nadpis sekcie v strede s krátkou čiarou pod ním. */
function sectionTitle(ctx: Ctx, text: string, y: number) {
  centered(ctx, text, SHEET_WIDTH / 2, y + 40, SHEET_WIDTH - 2 * MARGIN, 66, 36)
  font(ctx, 66)
  const w = Math.min(ctx.measureText(text).width, SHEET_WIDTH - 2 * MARGIN)
  ctx.fillRect(SHEET_WIDTH / 2 - w / 2, y + 92, w, 8)
  return y + 140
}

/** Počet kusov: veľké číslo a menšie „KS“ vedľa, vycentrované. */
function countText(ctx: Ctx, count: number, cx: number, cy: number, size: number) {
  const value = String(count)
  const unit = ' KS'
  const unitSize = Math.floor(size * 0.42)
  font(ctx, size)
  const valueWidth = ctx.measureText(value).width
  font(ctx, unitSize, 700)
  const unitWidth = ctx.measureText(unit).width
  const x = cx - (valueWidth + unitWidth) / 2
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = INK
  font(ctx, size)
  ctx.fillText(value, x, cy + size * 0.36)
  ctx.fillStyle = MUTED
  font(ctx, unitSize, 700)
  ctx.fillText(unit, x + valueWidth, cy + size * 0.36)
  ctx.fillStyle = INK
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

  // Hlavička: logo vľavo, názov hárku v strede, box s číslom case a QR vpravo.
  const HEADER = 430
  const LOGO_MAX_WIDTH = 600
  let logoWidth = 0
  if (data.logo) {
    const { width: sourceWidth, height: sourceHeight } = sourceSize(data.logo)
    const scale = Math.min(LOGO_MAX_WIDTH / sourceWidth, (HEADER - 40) / sourceHeight)
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
  // Box vpravo: „CASE Č.“ a číslo vľavo, veľký QR vpravo.
  const QR = data.qr ? HEADER - 80 : 0
  const BOX = data.qr || data.caseNumber ? Math.max(360, 300 + QR) : 0
  if (BOX) {
    const boxX = left + width - BOX
    ctx.lineWidth = 5
    roundRect(ctx, boxX, MARGIN, BOX, HEADER, 28)
    ctx.stroke()
    ctx.lineWidth = LINE
    const textWidth = BOX - QR - 80
    font(ctx, 44, 700)
    ctx.textBaseline = 'top'
    ctx.fillStyle = MUTED
    ctx.fillText('CASE Č.', boxX + 40, MARGIN + 50)
    ctx.fillStyle = INK
    const number = data.caseNumber || '—'
    const numberSize = fitSize(ctx, number, textWidth, 170, 50)
    font(ctx, numberSize)
    ctx.fillText(ellipsize(ctx, number, textWidth), boxX + 40, MARGIN + 110)
    if (data.qr) {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(data.qr, boxX + BOX - 40 - QR, MARGIN + 40, QR, QR)
      ctx.imageSmoothingEnabled = true
      font(ctx, 30, 700)
      ctx.fillStyle = MUTED
      ctx.fillText('NASKENUJ', boxX + 40, MARGIN + HEADER - 110)
      ctx.fillText('PRE OBSAH', boxX + 40, MARGIN + HEADER - 70)
      ctx.fillStyle = INK
    }
  }
  // Text je v strede medzi logom a boxom.
  const titleLeft = left + logoWidth + (logoWidth ? 60 : 0)
  const titleRight = left + width - BOX - (BOX ? 60 : 0)
  const centerX = (titleLeft + titleRight) / 2
  const titleWidth = titleRight - titleLeft
  centered(ctx, 'FLIGHTCASE CONTENT', centerX, MARGIN + HEADER * 0.3, titleWidth, 140, 50)
  ctx.fillRect(centerX - titleWidth * 0.35, MARGIN + HEADER * 0.5 - 4, titleWidth * 0.7, 8)
  centered(ctx, data.caseName || 'OBSAH CASE', centerX, MARGIN + HEADER * 0.72, titleWidth, 96, 36)

  let y = MARGIN + HEADER + 70
  const contactSpace = data.footer ? 110 : 0
  const SUMMARY = 210
  const footerSpace = contactSpace + SUMMARY + 50
  const { columns, rows, others } = data.matrix
  // Ostatný obsah: karty, alebo pri veľa položkách zoznam. Miesto preň sa odloží vopred.
  const OTHER_LINE = 78
  const otherColumns = others.length > 8 ? 2 : 1
  const asCards = others.length > 0 && others.length <= CARD_LIMIT
  const cardRows = Math.ceil(others.length / cardColumns(others.length))
  const othersHeight = others.length === 0 ? 0 : asCards ? 160 + cardRows * 500 : 160 + Math.ceil(others.length / otherColumns) * OTHER_LINE

  // Káble: jedna tabuľka (dĺžka × typ), alebo pri „každý typ zvlášť“ tabuľka za každý typ pod sebou.
  const tables =
    data.layout === 'stacked' && columns.length > 1
      ? columns.map((column, index) => ({
          title: column.toUpperCase(),
          columns: [column],
          rows: rows.filter((row) => row.counts[index] > 0).map((row) => ({ lengthM: row.lengthM, counts: [row.counts[index]], ...(row.variants?.[index] ? { variants: [row.variants[index]] } : {}) })),
        }))
      : rows.length > 0
        ? [{ title: columns.length === 1 ? columns[0].toUpperCase() : 'KÁBLE PODĽA DĹŽKY', columns, rows }]
        : []
  const FIRST = 560
  const HEAD_ROW = 130
  const STRIP = 54
  const TABLE_EXTRA = 140 + HEAD_ROW + 70
  const totalRows = tables.reduce((sum, table) => sum + table.rows.length, 0)
  const rowHeight = Math.max(100, Math.min(360, (bottom - footerSpace - othersHeight - y - tables.length * TABLE_EXTRA) / Math.max(1, totalRows)))

  for (const table of tables) {
    y = sectionTitle(ctx, table.title, y)
    const columnWidth = (width - FIRST) / table.columns.length
    const tableHeight = HEAD_ROW + table.rows.length * rowHeight

    // Hlavička tabuľky (sivý pás).
    ctx.fillStyle = SOFT
    ctx.fillRect(left, y, width, HEAD_ROW)
    ctx.fillStyle = MUTED
    centered(ctx, 'FARBA / DĹŽKA', left + FIRST / 2, y + HEAD_ROW / 2, FIRST - 60, 50, 30)
    table.columns.forEach((column, index) => {
      const x = left + FIRST + index * columnWidth
      centered(ctx, table.columns.length === 1 ? 'POČET' : column.toUpperCase(), x + columnWidth / 2, y + HEAD_ROW / 2, columnWidth - 60, 56, 28)
    })
    ctx.fillStyle = INK

    table.rows.forEach((row, rowIndex) => {
      const rowY = y + HEAD_ROW + rowIndex * rowHeight
      if (rowIndex % 2 === 1) {
        ctx.fillStyle = '#f8f9fb'
        ctx.fillRect(left, rowY, width, rowHeight)
        ctx.fillStyle = INK
      }
      // Farba podľa typu kábla v prvom stĺpci, kde táto dĺžka je (typy môžu mať vlastné farby).
      const column = table.columns[row.counts.findIndex((count) => count > 0)]
      const color = findCableColor(data.colors, column, row.lengthM)
      const lengthText = `${formatNumber(row.lengthM)} m`
      const textWidth = FIRST - STRIP - 70
      const labelX = left + STRIP + (FIRST - STRIP) / 2
      if (color) {
        ctx.fillStyle = color.color
        ctx.fillRect(left, rowY, STRIP, rowHeight)
        if (color.name) {
          coloured(ctx, color.name.toUpperCase(), labelX, rowY + rowHeight * 0.3, textWidth, Math.min(64, rowHeight * 0.26), color.color)
          coloured(ctx, lengthText, labelX, rowY + rowHeight * 0.66, textWidth, Math.min(130, rowHeight * 0.46), color.color)
        } else {
          coloured(ctx, lengthText, labelX, rowY + rowHeight / 2, textWidth, Math.min(140, rowHeight * 0.5), color.color)
        }
      } else {
        centered(ctx, lengthText, labelX, rowY + rowHeight / 2, textWidth, Math.min(130, rowHeight * 0.5), 40)
      }
      row.counts.forEach((count, index) => {
        if (count === 0) return
        const x = left + FIRST + index * columnWidth
        const variant = row.variants?.[index]
        if (!variant) {
          countText(ctx, count, x + columnWidth / 2, rowY + rowHeight / 2, Math.min(150, rowHeight * 0.55))
          return
        }
        // Varianty (stereo, silent…) pod počtom menším písmom: „z toho 2× STEREO, 1× SILENT“.
        countText(ctx, count, x + columnWidth / 2, rowY + rowHeight * 0.4, Math.min(130, rowHeight * 0.45))
        ctx.fillStyle = MUTED
        centered(ctx, variant, x + columnWidth / 2, rowY + rowHeight * 0.78, columnWidth - 50, Math.min(46, rowHeight * 0.17), 22)
        ctx.fillStyle = INK
      })
    })

    // Mriežka až nakoniec, aby prekryla okraje farebných polí.
    ctx.strokeStyle = GRID
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(left + FIRST, y)
    ctx.lineTo(left + FIRST, y + tableHeight)
    for (let index = 1; index < table.columns.length; index++) {
      const x = left + FIRST + index * columnWidth
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + tableHeight)
    }
    for (let index = 0; index < table.rows.length; index++) {
      const rowY = y + HEAD_ROW + index * rowHeight
      ctx.moveTo(left + (index === 0 ? 0 : STRIP), rowY)
      ctx.lineTo(left + width, rowY)
    }
    ctx.stroke()
    ctx.strokeStyle = INK
    ctx.lineWidth = LINE
    ctx.strokeRect(left, y, width, tableHeight)
    y += tableHeight + 70
  }

  if (asCards) {
    y = sectionTitle(ctx, rows.length > 0 ? 'PRÍSLUŠENSTVO / REDUKCIE' : 'OBSAH', y)
    const perRow = cardColumns(others.length)
    const cardWidth = (width - CARD_GAP * (perRow - 1)) / perRow
    const cardHeight = Math.max(300, Math.min(rows.length > 0 ? 480 : 640, (bottom - footerSpace - y - CARD_GAP * (cardRows - 1)) / cardRows))
    const pad = 30
    others.forEach((item, index) => {
      const x = left + (index % perRow) * (cardWidth + CARD_GAP)
      const top = y + Math.floor(index / perRow) * (cardHeight + CARD_GAP)
      ctx.fillStyle = SOFT
      roundRect(ctx, x, top, cardWidth, cardHeight, 22)
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = GRID
      ctx.stroke()
      ctx.strokeStyle = INK
      ctx.lineWidth = LINE
      ctx.fillStyle = INK
      const nameSize = Math.max(34, Math.min(60, Math.floor(cardWidth / 6.5)))
      const nameBottom = wrapped(ctx, item.name, x + cardWidth / 2, top + pad, cardWidth - 2 * pad, nameSize)
      const countSize = Math.floor(nameSize * 1.7)
      const imageTop = nameBottom + 16
      const imageBottom = top + cardHeight - pad - countSize * 1.2
      const photo = item.photoPath ? data.photos?.get(item.photoPath) : undefined
      if (photo && imageBottom - imageTop > 40) {
        const { width: sourceWidth, height: sourceHeight } = sourceSize(photo)
        const scale = Math.min((cardWidth - 2 * pad) / sourceWidth, (imageBottom - imageTop) / sourceHeight)
        const w = sourceWidth * scale
        const h = sourceHeight * scale
        ctx.drawImage(photo, x + (cardWidth - w) / 2, imageTop + (imageBottom - imageTop - h) / 2, w, h)
      }
      countText(ctx, item.quantity, x + cardWidth / 2, top + cardHeight - pad - countSize * 0.45, countSize)
    })
  } else if (others.length > 0) {
    y = sectionTitle(ctx, rows.length > 0 ? 'OSTATNÝ OBSAH' : 'OBSAH', y)
    const gap = 80
    const columnWidth = (width - gap * (otherColumns - 1)) / otherColumns
    const perColumn = Math.ceil(others.length / otherColumns)
    // Bez tabuľky káblov má zoznam celú stranu, preto môže byť písmo väčšie.
    const lineHeight = Math.max(52, Math.min(110, (bottom - footerSpace - y) / perColumn))
    font(ctx, Math.floor(lineHeight * 0.66), 700)
    ctx.textBaseline = 'top'
    others.forEach((item, index) => {
      const column = Math.floor(index / perColumn)
      const text = item.quantity > 1 ? `${item.quantity}× ${item.name}` : item.name
      ctx.fillText(ellipsize(ctx, text, columnWidth), left + column * (columnWidth + gap), y + (index % perColumn) * lineHeight)
    })
  }

  // Súhrn dole: počet kusov, hmotnosť, kto kontroloval a kedy.
  const summaryY = bottom - contactSpace - SUMMARY
  ctx.lineWidth = 5
  roundRect(ctx, left, summaryY, width, SUMMARY, 24)
  ctx.stroke()
  ctx.lineWidth = LINE
  const cells: [string, string | null][] = [
    ['CELKOM KUSOV', String(data.totalPieces ?? 0)],
    ['HMOTNOSŤ', data.weightKg ? `${formatNumber(Math.round(data.weightKg * 10) / 10)} kg` : '—'],
    ['KONTROLOVAL', null],
    ['DÁTUM', null],
  ]
  const cellWidth = width / cells.length
  cells.forEach(([label, value], index) => {
    const x = left + index * cellWidth
    if (index > 0) {
      ctx.fillStyle = GRID
      ctx.fillRect(x, summaryY + 40, 3, SUMMARY - 80)
    }
    font(ctx, 36, 700)
    ctx.textBaseline = 'top'
    ctx.fillStyle = MUTED
    ctx.fillText(label, x + 50, summaryY + 40)
    ctx.fillStyle = INK
    if (value) {
      font(ctx, fitSize(ctx, value, cellWidth - 100, 84, 40))
      ctx.fillText(value, x + 50, summaryY + 92)
    } else {
      // Prázdna linka na ručné vyplnenie (podpis, dátum).
      ctx.fillRect(x + 50, summaryY + SUMMARY - 50, cellWidth - 100, 4)
    }
  })

  if (data.footer) centered(ctx, data.footer, SHEET_WIDTH / 2, bottom - 30, width, 52, 26)
}
