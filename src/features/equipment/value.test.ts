import { describe, expect, it } from 'vitest'
import { equipmentValue, remainingValue, valueSummary } from './value'

const base = { quantity: 1, purchasedOn: null, unitPurchases: {}, trackUnits: false, unitIds: [] as number[] }

describe('equipment value', () => {
  it('depreciates linearly to zero', () => {
    expect(remainingValue(1000, '2024-01-01', 4, '2024-01-01')).toBe(1000)
    expect(remainingValue(1000, '2024-01-01', 4, '2026-01-01')).toBeCloseTo(500, 0)
    expect(remainingValue(1000, '2020-01-01', 4, '2026-01-01')).toBe(0)
    expect(remainingValue(1000, null, 4, '2026-01-01')).toBe(1000)
  })

  it('values pieces by their own purchase dates', () => {
    const value = equipmentValue(
      { ...base, attributes: { purchasePrice: 800 }, quantity: 2, trackUnits: true, unitPurchases: { '2': '2024-10-19' }, purchasedOn: '2022-10-19' },
      '2026-10-19',
    )
    expect(value).toMatchObject({ purchase: 1600, years: 4, undated: 0 })
    expect(value!.current).toBeCloseTo(400, 0)
    expect(equipmentValue({ ...base, attributes: {} }, '2026-10-19')).toBeNull()
  })

  it('sums by group and counts unpriced items', () => {
    const summary = valueSummary(
      [
        { ...base, attributes: { purchasePrice: 100 }, quantity: 3, group: 'Audio' },
        { ...base, attributes: { purchasePrice: 1000, depreciationYears: 2 }, purchasedOn: '2025-10-19', group: 'Svetlá' },
        { ...base, attributes: {}, group: 'Audio' },
      ],
      '2026-10-19',
      (item) => item.group,
    )
    expect(summary.purchase).toBe(1300)
    expect(summary.unpriced).toBe(1)
    expect(summary.groups.map((group) => group.name)).toEqual(['Svetlá', 'Audio'])
  })
})
