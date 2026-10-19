import { describe, expect, it } from 'vitest'
import type { CompanyEvent } from '@/features/events/model'
import { yearReport, yearReportYear } from './model'

const event = (patch: Partial<CompanyEvent>) =>
  ({ id: 'e', name: 'Ples', client: 'Mesto', venue: '', startsOn: '2026-02-10', endsOn: '2026-02-11', status: 'done', note: '', equipment: [], crew: [], ...patch }) as CompanyEvent

describe('yearReport', () => {
  it('counts events, days, crew and money for the year', () => {
    const report = yearReport({
      year: '2026',
      events: [
        event({ crew: [{ id: 'c', memberId: 'u1', name: '', role: '', response: 'yes', responseNote: '' }] }),
        event({ id: 'f', startsOn: '2026-07-01', endsOn: '2026-07-03', client: 'Mesto', crew: [{ id: 'd', memberId: 'u1', name: '', role: '', response: 'pending', responseNote: '' }, { id: 'x', memberId: 'u2', name: '', role: '', response: 'no', responseNote: '' }] }),
        event({ id: 'g', status: 'cancelled' }),
        event({ id: 'h', startsOn: '2025-12-31', endsOn: '2025-12-31' }),
      ],
      income: [{ amount: 1000, receivedOn: '2026-03-01' }, { amount: 50, receivedOn: '2025-01-01' }],
      payouts: [{ amount: 200, happenedOn: '2026-03-02' }],
    })
    expect(report.events).toMatchObject({ count: 2, days: 5, clients: [['Mesto', 2]] })
    expect(report.events?.crew).toEqual([{ key: 'u1', memberId: 'u1', name: '', events: 2, days: 5 }])
    expect(report.events?.months[6].events).toBe(1)
    expect(report.money).toMatchObject({ income: 1000, payouts: 200, orders: undefined })
    expect(report.service).toBeUndefined()
  })
})

describe('yearReportYear', () => {
  it('shows the report only on 31 Dec and 1 Jan', () => {
    expect(yearReportYear('2026-12-31')).toBe('2026')
    expect(yearReportYear('2027-01-01')).toBe('2026')
    expect(yearReportYear('2027-01-02')).toBeNull()
  })
})
