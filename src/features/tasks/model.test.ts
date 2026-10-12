import { describe, expect, it } from 'vitest'
import { isTaskOverdue, sortTasks, taskSchema, type Task } from './model'

const today = '2026-10-13'

const task = (patch: Partial<Task>): Task => ({
  id: 'x',
  title: 'Úloha',
  note: '',
  assigneeId: null,
  priority: 'normal',
  dueOn: null,
  status: 'open',
  createdBy: null,
  ...patch,
})

describe('isTaskOverdue', () => {
  it('needs a past due date and an unfinished task', () => {
    expect(isTaskOverdue(task({ dueOn: '2026-10-12' }), today)).toBe(true)
    expect(isTaskOverdue(task({ dueOn: '2026-10-13' }), today)).toBe(false)
    expect(isTaskOverdue(task({ dueOn: '2026-10-01', status: 'done' }), today)).toBe(false)
    expect(isTaskOverdue(task({}), today)).toBe(false)
  })
})

describe('sortTasks', () => {
  it('orders by overdue, priority and due date, with finished tasks last', () => {
    const sorted = sortTasks(
      [
        task({ id: 'done', status: 'done', priority: 'high' }),
        task({ id: 'low', priority: 'low', dueOn: '2026-10-20' }),
        task({ id: 'normal-no-date' }),
        task({ id: 'normal-dated', dueOn: '2026-10-15' }),
        task({ id: 'high', priority: 'high' }),
        task({ id: 'overdue-low', priority: 'low', dueOn: '2026-10-01' }),
      ],
      today,
    )
    expect(sorted.map((t) => t.id)).toEqual(['overdue-low', 'high', 'normal-dated', 'normal-no-date', 'low', 'done'])
  })
})

describe('taskSchema', () => {
  it('requires a title and accepts an empty due date', () => {
    const valid = { title: 'Skontrolovať káble', note: '', assigneeId: '', priority: 'normal', dueOn: '', status: 'open' }
    expect(taskSchema.safeParse(valid).success).toBe(true)
    expect(taskSchema.safeParse({ ...valid, title: '  ' }).success).toBe(false)
    expect(taskSchema.safeParse({ ...valid, dueOn: 'zajtra' }).success).toBe(false)
  })
})
