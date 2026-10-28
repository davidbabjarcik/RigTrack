import { describe, expect, it } from 'vitest'
import { clearWhiteBackground } from './removeBackground'

/** 5 × 5: biely okraj, tmavý rámik a biely stred vnútri výrobku. */
function sample() {
  const size = 5
  const data = new Uint8ClampedArray(size * size * 4).fill(255)
  for (let y = 1; y < 4; y++)
    for (let x = 1; x < 4; x++) {
      if (x === 2 && y === 2) continue
      const at = (y * size + x) * 4
      data[at] = data[at + 1] = data[at + 2] = 20
    }
  return { data, size }
}

describe('white background removal', () => {
  it('clears white touching the edge and keeps white inside the product', () => {
    const { data, size } = sample()
    expect(clearWhiteBackground(data, size, size)).toBe(16)
    expect(data[3]).toBe(0)
    expect(data[(1 * size + 1) * 4 + 3]).toBe(255)
    expect(data[(2 * size + 2) * 4 + 3]).toBe(255)
  })
})
