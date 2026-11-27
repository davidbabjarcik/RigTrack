import { ellipsize, font, INK, sourceSize } from '@/features/cases/canvas'
import { buildPdf, canvasJpeg, pageSizePt } from '@/features/cases/sheetPdf'
import { formatDate } from '@/lib/format'
import { partsOf, rackSummary, rackWarnings, slotInfo, topU, type FitSlot, type Sources } from './fit'
import { faceShapes, type Shape } from './faces'
import { CABLE_LABELS, cableSummary, endText, portsResolver, summaryText, type RackLink } from './links'
import { RACK_RAIL_LABELS, RACK_TYPE_LABELS, rackHeightMm, type RackDesign } from './model'

// PDF racku pre požičovňu / sklad: A4 na výšku pri 300 dpi, čitateľné aj čiernobielo (vzory namiesto farieb).
// Hlavička: logo a názov firmy z Nastavení, rack, akcia, dátum, kontakt, verzia.

const W = 2480
const H = 3508
const M = 140
const MUTED = '#555555'
const LINE = '#999999'

export type RackPdfContext = {
  rack: RackDesign
  slots: FitSlot[]
  links: RackLink[]
  sources: Sources
  companyName: string
  logo: CanvasImageSource | null
  contact: string
  event: { name: string; startsOn: string; endsOn: string } | null
  /** Sériové číslo kusu (z techniky alebo údajov po kusoch). */
  serialOf: (slot: FitSlot) => string
  generatedOn: string
}

function page() {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = INK
  ctx.textBaseline = 'top'
  return { canvas, ctx }
}

function header(ctx: CanvasRenderingContext2D, data: RackPdfContext, pageNo: number) {
  let x = M
  if (data.logo) {
    const { width, height } = sourceSize(data.logo)
    const scale = Math.min(520 / width, 200 / height)
    ctx.drawImage(data.logo, M, M, width * scale, height * scale)
    x = M + width * scale + 60
  }
  font(ctx, 46, 700)
  ctx.fillStyle = MUTED
  ctx.fillText(ellipsize(ctx, data.companyName, W - x - M), x, M)
  font(ctx, 80, 800)
  ctx.fillStyle = INK
  ctx.fillText(ellipsize(ctx, data.rack.name, W - x - M), x, M + 60)
  font(ctx, 40, 500)
  ctx.fillStyle = MUTED
  const when = data.event ? (data.event.startsOn === data.event.endsOn ? formatDate(data.event.startsOn) : `${formatDate(data.event.startsOn)} – ${formatDate(data.event.endsOn)}`) : ''
  const line = [data.event ? `Akcia: ${data.event.name}` : '', when, `Verzia ${data.rack.version}`, `Vytlačené ${formatDate(data.generatedOn)}`, pageNo > 1 ? `strana ${pageNo}` : ''].filter(Boolean).join(' · ')
  ctx.fillText(ellipsize(ctx, line, W - x - M), x, M + 160)
  if (data.contact) ctx.fillText(ellipsize(ctx, data.contact, W - x - M), x, M + 215)
  ctx.strokeStyle = INK
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(M, M + 290)
  ctx.lineTo(W - M, M + 290)
  ctx.stroke()
  ctx.fillStyle = INK
  return M + 330
}

/** Jeden pohľad (predok / zadok) v mierke: rám, čísla U, zariadenia s názvom; doplnky šrafované. */
function drawSide(ctx: CanvasRenderingContext2D, data: RackPdfContext, side: 'front' | 'rear', x: number, y: number, width: number, maxHeight: number) {
  const rowH = Math.min(70, maxHeight / data.rack.units)
  const height = rowH * data.rack.units
  font(ctx, 44, 800)
  ctx.fillText(side === 'front' ? 'PREDOK' : 'ZADOK', x, y)
  const top = y + 70
  const left = x + 70
  const inner = width - 70
  ctx.lineWidth = 8
  ctx.strokeStyle = INK
  ctx.strokeRect(left - 8, top - 8, inner + 16, height + 16)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = LINE
  font(ctx, 26, 600)
  ctx.textAlign = 'right'
  for (let u = 1; u <= data.rack.units; u++) {
    const rowTop = top + height - u * rowH
    ctx.fillStyle = MUTED
    ctx.fillText(String(u), left - 20, rowTop + rowH / 2 - 13)
    ctx.beginPath()
    ctx.moveTo(left, rowTop)
    ctx.lineTo(left + inner, rowTop)
    ctx.stroke()
  }
  ctx.textAlign = 'left'
  for (const slot of data.slots.filter((item) => item.side === side)) {
    const [first, last] = partsOf(slot)
    const sx = left + (first / 6) * inner + 4
    const sw = ((last - first + 1) / 6) * inner - 8
    const sy = top + height - topU(slot) * rowH + 4
    const sh = slot.heightU * rowH - 8
    const info = slotInfo(slot, data.sources)
    ctx.fillStyle = slot.accessory ? '#e6e6e6' : '#ffffff'
    ctx.fillRect(sx, sy, sw, sh)
    if (slot.accessory) {
      // Doplnky šrafované, aby sa dali odlíšiť aj čiernobielo.
      ctx.save()
      ctx.beginPath()
      ctx.rect(sx, sy, sw, sh)
      ctx.clip()
      ctx.strokeStyle = '#bbbbbb'
      ctx.lineWidth = 2
      for (let offset = -sh; offset < sw; offset += 24) {
        ctx.beginPath()
        ctx.moveTo(sx + offset, sy + sh)
        ctx.lineTo(sx + offset + sh, sy)
        ctx.stroke()
      }
      ctx.restore()
    }
    // Kresba panela (displeje, konektory…) svetlo a šedo, aby text ostal čitateľný aj čiernobielo.
    drawFace(ctx, faceShapes({ category: info.category, accessory: slot.accessory, side: 'front', heightU: slot.heightU, width: slot.width, name: `${info.name} ${info.subtitle}` }), sx, sy, sw, sh, slot.heightU)
    ctx.lineWidth = 4
    ctx.strokeStyle = INK
    ctx.strokeRect(sx, sy, sw, sh)
    ctx.fillStyle = INK
    const size = Math.max(20, Math.min(36, rowH * 0.5))
    font(ctx, size, 700)
    const label = ellipsize(ctx, info.name, sw - 24)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(sx + 6, sy + Math.max(6, sh / 2 - size / 2 - (info.subtitle && slot.heightU > 1 ? size / 2 : 0)) - 4, ctx.measureText(label).width + 12, size + 8)
    ctx.fillStyle = INK
    ctx.fillText(ellipsize(ctx, info.name, sw - 24), sx + 12, sy + Math.max(6, sh / 2 - size / 2 - (info.subtitle && slot.heightU > 1 ? size / 2 : 0)))
    if (info.subtitle && slot.heightU > 1) {
      font(ctx, size * 0.75, 500)
      ctx.fillStyle = MUTED
      ctx.fillText(ellipsize(ctx, info.subtitle, sw - 24), sx + 12, sy + sh / 2 + 4)
      ctx.fillStyle = INK
    }
  }
  return top + height + 30
}

type Row = { u: string; side: string; name: string; serial: string; kg: string; w: string }

function rowsOf(data: RackPdfContext): Row[] {
  return [...data.slots]
    .sort((a, b) => (a.side === b.side ? topU(b) - topU(a) || a.col - b.col : a.side === 'front' ? -1 : 1))
    .map((slot) => {
      const info = slotInfo(slot, data.sources)
      return {
        u: slot.heightU > 1 ? `${slot.bottomU}–${topU(slot)}` : String(slot.bottomU),
        side: slot.side === 'front' ? 'P' : 'Z',
        name: info.name + (info.subtitle ? ` (${info.subtitle})` : ''),
        serial: data.serialOf(slot),
        kg: info.weightKg !== null ? String(info.weightKg).replace('.', ',') : '',
        w: info.powerW !== null ? String(info.powerW) : '',
      }
    })
}

const COLUMNS: { key: keyof Row; label: string; width: number; right?: boolean }[] = [
  { key: 'u', label: 'U', width: 170 },
  { key: 'side', label: 'Strana', width: 170 },
  { key: 'name', label: 'Zariadenie', width: 1060 },
  { key: 'serial', label: 'Sériové č.', width: 400 },
  { key: 'kg', label: 'kg', width: 200, right: true },
  { key: 'w', label: 'W', width: 200, right: true },
]
const ROW = 64

function tableHeader(ctx: CanvasRenderingContext2D, y: number) {
  font(ctx, 34, 800)
  let x = M
  for (const column of COLUMNS) {
    ctx.textAlign = column.right ? 'right' : 'left'
    ctx.fillText(column.label, column.right ? x + column.width - 10 : x, y)
    x += column.width
  }
  ctx.textAlign = 'left'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(M, y + 50)
  ctx.lineTo(W - M, y + 50)
  ctx.stroke()
  return y + 66
}

function tableRow(ctx: CanvasRenderingContext2D, row: Row, y: number) {
  font(ctx, 32, 500)
  let x = M
  for (const column of COLUMNS) {
    ctx.textAlign = column.right ? 'right' : 'left'
    const text = ellipsize(ctx, row[column.key], column.width - 20)
    ctx.fillText(text, column.right ? x + column.width - 10 : x, y + 14)
    x += column.width
  }
  ctx.textAlign = 'left'
  ctx.strokeStyle = LINE
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(M, y + ROW)
  ctx.lineTo(W - M, y + ROW)
  ctx.stroke()
  ctx.strokeStyle = INK
  return y + ROW
}

/** Strany PDF racku (canvasy A4 na výšku). */
export function rackPages(data: RackPdfContext): HTMLCanvasElement[] {
  const pages: HTMLCanvasElement[] = []
  let { canvas, ctx } = page()
  let y = header(ctx, data, 1)

  font(ctx, 38, 500)
  ctx.fillStyle = MUTED
  const facts = [
    RACK_TYPE_LABELS[data.rack.rackType],
    `${data.rack.units} U (${rackHeightMm(data.rack.units)} mm)`,
    data.rack.depthMm ? `hĺbka ${data.rack.depthMm} mm` : '',
    RACK_RAIL_LABELS[data.rack.rails],
    data.rack.maxLoadKg !== null ? `nosnosť ${data.rack.maxLoadKg} kg` : '',
  ].filter(Boolean)
  ctx.fillText(facts.join(' · '), M, y)
  ctx.fillStyle = INK
  y += 80

  // Predok a zadok vedľa seba v mierke (rovnaká výška riadku).
  const columnWidth = (W - 2 * M - 120) / 2
  const sidesHeight = Math.min(1500, data.rack.units * 70)
  const bottom = Math.max(drawSide(ctx, data, 'front', M, y, columnWidth, sidesHeight), drawSide(ctx, data, 'rear', M + columnWidth + 120, y, columnWidth, sidesHeight))
  y = bottom + 20

  // Súhrn a varovania.
  const summary = rackSummary(data.rack, data.slots, data.sources)
  font(ctx, 38, 700)
  ctx.fillText(`Obsadené ${summary.usedU} U · voľné ${summary.freeU} U · obsah ${String(summary.contentsKg).replace('.', ',')} kg · spolu s rackom ${String(summary.totalKg).replace('.', ',')} kg · príkon ${summary.powerW} W (${String(summary.amps).replace('.', ',')} A pri 230 V)`, M, y)
  y += 70
  const warnings = rackWarnings(data.rack, data.slots, data.sources).filter((warning) => warning.level === 'warn')
  font(ctx, 32, 500)
  for (const warning of warnings.slice(0, 6)) {
    ctx.fillText(ellipsize(ctx, `⚠ ${warning.text}`, W - 2 * M), M, y)
    y += 48
  }
  y += 20

  // Tabuľka (pokračuje na ďalších stranách).
  y = tableHeader(ctx, y)
  for (const row of rowsOf(data)) {
    if (y + ROW > H - M - 200) {
      pages.push(canvas)
      ;({ canvas, ctx } = page())
      y = tableHeader(ctx, header(ctx, data, pages.length + 1))
    }
    y = tableRow(ctx, row, y)
  }

  // Káble: zoznam prepojení a súhrn pre balenie.
  if (data.links.length > 0) {
    const resolve = portsResolver((slot) => slotInfo(slot, data.sources))
    const lines = [
      ...data.links.map((link, index) => `${index + 1}. ${endText(data.slots, resolve, link.from, link.fromPort)} → ${endText(data.slots, resolve, link.to, link.toPort)} · ${CABLE_LABELS[link.cable]}${link.lengthM !== null ? ` ${String(link.lengthM).replace('.', ',')} m` : ''}${link.label ? ` · ${link.label}` : ''}`),
    ]
    const newPage = () => {
      pages.push(canvas)
      ;({ canvas, ctx } = page())
      y = header(ctx, data, pages.length + 1)
    }
    if (y + 220 > H - M) newPage()
    y += 40
    font(ctx, 36, 800)
    ctx.fillText(`Káble (${data.links.length})`, M, y)
    y += 56
    font(ctx, 30, 600)
    ctx.fillText(ellipsize(ctx, `Spolu: ${cableSummary(data.links).map((row) => summaryText(row)).join(', ')}`, W - 2 * M), M, y)
    y += 54
    font(ctx, 30, 500)
    for (const line of lines) {
      if (y + 46 > H - M - 100) {
        newPage()
        font(ctx, 30, 500)
      }
      ctx.fillText(ellipsize(ctx, line, W - 2 * M), M, y)
      y += 46
    }
  }

  if (data.rack.note) {
    if (y + 200 > H - M) {
      pages.push(canvas)
      ;({ canvas, ctx } = page())
      y = header(ctx, data, pages.length + 1)
    }
    y += 40
    font(ctx, 36, 800)
    ctx.fillText('Poznámky', M, y)
    font(ctx, 32, 500)
    let lineY = y + 56
    for (const line of data.rack.note.split('\n').slice(0, 12)) {
      ctx.fillText(ellipsize(ctx, line, W - 2 * M), M, lineY)
      lineY += 46
    }
  }
  pages.push(canvas)
  return pages
}

/** PDF racku (A4 na výšku). */
export async function rackPdf(data: RackPdfContext): Promise<Blob> {
  const images = await Promise.all(rackPages(data).map(async (canvas) => ({ ...(await canvasJpeg(canvas, 0.92)), page: pageSizePt('A4', false) })))
  return buildPdf(images, pageSizePt('A4', false))
}

/** Tvary panela do PDF: šedé, priehľadné, orezané na slot. */
function drawFace(ctx: CanvasRenderingContext2D, shapes: Shape[], sx: number, sy: number, sw: number, sh: number, heightU: number) {
  const perU = sh / Math.max(1, heightU)
  ctx.save()
  ctx.beginPath()
  ctx.rect(sx, sy, sw, sh)
  ctx.clip()
  ctx.globalAlpha = 0.35
  ctx.filter = 'grayscale(1)'
  // Plochu panela (prvý tvar) vynechá – PDF ostáva svetlé.
  for (const shape of shapes.slice(1)) {
    ctx.lineWidth = 2
    if (shape.t === 'rect') {
      ctx.fillStyle = shape.fill
      ctx.fillRect(sx + shape.x * sw, sy + shape.y * perU, shape.w * sw, shape.h * perU)
      if (shape.stroke) {
        ctx.strokeStyle = shape.stroke
        ctx.strokeRect(sx + shape.x * sw, sy + shape.y * perU, shape.w * sw, shape.h * perU)
      }
    } else if (shape.t === 'circle') {
      ctx.beginPath()
      ctx.arc(sx + shape.x * sw, sy + shape.y * perU, shape.r * perU, 0, Math.PI * 2)
      ctx.fillStyle = shape.fill
      ctx.fill()
      if (shape.stroke) {
        ctx.strokeStyle = shape.stroke
        ctx.stroke()
      }
    } else {
      ctx.beginPath()
      ctx.moveTo(sx + shape.x1 * sw, sy + shape.y1 * perU)
      ctx.lineTo(sx + shape.x2 * sw, sy + shape.y2 * perU)
      ctx.strokeStyle = shape.stroke
      ctx.lineWidth = (shape.width ?? 1) * 2
      ctx.stroke()
    }
  }
  ctx.restore()
}
