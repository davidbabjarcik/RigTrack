import { describe, expect, it } from 'vitest'
import { bookValueOn, equipmentValue, soldCsv, soldForYear, soldSummary, soldYears, valueSummary } from './value'

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

describe('sold gear', () => {
  const sold = (id: string, attributes: object, purchasedOn: string | null = '2022-01-01', quantity = 2) =>
    ({ id, name: `Ukážka ${id}`, status: 'sold' as const, quantity, purchasedOn, attributes })

  it('compares the sale with the purchase and with the value after depreciation', () => {
    // 2 ks po 1000 € = 2000 €, odpis 4 roky; predané po 2 rokoch (hodnota 1000 €) za 1300 €.
    const summary = soldSummary([
      sold('a', { purchasePrice: 1000, depreciationYears: 4, soldOn: '2024-01-01', soldPrice: 1300, soldTo: 'Ukážkový kupec' }),
      sold('b', { soldOn: '2025-05-01' }),
      { id: 'c', name: 'Máme', status: 'available' as const, quantity: 1, purchasedOn: null, attributes: { purchasePrice: 99 } },
    ])
    expect(summary.count).toBe(2)
    expect(summary.unpriced).toBe(1)
    expect(summary.rows[1]).toMatchObject({ id: 'a', bought: 2000, sold: 1300, gain: -700, soldTo: 'Ukážkový kupec' })
    expect(summary.rows[1].gainVsBook).toBeCloseTo(300, -1)
    expect(summary).toMatchObject({ sold: 1300, bought: 2000, gain: -700 })
  })

  it('filters by year and exports CSV for the accountant', () => {
    const items = [
      sold('a', { purchasePrice: 1000, soldOn: '2024-03-05', soldPrice: 1300.5, soldTo: 'Ukážkový "kupec"' }, '2022-01-01', 1),
      sold('b', { soldOn: '2025-05-01' }),
    ]
    expect(soldYears(items)).toEqual(['2025', '2024'])
    expect(soldForYear(items, '2024').count).toBe(1)
    expect(soldForYear(items, '').count).toBe(2)
    const csv = soldCsv(soldForYear(items, '2024').rows, () => ({ serial: 'SN1', inventory: 'INV1' }))
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.split('\r\n')[1]).toBe('"05.03.2024";"Ukážka a";"SN1";"INV1";"Ukážkový ""kupec""";"1000,00";"1300,50";"300,50"')
  })

  it('has no book value without purchase date or depreciation', () => {
    expect(bookValueOn({ quantity: 1, purchasedOn: null, attributes: { purchasePrice: 100, depreciationYears: 2 } }, '2025-01-01')).toBeNull()
    expect(bookValueOn({ quantity: 1, purchasedOn: '2020-01-01', attributes: { purchasePrice: 100, depreciationYears: 2 } }, '2025-01-01')).toBe(0)
  })
})
