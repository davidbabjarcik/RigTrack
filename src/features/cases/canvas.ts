// Spoločné pomôcky na kreslenie štítkov a hárkov do canvasu.

export type Ctx = CanvasRenderingContext2D

export const INK = '#000000'
const FONT = 'Montserrat, "Segoe UI", Arial, Helvetica, sans-serif'

export function font(ctx: Ctx, size: number, weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`
}

/** Najväčšie písmo od `max` po `min`, pri ktorom sa text zmestí do šírky. */
export function fitSize(ctx: Ctx, text: string, maxWidth: number, max: number, min: number) {
  let size = max
  for (; size > min; size -= 2) {
    font(ctx, size)
    if (ctx.measureText(text).width <= maxWidth) break
  }
  return size
}

export function ellipsize(ctx: Ctx, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

export function sourceSize(image: CanvasImageSource) {
  if (image instanceof HTMLImageElement) return { width: image.naturalWidth, height: image.naturalHeight }
  if (image instanceof VideoFrame) return { width: image.displayWidth, height: image.displayHeight }
  const sized = image as { width: number | SVGAnimatedLength; height: number | SVGAnimatedLength }
  return { width: Number(sized.width), height: Number(sized.height) }
}

/** Čierna alebo biela podľa toho, čo je na danej farbe pozadia čitateľnejšie. */
export function contrastInk(hex: string) {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#000000' : '#ffffff'
}

/** Stiahne obsah canvasu ako PNG súbor. */
export function downloadCanvas(canvas: HTMLCanvasElement, fileName: string) {
  canvas.toBlob((blob) => {
    if (!blob) return
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = fileName
    link.click()
    URL.revokeObjectURL(link.href)
  }, 'image/png')
}

/** Bezpečný názov súboru z ľubovoľného textu. */
export function fileSlug(text: string) {
  return text.replace(/[^\p{L}\p{N}_-]+/gu, '_')
}

/** QR kód ako canvas na kreslenie do štítku (knižnica sa stiahne až pri prvom použití). */
export async function qrCanvas(text: string, size = 520, margin = 0) {
  const { toCanvas } = await import('qrcode')
  const canvas = document.createElement('canvas')
  await toCanvas(canvas, text, { margin, width: size, errorCorrectionLevel: 'M' })
  return canvas
}

/** Dátum a čas vygenerovania drobným písmom do pravého dolného rohu (na každom PDF / PNG hárku). */
export function stampGenerated(canvas: HTMLCanvasElement, when = new Date(), side: 'left' | 'right' = 'right') {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const size = Math.max(10, Math.round(canvas.width * 0.0085))
  const text = `Vygenerované ${when.toLocaleDateString('sk-SK')} ${when.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`
  ctx.save()
  ctx.font = `500 ${size}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillStyle = '#6b7280'
  ctx.textAlign = side
  ctx.textBaseline = 'bottom'
  ctx.fillText(text, side === 'right' ? canvas.width - size * 1.2 : size * 1.2, canvas.height - size * 0.6)
  ctx.restore()
}
