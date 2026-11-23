import { renderToStaticMarkup } from 'react-dom/server'
import { ellipsize, font, INK, sourceSize } from '@/features/cases/canvas'
import { buildPdf, canvasJpeg, pageSizePt } from '@/features/cases/sheetPdf'
import { formatDate } from '@/lib/format'
import { analyze, formatMhz, RF_KIND_LABELS, toKhz, tvChannelOf, type RfChannel, type RfSettings } from './rf'
import { Spectrum } from './Spectrum'

// PDF HF plánu: A4 na šírku – hlavička firmy z Nastavení, spektrum, tabuľka kanálov (frekvencia, TV kanál, pásmo, stav),
// nastavenia kontroly a vylúčené TV kanály.

const W = 3508
const H = 2480
const M = 120
const MUTED = '#555555'

export type RfPdfContext = {
  channels: RfChannel[]
  settings: RfSettings
  excludedTv: number[]
  place: string
  note: string
  version: number
  names: Record<string, string>
  companyName: string
  logo: CanvasImageSource | null
  contact: string
  event: { name: string; startsOn: string; endsOn: string; venue: string }
  generatedOn: string
}

async function spectrumImage(data: RfPdfContext, width: number) {
  const markup = renderToStaticMarkup(<Spectrum channels={data.channels} settings={data.settings} excludedTv={data.excludedTv} />)
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${(width * 120) / 1000}" font-family="Arial, Helvetica, sans-serif" color="#000000" `)
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

export async function rfPages(data: RfPdfContext): Promise<HTMLCanvasElement[]> {
  const issues = analyze(data.channels, data.settings, data.excludedTv)
  const sorted = [...data.channels].sort((a, b) => (a.freq_mhz ?? 1e9) - (b.freq_mhz ?? 1e9))
  const pages: HTMLCanvasElement[] = []
  const rowH = 52
  let index = 0
  while (index < sorted.length || pages.length === 0) {
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
    ctx.fillText(ellipsize(ctx, `HF frekvenčný plán – ${data.event.name}`, W - x - M), x, M + 55)
    font(ctx, 38, 500)
    ctx.fillStyle = MUTED
    const when = data.event.startsOn === data.event.endsOn ? formatDate(data.event.startsOn) : `${formatDate(data.event.startsOn)} – ${formatDate(data.event.endsOn)}`
    ctx.fillText(ellipsize(ctx, [when, data.place || data.event.venue, `Verzia ${data.version}`, `Vytlačené ${formatDate(data.generatedOn)}`, pages.length > 0 ? `strana ${pages.length + 1}` : ''].filter(Boolean).join(' · '), W - x - M), x, M + 150)
    if (data.contact) ctx.fillText(ellipsize(ctx, data.contact, W - x - M), x, M + 200)
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(M, M + 265)
    ctx.lineTo(W - M, M + 265)
    ctx.stroke()
    let y = M + 300
    if (pages.length === 0) {
      const image = await spectrumImage(data, W - 2 * M)
      ctx.drawImage(image, M, y, W - 2 * M, ((W - 2 * M) * 120) / 1000)
      y += ((W - 2 * M) * 120) / 1000 + 30
      font(ctx, 34, 500)
      ctx.fillStyle = INK
      const fifth = data.settings.fifth ? `, IM 5. rádu ±${data.settings.imd5_khz} kHz` : ''
      ctx.fillText(ellipsize(ctx, `Odstup nosných ${data.settings.spacing_khz} kHz · IM 3. rádu (2 a 3 vysielače) ±${data.settings.imd3_khz} kHz${fifth} · vylúčené TV kanály: ${data.excludedTv.join(', ') || 'žiadne'}`, W - 2 * M), M, y)
      y += 70
    }
    const cols = [M, M + 700, M + 1000, M + 1350, M + 1550, M + 2000]
    font(ctx, 34, 800)
    ctx.fillStyle = INK
    ;['Kanál', 'Druh', 'Frekvencia', 'TV', 'Pásmo (MHz)', 'Stav / technika'].forEach((title, column) => ctx.fillText(title, cols[column], y))
    y += rowH
    ctx.lineWidth = 2
    font(ctx, 34, 500)
    while (index < sorted.length && y + rowH < H - M) {
      const channel = sorted[index]
      const khz = channel.freq_mhz === null ? null : toKhz(channel.freq_mhz)
      const list = (issues.get(channel.id) ?? []).filter((issue) => issue.kind !== 'missing')
      ctx.strokeStyle = '#cccccc'
      ctx.beginPath()
      ctx.moveTo(M, y - 8)
      ctx.lineTo(W - M, y - 8)
      ctx.stroke()
      ctx.fillStyle = INK
      ctx.fillText(ellipsize(ctx, channel.name, 680), cols[0], y)
      ctx.fillText(RF_KIND_LABELS[channel.kind], cols[1], y)
      font(ctx, 36, 800)
      ctx.fillText(khz === null ? '—' : `${formatMhz(khz)}`, cols[2], y)
      font(ctx, 34, 500)
      ctx.fillText(khz === null ? '' : String(tvChannelOf(khz) ?? ''), cols[3], y)
      ctx.fillText(`${channel.min_mhz}–${channel.max_mhz}`, cols[4], y)
      const status = list.length > 0 ? `! ${list.map((issue) => issue.text).join('; ')}` : [channel.equipment_id ? data.names[channel.equipment_id] : '', channel.locked ? 'zamknuté' : ''].filter(Boolean).join(' · ') || 'OK'
      ctx.fillText(ellipsize(ctx, status, W - M - cols[5]), cols[5], y)
      y += rowH
      index++
    }
    if (index >= sorted.length && data.note && y + 120 < H - M) {
      y += 30
      font(ctx, 36, 800)
      ctx.fillText('Poznámka', M, y)
      font(ctx, 32, 500)
      ctx.fillText(ellipsize(ctx, data.note, W - 2 * M), M, y + 50)
    }
    font(ctx, 28, 500)
    ctx.fillStyle = MUTED
    ctx.fillText('Pomôcka na plánovanie – pred akciou overte spektrum skenom na mieste.', M, H - M + 20)
    pages.push(canvas)
    if (sorted.length === 0) break
  }
  return pages
}

export async function rfPdf(data: RfPdfContext): Promise<Blob> {
  const page = pageSizePt('A4', true)
  const images = await Promise.all((await rfPages(data)).map(async (canvas) => ({ ...(await canvasJpeg(canvas, 0.92)), page })))
  return buildPdf(images, page)
}
