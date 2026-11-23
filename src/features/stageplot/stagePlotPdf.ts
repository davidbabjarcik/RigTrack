import { ellipsize, font, INK, sourceSize } from '@/features/cases/canvas'
import { buildPdf, canvasJpeg, pageSizePt } from '@/features/cases/sheetPdf'
import { formatDate } from '@/lib/format'
import { channelLegend, itemText, KIND_INFO, printScale, type StageItem } from './model'

// PDF stage plánu: A4 alebo A3 na šírku, pôdorys v presnej mierke (1 : 25, 1 : 50…) s mierkou, legenda kanálov
// z input listu vpravo. Hlavička: logo, názov a kontakt firmy z Nastavení, akcia, termín, verzia. Čiernobielo čitateľné.

const W = 3508
const H = 2480
const M = 120
const MUTED = '#555555'
const PAPER_MM: Record<'A4' | 'A3', number> = { A4: 297, A3: 420 }

export type StagePlotPdfContext = {
  paper: 'A4' | 'A3'
  widthM: number
  depthM: number
  items: StageItem[]
  note: string
  version: number
  channels: { channel: number; name: string }[]
  companyName: string
  logo: CanvasImageSource | null
  contact: string
  event: { name: string; startsOn: string; endsOn: string; venue: string }
  generatedOn: string
}

function header(ctx: CanvasRenderingContext2D, data: StagePlotPdfContext) {
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
  ctx.fillText(ellipsize(ctx, `Stage plán – ${data.event.name}`, W - x - M), x, M + 55)
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
  return M + 300
}

function shape(ctx: CanvasRenderingContext2D, item: StageItem, s: number) {
  const info = KIND_INFO[item.kind]
  const w = item.w * s
  const d = item.d * s
  ctx.beginPath()
  if (info.shape === 'round') ctx.ellipse(0, 0, w / 2, d / 2, 0, 0, Math.PI * 2)
  else if (info.shape === 'wedge') {
    ctx.moveTo(-w / 2, -d / 2)
    ctx.lineTo(w / 2, -d / 2)
    ctx.lineTo((w / 2) * 0.7, d / 2)
    ctx.lineTo((-w / 2) * 0.7, d / 2)
    ctx.closePath()
  } else ctx.rect(-w / 2, -d / 2, w, d)
  if (info.shape === 'text') return
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  if (info.shape === 'hatch') {
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = '#888888'
    ctx.lineWidth = 3
    for (let offset = -w - d; offset < w + d; offset += 28) {
      ctx.beginPath()
      ctx.moveTo(offset - d, -d / 2)
      ctx.lineTo(offset + d, d / 2 + d)
      ctx.stroke()
    }
    ctx.restore()
    ctx.beginPath()
    ctx.rect(-w / 2, -d / 2, w, d)
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 5
  ctx.stroke()
}

/** Strana stage plánu (plátno A4 / A3 na šírku). */
export function stagePlotPage(data: StagePlotPdfContext): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'top'
  const top = header(ctx, data)
  const channelName = (channel: number) => data.channels.find((item) => item.channel === channel)?.name
  const legend = channelLegend(data.items, channelName)
  const sideW = legend.length > 0 || data.note ? 820 : 0
  const areaW = W - 2 * M - sideW - (sideW ? 80 : 0)
  const areaH = H - top - M - 160
  // Presná mierka na papieri: najbližšia „pekná“ mierka, pri ktorej sa pódium zmestí.
  const pxPerMm = W / PAPER_MM[data.paper]
  const fit = Math.min(areaW / (data.widthM + 1.6), areaH / (data.depthM + 1.4))
  const { nice } = printScale(fit, W, PAPER_MM[data.paper])
  const s = (pxPerMm * 1000) / nice
  const x0 = M + (areaW - data.widthM * s) / 2
  const y0 = top + 80

  ctx.strokeStyle = '#cccccc'
  ctx.lineWidth = 2
  for (let meter = 1; meter < data.widthM; meter++) {
    ctx.beginPath()
    ctx.moveTo(x0 + meter * s, y0)
    ctx.lineTo(x0 + meter * s, y0 + data.depthM * s)
    ctx.stroke()
  }
  for (let meter = 1; meter < data.depthM; meter++) {
    ctx.beginPath()
    ctx.moveTo(x0, y0 + meter * s)
    ctx.lineTo(x0 + data.widthM * s, y0 + meter * s)
    ctx.stroke()
  }
  ctx.strokeStyle = INK
  ctx.lineWidth = 10
  ctx.strokeRect(x0, y0, data.widthM * s, data.depthM * s)
  ctx.fillStyle = MUTED
  font(ctx, 36, 600)
  ctx.textAlign = 'center'
  ctx.fillText(`${data.widthM.toLocaleString('sk-SK')} m · zadná stena`, x0 + (data.widthM * s) / 2, y0 - 55)
  ctx.fillStyle = INK
  font(ctx, 48, 800)
  ctx.fillText('PUBLIKUM', x0 + (data.widthM * s) / 2, y0 + data.depthM * s + 30)
  ctx.save()
  ctx.translate(x0 - 45, y0 + (data.depthM * s) / 2)
  ctx.rotate(-Math.PI / 2)
  font(ctx, 36, 600)
  ctx.fillStyle = MUTED
  ctx.fillText(`${data.depthM.toLocaleString('sk-SK')} m`, 0, -20)
  ctx.restore()

  const order = (item: StageItem) => (item.kind === 'riser' ? 0 : item.kind === 'drums' ? 1 : item.kind === 'label' ? 3 : 2)
  for (const item of [...data.items].sort((a, b) => order(a) - order(b))) {
    ctx.save()
    ctx.translate(x0 + item.x * s, y0 + item.y * s)
    ctx.rotate((item.rot * Math.PI) / 180)
    shape(ctx, item, s)
    ctx.restore()
    const text = itemText(item, channelName)
    const size = Math.max(22, Math.min(46, item.d * s * 0.42, ((item.w * s) / Math.max(3, text.main.length)) * 1.7))
    ctx.fillStyle = INK
    font(ctx, size, 700)
    ctx.textBaseline = 'middle'
    ctx.fillText(text.main, x0 + item.x * s, y0 + item.y * s - (text.channel ? size * 0.45 : 0))
    if (text.channel) {
      font(ctx, size * 0.8, 600)
      ctx.fillText(text.channel, x0 + item.x * s, y0 + item.y * s + size * 0.55)
    }
    ctx.textBaseline = 'top'
  }
  ctx.textAlign = 'left'

  // Mierka: úsečka 1 m (a 5 m pri veľkých pódiách) a pomer na papieri.
  const barY = H - M - 60
  const meters = data.widthM >= 12 ? 5 : 1
  ctx.lineWidth = 6
  ctx.strokeStyle = INK
  ctx.beginPath()
  ctx.moveTo(M, barY)
  ctx.lineTo(M + meters * s, barY)
  ctx.moveTo(M, barY - 18)
  ctx.lineTo(M, barY + 18)
  ctx.moveTo(M + meters * s, barY - 18)
  ctx.lineTo(M + meters * s, barY + 18)
  ctx.stroke()
  font(ctx, 34, 600)
  ctx.fillStyle = INK
  ctx.fillText(`${meters} m · mierka 1 : ${nice} (${data.paper})`, M + meters * s + 30, barY - 18)

  if (sideW) {
    let y = top + 40
    const x = W - M - sideW
    if (legend.length > 0) {
      font(ctx, 44, 800)
      ctx.fillText('Kanály (input list)', x, y)
      y += 70
      font(ctx, 34, 500)
      for (const row of legend.slice(0, 40)) {
        ctx.fillText(ellipsize(ctx, `${row.channel}  ${row.name || row.label}  ·  ${row.kind}`, sideW), x, y)
        y += 48
      }
      if (legend.length > 40) ctx.fillText(`… a ďalšie (${legend.length - 40})`, x, y)
      y += 60
    }
    if (data.note) {
      font(ctx, 38, 800)
      ctx.fillText('Poznámka', x, y)
      y += 55
      font(ctx, 32, 500)
      for (const part of data.note.match(/.{1,40}(\s|$)/g) ?? [data.note]) {
        ctx.fillText(part.trim(), x, y)
        y += 42
      }
    }
  }
  return canvas
}

export async function stagePlotPdf(data: StagePlotPdfContext): Promise<Blob> {
  const image = await canvasJpeg(stagePlotPage(data), 0.92)
  const page = pageSizePt(data.paper, true)
  return buildPdf([{ ...image, page }], page)
}
