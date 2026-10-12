import { describe, expect, it } from 'vitest'
import { shoppingSchema, shoppingTotal, sortShopping, type ShoppingItem } from './model'

const item = (patch: Partial<ShoppingItem>): ShoppingItem => ({
  id: 'x',
  list: 'buy',
  name: 'Vec',
  quantity: 1,
  unitPrice: null,
  supplier: '',
  url: '',
  priority: 'normal',
  dueOn: null,
  status: 'planned',
  assigneeId: null,
  orderNumber: '',
  note: '',
  createdBy: null,
  ...patch,
})

describe('shoppingTotal', () => {
  it('multiplies price by quantity and skips items without a price', () => {
    expect(shoppingTotal([item({ quantity: 3, unitPrice: 0.1 }), item({ quantity: 2, unitPrice: 1200 }), item({ quantity: 5 })])).toBe(2400.3)
  })
})

describe('sortShopping', () => {
  it('orders by priority and due date and keeps delivered items last', () => {
    const sorted = sortShopping([
      item({ id: 'delivered', status: 'delivered', priority: 'high' }),
      item({ id: 'low', priority: 'low' }),
      item({ id: 'normal-later', dueOn: '2026-12-01' }),
      item({ id: 'normal-sooner', dueOn: '2026-11-01' }),
      item({ id: 'high', priority: 'high' }),
    ])
    expect(sorted.map((i) => i.id)).toEqual(['high', 'normal-sooner', 'normal-later', 'low', 'delivered'])
  })
})

describe('shoppingSchema', () => {
  const valid = { list: 'want', name: 'Moving head', quantity: 2, supplier: '', url: '', priority: 'normal', dueOn: '', status: 'planned', assigneeId: '', orderNumber: '', note: '' }

  it('accepts web links only', () => {
    expect(shoppingSchema.safeParse({ ...valid, url: 'https://www.thomann.de/' }).success).toBe(true)
    expect(shoppingSchema.safeParse({ ...valid, url: 'javascript:alert(1)' }).success).toBe(false)
    expect(shoppingSchema.safeParse({ ...valid, url: 'thomann.de' }).success).toBe(false)
  })

  it('requires a name and a positive quantity', () => {
    expect(shoppingSchema.safeParse(valid).success).toBe(true)
    expect(shoppingSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
    expect(shoppingSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false)
  })
})
