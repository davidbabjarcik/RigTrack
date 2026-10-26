// Filter, triedenie a stĺpce kanbanu úloh.
import { addDays } from '@/features/calendar/model'
import { assigneesOf, isAssignedTo, isTaskOverdue, sortTasks, TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_STATUSES, type Task } from './model'

export type TaskFilter = {
  scope: 'mine' | 'all'
  person: string
  category: string
  priority: string
  /** '' = nehotové, 'all' = všetky, inak konkrétny stav. */
  status: '' | 'all' | 'open' | 'in_progress' | 'done'
  due: '' | 'overdue' | 'today' | 'week' | 'later' | 'none'
  /** Len úlohy „Doplniť“ (z @todo / 31121800). */
  fill: boolean
  search: string
}
export const NO_TASK_FILTER: TaskFilter = { scope: 'mine', person: '', category: '', priority: '', status: '', due: '', fill: false, search: '' }

export type TaskSort = 'smart' | 'due' | 'priority' | 'title' | 'newest'
export const TASK_SORT_LABELS: Record<TaskSort, string> = {
  smart: 'Najdôležitejšie (po termíne, priorita, termín)',
  due: 'Podľa termínu',
  priority: 'Podľa priority',
  title: 'Podľa názvu',
  newest: 'Najnovšie',
}

export type BoardBy = 'status' | 'priority' | 'category' | 'person' | 'due'
export const BOARD_BY_LABELS: Record<BoardBy, string> = { status: 'Stav', priority: 'Priorita', category: 'Kategória', person: 'Kto', due: 'Termín' }

/** Úloha na doplnenie údaju (z kľúčového slova v políčku). */
export const isFillTask = (task: Pick<Task, 'category' | 'link'>) => task.category === 'Doplniť' || Boolean(task.link)

const DUE_LABELS = { overdue: 'Po termíne', today: 'Dnes', week: 'Do 7 dní', later: 'Neskôr', none: 'Bez termínu' } as const
type DueKey = keyof typeof DUE_LABELS

export function dueBucket(task: Pick<Task, 'status' | 'dueOn'>, today: string): DueKey {
  if (!task.dueOn) return 'none'
  if (isTaskOverdue(task, today)) return 'overdue'
  if (task.dueOn === today) return 'today'
  if (task.dueOn <= addDays(today, 7)) return 'week'
  return 'later'
}

export function filterTasks(tasks: Task[], filter: TaskFilter, userId: string, today: string) {
  const words = filter.search.toLowerCase().split(/\s+/).filter(Boolean)
  return tasks.filter(
    (task) =>
      (filter.scope === 'all' || isAssignedTo(task, userId)) &&
      (!filter.person || isAssignedTo(task, filter.person)) &&
      (!filter.category || (task.category ?? '') === filter.category) &&
      (!filter.priority || task.priority === filter.priority) &&
      (filter.status === 'all' || (filter.status === '' ? task.status !== 'done' : task.status === filter.status)) &&
      (!filter.due || dueBucket(task, today) === filter.due) &&
      (!filter.fill || isFillTask(task)) &&
      words.every((word) => `${task.title} ${task.note} ${task.category ?? ''}`.toLowerCase().includes(word)),
  )
}

const rank = (priority: Task['priority']) => TASK_PRIORITIES.indexOf(priority)

export function sortTaskList(tasks: Task[], sort: TaskSort, today: string) {
  const list = sortTasks(tasks, today)
  if (sort === 'due') return list.sort((a, b) => (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999'))
  if (sort === 'priority') return list.sort((a, b) => rank(a.priority) - rank(b.priority))
  if (sort === 'title') return list.sort((a, b) => a.title.localeCompare(b.title, 'sk'))
  if (sort === 'newest') return list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  return list
}

export type BoardColumn = { key: string; label: string; color?: string }

/** Stĺpce kanbanu; pri kategórii a človeku len tie, ktoré úlohy majú (a „bez …“). */
export function boardColumns(by: BoardBy, tasks: Task[], people: { id: string; name: string }[], colors: (priority: Task['priority']) => string): BoardColumn[] {
  if (by === 'status') return TASK_STATUSES.map((status) => ({ key: status, label: TASK_STATUS_LABELS[status] }))
  if (by === 'priority') return TASK_PRIORITIES.map((priority) => ({ key: priority, label: TASK_PRIORITY_LABELS[priority], color: colors(priority) }))
  if (by === 'due') return (Object.keys(DUE_LABELS) as DueKey[]).map((key) => ({ key, label: DUE_LABELS[key] }))
  if (by === 'category') {
    const used = [...new Set(tasks.map((task) => task.category ?? '').filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sk'))
    return [...used.map((category) => ({ key: category, label: category })), { key: '', label: 'Bez kategórie' }]
  }
  const used = new Set(tasks.flatMap((task) => assigneesOf(task)))
  return [...people.filter((person) => used.has(person.id)).map((person) => ({ key: person.id, label: person.name })), { key: '', label: 'Nikto' }]
}

/** Do ktorého stĺpca úloha patrí (pri viacerých riešiteľoch prvý). */
export function boardKey(task: Task, by: BoardBy, today: string) {
  if (by === 'status') return task.status
  if (by === 'priority') return task.priority
  if (by === 'due') return dueBucket(task, today)
  if (by === 'category') return task.category ?? ''
  return assigneesOf(task)[0] ?? ''
}

/** Presun medzi stĺpcami sa dá všade okrem termínu (ten sa mení v úlohe). */
export const canDragBy = (by: BoardBy) => by !== 'due'
