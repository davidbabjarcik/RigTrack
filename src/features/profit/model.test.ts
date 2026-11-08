import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, eventIncome, eventProfit, gearWear, profitSummary, type ProfitInput } from './model'

const offer = (status: 'draft' | 'sent' | 'accepted', price: number, vatMode: 'with' | 'plus' | 'none' = 'plus') => ({
  status,
  sections: [{ id: 's', title: 'Zvuk', description: '', items: '', includes: '', price, priceNote: '', priceMode: 'manual' as const, lines: [], parts: [] }],
  totalOverride: null,
  vatMode,
  vatPct: 23,
})

const base: ProfitInput = { days: 2, payments: [], offers: [], crewPayments: [], expenses: [], km: 0, costs: [], gear: [], settings: DEFAULT_SETTINGS }

describe('event income', () => {
  it('uses payments without VAT first', () => {
    expect(eventIncome([{ amount: 1230, vat: 'with', vatRate: 23 }, { amount: 500, vat: 'without', vatRate: null }], [offer('accepted', 9999)])).toEqual({ amount: 1500, source: 'payments' })
  })

  it('falls back to the accepted, then sent offer', () => {
    expect(eventIncome([], [offer('sent', 800), offer('accepted', 2460, 'with')])).toEqual({ amount: 2000, source: 'offer' })
    expect(eventIncome([], [offer('draft', 100), offer('sent', 800)])).toEqual({ amount: 800, source: 'offer' })
    expect(eventIncome([], [offer('draft', 100)])).toEqual({ amount: 0, source: 'none' })
  })
})

describe('gear wear', () => {
  it('spreads yearly depreciation over the days gear is used', () => {
    // 2 × 3000 € na 5 rokov = 1200 € ročne / 60 dní = 20 € na deň × 2 dni
    expect(gearWear([{ quantity: 2, purchasePrice: 3000, depreciationYears: 5 }, { quantity: 1 }], 2, 60)).toEqual({ amount: 40, unpriced: 1 })
  })
})

describe('event profit', () => {
  it('subtracts every cost from income', () => {
    const result = eventProfit({
      ...base,
      payments: [{ amount: 3000, vat: 'without', vatRate: null }],
      crewPayments: [{ amount: 400, kind: 'reward' }, { amount: 100, kind: 'bonus' }, { amount: 200, kind: 'advance' }],
      expenses: [50, 30.5],
      km: 364,
      costs: [{ kind: 'rental', amount: 300 }, { kind: 'other', amount: 20 }],
      gear: [{ quantity: 2, purchasePrice: 3000, depreciationYears: 5 }],
      settings: { kmRate: 0.35, gearUseDays: 60 },
    })
    expect(result.lines.find((line) => line.key === 'crew')?.amount).toBe(500)
    expect(result.lines.find((line) => line.key === 'travel')?.amount).toBe(127.4)
    expect(result.costs).toBe(500 + 127.4 + 80.5 + 300 + 20 + 40)
    expect(result.profit).toBe(3000 - 1067.9)
    expect(result.margin).toBe(64)
  })

  it('has no margin without income', () => {
    expect(eventProfit({ ...base, expenses: [10] })).toMatchObject({ profit: -10, margin: null })
  })
})

describe('profit summary', () => {
  it('totals events and ranks clients by profit', () => {
    const p = (income: number, costs: number) => eventProfit({ ...base, payments: [{ amount: income, vat: 'without', vatRate: null }], expenses: [costs] })
    const summary = profitSummary([
      { client: 'Klient A', profit: p(1000, 400) },
      { client: 'Klient B', profit: p(2000, 500) },
      { client: 'Klient A', profit: p(500, 600) },
    ])
    expect(summary).toMatchObject({ income: 3500, costs: 1500, profit: 2000, margin: 57 })
    expect(summary.clients.map((client) => [client.client, client.events, client.profit])).toEqual([['Klient B', 1, 1500], ['Klient A', 2, 500]])
  })
})
