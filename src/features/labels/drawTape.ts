import { fitSize, font, INK, qrCanvas } from '@/features/cases/canvas'
import { qrUrl } from '@/features/scan/qr'
import type { TapeLabel, TapeMm } from './tape'

// Štítok na pásku ako obrázok: výška = šírka pásky, dĺžka podľa textu. Kreslí sa v 360 dpi (ostré aj po zmenšení).
const DPI = 360
export const mmToPx = (mm: number) => Math.round((mm / 25.4) * DPI)
/** Okraj pásky, kam tlačiareň netlačí (asi 1,5 mm z každej strany pri 12–18 mm). */
const EDGE_MM = 1.5

export async function drawTapeLabel(label: TapeLabel, tape: TapeMm) {
  const height = mmToPx(tape)
  const edge = mmToPx(EDGE_MM)
  const inner = height - edge * 2
  const gap = mmToPx(1.5)
  const measure = document.createElement('canvas').getContext('2d')!
  const titleMax = label.lines.length > 0 ? Math.round(inner * 0.5) : Math.round(inner * 0.75)
  const lineMax = label.lines.length > 0 ? Math.round((inner - titleMax) / label.lines.length) : 0
  font(measure, titleMax)
  const titleWidth = measure.measureText(label.title).width
  const lineWidths = label.lines.map((line) => {
    font(measure, lineMax, 600)
    return measure.measureText(line).width
  })
  const qrSize = label.qr ? inner : 0
  // Len QR (bez textu): štítok je presne taký dlhý ako QR s okrajmi, bez prázdneho miesta.
  const hasText = Boolean(label.title) || label.lines.length > 0
  const textWidth = hasText ? Math.max(titleWidth, ...lineWidths, mmToPx(10)) : 0
  const width = Math.round(edge * 2 + (qrSize ? qrSize + (hasText ? gap : 0) : 0) + textWidth)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = INK
  ctx.textBaseline = 'top'
  let x = edge
  if (label.qr) {
    const qr = await qrCanvas(qrUrl(label.qr, window.location.origin), qrSize, 0)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qr, x, edge, qrSize, qrSize)
    x += qrSize + gap
  }
  if (!hasText) return canvas
  const space = width - x - edge
  let y = edge
  const title = fitSize(ctx, label.title, space, titleMax, 10)
  font(ctx, title)
  ctx.fillText(label.title, x, label.lines.length === 0 ? (height - title) / 2 : y)
  y += title
  for (const line of label.lines) {
    font(ctx, Math.min(lineMax, fitSize(ctx, line, space, lineMax, 8)), 600)
    ctx.fillText(line, x, y)
    y += lineMax
  }
  return canvas
}
