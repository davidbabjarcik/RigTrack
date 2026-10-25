import { z } from 'zod'

/** Priorita úlohy od najdôležitejšej; „none“ = bez priority (0099, predvolená pre nové úlohy). */
export const TASK_PRIORITIES = ['high', 'normal', 'low', 'none'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = { high: 'Vysoká', normal: 'Stredná', low: 'Nízka', none: 'Bez priority' }
/** Predvolené farby; každý si ich môže zmeniť v Nastaveniach → Účet. */
export const DEFAULT_PRIORITY_COLORS: Record<TaskPriority, string> = { high: '#ef4444', normal: '#eab308', low: '#3b82f6', none: '#9ca3af' }
export const priorityColor = (priority: TaskPriority, custom?: Partial<Record<string, string>>) => custom?.[priority] || DEFAULT_PRIORITY_COLORS[priority]
const priorityRank = (priority: TaskPriority) => TASK_PRIORITIES.indexOf(priority)

// Zodpovedá check constraints v 0016_tasks_shopping.sql.
export const TASK_STATUSES = ['open', 'in_progress', 'done'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Čaká',
  in_progress: 'Rieši sa',
  done: 'Hotovo',
}

export type Task = {
  id: string
  title: string
  note: string
  assigneeId: string | null
  priority: TaskPriority
  dueOn: string | null
  status: TaskStatus
  createdBy: string | null
  /** Viac riešiteľov, kategória a event (0061); bez migrácie len assigneeId. */
  assigneeIds?: string[]
  category?: string
  eventId?: string | null
  createdAt?: string
  /** Odkaz na stránku, odkiaľ úloha prišla (napr. cez @todo v políčku) – 0098. */
  link?: string
}

/** Má úlohu na starosti tento človek (jeden z riešiteľov)? */
export function isAssignedTo(task: Pick<Task, 'assigneeId' | 'assigneeIds'>, userId: string | undefined) {
  if (!userId) return false
  return task.assigneeId === userId || Boolean(task.assigneeIds?.includes(userId))
}

/** Riešitelia úlohy (aj zo starších záznamov s jedným riešiteľom). */
export function assigneesOf(task: Pick<Task, 'assigneeId' | 'assigneeIds'>) {
  if (task.assigneeIds && task.assigneeIds.length > 0) return task.assigneeIds
  return task.assigneeId ? [task.assigneeId] : []
}

/** Po koľkých dňoch otvorenej úlohy appka upozorní, že visí. */
export const STALE_DAYS = 30

/** Nedokončená úloha, ktorá visí dlhšie ako mesiac od založenia. */
export function isTaskStale(task: Pick<Task, 'status' | 'createdAt'>, today: string) {
  if (task.status === 'done' || !task.createdAt) return false
  return (Date.parse(today) - Date.parse(task.createdAt.slice(0, 10))) / 86_400_000 > STALE_DAYS
}

/** Navrhované kategórie; dá sa napísať aj iná. */
export const TASK_CATEGORIES = ['Sklad', 'Servis', 'Web', 'Soc. siete', 'Administratíva', 'Nákup', 'Po evente']

const text = (max: number) => z.string().trim().max(max, `Najviac ${max} znakov`)

export const taskSchema = z.object({
  title: text(200).min(1, 'Zadajte, čo treba spraviť'),
  note: text(2000),
  assigneeId: z.string(),
  assigneeIds: z.array(z.string()).max(20, 'Najviac 20 ľudí').optional(),
  category: text(60).optional(),
  priority: z.enum(TASK_PRIORITIES),
  dueOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Zadajte dátum'),
  status: z.enum(TASK_STATUSES),
})
export type TaskFormValues = z.infer<typeof taskSchema>

export function isTaskOverdue(task: Pick<Task, 'status' | 'dueOn'>, today: string) {
  return task.status !== 'done' && task.dueOn !== null && task.dueOn < today
}

/**
 * Nedokončené úlohy: najprv po termíne, potom podľa priority a termínu (bez termínu na konci).
 * Hotové sú až za nimi.
 */
export function sortTasks(tasks: Task[], today: string) {
  return [...tasks].sort((a, b) => {
    const done = Number(a.status === 'done') - Number(b.status === 'done')
    if (done !== 0) return done
    const overdue = Number(isTaskOverdue(b, today)) - Number(isTaskOverdue(a, today))
    if (overdue !== 0) return overdue
    const priority = priorityRank(a.priority) - priorityRank(b.priority)
    if (priority !== 0) return priority
    return (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999') || a.title.localeCompare(b.title, 'sk')
  })
}
