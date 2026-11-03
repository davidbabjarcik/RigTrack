// IP / MAC tabuľka nakreslená do obrázka (A4 / A5, na výšku / na šírku, 150 dpi) – náhľad, tlač, PDF aj PNG sú rovnaké.

import { stampGenerated } from '@/features/cases/canvas'

export type AddressPrintRow = { ip: string; mac: string; name: string; detail: string; network: string; duplicate: boolean; kind: 'equipment' | 'device' | 'guest' }
export type AddressPrintInput = {
  mode: 'ip' | 'mac'
  rows: AddressPrintRow[]
  paper: 'A4' | 'A5'
  landscape: boolean
  companyName: string
  network: string
}

const PX_PER_MM = 150 / 25.4
const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const MONO = "ui-monospace, 'Cascadia Mono', Consolas, monospace"

export function addressPageMm(paper: 'A4' | 'A5', landscape: boolean) {
  const [w, h] = paper === 'A5' ? [148, 210] : [210, 297]
  return landscape ? { w: h, h: w } : { w, h }
}

const KIND_LABELS: Record<AddressPrintRow['kind'], string> = { equipment: 'technika', device: 'zariadenie člena', guest: 'hosť' }

function fit(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

/** Strany tabuľky: hlavička s názvom, firmou, sieťou a dátumom, riadky striedavo podfarbené, duplicitné IP červené. */
export function renderAddressPages(input: AddressPrintInput): HTMLCanvasElement[] {
  const page = addressPageMm(input.paper, input.landscape)
  const scale = input.paper === 'A5' ? 0.82 : 1
  const margin = 10 * scale
  const rowH = 7.2 * scale
  const headerH = 24 * scale
  const tableTop = margin + headerH + 8 * scale
  const perPage = Math.max(1, Math.floor((page.h - tableTop - margin - 6) / rowH))
  const pages: AddressPrintRow[][] = []
  for (let i = 0; i < Math.max(1, input.rows.length); i += perPage) pages.push(input.rows.slice(i, i + perPage))
  const width = page.w - margin * 2
  // Stĺpce: hlavná adresa, druhá adresa, zariadenie (najširšie), druh, sieť.
  const cols = input.landscape
    ? [0.17, 0.2, 0.33, 0.13, 0.17]
    : [0.2, 0.24, 0.34, 0.0, 0.22]
  const headers = input.mode === 'ip' ? ['IP adresa', 'MAC', 'Zariadenie', 'Druh', 'Sieť'] : ['MAC adresa', 'IP', 'Zariadenie', 'Druh', 'Sieť']

  return pages.map((rows, pageIndex) => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(page.w * PX_PER_MM)
    canvas.height = Math.round(page.h * PX_PER_MM)
    const ctx = canvas.getContext('2d')!
    ctx.scale(PX_PER_MM, PX_PER_MM)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, page.w, page.h)

    // Hlavička: tmavý pás s názvom a údajmi.
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.roundRect(margin, margin, width, headerH, 3 * scale)
    ctx.fill()
    ctx.fillStyle = '#f59e0b'
    ctx.fillRect(margin, margin + headerH - 1.2 * scale, width, 1.2 * scale)
    ctx.fillStyle = '#ffffff'
    ctx.font = `800 ${9 * scale}px ${FONT}`
    ctx.fillText(input.mode === 'ip' ? 'IP TABUĽKA' : 'MAC ADRESY', margin + 6 * scale, margin + 11 * scale)
    ctx.font = `500 ${3.6 * scale}px ${FONT}`
    ctx.fillStyle = '#cbd5e1'
    ctx.fillText(fit(ctx, [input.companyName, input.network || 'všetky siete', `${input.rows.length} ${input.rows.length === 1 ? 'zariadenie' : 'zariadení'}`].join('  ·  '), width - 12 * scale), margin + 6 * scale, margin + 18 * scale)

    // Tabuľka.
    let x = margin
    const xs = cols.map((part) => {
      const start = x
      x += part * width
      return start
    })
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(margin, tableTop - rowH, width, rowH)
    ctx.font = `700 ${3.3 * scale}px ${FONT}`
    ctx.fillStyle = '#334155'
    headers.forEach((title, index) => {
      if (cols[index] > 0) ctx.fillText(title.toUpperCase(), xs[index] + 2 * scale, tableTop - rowH / 2 + 1.2 * scale)
    })
    rows.forEach((row, index) => {
      const y = tableTop + index * rowH
      if (index % 2 === 1) {
        ctx.fillStyle = '#f8fafc'
        ctx.fillRect(margin, y, width, rowH)
      }
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(margin, y + rowH - 0.2, width, 0.2)
      const base = y + rowH / 2 + 1.3 * scale
      const main = input.mode === 'ip' ? row.ip : row.mac
      const second = input.mode === 'ip' ? row.mac : row.ip
      ctx.font = `700 ${3.8 * scale}px ${MONO}`
      ctx.fillStyle = row.duplicate && input.mode === 'ip' ? '#dc2626' : '#0f172a'
      ctx.fillText(fit(ctx, main || '—', cols[0] * width - 3 * scale), xs[0] + 2 * scale, base)
      ctx.font = `500 ${3.3 * scale}px ${MONO}`
      ctx.fillStyle = '#475569'
      ctx.fillText(fit(ctx, second || '—', cols[1] * width - 3 * scale), xs[1] + 2 * scale, base)
      ctx.font = `600 ${3.5 * scale}px ${FONT}`
      ctx.fillStyle = '#0f172a'
      const nameW = cols[2] * width - 3 * scale
      const name = fit(ctx, row.name, nameW)
      ctx.fillText(name, xs[2] + 2 * scale, base)
      if (cols[3] > 0) {
        ctx.font = `400 ${3.1 * scale}px ${FONT}`
        ctx.fillStyle = '#64748b'
        ctx.fillText(fit(ctx, KIND_LABELS[row.kind], cols[3] * width - 3 * scale), xs[3] + 2 * scale, base)
      }
      ctx.font = `400 ${3.2 * scale}px ${FONT}`
      ctx.fillStyle = '#334155'
      ctx.fillText(fit(ctx, row.network || '—', cols[4] * width - 3 * scale), xs[4] + 2 * scale, base)
    })
    if (rows.length === 0) {
      ctx.font = `500 ${4 * scale}px ${FONT}`
      ctx.fillStyle = '#64748b'
      ctx.fillText('Žiadne adresy.', margin + 2 * scale, tableTop + rowH)
    }

    if (pages.length > 1) {
      ctx.font = `500 ${3 * scale}px ${FONT}`
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'center'
      ctx.fillText(`${pageIndex + 1} / ${pages.length}`, page.w / 2, page.h - 4)
      ctx.textAlign = 'left'
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    stampGenerated(canvas)
    return canvas
  })
}
