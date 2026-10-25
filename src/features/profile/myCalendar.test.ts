import { describe, expect, it } from 'vitest'
import { byMonth, overlaps, type MyEvent } from './myCalendar'

const ev = (id: string, companyId: string, startsOn: string, endsOn: string, patch: Partial<MyEvent> = {}): MyEvent => ({
  id, companyId, name: id, startsOn, endsOn, venue: '', cancelled: false, response: 'yes', ...patch,
})

describe('my calendar', () => {
  it('finds overlapping events across companies, ignoring cancelled and declined', () => {
    const events = [
      ev('a', 'c1', '2026-11-10', '2026-11-12'),
      ev('b', 'c2', '2026-11-12', '2026-11-12'),
      ev('c', 'c2', '2026-11-11', '2026-11-11', { cancelled: true }),
      ev('d', 'c1', '2026-11-11', '2026-11-11', { response: 'no' }),
      ev('e', 'c1', '2026-11-20', '2026-11-20'),
    ]
    const result = overlaps(events)
    expect([...result.keys()].sort()).toEqual(['a', 'b'])
    expect(result.get('a')!.map((item) => item.id)).toEqual(['b'])
  })

  it('groups by month in date order', () => {
    expect(byMonth([ev('x', 'c', '2026-12-01', '2026-12-01'), ev('y', 'c', '2026-11-05', '2026-11-05')]).map(([month, list]) => [month, list.map((item) => item.id)])).toEqual([
      ['2026-11', ['y']],
      ['2026-12', ['x']],
    ])
  })
})
