import { describe, expect, it } from 'vitest'
import { daysLeft, daysLeftLabel, filesByBucket } from './model'

describe('recycle bin', () => {
  const now = new Date('2026-10-31T12:00:00Z')

  it('counts down thirty days from the deletion', () => {
    expect(daysLeft('2026-10-31T08:00:00Z', now)).toBe(30)
    expect(daysLeft('2026-10-19T12:00:00Z', now)).toBe(18)
    expect(daysLeft('2026-10-01T11:00:00Z', now)).toBe(0)
    expect(daysLeft('2026-01-01T00:00:00Z', now)).toBe(0)
  })

  it('words the remaining time', () => {
    expect(daysLeftLabel(1)).toBe('zostáva 1 deň')
    expect(daysLeftLabel(3)).toBe('zostáva 3 dni')
    expect(daysLeftLabel(12)).toBe('zostáva 12 dní')
    expect(daysLeftLabel(0)).toBe('zmaže sa pri najbližšom čistení')
  })

  it('groups files by bucket and adds photo thumbnails', () => {
    const buckets = filesByBucket([
      { bucket: 'equipment-photos', path: 'c/a.jpg' },
      { bucket: 'event-documents', path: 'c/e/rider.pdf' },
      { bucket: 'equipment-photos', path: '' },
    ])
    expect(buckets.get('equipment-photos')).toEqual(['c/a.jpg', 'c/a-thumb.jpg'])
    expect(buckets.get('event-documents')).toEqual(['c/e/rider.pdf'])
  })
})
