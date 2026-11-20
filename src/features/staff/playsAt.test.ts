import { describe, expect, it } from 'vitest'
import { playsAt } from './model'

const crew = (memberId: string | null, name: string, role = 'DJ') => ({ id: name, memberId, name, role }) as never

describe('playsAt', () => {
  it('člen podľa účtu, externista podľa mena, len na DJ hraní', () => {
    const gig = { kind: 'dj', crew: [crew('m1', ''), crew(null, 'Ukážkový DJ')] } as never
    expect(playsAt(gig, { memberId: 'm1', name: 'x' })).toBe(true)
    expect(playsAt(gig, { memberId: null, name: ' ukážkový dj ' })).toBe(true)
    expect(playsAt(gig, { memberId: 'm2', name: 'Ukážkový DJ' })).toBe(false)
    expect(playsAt({ ...(gig as object), kind: 'event' } as never, { memberId: 'm1', name: '' })).toBe(false)
  })
})
