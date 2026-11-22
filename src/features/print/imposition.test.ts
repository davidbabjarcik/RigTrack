import { describe, expect, it } from 'vitest'
import { A4_MM, clampLabelScale, LABEL_MM, LABEL_SCALE_MAX, labelGrid, labelSizeCm } from './imposition'

const inside = (sheet: ReturnType<typeof labelGrid>) => {
  const [w, h] = sheet.landscape ? [A4_MM.height, A4_MM.width] : [A4_MM.width, A4_MM.height]
  return sheet.slots.every((slot) => slot.x >= 9.9 && slot.y >= 9.9 && slot.x + slot.width <= w - 9.9 && slot.y + slot.height <= h - 9.9)
}

describe('štítky cases v mierke', () => {
  it('100 % = 15,6 × 12,7 cm, dva pod sebou na A4 na výšku', () => {
    expect(labelSizeCm(100)).toBe('15,6 × 12,7 cm')
    const sheet = labelGrid(LABEL_MM.width, LABEL_MM.height)
    expect(sheet.landscape).toBe(false)
    expect(sheet.slots).toHaveLength(2)
    expect(inside(sheet)).toBe(true)
  })

  it('50 % – šesť na stranu, menšie číslo v cm', () => {
    expect(labelSizeCm(50)).toBe('7,8 × 6,4 cm')
    const sheet = labelGrid(LABEL_MM.width / 2, LABEL_MM.height / 2)
    expect(sheet.slots).toHaveLength(6)
    expect(inside(sheet)).toBe(true)
  })

  it('najväčšia mierka sa zmestí na A4 na šírku', () => {
    const factor = LABEL_SCALE_MAX / 100
    const sheet = labelGrid(LABEL_MM.width * factor, LABEL_MM.height * factor)
    expect(sheet.landscape).toBe(true)
    expect(sheet.slots).toHaveLength(1)
    expect(inside(sheet)).toBe(true)
  })

  it('mierka sa obmedzí na 20–145 %', () => {
    expect(clampLabelScale(5)).toBe(20)
    expect(clampLabelScale(400)).toBe(145)
    expect(clampLabelScale(Number.NaN)).toBe(100)
    expect(clampLabelScale(72.4)).toBe(72)
  })

  it('medzi štítkami je medzera na značky rezu', () => {
    const sheet = labelGrid(LABEL_MM.width * 0.4, LABEL_MM.height * 0.4)
    const [a, b] = sheet.slots
    expect(b.x - (a.x + a.width)).toBeGreaterThanOrEqual(10)
  })
})
