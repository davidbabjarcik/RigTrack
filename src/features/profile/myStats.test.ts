import { describe, expect, it } from 'vitest'
import { statsByCompany, summarize } from './myStats'

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

  it('summarizes the filtered period with hours by place, drives, duties and clients', () => {
    const data = {
      events: [
        { companyId: 'a', startsOn: '2026-03-01', endsOn: '2026-03-02', client: 'Mesto', venue: 'Námestie', cancelled: false, declined: false },
        { companyId: 'a', startsOn: '2026-03-20', endsOn: '2026-03-20', client: 'Mesto', venue: 'Hala', cancelled: false, declined: false },
        { companyId: 'b', startsOn: '2026-04-01', client: 'Klub', cancelled: false, declined: true },
      ],
      payments: [{ companyId: 'a', amount: 300, date: '2026-03-25' }],
      minutes: [
        { companyId: 'a', date: '2026-03-01', minutes: 600, source: 'event' as const },
        { companyId: 'a', date: '2026-03-05', minutes: 240, source: 'home' as const },
        { companyId: 'b', date: '2026-03-06', minutes: 120, source: 'company' as const },
      ],
      drives: [{ companyId: 'a', date: '2026-03-01', km: 120.5 }],
      duties: [
        { companyId: 'a', date: '2026-03-01', name: 'Nakladanie' },
        { companyId: 'a', date: '2026-03-20', name: 'Nakladanie' },
      ],
    }
    const all = summarize(data, { companyId: '', year: '2026', month: '' })
    expect(all).toMatchObject({ events: 2, days: 3, declined: 1, hoursEvent: 10, hoursHome: 4, hoursCompany: 2, earned: 300, perEvent: 150, drives: 1, km: 120.5 })
    expect(all.duties).toEqual([{ label: 'Nakladanie', value: 2 }])
    expect(all.clients).toEqual([{ label: 'Mesto', value: 2 }])
    expect(all.months[2]).toEqual({ month: '2026-03', events: 2, hours: 16, earned: 300 })
    expect(summarize(data, { companyId: 'b', year: '2026', month: '03' })).toMatchObject({ events: 0, hoursCompany: 2, earned: 0 })
    expect(summarize(data, { companyId: '', year: '', month: '' }).months).toEqual([])
  })
})
