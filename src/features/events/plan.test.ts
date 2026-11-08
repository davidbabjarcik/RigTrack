import { describe, expect, it } from 'vitest'
import { dayKm, defaultProgram, eventDates, formatMinutes, onDay, timesFromProgram, totalKm, workedMinutes, worthSaving } from './plan'

describe('multi-day events', () => {
  it('lists the days of an event', () => {
    expect(eventDates('2026-11-07', '2026-11-11')).toEqual(['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'])
    expect(eventDates('2026-11-07', '2026-11-07')).toEqual(['2026-11-07'])
  })

  it('treats an empty day list as every day', () => {
    expect(onDay([], '2026-11-07')).toBe(true)
    expect(onDay(['2026-11-08'], '2026-11-07')).toBe(false)
  })

  it('counts kilometres from the warehouse', () => {
    // 92 km jedným smerom, 2 autá, 1 otočka → 368 km; druhý deň 1 auto, 2 otočky + 15 km po meste
    expect(dayKm(92, { vehicles: 2, roundTrips: 1, extraKm: 0 })).toBe(368)
    expect(totalKm(92, [{ vehicles: 2, roundTrips: 1, extraKm: 0 }, { vehicles: 1, roundTrips: 2, extraKm: 15 }])).toBe(751)
    expect(dayKm(null, { vehicles: 1, roundTrips: 1, extraKm: 20 })).toBe(20)
  })

  it('counts worked time including overnight shifts and breaks', () => {
    expect(workedMinutes({ startsAt: '08:00', endsAt: '18:30', breakMinutes: 45 })).toBe(585)
    expect(workedMinutes({ startsAt: '18:00', endsAt: '02:00', breakMinutes: 0 })).toBe(480)
    expect(formatMinutes(585)).toBe('9 h 45 min')
    expect(formatMinutes(480)).toBe('8 h')
  })
})

describe('program when adding an event', () => {
  const none = { getInTime: '', showTime: '', showEndTime: '' }
  it('suggests build, event and teardown days', () => {
    expect(defaultProgram(['2026-11-15'], [], none).map((row) => row.kind)).toEqual(['show'])
    expect(defaultProgram(['2026-11-15', '2026-11-16'], [], none).map((row) => row.kind)).toEqual(['show', 'teardown'])
    expect(defaultProgram(eventDates('2026-11-15', '2026-11-18'), [], none).map((row) => row.kind)).toEqual(['build', 'show', 'show', 'teardown'])
  })

  it('keeps saved days and fills old event times into a new program', () => {
    const saved = [{ id: 'd1', day: '2026-11-16', kind: 'show' as const, startsAt: '21:00', endsAt: '03:00', note: '' }]
    const kept = defaultProgram(eventDates('2026-11-15', '2026-11-17'), saved, { getInTime: '08:00', showTime: '20:00', showEndTime: '' })
    expect(kept[1]).toBe(saved[0])
    expect(kept[0].startsAt).toBe('')
    const old = defaultProgram(eventDates('2026-11-15', '2026-11-17'), [], { getInTime: '14:00', showTime: '21:07', showEndTime: '03:00' })
    expect(old.map((row) => [row.kind, row.startsAt, row.endsAt])).toEqual([['build', '14:00', ''], ['show', '21:07', '03:00'], ['teardown', '', '']])
  })

  it('derives the event times from the program', () => {
    const rows = defaultProgram(eventDates('2026-11-15', '2026-11-17'), [], { getInTime: '14:00', showTime: '21:07', showEndTime: '03:00' })
    expect(timesFromProgram(rows)).toEqual({ getInTime: '14:00', showTime: '21:07', showEndTime: '03:00' })
    expect(timesFromProgram([{ day: '2026-11-15', kind: 'show', startsAt: '18:00', endsAt: '23:00', note: '' }])).toEqual({ getInTime: '', showTime: '18:00', showEndTime: '23:00' })
    expect(worthSaving({ day: '2026-11-15', kind: 'show', startsAt: '', endsAt: '', note: ' ' })).toBe(false)
    expect(worthSaving({ day: '2026-11-15', kind: 'build', startsAt: '14:00', endsAt: '', note: '' })).toBe(true)
  })
})
