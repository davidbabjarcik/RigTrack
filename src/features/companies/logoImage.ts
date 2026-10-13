// Úpravy loga priamo v prehliadači: odstránenie jednofarebného pozadia, orezanie okrajov
// a zistenie, či je logo tmavé alebo svetlé (podľa toho sa na opačnom podklade prefarbí).
// Funkcie pracujú s poľom RGBA bodov, takže sa dajú testovať bez obrázka.

export type Rgb = [number, number, number]
export type LogoTone = 'dark' | 'light' | 'mixed'
type Pixels = Uint8ClampedArray | number[]

// Bod, ktorý sa od pozadia líši menej než NEAR, je pozadie; nad FAR je to určite logo.
// Medzi nimi priehľadnosť plynule rastie, aby hrany neostali zubaté.
const NEAR = 18
const FAR = 64
const VISIBLE_ALPHA = 24

const distance = (data: Pixels, offset: number, color: Rgb) =>
  Math.max(Math.abs(data[offset] - color[0]), Math.abs(data[offset + 1] - color[1]), Math.abs(data[offset + 2] - color[2]))

/**
 * Farba pozadia, ak ho obrázok má: všetky rohy a stredy strán sú nepriehľadné a majú
 * (takmer) rovnakú farbu. Logo s priehľadným pozadím alebo fotka vráti null.
 */
export function detectBackground(data: Pixels, width: number, height: number): Rgb | null {
  if (width < 2 || height < 2) return null
  const last = { x: width - 1, y: height - 1 }
  const mid = { x: Math.floor(width / 2), y: Math.floor(height / 2) }
  const samples = [
    [0, 0], [last.x, 0], [0, last.y], [last.x, last.y],
    [mid.x, 0], [mid.x, last.y], [0, mid.y], [last.x, mid.y],
  ].map(([x, y]) => (y * width + x) * 4)
  if (samples.some((offset) => data[offset + 3] < 250)) return null
  const first: Rgb = [data[samples[0]], data[samples[0] + 1], data[samples[0] + 2]]
  if (samples.some((offset) => distance(data, offset, first) > NEAR)) return null
  const mean = (channel: number) => Math.round(samples.reduce((sum, offset) => sum + data[offset + channel], 0) / samples.length)
  return [mean(0), mean(1), mean(2)]
}

/** Spriehľadní všetko, čo má farbu pozadia. Mení pole na mieste. */
export function removeBackground(data: Pixels, background: Rgb) {
  for (let offset = 0; offset < data.length; offset += 4) {
    const away = distance(data, offset, background)
    if (away <= NEAR) data[offset + 3] = 0
    else if (away < FAR) data[offset + 3] = Math.round(data[offset + 3] * ((away - NEAR) / (FAR - NEAR)))
  }
}

/** Najmenší obdĺžnik, v ktorom je niečo vidno; null pri úplne priehľadnom obrázku. */
export function contentBounds(data: Pixels, width: number, height: number) {
  let left = width
  let top = height
  let right = -1
  let bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= VISIBLE_ALPHA) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }
  return right < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

/**
 * Je logo tmavé, svetlé, alebo farebné? Tmavé sa na tmavom podklade prefarbí na biele,
 * svetlé na svetlom na čierne; farebné („mixed“) sa nechá tak a dostane podložku.
 */
export function logoTone(data: Pixels): LogoTone {
  let visible = 0
  let dark = 0
  let light = 0
  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] <= VISIBLE_ALPHA) continue
    visible++
    const [red, green, blue] = [data[offset], data[offset + 1], data[offset + 2]]
    // Sýta farba (červená, modrá…) nie je ani tmavá, ani svetlá: prefarbením by sa stratila.
    if (Math.max(red, green, blue) - Math.min(red, green, blue) > 70) continue
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
    if (luminance < 0.35) dark++
    else if (luminance > 0.75) light++
  }
  if (visible === 0) return 'mixed'
  if (dark / visible >= 0.9) return 'dark'
  if (light / visible >= 0.9) return 'light'
  return 'mixed'
}

/** Prefarbí všetky viditeľné body na jednu farbu, priehľadnosť nechá. Mení pole na mieste. */
export function recolor(data: Pixels, color: Rgb) {
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = color[0]
    data[offset + 1] = color[1]
    data[offset + 2] = color[2]
  }
}
