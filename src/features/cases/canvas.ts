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
