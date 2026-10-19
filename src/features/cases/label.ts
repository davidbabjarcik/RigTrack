// Flight case štítok: 1838 × 1500 px na šírku, vykreslený do canvasu a stiahnuteľný ako PNG.
// Rozloženie: vľavo stĺpec s logom a údajmi (Number, Category, Weight a prázdne pole
// Date of inspection na dopísanie fixkou), vpravo hlavný prvok case s fotkou, pod ním
// vedľajšie prvky a dole kontaktný riadok firmy.

import { font, fitSize, ellipsize, sourceSize, INK, type Ctx } from './canvas'

export const LABEL_WIDTH = 1838
export const LABEL_HEIGHT = 1500

export type LabelData = {
  number: string
  category: string
  weight: string
  /** Hlavný prvok case: veľký názov a jeho fotka, ak ju má. */
  main: { name: string; photo: CanvasImageSource | null } | null
  /** Vedľajšie prvky (napr. kapsula k mikrofónu), menším písmom pod hlavným. */
  secondary: string[]
  footer: string
  /** Logo firmy; bez neho sa do rámčeka vypíše názov firmy. */
  logo: CanvasImageSource | null
  companyName: string
  /** QR kód s odkazom na case v appke (vpravo hore); bez neho sa nekreslí. */
  qr?: CanvasImageSource | null
}

/** Riadky na štítok: rovnaké názvy sa zlúčia a kusy sčítajú, napr. „2× Kapsula Beta 58“. */
export function labelContentLines(items: { name: string; quantity: number }[]): string[] {
  const totals = new Map<string, number>()
  for (const item of items) totals.set(item.name, (totals.get(item.name) ?? 0) + item.quantity)
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'sk', { numeric: true }))
    .map(([name, quantity]) => (quantity > 1 ? `${quantity}× ${name}` : name))
}

/** 35.5 → „35,5 kg“ */
export function formatWeight(weightKg: number | null) {
  return weightKg === null ? '' : `${String(weightKg).replace('.', ',')} kg`
}

const MARGIN = 36
const BORDER = 16
const DIVIDER = 9
const RADIUS = 110
const PAD = 26
const LEFT_SHARE = 0.325
// Výšky riadkov ľavého stĺpca ako podiel výšky štítku: logo, tri údaje a dátum kontroly.
const ROW_SHARES = [0.32, 0.18, 0.18, 0.18, 0.14]
const FIELD_LABELS = ['Number:', 'Category:', 'Weight:', 'Date of inspection:']

/** Text čo najväčším písmom do daného obdĺžnika, vycentrovaný; vráti použitú výšku. */
function drawLines(ctx: Ctx, lines: string[], x: number, y: number, width: number, height: number, max: number, min: number) {
  if (lines.length === 0 || height <= 0) return
  const LINE = 1.22
  font(ctx, 100)
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width))
  // Pod spodnou hranicou by sa text nedal čítať; vtedy sa radšej skrátia názvy a zvyšok vynechá.
  const size = Math.max(min, Math.floor(Math.min(max, (100 * width) / widest, height / (lines.length * LINE))))
  const visible = lines.slice(0, Math.max(1, Math.floor(height / (size * LINE))))
  const blockHeight = visible.length * size * LINE
  font(ctx, size)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  visible.forEach((line, index) => {
    ctx.fillText(ellipsize(ctx, line, width), x + width / 2, y + (height - blockHeight) / 2 + (index + 0.5) * size * LINE)
  })
  ctx.textAlign = 'left'
}

/** Pravá plocha: fotka hlavného prvku hore, jeho názov pod ňou a vedľajšie prvky naspodku. */
function drawContent(ctx: Ctx, data: LabelData, x: number, y: number, width: number, height: number) {
  const mainLines = data.main?.name ? [data.main.name] : []
  const hasSecondary = data.secondary.length > 0
  let top = y
  let room = height

  if (data.main?.photo) {
    const photoHeight = height * (hasSecondary ? 0.5 : 0.62)
    const { width: sourceWidth, height: sourceHeight } = sourceSize(data.main.photo)
    const scale = Math.min(width / sourceWidth, photoHeight / sourceHeight)
    const drawWidth = sourceWidth * scale
    const drawHeight = sourceHeight * scale
    ctx.drawImage(data.main.photo, x + (width - drawWidth) / 2, top + (photoHeight - drawHeight) / 2, drawWidth, drawHeight)
    top += photoHeight + 24
    room -= photoHeight + 24
  }

  if (mainLines.length > 0 && hasSecondary) {
    // Hlavný názov dostane toľko miesta ako všetky vedľajšie spolu, najviac však polovicu.
    const mainRoom = Math.min(room * 0.5, 190)
    drawLines(ctx, mainLines, x, top, width, mainRoom, 150, 40)
    drawLines(ctx, data.secondary, x, top + mainRoom, width, room - mainRoom, 70, 26)
  } else if (mainLines.length > 0) {
    drawLines(ctx, mainLines, x, top, width, room, 170, 40)
  } else {
    drawLines(ctx, data.secondary, x, top, width, room, 110, 26)
  }
}

export function drawCaseLabel(canvas: HTMLCanvasElement, data: LabelData) {
  canvas.width = LABEL_WIDTH
  canvas.height = LABEL_HEIGHT
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT)
  ctx.fillStyle = INK
  ctx.strokeStyle = INK
  ctx.lineJoin = 'round'

  const left = MARGIN + BORDER / 2
  const top = MARGIN + BORDER / 2
  const width = LABEL_WIDTH - 2 * left
  const height = LABEL_HEIGHT - 2 * top
  const split = left + width * LEFT_SHARE

  // Vonkajší rám so zaoblenými rohmi; deliace čiary sa orežú podľa neho.
  ctx.lineWidth = BORDER
  ctx.beginPath()
  ctx.roundRect(left, top, width, height, RADIUS)
  ctx.stroke()
  ctx.save()
  ctx.clip()
  ctx.lineWidth = DIVIDER
  ctx.beginPath()
  ctx.moveTo(split, top)
  ctx.lineTo(split, top + height)
  const rows: { y: number; height: number }[] = []
  let y = top
  ROW_SHARES.forEach((share, index) => {
    rows.push({ y, height: height * share })
    y += height * share
    if (index < ROW_SHARES.length - 1) {
      ctx.moveTo(left, y)
      ctx.lineTo(split, y)
    }
  })
  ctx.stroke()
  ctx.restore()

  // Logo alebo názov firmy.
  const logoBox = rows[0]
  const boxWidth = split - left
  if (data.logo) {
    const { width: sourceWidth, height: sourceHeight } = sourceSize(data.logo)
    const scale = Math.min((boxWidth - 2 * PAD - 30) / sourceWidth, (logoBox.height - 2 * PAD - 20) / sourceHeight)
    const drawWidth = sourceWidth * scale
    const drawHeight = sourceHeight * scale
    ctx.drawImage(
      data.logo,
      left + (boxWidth - drawWidth) / 2 + 10,
      logoBox.y + (logoBox.height - drawHeight) / 2 + 12,
      drawWidth,
      drawHeight,
    )
  } else if (data.companyName) {
    const size = fitSize(ctx, data.companyName, boxWidth - 2 * PAD - 30, 96, 30)
    font(ctx, size)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(data.companyName, left + boxWidth / 2 + 8, logoBox.y + logoBox.height / 2 + 12, boxWidth - 2 * PAD)
    ctx.textAlign = 'left'
  }

  // Údaje v ľavom stĺpci: malý popis hore, hodnota čo najväčšia pod ním.
  // Dátum kontroly ostáva prázdny: dopisuje sa na štítok fixkou pri každej kontrole.
  const values = [data.number, data.category, data.weight, '']
  const LABEL_SIZE = 34
  values.forEach((value, index) => {
    const row = rows[index + 1]
    const x = left + PAD + 4
    font(ctx, LABEL_SIZE)
    ctx.textBaseline = 'top'
    ctx.fillText(FIELD_LABELS[index], x, row.y + 22)
    if (!value) return
    const room = row.height - LABEL_SIZE - 22 - 26
    const maxWidth = boxWidth - 2 * PAD - 12
    const size = Math.min(fitSize(ctx, value, maxWidth, 110, 28), Math.floor(room))
    font(ctx, size)
    ctx.textBaseline = 'middle'
    ctx.fillText(ellipsize(ctx, value, maxWidth), x, row.y + 22 + LABEL_SIZE + 10 + room / 2)
  })

  // Pravá časť: obsah a kontaktný riadok.
  const rightX = split + PAD + 6
  const rightWidth = left + width - rightX - PAD - 20
  font(ctx, 42)
  ctx.textBaseline = 'top'
  ctx.fillText('Content:', rightX, top + 30)

  const footerSize = data.footer ? fitSize(ctx, data.footer, rightWidth - 40, 44, 22) : 0
  const footerSpace = data.footer ? footerSize + 70 : 40
  if (data.footer) {
    font(ctx, footerSize)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(data.footer, rightX + rightWidth / 2, top + height - 44)
    ctx.textAlign = 'left'
  }

  // QR kód vpravo hore; obsah sa vtedy začína až pod ním.
  const QR_SIZE = 260
  if (data.qr) ctx.drawImage(data.qr, rightX + rightWidth - QR_SIZE, top + 24, QR_SIZE, QR_SIZE)
  const contentTop = data.qr ? top + 24 + QR_SIZE + 12 : top + 30 + 42 + 34
  drawContent(ctx, data, rightX, contentTop, rightWidth, top + height - footerSpace - contentTop)
}
