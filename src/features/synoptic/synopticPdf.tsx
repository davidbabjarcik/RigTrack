import { renderToStaticMarkup } from 'react-dom/server'
import { ellipsize, font, INK, sourceSize } from '@/features/cases/canvas'
import { buildPdf, canvasJpeg, pageSizePt } from '@/features/cases/sheetPdf'
import { formatDate } from '@/lib/format'
import { bounds, cableSummary, type SynLink, type SynNode } from './model'
import { SynopticSvg } from './SynopticSvg'

// PDF synoptiky: A4 alebo A3 na šírku – kresba zapojenia prispôsobená ploche a vpravo súhrn káblov (počet, metre).
// Hlavička: logo, názov a kontakt firmy z Nastavení, akcia, termín, verzia.

const W = 3508
const H = 2480
const M = 120
const MUTED = '#555555'

export type SynopticPdfContext = {
  paper: 'A4' | 'A3'
  nodes: SynNode[]
  links: SynLink[]
  names: Record<string, string>
  note: string
  version: number
  companyName: string
  logo: CanvasImageSource | null
  contact: string
  event: { name: string; startsOn: string; endsOn: string; venue: string }
  generatedOn: string
}

async function svgImage(data: SynopticPdfContext, width: number, height: number) {
  const markup = renderToStaticMarkup(<SynopticSvg nodes={data.nodes} links={data.links} names={data.names} />)
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="Arial, Helvetica, sans-serif" color="#000000" `)
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function synopticPage(data: SynopticPdfContext): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'

  let x = M
  if (data.logo) {
    const { width, height } = sourceSize(data.logo)
    const scale = Math.min(480 / width, 170 / height)
    ctx.drawImage(data.logo, M, M, width * scale, height * scale)
    x = M + width * scale + 60
  }
  font(ctx, 42, 700)
  ctx.fillStyle = MUTED
  ctx.fillText(ellipsize(ctx, data.companyName, W - x - M), x, M)
  font(ctx, 76, 800)
  ctx.fillStyle = INK
  ctx.fillText(ellipsize(ctx, `Synoptika – ${data.event.name}`, W - x - M), x, M + 55)
  font(ctx, 38, 500)
  ctx.fillStyle = MUTED
  const when = data.event.startsOn === data.event.endsOn ? formatDate(data.event.startsOn) : `${formatDate(data.event.startsOn)} – ${formatDate(data.event.endsOn)}`
  ctx.fillText(ellipsize(ctx, [when, data.event.venue, `Verzia ${data.version}`, `Vytlačené ${formatDate(data.generatedOn)}`].filter(Boolean).join(' · '), W - x - M), x, M + 150)
  if (data.contact) ctx.fillText(ellipsize(ctx, data.contact, W - x - M), x, M + 200)
  ctx.strokeStyle = INK
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(M, M + 265)
  ctx.lineTo(W - M, M + 265)
  ctx.stroke()
  const top = M + 320

  const summary = cableSummary(data.links)
  const sideW = summary.length > 0 || data.note ? 760 : 0
  const areaW = W - 2 * M - (sideW ? sideW + 80 : 0)
  const areaH = H - top - M
  const box = bounds(data.nodes)
  const scale = Math.min(areaW / box.width, areaH / box.height, 4)
  const image = await svgImage(data, box.width * scale, box.height * scale)
  ctx.drawImage(image, M, top, box.width * scale, box.height * scale)

  if (sideW) {
    let y = top
    const left = W - M - sideW
    ctx.fillStyle = INK
    if (summary.length > 0) {
      font(ctx, 44, 800)
      ctx.fillText('Káble', left, y)
      y += 70
      font(ctx, 34, 500)
      for (const row of summary.slice(0, 30)) {
        const meters = row.meters ? `${row.meters.toLocaleString('sk-SK')} m` : ''
        ctx.fillText(ellipsize(ctx, [`${row.pieces}× ${row.cable}`, meters, row.missing ? `${row.missing}× bez dĺžky` : ''].filter(Boolean).join(' · '), sideW), left, y)
        y += 48
      }
      y += 50
    }
    if (data.note) {
      font(ctx, 38, 800)
      ctx.fillText('Poznámka', left, y)
      y += 55
      font(ctx, 32, 500)
      for (const part of data.note.match(/.{1,40}(\s|$)/g) ?? [data.note]) {
        ctx.fillText(part.trim(), left, y)
        y += 42
      }
    }
  }
  return canvas
}

export async function synopticPdf(data: SynopticPdfContext): Promise<Blob> {
  const image = await canvasJpeg(await synopticPage(data), 0.92)
  const page = pageSizePt(data.paper, true)
  return buildPdf([{ ...image, page }], page)
}
