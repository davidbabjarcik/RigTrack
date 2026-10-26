import { describe, expect, it } from 'vitest'
import { enqueue, enqueueUnit, mergeChecks, type PendingTick } from './offline'

const tick = (patch: Partial<PendingTick>): PendingTick => ({ rowKey: 'e:x', equipmentId: 'x', phase: 'out', checked: true, at: '2026-11-10T08:00:00Z', ...patch })
const check = (patch: object) => ({ id: 'c1', equipmentId: 'x', caseId: null, phase: 'out' as const, checkedByName: 'Jano', checkedAt: '2026-11-10T07:00:00Z', ...patch })

describe('offline pack list', () => {
  it('keeps only the newest change of a row and phase', () => {
    const queue = enqueue(enqueue([], tick({ checked: true })), tick({ checked: false }))
    expect(queue).toHaveLength(1)
    expect(queue[0].checked).toBe(false)
    expect(enqueue(queue, tick({ phase: 'back' }))).toHaveLength(2)
  })

  it('shows pending ticks and hides pending unticks', () => {
    expect(mergeChecks([], [tick({})])).toEqual([expect.objectContaining({ id: 'pending', equipmentId: 'x', checkedByName: 'čaká na odoslanie' })])
    expect(mergeChecks([check({})], [tick({ checked: false })])).toEqual([])
    expect(mergeChecks([check({})], [tick({ checked: true })])).toEqual([check({})])
    expect(mergeChecks([check({ phase: 'back' })], [tick({ checked: false })])).toEqual([check({ phase: 'back' })])
  })
})

describe('pending pieces', () => {
  it('keeps each scanned piece once per phase', () => {
    const one = { equipmentId: 'b', unit: 7, phase: 'out' as const }
    const queue = enqueueUnit(enqueueUnit([], one), one)
    expect(queue).toEqual([one])
    expect(enqueueUnit(queue, { ...one, phase: 'back' })).toHaveLength(2)
  })
})
