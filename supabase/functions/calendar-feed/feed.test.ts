import { describe, expect, it } from 'vitest'
import { buildFeed, isFeedToken, type FeedEvent } from './feed'

const event = (patch: Partial<FeedEvent>): FeedEvent => ({
  id: 'e1', name: 'Festival', venue: 'Námestie, Mesto', starts_on: '2026-11-20', ends_on: '2026-11-21', status: 'confirmed',
  get_in_time: '08:00', show_time: '20:00', show_end_time: '23:30', crew_role: 'Svetlá', company_name: 'Firma', scope: 'mine', app_url: 'https://app.example.com/', ...patch,
})

describe('calendar feed', () => {
  it('builds all-day events with times, role and a link into the app', () => {
    const ics = buildFeed([event({})], new Date('2026-11-08T10:00:00Z'))
    expect(ics).toContain('X-WR-CALNAME:RigTrack – Firma (moje eventy)')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261120')
    expect(ics).toContain('DTEND;VALUE=DATE:20261122')
    expect(ics).toContain('LOCATION:Námestie\\, Mesto')
    expect(ics.replace(/\r\n /g, '')).toContain('DESCRIPTION:Potvrdený\\nRola: Svetlá\\nPríchod 08:00\\, Začiatok 20:00–23:30\\nhttps://app.example.com/events/e1')
    expect(ics).toContain('URL:https://app.example.com/events/e1')
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true)
  })

  it('marks planned events as tentative and works without the app address', () => {
    const ics = buildFeed([event({ status: 'planned', app_url: '', crew_role: '', get_in_time: '', show_time: '' })])
    expect(ics).toContain('STATUS:TENTATIVE')
    expect(ics).not.toContain('URL:')
    expect(buildFeed([])).toContain('X-WR-CALNAME:RigTrack')
  })

  it('accepts only a 64 character hex key', () => {
    expect(isFeedToken('a'.repeat(64))).toBe(true)
    expect(isFeedToken('a'.repeat(63))).toBe(false)
    expect(isFeedToken(`${'a'.repeat(60)}' or`)).toBe(false)
  })
})
