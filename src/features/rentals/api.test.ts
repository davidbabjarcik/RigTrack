import { describe, expect, it } from 'vitest'
import { compareSuppliers, type RentalRequest } from './api'

const supplier = (id: string, responded = true) => ({ id, partnerId: null, name: id.toUpperCase(), email: '', token: id.repeat(64), revokedAt: null, viewedAt: null, respondedAt: responded ? '2026-11-20T10:00:00Z' : null, message: '' })
const request: Pick<RentalRequest, 'items' | 'suppliers' | 'quotes'> = {
  items: [{ id: 'led', equipmentId: null, name: 'LED', quantity: 10, note: '' }, { id: 'sub', equipmentId: null, name: 'Sub', quantity: 4, note: '' }],
  suppliers: [supplier('a'), supplier('b'), supplier('c', false)],
  quotes: [
    { supplierId: 'a', itemId: 'led', available: 10, unitPrice: 30, note: '' },
    { supplierId: 'a', itemId: 'sub', available: 4, unitPrice: 50, note: '' },
    { supplierId: 'b', itemId: 'led', available: 10, unitPrice: 25, note: '' },
    { supplierId: 'b', itemId: 'sub', available: 2, unitPrice: 40, note: '' },
  ],
}

describe('porovnanie dodávateľov', () => {
  it('súčty, pokrytie, najlacnejší po položkách a najlacnejší kompletný', () => {
    const result = compareSuppliers(request)
    expect(result.suppliers).toEqual([
      { id: 'a', name: 'A', covered: 2, total: 500, priced: true, complete: true },
      { id: 'b', name: 'B', covered: 1, total: 330, priced: true, complete: false },
    ])
    expect(result.best.get('led')).toBe('b')
    expect(result.best.get('sub')).toBe('a')
    expect(result.cheapestComplete).toBe('a')
  })
})
