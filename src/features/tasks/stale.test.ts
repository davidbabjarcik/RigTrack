import { describe, expect, it } from 'vitest'
import { assigneesOf, isAssignedTo, isTaskStale } from './model'

describe('tasks for several people', () => {
  it('knows who has the task and when it is stale', () => {
    const task = { assigneeId: 'a', assigneeIds: ['a', 'b'], status: 'open' as const, createdAt: '2026-09-01T10:00:00Z' }
    expect(isAssignedTo(task, 'b')).toBe(true)
    expect(isAssignedTo(task, 'c')).toBe(false)
    expect(assigneesOf({ assigneeId: 'x', assigneeIds: [] })).toEqual(['x'])
    expect(isTaskStale(task, '2026-10-19')).toBe(true)
    expect(isTaskStale(task, '2026-09-20')).toBe(false)
    expect(isTaskStale({ ...task, status: 'done' }, '2026-12-01')).toBe(false)
  })
})
