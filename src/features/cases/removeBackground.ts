// Odstránenie bieleho pozadia z fotky výrobku (typická produktová fotka na bielom): biele pixely spojené
// s okrajom fotky sa stanú priehľadnými. Biele časti vnútri výrobku (nedotýkajú sa okraja) ostanú.

/** Je pixel „biely“ (svetlý a takmer bez farby)? */
const isWhite = (data: Uint8ClampedArray, index: number, threshold: number) => {
  const r = data[index]
  const g = data[index + 1]
  const b = data[index + 2]
  return r >= threshold && g >= threshold && b >= threshold && Math.max(r, g, b) - Math.min(r, g, b) < 18
}

/** V pixeloch obrázka (RGBA) spraví priehľadným biele pozadie spojené s okrajom. Vráti počet zmenených pixelov. */
export function clearWhiteBackground(data: Uint8ClampedArray, width: number, height: number, threshold = 236) {
  const seen = new Uint8Array(width * height)
  const stack: number[] = []
  const push = (x: number, y: number) => {
    const at = y * width + x
    if (seen[at]) return
    seen[at] = 1
    if (isWhite(data, at * 4, threshold)) stack.push(at)
  }
  for (let x = 0; x < width; x++) {
    push(x, 0)
    push(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    push(0, y)
    push(width - 1, y)
  }
  let cleared = 0
  while (stack.length > 0) {
    const at = stack.pop()!
    data[at * 4 + 3] = 0
    cleared++
    const x = at % width
    const y = (at - x) / width
    if (x > 0) push(x - 1, y)
    if (x < width - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < height - 1) push(x, y + 1)
  }
  return cleared
}

/** Kópia fotky bez bieleho pozadia (najviac `maxSide` px). Fotka bez bieleho okraja sa vráti nezmenená. */
export function withoutWhiteBackground(image: CanvasImageSource & { width: number; height: number }, maxSide = 900) {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
  clearWhiteBackground(pixels.data, canvas.width, canvas.height)
  ctx.putImageData(pixels, 0, 0)
  return canvas
}
