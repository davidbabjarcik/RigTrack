import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import { buildQuote, DEFAULT_QUOTE } from './model'

const equipment = [
  { id: 'spiider', name: 'Robe Spiider', rentalPrice: 60 },
  { id: 'sm58', name: 'Shure SM58', rentalPrice: 5 },
  { id: 'cable', name: 'Kábel', rentalPrice: null },
] as Equipment[]

describe('quote', () => {
  it('prices equipment per day, transport, crew, discount and VAT', () => {
    const quote = buildQuote(
      [
        { equipmentId: 'spiider', quantity: 4, caseId: null },
        { equipmentId: 'sm58', quantity: 6, caseId: 'c' },
        { equipmentId: 'cable', quantity: 20, caseId: null },
      ],
      equipment,
      2,
      50,
      { ...DEFAULT_QUOTE, kmRate: 0.5, crewCount: 2, crewDayRate: 100, discountPct: 10, vatPct: 20 },
    )
    expect(quote.lines.map((line) => [line.label, line.total])).toEqual([
      ['Robe Spiider', 480],
      ['Shure SM58', 60],
      ['Doprava', 50],
      ['Technická obsluha', 400],
    ])
    expect(quote.unpriced).toEqual(['Kábel'])
    expect(quote).toMatchObject({ equipmentTotal: 540, subtotal: 990, discount: 54, base: 936, vat: 187.2, total: 1123.2 })
  })
})
