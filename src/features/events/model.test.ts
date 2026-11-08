import { describe, expect, it } from 'vitest'
import type { Loan } from '@/features/loans/model'
import { busyElsewhere, describeTimes, eventsSinceCheck, EMPTY_EVENT_DETAILS, eventSchema, formatFileSize, pastEventNames, plannedOnEvents, previousEdition, seriesKey, sameGearAt, sortEvents, whereBusy, type CompanyEvent } from './model'

const today = '2026-10-13'

const event = (patch: Partial<CompanyEvent>): CompanyEvent => ({
  id: 'e1', name: 'Festival', client: '', venue: '', startsOn: '2026-11-01', endsOn: '2026-11-02', status: 'planned', note: '',
  equipment: [], crew: [], ...EMPTY_EVENT_DETAILS, ...patch,
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
  const valid = { name: 'Festival', client: '', venue: '', startsOn: '2026-11-01', endsOn: '2026-11-02', status: 'planned', note: '', ...EMPTY_EVENT_DETAILS }

  it('requires a name and a sensible date range', () => {
    expect(eventSchema.safeParse(valid).success).toBe(true)
    expect(eventSchema.safeParse({ ...valid, name: ' ' }).success).toBe(false)
    expect(eventSchema.safeParse({ ...valid, endsOn: '2026-10-31' }).success).toBe(false)
  })

  it('accepts organizer contacts and times, but not a broken e-mail or time', () => {
    expect(eventSchema.safeParse({ ...valid, organizerEmail: 'info@mesto.sk', getInTime: '14:00', showTime: '19:30' }).success).toBe(true)
    expect(eventSchema.safeParse({ ...valid, organizerEmail: 'info@' }).success).toBe(false)
    expect(eventSchema.safeParse({ ...valid, showTime: '7' }).success).toBe(false)
  })
})

describe('describeTimes', () => {
  it('lists only the times that are filled in', () => {
    expect(describeTimes({ getInTime: '14:00', showTime: '19:30', showEndTime: '23:00' })).toBe('príchod / stavba 14:00 · program 19:30 – 23:00')
    expect(describeTimes({ getInTime: '', showTime: '20:00', showEndTime: '' })).toBe('program 20:00')
    expect(describeTimes({ getInTime: '', showTime: '', showEndTime: '' })).toBe('')
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
    id, name, client: '', venue: '', startsOn, endsOn: startsOn, status: 'done', note: '', equipment: [], crew: [], ...EMPTY_EVENT_DETAILS, ...patch,
  })
  const events = [
    edition('j24', 'Letný fest Ukážkovo 2024', '2024-08-10'),
    edition('j25', 'Letný fest – Ukážkovo 2025', '2025-08-09', { venue: 'Amfiteáter' }),
    edition('j25x', 'Letný fest Ukážkovo', '2025-09-01', { status: 'cancelled' }),
    edition('k25', 'Deň kapusty 2025', '2025-09-20'),
  ]

  it('treats the same name without the year, case and diacritics as one event', () => {
    expect(seriesKey('Letný fest Ukážkovo 2025')).toBe(seriesKey('letný fest – ukážkovo'))
    expect(seriesKey('Deň kapusty 2025')).toBe('den kapusty')
    expect(seriesKey('2025')).toBe('')
  })

  it('finds the latest earlier edition and skips cancelled ones', () => {
    expect(previousEdition(events, { name: 'Letný fest Ukážkovo 2026', startsOn: '2026-08-08' })?.id).toBe('j25')
    expect(previousEdition(events, { id: 'j25', name: 'Letný fest – Ukážkovo 2025', startsOn: '2025-08-09' })?.id).toBe('j24')
    expect(previousEdition(events, { name: 'Nová akcia', startsOn: '2026-01-01' })).toBeNull()
    expect(previousEdition(events, { name: '', startsOn: '2026-01-01' })).toBeNull()
  })

  it('offers each past event once, newest first', () => {
    expect(pastEventNames(events)).toEqual(['Deň kapusty 2025', 'Letný fest – Ukážkovo 2025'])
  })
})

describe('eventsSinceCheck', () => {
  const withCase = (id: string, startsOn: string, patch: Partial<CompanyEvent> = {}) =>
    event({ id, startsOn, endsOn: startsOn, status: 'done', equipment: [{ equipmentId: 'mix', quantity: 1, caseId: 'box' }], ...patch })
  const events = [
    withCase('old', '2026-08-01'),
    withCase('a', '2026-09-10'),
    withCase('b', '2026-10-01'),
    withCase('cancelled', '2026-10-05', { status: 'cancelled' }),
    withCase('future', '2026-12-01', { status: 'planned' }),
    event({ id: 'other', startsOn: '2026-10-02', endsOn: '2026-10-02', status: 'done' }),
  ]

  it('counts past events with the case after its last check, not this one', () => {
    expect(eventsSinceCheck('box', '2026-09-01', events, 'future', today)).toBe(2)
    expect(eventsSinceCheck('box', '2026-10-01', events, 'future', today)).toBe(0)
    expect(eventsSinceCheck('box', null, events, 'b', today)).toBe(2)
  })
})

describe('whereBusy', () => {
  it('lists the other events and open loans that hold the equipment in the term', () => {
    const events = [
      event({ id: 'e1', equipment: [{ equipmentId: 'cables', quantity: 5, caseId: null }] }),
      event({ id: 'other', name: 'Ples', startsOn: '2026-11-02', endsOn: '2026-11-03', equipment: [{ equipmentId: 'cables', quantity: 3, caseId: null }] }),
      event({ id: 'cancelled', status: 'cancelled', equipment: [{ equipmentId: 'cables', quantity: 2, caseId: null }] }),
      event({ id: 'none', equipment: [{ equipmentId: 'mixer', quantity: 1, caseId: null }] }),
    ]
    const result = whereBusy(event({}), 'cables', events, [loan({}), loan({ id: 'done', status: 'returned' })], today)
    expect(result.onEvents).toEqual([{ id: 'other', name: 'Ples', startsOn: '2026-11-02', endsOn: '2026-11-03', quantity: 3 }])
    expect(result.onLoans).toEqual([{ id: 'l1', borrower: 'Klient', overdue: false, quantity: 4 }])
  })
})

describe('sameGearAt', () => {
  const linked = [
    { companyName: 'Partner A', name: 'Svetlo 1', manufacturer: 'Maker', model: 'X1', quantity: 4 },
    { companyName: 'Partner A', name: 'Svetlo 1 b', manufacturer: 'maker ', model: 'x1', quantity: 2 },
    { companyName: 'Partner B', name: 'Iné', manufacturer: 'Maker', model: 'X1', quantity: 8 },
    { companyName: 'Partner C', name: 'Kábel 10 m', manufacturer: '', model: '', quantity: 20 },
  ]
  it('matches by manufacturer and model, summed per company', () => {
    expect(sameGearAt({ name: 'Moje svetlo', manufacturer: 'MAKER', model: 'X1' }, linked)).toEqual([
      { companyName: 'Partner B', quantity: 8 },
      { companyName: 'Partner A', quantity: 6 },
    ])
  })
  it('falls back to the name without a model', () => {
    expect(sameGearAt({ name: 'kábel 10 m', manufacturer: '', model: '' }, linked)).toEqual([{ companyName: 'Partner C', quantity: 20 }])
    expect(sameGearAt({ name: '', manufacturer: '', model: '' }, linked)).toEqual([])
  })
})
