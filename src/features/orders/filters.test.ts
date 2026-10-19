import { describe, expect, it } from 'vitest'
import { filterOrders, NO_ORDER_FILTER, orderStats, type OrderSummary } from './model'

const order = (patch: Partial<OrderSummary>): OrderSummary => ({
  id: patch.id ?? 'o',
  source: 'shop',
  supplier: 'Thomann',
  seller: '',
  photoPath: '',
  orderNumber: '',
  orderedAt: '2026-03-01',
  currency: 'EUR',
  note: '',
  itemCount: 1,
  total: 100,
  createdAt: '2026-03-01T10:00:00Z',
  orderedBy: 'u1',
  forUs: true,
  forWhom: '',
  addToStock: true,
  hasInvoice: true,
  ...patch,
})

const orders = [
  order({ id: 'a', total: 50, orderedAt: '2026-01-10', createdAt: '2026-05-01T00:00:00Z' }),
  order({ id: 'b', total: 300, orderedAt: '2026-02-10', orderedBy: 'u2', supplier: 'Bazoš.sk', source: 'marketplace' }),
  order({ id: 'c', total: 20, orderedAt: '2025-12-24', forUs: false, forWhom: 'Klient', hasInvoice: false }),
]

describe('filterOrders', () => {
  it('sorts by price and by when they were added', () => {
    expect(filterOrders(orders, { ...NO_ORDER_FILTER, sort: 'total_desc' }).map((o) => o.id)).toEqual(['b', 'a', 'c'])
    expect(filterOrders(orders, { ...NO_ORDER_FILTER, sort: 'total_asc' }).map((o) => o.id)).toEqual(['c', 'a', 'b'])
    expect(filterOrders(orders, { ...NO_ORDER_FILTER, sort: 'created_desc' })[0].id).toBe('a')
    expect(filterOrders(orders, NO_ORDER_FILTER).map((o) => o.id)).toEqual(['b', 'a', 'c'])
  })

  it('filters by orderer, recipient, year and flags', () => {
    expect(filterOrders(orders, { ...NO_ORDER_FILTER, orderedBy: 'u2' }).map((o) => o.id)).toEqual(['b'])
    expect(filterOrders(orders, { ...NO_ORDER_FILTER, forWhom: 'others' }).map((o) => o.id)).toEqual(['c'])
    expect(filterOrders(orders, { ...NO_ORDER_FILTER, year: '2026', forWhom: 'us' })).toHaveLength(2)
    expect(filterOrders(orders, { ...NO_ORDER_FILTER, flag: 'noInvoice' }).map((o) => o.id)).toEqual(['c'])
    expect(filterOrders(orders, { ...NO_ORDER_FILTER, search: 'bazos' }).map((o) => o.id)).toEqual(['b'])
  })
})

describe('orderStats', () => {
  it('counts orders for others separately', () => {
    const stats = orderStats(orders)
    expect(stats.totals).toEqual({ EUR: 350 })
    expect(stats.forOthers).toEqual({ EUR: 20 })
    expect(stats.byMonth.map((row) => row.month)).toEqual(['2026-02', '2026-01'])
    expect(stats.bySupplier[0].name).toBe('Bazoš.sk')
    expect(stats.byOrderer.map((row) => row.id)).toEqual(['u2', 'u1'])
  })
})
