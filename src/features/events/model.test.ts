import { describe, expect, it } from 'vitest'
import type { Loan } from '@/features/loans/model'
import { busyElsewhere, eventSchema, formatFileSize, sortEvents, type CompanyEvent } from './model'

const today = '2026-10-13'

const event = (patch: Partial<CompanyEvent>): CompanyEvent => ({
  id: 'e1', name: 'Festival', client: '', venue: '', startsOn: '2026-11-01', endsOn: '2026-11-02', status: 'planned', note: '',
  equipment: [], crew: [], ...patch,
})
const loan = (patch: Partial<Loan>): Loan => ({
  id: 'l1', borrower: 'Klient', contact: '', startsOn: '2026-11-02', endsOn: '2026-11-03', status: 'reserved', note: '',
  issuedAt: null, returnedAt: null, items: [{ equipmentId: 'cables', quantity: 4, damaged: false }], ...patch,
})

describe('sortEvents', () => {
  it('lists upcoming events from the nearest, then past and cancelled from the latest', () => {
    const sorted = sortEvents(
      [
        event({ id: 'past-old', startsOn: '2026-05-01', endsOn: '2026-05-02', status: 'done' }),
        event({ id: 'later', startsOn: '2026-12-01', endsOn: '2026-12-01' }),
        event({ id: 'cancelled', startsOn: '2026-11-15', endsOn: '2026-11-15', status: 'cancelled' }),
        event({ id: 'soon', startsOn: '2026-10-20', endsOn: '2026-10-21', status: 'confirmed' }),
        event({ id: 'running', startsOn: '2026-10-12', endsOn: '2026-10-14' }),
      ],
      today,
    )
    expect(sorted.map((e) => e.id)).toEqual(['running', 'soon', 'later', 'cancelled', 'past-old'])
  })
})

describe('busyElsewhere', () => {
  const mine = event({})
  const cables = (id: string, patch: Partial<CompanyEvent>) => event({ id, equipment: [{ equipmentId: 'cables', quantity: 5 }], ...patch })

  it('adds up overlapping live events and open loans, but not this event, cancelled ones or other terms', () => {
    const events = [
      cables('e1', {}),
      cables('overlap', { startsOn: '2026-11-02', endsOn: '2026-11-04', status: 'confirmed' }),
      cables('cancelled', { status: 'cancelled' }),
      cables('other-term', { startsOn: '2026-12-01', endsOn: '2026-12-02' }),
    ]
    expect(busyElsewhere(mine, 'cables', events, [loan({})], today)).toBe(9)
    expect(busyElsewhere(mine, 'mixer', events, [loan({})], today)).toBe(0)
  })
})

describe('eventSchema', () => {
  const valid = { name: 'Festival', client: '', venue: '', startsOn: '2026-11-01', endsOn: '2026-11-02', status: 'planned', note: '' }

  it('requires a name and a sensible date range', () => {
    expect(eventSchema.safeParse(valid).success).toBe(true)
    expect(eventSchema.safeParse({ ...valid, name: ' ' }).success).toBe(false)
    expect(eventSchema.safeParse({ ...valid, endsOn: '2026-10-31' }).success).toBe(false)
  })
})

describe('formatFileSize', () => {
  it('uses readable units with a decimal comma', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1536)).toBe('1,5 kB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB')
  })
})
