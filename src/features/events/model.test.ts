import { describe, expect, it } from 'vitest'
import type { Loan } from '@/features/loans/model'
import { busyElsewhere, eventSchema, formatFileSize, pastEventNames, plannedOnEvents, previousEdition, seriesKey, sortEvents, type CompanyEvent } from './model'

const today = '2026-10-13'

const event = (patch: Partial<CompanyEvent>): CompanyEvent => ({
  id: 'e1', name: 'Festival', client: '', venue: '', startsOn: '2026-11-01', endsOn: '2026-11-02', status: 'planned', note: '',
  equipment: [], crew: [], ...patch,
})
const loan = (patch: Partial<Loan>): Loan => ({
  id: 'l1', borrower: 'Klient', contact: '', borrowerIco: '', borrowerAddress: '', billedDays: null, price: null, deposit: null, startsOn: '2026-11-02', endsOn: '2026-11-03', status: 'reserved', note: '',
  issuedAt: null, returnedAt: null, issuedByName: '', returnedByName: '', items: [{ equipmentId: 'cables', quantity: 4, damaged: false, caseId: null, unitNumbers: [], damagedUnits: [], damagedQuantity: 0, unitPrice: null }], ...patch,
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
  const cables = (id: string, patch: Partial<CompanyEvent>) => event({ id, equipment: [{ equipmentId: 'cables', quantity: 5, caseId: null }], ...patch })

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

describe('plannedOnEvents', () => {
  it('counts equipment on live events overlapping the term', () => {
    const events = [
      event({ id: 'a', equipment: [{ equipmentId: 'lights', quantity: 3, caseId: null }] }),
      event({ id: 'b', status: 'cancelled', equipment: [{ equipmentId: 'lights', quantity: 2, caseId: null }] }),
      event({ id: 'c', startsOn: '2026-12-01', endsOn: '2026-12-02', equipment: [{ equipmentId: 'lights', quantity: 4, caseId: null }] }),
    ]
    expect(plannedOnEvents(events, 'lights', '2026-11-02', '2026-11-05')).toBe(3)
    expect(plannedOnEvents(events, 'lights', '2026-11-03', '2026-11-30')).toBe(0)
    expect(plannedOnEvents(events, 'mixer', '2026-11-01', '2026-11-02')).toBe(0)
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

describe('recurring events', () => {
  const edition = (id: string, name: string, startsOn: string, patch: Partial<CompanyEvent> = {}): CompanyEvent => ({
    id, name, client: '', venue: '', startsOn, endsOn: startsOn, status: 'done', note: '', equipment: [], crew: [], ...patch,
  })
  const events = [
    edition('j24', 'JESKO Medzilaborce 2024', '2024-08-10'),
    edition('j25', 'Jesko – Medzilaborce 2025', '2025-08-09', { venue: 'Amfiteáter' }),
    edition('j25x', 'JESKO Medzilaborce', '2025-09-01', { status: 'cancelled' }),
    edition('k25', 'Deň kapusty 2025', '2025-09-20'),
  ]

  it('treats the same name without the year, case and diacritics as one event', () => {
    expect(seriesKey('JESKO Medzilaborce 2025')).toBe(seriesKey('jesko – medzilaborce'))
    expect(seriesKey('Deň kapusty 2025')).toBe('den kapusty')
    expect(seriesKey('2025')).toBe('')
  })

  it('finds the latest earlier edition and skips cancelled ones', () => {
    expect(previousEdition(events, { name: 'JESKO Medzilaborce 2026', startsOn: '2026-08-08' })?.id).toBe('j25')
    expect(previousEdition(events, { id: 'j25', name: 'Jesko – Medzilaborce 2025', startsOn: '2025-08-09' })?.id).toBe('j24')
    expect(previousEdition(events, { name: 'Nová akcia', startsOn: '2026-01-01' })).toBeNull()
    expect(previousEdition(events, { name: '', startsOn: '2026-01-01' })).toBeNull()
  })

  it('offers each past event once, newest first', () => {
    expect(pastEventNames(events)).toEqual(['Deň kapusty 2025', 'Jesko – Medzilaborce 2025'])
  })
})
