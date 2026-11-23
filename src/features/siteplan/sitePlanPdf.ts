import { ellipsize, font, INK, sourceSize } from '@/features/cases/canvas'
import { buildPdf, canvasJpeg, pageSizePt } from '@/features/cases/sheetPdf'
import { formatDate } from '@/lib/format'
import { metersPerPixel, OSM_ATTRIBUTION, project, TILE, TILE_URL, type MapView } from './geo'
import { MARKER_CODES, MARKER_LABELS, ROUTE_DASH, ROUTE_LABELS, type SiteMarker, type SiteRoute } from './model'

// PDF site plánu: A4 na šírku – hlavička firmy z Nastavení, mapa OpenStreetMap (o úroveň bližšie ako na obrazovke,
// aby bola ostrá) so značkami a trasami, mierka, atribúcia OSM a vpravo dĺžky trás a kábel.

const W = 3508
const H = 2480
const M = 120
const MUTED = '#555555'

export type SitePdfContext = {
  view: MapView
  markers: SiteMarker[]
  routes: SiteRoute[]
  rows: { label: string; meters: number; cable: string }[]
  note: string
  version: number
  companyName: string
  logo: CanvasImageSource | null
  contact: string
  event: { name: string; startsOn: string; endsOn: string; venue: string }
  generatedOn: string
}

function loadTile(url: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.referrerPolicy = 'strict-origin-when-cross-origin'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

/** Mapa do plátna width × height (pixely tlače) okolo stredu výrezu. */
async function drawMap(ctx: CanvasRenderingContext2D, data: SitePdfContext, left: number, top: number, width: number, height: number) {
  const zoom = Math.min(19, data.view.zoom + 1)
  // Plocha mapy v pixeloch dlaždíc: zodpovedá ~1000 × 700 px obrazovky pri pôvodnom priblížení.
  const mapW = 2000
  const mapH = Math.round((mapW * height) / width)
  const scale = width / mapW
  const center = project(data.view, zoom)
  const origin = { x: center.x - mapW / 2, y: center.y - mapH / 2 }
  const max = 2 ** zoom
  const jobs: Promise<void>[] = []
  ctx.save()
  ctx.beginPath()
  ctx.rect(left, top, width, height)
  ctx.clip()
  ctx.fillStyle = '#eeeeee'
  ctx.fillRect(left, top, width, height)
  for (let tx = Math.floor(origin.x / TILE); tx <= Math.floor((origin.x + mapW) / TILE); tx++) {
    for (let ty = Math.floor(origin.y / TILE); ty <= Math.floor((origin.y + mapH) / TILE); ty++) {
      if (ty < 0 || ty >= max) continue
      const x = left + (tx * TILE - origin.x) * scale
      const y = top + (ty * TILE - origin.y) * scale
      jobs.push(loadTile(TILE_URL(zoom, ((tx % max) + max) % max, ty)).then((image) => { if (image) ctx.drawImage(image, x, y, TILE * scale + 1, TILE * scale + 1) }))
    }
  }
  await Promise.all(jobs)
  const at = (lat: number, lon: number) => {
    const point = project({ lat, lon }, zoom)
    return { x: left + (point.x - origin.x) * scale, y: top + (point.y - origin.y) * scale }
  }
  for (const route of data.routes) {
    ctx.strokeStyle = INK
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash((ROUTE_DASH[route.kind] || '').split(' ').filter(Boolean).map((value) => Number(value) * 3))
    ctx.beginPath()
    route.points.forEach(([lat, lon], index) => {
      const point = at(lat, lon)
      if (index === 0) ctx.moveTo(point.x, point.y)
      else ctx.lineTo(point.x, point.y)
    })
    ctx.stroke()
  }
  ctx.setLineDash([])
  for (const marker of data.markers) {
    const point = at(marker.lat, marker.lon)
    ctx.beginPath()
    ctx.arc(point.x, point.y, 34, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.lineWidth = 7
    ctx.strokeStyle = INK
    ctx.stroke()
    ctx.fillStyle = INK
    font(ctx, 30, 800)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(MARKER_CODES[marker.kind], point.x, point.y + 1)
    if (marker.label) {
      ctx.textAlign = 'left'
      font(ctx, 34, 800)
      ctx.lineWidth = 10
      ctx.strokeStyle = '#ffffff'
      ctx.strokeText(marker.label, point.x + 44, point.y)
      ctx.fillText(marker.label, point.x + 44, point.y)
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
  }
  ctx.restore()
  ctx.strokeStyle = INK
  ctx.lineWidth = 4
  ctx.strokeRect(left, top, width, height)
  // Mierka a atribúcia.
  const perPx = metersPerPixel(data.view.lat, zoom) / scale
  const nice = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].filter((value) => value / perPx <= width / 4).at(-1) ?? 5
  const barPx = nice / perPx
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(left + 20, top + height - 90, barPx + 260, 70)
  ctx.strokeStyle = INK
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(left + 40, top + height - 45)
  ctx.lineTo(left + 40 + barPx, top + height - 45)
  ctx.stroke()
  ctx.fillStyle = INK
  font(ctx, 32, 700)
  ctx.fillText(`${nice} m`, left + 60 + barPx, top + height - 70)
  font(ctx, 26, 500)
  const attribution = OSM_ATTRIBUTION
  const attributionW = ctx.measureText(attribution).width + 24
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(left + width - attributionW, top + height - 40, attributionW, 40)
  ctx.fillStyle = INK
  ctx.fillText(attribution, left + width - attributionW + 12, top + height - 34)
}

export async function sitePlanPage(data: SitePdfContext): Promise<HTMLCanvasElement> {
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
  ctx.fillText(ellipsize(ctx, `Site plán – ${data.event.name}`, W - x - M), x, M + 55)
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
  const top = M + 310
  const sideW = 860
  await drawMap(ctx, data, M, top, W - 2 * M - sideW - 60, H - top - M)

  let y = top
  const left = W - M - sideW
  ctx.fillStyle = INK
  if (data.rows.length > 0) {
    font(ctx, 44, 800)
    ctx.fillText('Trasy káblov', left, y)
    y += 70
    font(ctx, 32, 500)
    for (const row of data.rows.slice(0, 22)) {
      ctx.fillText(ellipsize(ctx, `${row.meters} m · ${row.label}`, sideW), left, y)
      y += 42
      if (row.cable) {
        ctx.fillStyle = MUTED
        ctx.fillText(ellipsize(ctx, row.cable, sideW - 30), left + 30, y)
        ctx.fillStyle = INK
        y += 42
      }
    }
    y += 40
  }
  const kinds = [...new Set(data.markers.map((marker) => marker.kind))]
  if (kinds.length > 0) {
    font(ctx, 38, 800)
    ctx.fillText('Značky', left, y)
    y += 55
    font(ctx, 30, 500)
    for (const kind of kinds) {
      ctx.fillText(`${MARKER_CODES[kind]} = ${MARKER_LABELS[kind]}`, left, y)
      y += 40
    }
    y += 30
  }
  const routeKinds = [...new Set(data.routes.map((route) => route.kind))]
  if (routeKinds.length > 0) {
    font(ctx, 30, 500)
    for (const kind of routeKinds) {
      ctx.strokeStyle = INK
      ctx.lineWidth = 7
      ctx.setLineDash((ROUTE_DASH[kind] || '').split(' ').filter(Boolean).map((value) => Number(value) * 3))
      ctx.beginPath()
      ctx.moveTo(left, y + 16)
      ctx.lineTo(left + 90, y + 16)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillText(ROUTE_LABELS[kind], left + 110, y)
      y += 44
    }
    y += 30
  }
  if (data.note && y < H - M - 100) {
    font(ctx, 36, 800)
    ctx.fillText('Poznámka', left, y)
    font(ctx, 30, 500)
    let line = y + 50
    for (const part of data.note.match(/.{1,42}(\s|$)/g) ?? [data.note]) {
      if (line > H - M - 40) break
      ctx.fillText(part.trim(), left, line)
      line += 40
    }
  }
  return canvas
}

export async function sitePlanPdf(data: SitePdfContext): Promise<Blob> {
  const image = await canvasJpeg(await sitePlanPage(data), 0.9)
  const page = pageSizePt('A4', true)
  return buildPdf([{ ...image, page }], page)
}
