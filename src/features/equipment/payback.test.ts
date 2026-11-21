import { describe, expect, it } from 'vitest'
import { payback } from './payback'

const item = { id: 'a', rentalPrice: 50, quantity: 2, attributes: { purchasePrice: 300 } }
const gig = (id: string, startsOn: string, endsOn: string, quantity: number, status = 'done') =>
  ({ id, startsOn, endsOn, status, equipment: [{ equipmentId: 'a', quantity, caseId: null }] }) as never
const loan = (price: number | null, items: { equipmentId: string; quantity: number; unitPrice: number | null }[]) =>
  ({ id: 'l', startsOn: '2026-03-01', endsOn: '2026-03-02', billedDays: null, price, status: 'returned', items: items.map((row) => ({ ...row, damaged: false, caseId: null })) }) as never

describe('payback', () => {
  it('sčíta odohrané eventy a výpožičky a nájde deň splatenia', () => {
    // Kúpa 2 × 300 = 600 €. Event 2 dni × 2 ks × 50 = 200; event 1 deň × 2 ks = 100; výpožička: podiel z 300 € dohodnutých.
    const result = payback(
      item,
      [gig('e1', '2026-01-10', '2026-01-11', 2), gig('e2', '2026-02-01', '2026-02-01', 2), gig('zrusene', '2026-02-05', '2026-02-05', 2, 'cancelled'), gig('buduce', '2099-01-01', '2099-01-01', 2)],
      [loan(400, [{ equipmentId: 'a', quantity: 1, unitPrice: 50 }, { equipmentId: 'b', quantity: 1, unitPrice: 50 }])],
      '2026-06-01',
    )
    expect(result).toMatchObject({ bought: 600, earned: 500, eventCount: 2, loanCount: 1, paidOn: null, percent: 83, missing: 100 })
  })

  it('splatená technika má dátum splatenia', () => {
    const result = payback(item, [gig('e1', '2026-01-01', '2026-01-06', 2), gig('e2', '2026-02-01', '2026-02-01', 2)], [], '2026-06-01')
    expect(result.paidOn).toBe('2026-01-06')
    expect(result.missing).toBe(0)
  })
})
