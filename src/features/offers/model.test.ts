import { describe, expect, it } from 'vitest'
import { bulletLines, emptyPart, itemsFromEquipment, numberFromDate, partCode, priceLabel, sumPrices, summaryRows } from './model'

describe('offers', () => {
  it('codes parts A, B and sub-parts A1, A2', () => {
    expect([partCode(0), partCode(2), partCode(0, 1)]).toEqual(['A', 'C', 'A2'])
    expect(numberFromDate('2026-11-05')).toBe('20261105')
  })

  it('labels prices by VAT mode or uses the price note', () => {
    const plain = (text: string) => text.replace(/\s/g, ' ')
    expect(plain(priceLabel({ price: 1200, priceNote: '' }, 'with', 23))).toBe('1 200,00 € s DPH')
    expect(plain(priceLabel({ price: 600, priceNote: '' }, 'plus', 23))).toBe('600,00 € + 23 % DPH')
    expect(priceLabel({ price: null, priceNote: 'podľa dopytu' }, 'with', 23)).toBe('podľa dopytu')
  })

  it('summarizes priced parts and sums them', () => {
    const sections = [
      { ...emptyPart('Hlavné pódium'), parts: [{ ...emptyPart('Ozvučenie'), price: 1600 }, { ...emptyPart('Svetlá'), price: 1050 }] },
      { ...emptyPart('Doplnky'), priceNote: 'podľa dopytu' },
      { ...emptyPart('Pódium'), price: 350 },
    ]
    expect(summaryRows(sections).map((row) => row.code)).toEqual(['A1', 'A2', 'B', 'C'])
    expect(sumPrices(sections)).toBe(3000)
  })

  it('lists event equipment as bullet lines', () => {
    const equipment = [
      { id: 'a', name: 'Top', manufacturer: 'Značka', model: 'T1', kind: 'audio' },
      { id: 'b', name: 'Sub', manufacturer: '', model: '', kind: 'audio' },
      { id: 'c', name: 'Svetlo', manufacturer: '', model: '', kind: 'light' },
    ] as never
    const lines = [{ equipmentId: 'a', quantity: 4 }, { equipmentId: 'b', quantity: 6 }, { equipmentId: 'c', quantity: 8 }] as never
    expect(itemsFromEquipment(lines, equipment, ['audio'])).toBe('6 × Sub\n4 × Značka T1')
    expect(bulletLines('- jeden\n\n• dva\n tri ')).toEqual(['jeden', 'dva', 'tri'])
  })
})

describe('offer price modes', () => {
  it('sums equipment and custom lines when the part is priced by lines', async () => {
    const { newLine, partPrice, itemsFromLines, normalizePart } = await import('./model')
    const part = { ...emptyPart('Ozvučenie'), priceMode: 'lines' as const, lines: [newLine({ label: 'Reprobox', quantity: 4, days: 2, unitPrice: 25 }), newLine({ label: 'Doprava', unitPrice: 120 })] }
    expect(partPrice(part)).toBe(320)
    expect(partPrice({ ...part, priceMode: 'manual', price: 500 })).toBe(500)
    expect(itemsFromLines(part.lines)).toBe('4 × Reprobox\n1 × Doprava')
    expect(normalizePart({ title: 'Stará' })).toMatchObject({ title: 'Stará', priceMode: 'manual', lines: [], parts: [] })
    expect(sumPrices([part, { ...emptyPart('B'), price: 80 }])).toBe(400)
  })
})
