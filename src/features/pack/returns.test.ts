import { describe, expect, it } from 'vitest'
import { lastReturns, returnedUnchecked, stillOut, type PackMark } from './returns'

const mark = (eventId: string, phase: PackMark['phase'], at: string, ids: { caseId?: string; equipmentId?: string }): PackMark => ({
  eventId,
  phase,
  checkedAt: at,
  checkedByName: '',
  caseId: ids.caseId ?? null,
  equipmentId: ids.equipmentId ?? null,
})

describe('returns from events', () => {
  const marks = [
    mark('e1', 'out', '2026-10-01T08:00:00Z', { caseId: 'cables' }),
    mark('e1', 'back', '2026-10-03T20:00:00Z', { caseId: 'cables' }),
    mark('e1', 'out', '2026-10-01T08:00:00Z', { caseId: 'amp' }),
    mark('e1', 'out', '2026-10-01T08:00:00Z', { equipmentId: 'mic' }),
    mark('e2', 'out', '2026-10-20T08:00:00Z', { caseId: 'amp' }),
  ]

  it('asks to count a returned case until someone checks it', () => {
    const back = lastReturns(marks).get('cables')
    expect(returnedUnchecked(back, null)).toBe(true)
    expect(returnedUnchecked(back, '2026-10-02T10:00:00Z')).toBe(true)
    expect(returnedUnchecked(back, '2026-10-04T10:00:00Z')).toBe(false)
    expect(returnedUnchecked(lastReturns(marks).get('amp'), null)).toBe(false)
  })

  it('lists what is still out after the event ended', () => {
    const events = [
      { id: 'e1', name: 'Ples', endsOn: '2026-10-03', status: 'done' },
      { id: 'e2', name: 'Festival', endsOn: '2026-11-10', status: 'confirmed' },
    ]
    const out = stillOut(marks, events, '2026-11-02')
    expect(out.map((group) => group.event.name)).toEqual(['Ples'])
    expect(out[0].items.map((item) => item.caseId ?? item.equipmentId)).toEqual(['amp', 'mic'])
  })
})
