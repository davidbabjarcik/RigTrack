import { describe, expect, it } from 'vitest'
import { equipmentValue, valueSummary } from './value'

describe('equipment value', () => {
  it('multiplies purchase price by pieces', () => {
    expect(equipmentValue({ attributes: { purchasePrice: 4200 }, quantity: 2 })).toBe(8400)
    expect(equipmentValue({ attributes: {}, quantity: 2 })).toBeNull()
  })

  it('sums by group and counts unpriced items', () => {
    const summary = valueSummary(
      [
        { attributes: { purchasePrice: 100 }, quantity: 3, group: 'Audio' },
        { attributes: { purchasePrice: 1000 }, quantity: 1, group: 'Svetlá' },
        { attributes: {}, quantity: 1, group: 'Audio' },
      ],
      (item) => item.group,
    )
    expect(summary).toEqual({ total: 1300, unpriced: 1, groups: [{ name: 'Svetlá', value: 1000 }, { name: 'Audio', value: 300 }] })
  })
})
