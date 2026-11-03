import { stampGenerated } from '@/features/cases/canvas'
// Plagát inventára nakreslený do obrázka (A4, 150 dpi): z neho je náhľad, tlač, PDF aj PNG – všade rovnaký.
// Čierno-sivý na bielom papieri; rozmery v mm sa prepočítajú na pixely.

import type { PosterSection } from './poster'

export type PosterInput = {
  title: string
  subtitle: string
  notes: string[]
  portrait: boolean
  sections: PosterSection[]
  /** Fotky podľa cesty v Storage. */
  photos: Map<string, CanvasImageSource & { width: number; height: number }>
  logo: (CanvasImageSource & { width: number; height: number }) | null
  companyName: string
}

const DPI = 150
const PX_PER_MM = DPI / 25.4
const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const INK = '#0f172a'
const GRAY = '#64748b'
const LINE = '#cbd5e1'
const LIGHT = '#e2e8f0'

const M = 10 // okraj
const GAP = 4 // medzi časťami
const TILE_H = 26
const TILE_GAP = 3
const TILE_MIN_W = 55
const HEADER_H = 24 // hlavička s čiarou
const FOOTER_H = 13

export const posterPageMm = (portrait: boolean) => (portrait ? { w: 210, h: 297 } : { w: 297, h: 210 })
export const posterPagePx = (portrait: boolean) => {
  const { w, h } = posterPageMm(portrait)
  return { width: Math.round(w * PX_PER_MM), height: Math.round(h * PX_PER_MM) }
}

type Block = { section: PosterSection; tiles: PosterSection['tiles']; number: number; continued: boolean; wide: boolean }
type Row = { blocks: Block[]; height: number }

const tileCols = (width: number, wide: boolean) => (wide ? Math.max(1, Math.floor((width - 8 + TILE_GAP) / (TILE_MIN_W + TILE_GAP))) : 2)
const blockHeight = (count: number, cols: number) => {
  const rows = Math.max(1, Math.ceil(count / cols))
  return 4 + 7 + 3 + rows * TILE_H + (rows - 1) * TILE_GAP + 4
}

/**
 * Rozloží časti na strany: na šírku malé časti (do 4 dlaždíc) po dvoch vedľa seba, veľké cez celú šírku; na výšku
 * všetko pod sebou. Časť, ktorá sa nezmestí ani na prázdnu stranu, sa rozdelí (pokračuje na ďalšej).
 */
export function layoutPoster(sections: PosterSection[], portrait: boolean, hasNotes: boolean) {
  const page = posterPageMm(portrait)
  const contentW = page.w - 2 * M
  const halfW = (contentW - GAP) / 2
  const usable = page.h - 2 * M - HEADER_H - (hasNotes ? FOOTER_H + GAP : 0)
  const narrow = portrait ? [] : sections.filter((section) => section.tiles.length <= 4)

  // Riadky: buď jedna široká časť, alebo dve malé vedľa seba.
  const rows: Row[] = []
  let pending: Block | null = null
  sections.forEach((section, index) => {
    const wide = portrait || section.tiles.length > 4 || (narrow.length % 2 === 1 && narrow.at(-1) === section)
    if (!wide) {
      const block: Block = { section, tiles: section.tiles, number: index + 1, continued: false, wide: false }
      if (pending) {
        rows.push({ blocks: [pending, block], height: Math.max(blockHeight(pending.tiles.length, 2), blockHeight(block.tiles.length, 2)) })
        pending = null
      } else pending = block
      return
    }
    // Veľká časť: po kúskoch, ktoré sa zmestia na stranu.
    const cols = tileCols(contentW, true)
    const maxRows = Math.max(1, Math.floor((usable - 18 + TILE_GAP) / (TILE_H + TILE_GAP)))
    for (let start = 0; start < section.tiles.length; start += maxRows * cols) {
      const tiles = section.tiles.slice(start, start + maxRows * cols)
      rows.push({ blocks: [{ section, tiles, number: index + 1, continued: start > 0, wide: true }], height: blockHeight(tiles.length, cols) })
    }
  })
  if (pending) rows.push({ blocks: [pending], height: blockHeight((pending as Block).tiles.length, 2) })

  // Strany: riadky pod sebou, kým sa zmestia.
  const pages: Row[][] = [[]]
  let used = 0
  for (const row of rows) {
    const need = (pages.at(-1)!.length > 0 ? GAP : 0) + row.height
    if (pages.at(-1)!.length > 0 && used + need > usable) {
      pages.push([])
      used = 0
    }
    used += (pages.at(-1)!.length > 0 ? GAP : 0) + row.height
    pages.at(-1)!.push(row)
  }
  return { pages, contentW, halfW, page }
}

/** Nakreslí plagát; vráti jedno plátno na každú stranu. */
export function renderPoster(input: PosterInput): HTMLCanvasElement[] {
  const { pages, contentW, halfW, page } = layoutPoster(input.sections, input.portrait, input.notes.length > 0)
  const size = posterPagePx(input.portrait)
  return pages.map((rows, pageIndex) => {
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')!
    ctx.scale(PX_PER_MM, PX_PER_MM)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, page.w, page.h)
    ctx.textBaseline = 'alphabetic'

    drawHeader(ctx, input, page.w)
    let y = M + HEADER_H
    for (const row of rows) {
      let x = M
      for (const block of row.blocks) {
        const width = block.wide ? contentW : halfW
        drawBlock(ctx, input, block, x, y, width, row.height)
        x += width + GAP
      }
      y += row.height + GAP
    }
    if (input.notes.length > 0) drawFooter(ctx, input.notes, page)
    if (pages.length > 1) {
      setFont(ctx, 500, 3)
      ctx.fillStyle = GRAY
      ctx.textAlign = 'right'
      ctx.fillText(`${pageIndex + 1} / ${pages.length}`, page.w - M, page.h - 4)
      ctx.textAlign = 'left'
    }
    // Dátum vygenerovania (v pixeloch, mimo mierky mm).
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    stampGenerated(canvas, new Date(), 'left')
    return canvas
  })
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, sizeMm: number) {
  ctx.font = `${weight} ${sizeMm}px ${FONT}`
}

function spaced(ctx: CanvasRenderingContext2D, spacingMm: number) {
  // letterSpacing nepozná každý prehliadač; bez neho je text len bez rozostupov.
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacingMm}px`
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

/** Text do najviac `lines` riadkov (po slovách), posledný skrátený. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lines: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const out: string[] = []
  let line = ''
  for (const [index, word] of words.entries()) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next
      continue
    }
    out.push(line)
    line = word
    if (out.length === lines - 1) {
      line = words.slice(index).join(' ')
      break
    }
  }
  if (line) out.push(line)
  return out.slice(0, lines).map((value, index, all) => (index === all.length - 1 ? fitText(ctx, value, maxWidth) : value))
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Obrázok vpísaný do štvorca (celý, bez orezania). */
function drawContain(ctx: CanvasRenderingContext2D, image: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / image.width, h / image.height)
  const dw = image.width * scale
  const dh = image.height * scale
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function drawHeader(ctx: CanvasRenderingContext2D, input: PosterInput, pageW: number) {
  let x = M
  const top = M
  if (input.logo) {
    const h = 16
    const w = Math.min(60, (input.logo.width / input.logo.height) * h)
    drawContain(ctx, input.logo, x, top, w, h)
    x += w + 6
  }
  const right = pageW - M
  let companyW = 0
  if (!input.logo && input.companyName) {
    setFont(ctx, 600, 4)
    spaced(ctx, 1)
    companyW = Math.min(70, ctx.measureText(input.companyName.toUpperCase()).width)
    ctx.fillStyle = GRAY
    ctx.textAlign = 'right'
    ctx.fillText(fitText(ctx, input.companyName.toUpperCase(), 70), right, top + 10)
    ctx.textAlign = 'left'
    spaced(ctx, 0)
  }
  const [main, ...rest] = input.title.split('–')
  const first = main.trim().toUpperCase()
  const second = rest.join('–').trim().toUpperCase()
  const maxW = right - x - (companyW ? companyW + 6 : 0)
  let fontMm = input.portrait ? 10 : 12
  const measure = () => {
    setFont(ctx, 900, fontMm)
    return ctx.measureText(second ? `${first} – ${second}` : first).width
  }
  while (fontMm > 5 && measure() > maxW) fontMm -= 0.5
  const baseline = top + (input.subtitle ? fontMm * 0.85 : 8 + fontMm * 0.35)
  ctx.fillStyle = INK
  ctx.fillText(first, x, baseline)
  if (second) {
    ctx.fillStyle = GRAY
    ctx.fillText(` – ${second}`, x + ctx.measureText(first).width, baseline)
  }
  if (input.subtitle) {
    setFont(ctx, 500, 3.8)
    spaced(ctx, 0.8)
    ctx.fillStyle = GRAY
    ctx.fillText(fitText(ctx, input.subtitle.toUpperCase(), maxW), x, top + 15.5)
    spaced(ctx, 0)
  }
  ctx.fillStyle = INK
  ctx.fillRect(M, top + 19.5, pageW - 2 * M, 0.5)
}

function drawBlock(ctx: CanvasRenderingContext2D, input: PosterInput, block: Block, x: number, y: number, width: number, height: number) {
  ctx.strokeStyle = LINE
  ctx.lineWidth = 0.3
  roundRect(ctx, x, y, width, height, 3)
  ctx.stroke()

  // Hlavička: číslo, názov, spolu kusov.
  const hx = x + 4
  const hy = y + 4
  ctx.fillStyle = INK
  roundRect(ctx, hx, hy, 7, 7, 1.5)
  ctx.fill()
  setFont(ctx, 700, 4)
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.fillText(String(block.number), hx + 3.5, hy + 5)
  ctx.textAlign = 'right'
  setFont(ctx, 500, 3.4)
  ctx.fillStyle = GRAY
  const total = `spolu ${block.section.total} ks`
  ctx.fillText(total, x + width - 4, hy + 5)
  const totalW = ctx.measureText(total).width
  ctx.textAlign = 'left'
  setFont(ctx, 700, 4.8)
  spaced(ctx, 0.3)
  ctx.fillStyle = INK
  ctx.fillText(fitText(ctx, `${block.section.title}${block.continued ? ' (pokračovanie)' : ''}`.toUpperCase(), width - 8 - 10 - totalW - 4), hx + 10, hy + 5.4)
  spaced(ctx, 0)

  // Dlaždice.
  const cols = tileCols(width, block.wide)
  const tileW = (width - 8 - (cols - 1) * TILE_GAP) / cols
  block.tiles.forEach((tile, index) => {
    const tx = x + 4 + (index % cols) * (tileW + TILE_GAP)
    const ty = y + 4 + 7 + 3 + Math.floor(index / cols) * (TILE_H + TILE_GAP)
    ctx.strokeStyle = LIGHT
    ctx.lineWidth = 0.3
    roundRect(ctx, tx, ty, tileW, TILE_H, 2)
    ctx.stroke()

    const photo = input.photos.get(tile.photoPath)
    const photoSize = 20
    if (photo) drawContain(ctx, photo, tx + tileW - 3 - photoSize, ty + (TILE_H - photoSize) / 2, photoSize, photoSize)
    const textW = tileW - 6 - (photo ? photoSize + 2 : 0)
    const left = tx + 3

    setFont(ctx, 900, 10)
    ctx.fillStyle = INK
    const count = String(tile.count)
    ctx.fillText(count, left, ty + 11)
    const countW = ctx.measureText(count).width
    setFont(ctx, 700, 5.5)
    ctx.fillStyle = GRAY
    ctx.fillText('×', left + countW + 0.6, ty + 11)

    let line = ty + 11
    if (tile.detail) {
      setFont(ctx, 700, 4.4)
      ctx.fillStyle = INK
      line += 5.5
      ctx.fillText(fitText(ctx, tile.detail, textW), left, line)
    }
    line += 1.8
    ctx.fillStyle = LINE
    ctx.fillRect(left, line, Math.min(textW, 40), 0.25)
    setFont(ctx, 600, 3)
    spaced(ctx, 0.2)
    ctx.fillStyle = '#334155'
    const maxLines = tile.detail ? 2 : 3
    wrap(ctx, tile.name.toUpperCase(), textW, maxLines).forEach((text, lineIndex) => ctx.fillText(text, left, line + 3.6 + lineIndex * 3.4))
    spaced(ctx, 0)
  })
}

function drawFooter(ctx: CanvasRenderingContext2D, notes: string[], page: { w: number; h: number }) {
  const y = page.h - M - FOOTER_H
  ctx.strokeStyle = LINE
  ctx.lineWidth = 0.3
  roundRect(ctx, M, y, page.w - 2 * M, FOOTER_H, 3)
  ctx.stroke()
  const slot = (page.w - 2 * M - 10) / notes.length
  setFont(ctx, 600, 3.3)
  spaced(ctx, 0.3)
  notes.forEach((note, index) => {
    const x = M + 5 + index * slot
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.arc(x + 1, y + FOOTER_H / 2, 1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillText(fitText(ctx, note.toUpperCase(), slot - 6), x + 3.5, y + FOOTER_H / 2 + 1.2)
  })
  spaced(ctx, 0)
}
