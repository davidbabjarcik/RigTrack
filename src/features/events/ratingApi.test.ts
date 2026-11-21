import { describe, expect, it } from 'vitest'
import { isSafeLink, ratingSummary } from './ratingApi'

describe('hodnotenie', () => {
  it('priemer len z ohodnotených', () => {
    expect(ratingSummary([{ stars: 5 }, { stars: 4 }, { stars: null }])).toEqual({ count: 2, average: 4.5 })
    expect(ratingSummary([])).toEqual({ count: 0, average: null })
  })

  it('odkaz na recenzie len https', () => {
    expect(isSafeLink('https://g.page/r/ukazka/review')).toBe(true)
    expect(isSafeLink('')).toBe(true)
    expect(isSafeLink('http://ukazka.sk')).toBe(false)
    expect(isSafeLink('javascript:alert(1)')).toBe(false)
  })
})
