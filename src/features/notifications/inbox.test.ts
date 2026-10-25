import { describe, expect, it } from 'vitest'
import { timeAgo } from './inbox'

describe('inbox', () => {
  it('formats how long ago a notification came', () => {
    const now = Date.parse('2026-10-25T12:00:00Z')
    expect(timeAgo('2026-10-25T11:59:40Z', now)).toBe('teraz')
    expect(timeAgo('2026-10-25T11:55:00Z', now)).toBe('pred 5 min')
    expect(timeAgo('2026-10-25T09:00:00Z', now)).toBe('pred 3 h')
    expect(timeAgo('2026-10-24T10:00:00Z', now)).toBe('včera')
  })
})
