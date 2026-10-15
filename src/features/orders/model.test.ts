import { describe, expect, it } from 'vitest'
import { EMPTY_ITEM, orderSchema, orderTotal, supplierProductUrl } from './model'

const order = (items: object[]) => ({
  source: 'shop',
  supplier: 'Thomann',
  seller: '',
  orderNumber: '',
  orderedAt: '2026-10-12',
  currency: 'EUR',
  note: '',
  items,
})
const item = (patch: object) => ({ ...EMPTY_ITEM, name: 'Hák', ...patch })

describe('supplierProductUrl', () => {
  it('links Thomann articles by their number, whatever the spelling of the supplier', () => {
    expect(supplierProductUrl('Thomann', '358334')).toBe('https://www.thomann.de/intl/search_dir.html?sw=358334')
    expect(supplierProductUrl('thomann gmbh', ' 358334 ')).toBe('https://www.thomann.de/intl/search_dir.html?sw=358334')
  })

  it('returns nothing without a code or for other suppliers', () => {
    expect(supplierProductUrl('Thomann', '')).toBeNull()
    expect(supplierProductUrl('Music Store', '358334')).toBeNull()
  })
})

describe('orderTotal', () => {
  it('sums quantity × unit price without float drift', () => {
    expect(orderTotal([{ quantity: 3, unitPrice: 0.1 }, { quantity: 1, unitPrice: 0.2 }])).toBe(0.5)
    expect(orderTotal([{ quantity: 16, unitPrice: 5 }, { quantity: 4, unitPrice: 89.5 }])).toBe(438)
  })

  it('ignores rows that are still being typed', () => {
    expect(orderTotal([{ quantity: NaN, unitPrice: 5 }, { quantity: 2, unitPrice: 5 }])).toBe(10)
  })
})

describe('orderSchema', () => {
  it('accepts a valid order', () => {
    expect(orderSchema.safeParse(order([item({ quantity: 16, unitPrice: 5, mode: 'bulk' })])).success).toBe(true)
  })

  it('requires at least one item, a supplier and a date', () => {
    expect(orderSchema.safeParse(order([])).success).toBe(false)
    expect(orderSchema.safeParse({ ...order([item({})]), supplier: ' ' }).success).toBe(false)
    expect(orderSchema.safeParse({ ...order([item({})]), source: 'marketplace', supplier: 'Bazoš.sk', seller: 'Jozef' }).success).toBe(true)
    expect(orderSchema.safeParse({ ...order([item({})]), source: 'auction' }).success).toBe(false)
    expect(orderSchema.safeParse({ ...order([item({})]), orderedAt: '' }).success).toBe(false)
  })

  it('requires a target when topping up existing equipment', () => {
    expect(orderSchema.safeParse(order([item({ mode: 'existing' })])).success).toBe(false)
    expect(orderSchema.safeParse(order([item({ mode: 'existing', equipmentId: 'abc' })])).success).toBe(true)
  })

  it('limits how many separate pieces one line can create', () => {
    expect(orderSchema.safeParse(order([item({ mode: 'separate', quantity: 201 })])).success).toBe(false)
    expect(orderSchema.safeParse(order([item({ mode: 'bulk', quantity: 201 })])).success).toBe(true)
  })

  it('rejects zero quantity and negative prices', () => {
    expect(orderSchema.safeParse(order([item({ quantity: 0 })])).success).toBe(false)
    expect(orderSchema.safeParse(order([item({ unitPrice: -1 })])).success).toBe(false)
  })
})
