import { describe, expect, it } from 'vitest'
import { boardColumns, boardKey, dueBucket, filterTasks, NO_TASK_FILTER, sortTaskList } from './board'
import type { Task } from './model'

const task = (id: string, patch: Partial<Task> = {}): Task => ({ id, title: id, note: '', assigneeId: 'me', assigneeIds: ['me'], priority: 'none', dueOn: null, status: 'open', createdBy: 'me', category: '', link: '', ...patch })
const today = '2026-10-26'

describe('task board', () => {
  it('filters by person, status, due date and fill-in tasks', () => {
    const tasks = [task('a'), task('b', { assigneeIds: ['other'], assigneeId: 'other' }), task('c', { status: 'done' }), task('d', { category: 'Doplniť', link: '/equipment/x/edit' }), task('e', { dueOn: '2026-10-20' })]
    expect(filterTasks(tasks, NO_TASK_FILTER, 'me', today).map((t) => t.id)).toEqual(['a', 'd', 'e'])
    expect(filterTasks(tasks, { ...NO_TASK_FILTER, scope: 'all', status: 'all' }, 'me', today)).toHaveLength(5)
    expect(filterTasks(tasks, { ...NO_TASK_FILTER, fill: true }, 'me', today).map((t) => t.id)).toEqual(['d'])
    expect(filterTasks(tasks, { ...NO_TASK_FILTER, due: 'overdue' }, 'me', today).map((t) => t.id)).toEqual(['e'])
  })

  it('sorts and groups into columns', () => {
    const tasks = [task('b', { priority: 'low' }), task('a', { priority: 'high', category: 'Sklad' })]
    expect(sortTaskList(tasks, 'title', today).map((t) => t.id)).toEqual(['a', 'b'])
    expect(boardColumns('category', tasks, [], () => '').map((c) => c.label)).toEqual(['Sklad', 'Bez kategórie'])
    expect(boardKey(tasks[1], 'priority', today)).toBe('high')
    expect(dueBucket({ status: 'open', dueOn: '2026-10-30' }, today)).toBe('week')
  })
})
