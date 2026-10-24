import { describe, expect, it } from 'vitest'
import { statsByCompany } from './myStats'

describe('my stats across companies', () => {
  it('sums events, earnings and hours per company', () => {
    const events = [
      { companyId: 'a', startsOn: '2026-03-01', cancelled: false, declined: false },
      { companyId: 'a', startsOn: '2025-12-01', cancelled: false, declined: false },
      { companyId: 'a', startsOn: '2026-05-01', cancelled: true, declined: false },
      { companyId: 'b', startsOn: '2026-06-01', cancelled: false, declined: true },
      { companyId: 'b', startsOn: '2026-07-01', cancelled: false, declined: false },
    ]
    const payments = [
      { companyId: 'a', amount: 120, date: '2026-03-02' },
      { companyId: 'a', amount: 80.5, date: '2025-12-02' },
    ]
    const minutes = [
      { companyId: 'b', date: '2026-07-01', minutes: 450 },
      { companyId: 'b', date: '2025-07-01', minutes: 600 },
    ]
    expect(statsByCompany(['a', 'b'], events, payments, minutes, '2026')).toEqual([
      { companyId: 'a', events: 2, eventsYear: 1, earned: 200.5, earnedYear: 120, hoursYear: 0 },
      { companyId: 'b', events: 1, eventsYear: 1, earned: 0, earnedYear: 0, hoursYear: 7.5 },
    ])
  })
})
