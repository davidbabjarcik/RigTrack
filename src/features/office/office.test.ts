import { describe, expect, it } from 'vitest'
import { officeStats, packTotal, type OfficePurchase } from './api'

const buy = (patch: Partial<OfficePurchase>): OfficePurchase => ({
  id: 'p',
  itemId: 'coffee',
  quantity: 1,
  price: 10,
  packAmount: null,
  packUnit: '',
  boughtOn: '2026-10-01',
  boughtBy: 'u1',
  boughtByName: 'Dávid',
  note: '',
  ...patch,
})

describe('office', () => {
  it('converts pack sizes', () => {
    expect(packTotal(buy({ quantity: 3, packAmount: 1, packUnit: 'kg' }))).toEqual({ amount: 3, unit: 'kg' })
    expect(packTotal(buy({ quantity: 2, packAmount: 500, packUnit: 'g' }))).toEqual({ amount: 1, unit: 'kg' })
    expect(packTotal(buy({}))).toBeNull()
  })

  it('sums by person and item for a period', () => {
    const stats = officeStats(
      [
        buy({ quantity: 2, packAmount: 1, packUnit: 'kg', price: 25.5 }),
        buy({ boughtBy: 'u2', boughtByName: 'Jano', itemId: 'water', quantity: 6, price: 3.6 }),
        buy({ boughtOn: '2025-12-01', price: 99 }),
      ],
      '2026',
    )
    expect(stats.total).toBe(29.1)
    expect(stats.byPerson.map((person) => [person.name, person.total])).toEqual([['Dávid', 25.5], ['Jano', 3.6]])
    expect(stats.byItem.find((item) => item.itemId === 'coffee')?.packs).toEqual({ kg: 2 })
  })
})
