import { describe, expect, it } from 'vitest'
import { bothBases, incomeTotals, type EventPayment } from './income'

const payment = (patch: Partial<EventPayment>): EventPayment => ({
  id: 'p',
  amount: 100,
  method: 'cash',
  invoicedBy: '',
  vat: 'with',
  vatRate: 23,
  receivedOn: '2026-09-05',
  note: '',
  createdByName: '',
  ...patch,
})

describe('event income', () => {
  it('works out the other VAT basis when the rate is known', () => {
    expect(bothBases({ amount: 123, vat: 'with', vatRate: 23 })).toEqual({ gross: 123, net: 100 })
    expect(bothBases({ amount: 1500, vat: 'without', vatRate: 23 })).toEqual({ net: 1500, gross: 1845 })
    expect(bothBases({ amount: 100, vat: 'with', vatRate: null })).toEqual({ gross: 100, net: null })
  })

  it('adds up cash, account and invoices', () => {
    const totals = incomeTotals([
      payment({ amount: 1500, method: 'cash', vat: 'with' }),
      payment({ amount: 1500, method: 'invoice', invoicedBy: 'JEF', vat: 'without' }),
    ])
    expect(totals.byMethod).toEqual({ cash: 1500, account: 0, invoice: 1500 })
    expect(totals).toMatchObject({ gross: 3345, net: 2719.51, complete: true })
    expect(incomeTotals([payment({ vatRate: null })]).complete).toBe(false)
  })
})
