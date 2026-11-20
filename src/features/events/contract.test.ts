import { describe, expect, it } from 'vitest'
import { money, partyLines, paymentPoints } from './contract'

describe('contract', () => {
  it('formats money or leaves a line to fill in by hand', () => {
    expect(money(1234.5)).toBe('1 234,50 €')
    expect(money(null)).toBe('______________ €')
  })

  it('lists party details that are filled in', () => {
    expect(partyLines({ name: 'Ukážková firma', address: 'Ukážková 1', ico: '12345678', dic: '', icDph: '', representative: '' })).toEqual([
      'sídlo / miesto podnikania: Ukážková 1',
      'IČO: 12345678',
    ])
  })

  it('adds a deposit point only when there is a deposit', () => {
    expect(paymentPoints({ price: 1000, vat: 'none', deposit: null, dueDays: 14 })).toHaveLength(3)
    const points = paymentPoints({ price: 1000, vat: 'plus', deposit: 300, dueDays: 7 })
    expect(points).toHaveLength(4)
    expect(points[1]).toContain('300,00 €')
    expect(points[2]).toContain('7 dní')
    expect(paymentPoints({ price: 1, vat: 'none', deposit: 5, dueDays: 7 }, 'Nájomca')[1]).toMatch(/^Nájomca zaplatí/)
  })
})
