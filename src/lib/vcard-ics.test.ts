import { describe, expect, it } from 'vitest'
import { buildIcs, googleCalendarUrl } from './ics'
import { buildVCard, isUsefulContact } from './vcard'

describe('vCard', () => {
  it('splits the name and escapes special characters', () => {
    const card = buildVCard({ name: 'Peter Ján Opravár', org: 'AV Servis, s.r.o.', phone: '+421 900 123 456', email: 'p@servis.sk', note: 'Robe; Yamaha' })
    expect(card).toContain('N:Opravár;Peter Ján;;;')
    expect(card).toContain('FN:Peter Ján Opravár')
    expect(card).toContain('ORG:AV Servis\\, s.r.o.')
    expect(card).toContain('TEL;TYPE=CELL:+421900123456')
    expect(card).toContain('NOTE:Robe\\; Yamaha')
    expect(card.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true)
  })

  it('falls back to the company name and knows when a contact is useless', () => {
    expect(buildVCard({ name: '', org: 'Kultúrny dom' })).toContain('FN:Kultúrny dom')
    expect(isUsefulContact({ name: 'Jano' })).toBe(false)
    expect(isUsefulContact({ name: 'Jano', email: 'j@x.sk' })).toBe(true)
  })
})

describe('iCalendar', () => {
  const item = { uid: 'event-1', title: 'Festival; Stropkov', startsOn: '2026-11-06', endsOn: '2026-11-08', location: 'Námestie', description: 'Get-in 8:00' }

  it('writes all-day events with an exclusive end date', () => {
    const ics = buildIcs([item], new Date('2026-10-18T10:00:00Z'))
    expect(ics).toContain('DTSTART;VALUE=DATE:20261106')
    expect(ics).toContain('DTEND;VALUE=DATE:20261109')
    expect(ics).toContain('SUMMARY:Festival\\; Stropkov')
    expect(ics).toContain('UID:event-1@rigtrack')
    expect(ics).toContain('DTSTAMP:20261018T100000Z')
  })

  it('folds long lines to 75 bytes', () => {
    const ics = buildIcs([{ ...item, description: 'Dlhý popis s diakritikou '.repeat(10) }])
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    expect(ics).toContain('\r\n ')
  })

  it('builds a Google Calendar link', () => {
    const url = new URL(googleCalendarUrl(item))
    expect(url.searchParams.get('dates')).toBe('20261106/20261109')
    expect(url.searchParams.get('text')).toBe('Festival; Stropkov')
  })
})

describe('splitContact', () => {
  it('finds a phone and an e-mail in free text', async () => {
    const { splitContact } = await import('./vcard')
    expect(splitContact('Jano 0900 123 456, jano@firma.sk')).toEqual({ phone: '0900 123 456', email: 'jano@firma.sk' })
    expect(splitContact('+421 911/222 333')).toEqual({ phone: '+421 911/222 333', email: '' })
    expect(splitContact('len meno')).toEqual({ phone: '', email: '' })
  })
})
