import { describe, expect, it } from 'vitest'
import type { CompanyEvent } from '@/features/events/model'
import { clientEvents, clientSummary, loanMatches } from './history'

const event = (id: string, startsOn: string, organizer = '', status = 'confirmed') => ({ id, name: id, startsOn, endsOn: startsOn, organizer, status }) as CompanyEvent

describe('client history', () => {
  const events = [
    event('ples', '2026-01-20', 'Mesto Stropkov'),
    event('jarmok', '2026-08-15'),
    event('silvester', '2026-12-31'),
    event('zruseny', '2026-05-01', 'Mesto Stropkov', 'cancelled'),
    event('cudzi', '2026-06-01', 'Iná firma'),
  ]
  const links = [
    { eventId: 'jarmok', partnerId: 'p', kind: 'organizer' as const },
    { eventId: 'silvester', partnerId: 'p', kind: 'partner' as const },
  ]
  const revenue: Record<string, number> = { ples: 1200, jarmok: 3000.5 }

  it('finds linked events and older ones by organizer name, newest first', () => {
    const items = clientEvents({ id: 'p', name: 'mesto  Stropkov' }, events, links, (id) => revenue[id] ?? 0)
    expect(items.map((item) => [item.event.id, item.kind])).toEqual([
      ['silvester', 'partner'],
      ['jarmok', 'organizer'],
      ['ples', 'organizer'],
    ])
    const summary = clientSummary(items, '2026-10-24')
    expect(summary).toMatchObject({ count: 3, revenue: 4200.5 })
    expect([summary.first?.id, summary.last?.id, summary.next?.id]).toEqual(['ples', 'jarmok', 'silvester'])
  })

  it('matches loans by IČO, otherwise by name', () => {
    expect(loanMatches({ borrower: 'Iné meno', borrowerIco: '123 456' }, { name: 'Mesto', ico: '123456' })).toBe(true)
    expect(loanMatches({ borrower: 'Mesto', borrowerIco: '999' }, { name: 'Mesto', ico: '123456' })).toBe(false)
    expect(loanMatches({ borrower: 'MESTO Stropkov', borrowerIco: '' }, { name: 'Mesto Stropkov', ico: '123456' })).toBe(true)
    expect(loanMatches({ borrower: '', borrowerIco: '' }, { name: '', ico: '' })).toBe(false)
  })
})
