import { describe, expect, it } from 'vitest'
import { contentBounds, detectBackground, logoTone, recolor, removeBackground, type Rgb } from './logoImage'

/** Obrázok z riadkov znakov: každý znak je jeden bod. */
function image(rows: string[], palette: Record<string, [number, number, number, number]>) {
  const data: number[] = []
  for (const row of rows) for (const char of row) data.push(...palette[char])
  return { data, width: rows[0].length, height: rows.length }
}
const WHITE: [number, number, number, number] = [255, 255, 255, 255]
const BLACK: [number, number, number, number] = [10, 10, 10, 255]
const CLEAR: [number, number, number, number] = [0, 0, 0, 0]
const alphaOf = (data: number[]) => data.filter((_, index) => index % 4 === 3)

describe('logo background', () => {
  const onWhite = () => image(['.....', '.##..', '.##..', '.....'], { '.': WHITE, '#': BLACK })

  it('recognises a solid background and tells it from a transparent or busy one', () => {
    const { data, width, height } = onWhite()
    expect(detectBackground(data, width, height)).toEqual([255, 255, 255])
    const transparent = image(['..', '..'], { '.': CLEAR })
    expect(detectBackground(transparent.data, 2, 2)).toBeNull()
    const photo = image(['.#', '#.'], { '.': WHITE, '#': BLACK })
    expect(detectBackground(photo.data, 2, 2)).toBeNull()
  })

  it('makes the background transparent, keeps the logo and softens the edge', () => {
    const { data } = image(['.~#'], { '.': WHITE, '~': [214, 214, 214, 255], '#': BLACK })
    removeBackground(data, [255, 255, 255])
    const [background, edge, logo] = alphaOf(data)
    expect(background).toBe(0)
    expect(edge).toBeGreaterThan(0)
    expect(edge).toBeLessThan(255)
    expect(logo).toBe(255)
  })

  it('finds the box around what is left', () => {
    const { data, width, height } = onWhite()
    removeBackground(data, [255, 255, 255])
    expect(contentBounds(data, width, height)).toEqual({ x: 1, y: 1, width: 2, height: 2 })
    expect(contentBounds(image(['..'], { '.': CLEAR }).data, 2, 1)).toBeNull()
  })
})

describe('logo tone', () => {
  const RED: [number, number, number, number] = [220, 40, 40, 255]

  it('calls a black logo dark, a white one light and a coloured one mixed', () => {
    expect(logoTone(image(['##.'], { '#': BLACK, '.': CLEAR }).data)).toBe('dark')
    expect(logoTone(image(['##.'], { '#': WHITE, '.': CLEAR }).data)).toBe('light')
    expect(logoTone(image(['#r'], { '#': BLACK, r: RED }).data)).toBe('mixed')
    expect(logoTone(image(['..'], { '.': CLEAR }).data)).toBe('mixed')
  })

  it('recolours the logo and leaves transparency alone', () => {
    const { data } = image(['#.'], { '#': BLACK, '.': CLEAR })
    const white: Rgb = [255, 255, 255]
    recolor(data, white)
    expect(data.slice(0, 4)).toEqual([255, 255, 255, 255])
    expect(data[7]).toBe(0)
    expect(logoTone(data)).toBe('light')
  })
})
