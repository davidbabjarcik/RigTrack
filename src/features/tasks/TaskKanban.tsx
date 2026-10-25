import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { priorityColor, TASK_STATUS_LABELS, TASK_STATUSES, type Task, type TaskStatus } from './model'

type Props = {
  tasks: Task[]
  showDone: boolean
  canEdit: boolean
  colors?: Partial<Record<string, string>>
  onMove: (id: string, status: TaskStatus) => void
  renderCard: (task: Task) => ReactNode
}

/** Úlohy v stĺpcoch podľa stavu; kartu presuniete myšou alebo výberom stavu pod ňou (na mobile). */
export function TaskKanban({ tasks, showDone, canEdit, colors, onMove, renderCard }: Props) {
  const [over, setOver] = useState<TaskStatus | null>(null)
  const columns = TASK_STATUSES.filter((status) => showDone || status !== 'done')

  return (
    <div className={cn('grid gap-3', columns.length === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
      {columns.map((status) => {
        const items = tasks.filter((task) => task.status === status)
        return (
          <section
            key={status}
            aria-label={TASK_STATUS_LABELS[status]}
            className={cn('flex min-h-32 flex-col gap-2 rounded-xl border bg-muted/40 p-2', over === status && 'ring-2 ring-accent')}
            onDragOver={(event) => {
              if (!canEdit) return
              event.preventDefault()
              setOver(status)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(event) => {
              setOver(null)
              const id = event.dataTransfer.getData('text/task')
              const task = tasks.find((item) => item.id === id)
              if (task && task.status !== status) onMove(id, status)
            }}
          >
            <h2 className="flex items-center justify-between px-2 pt-1 text-sm font-medium">
              {TASK_STATUS_LABELS[status]}
              <span className="text-muted-foreground">{items.length}</span>
            </h2>
            {items.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted-foreground">{canEdit ? 'Presuňte sem úlohu' : 'Nič'}</p>}
            {items.map((task) => (
              <div
                key={task.id}
                draggable={canEdit}
                onDragStart={(event) => event.dataTransfer.setData('text/task', task.id)}
                className={cn(canEdit && 'cursor-grab active:cursor-grabbing')}
              >
                {renderCard(task)}
                {canEdit && (
                  <label className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground lg:hidden">
                    <span className="size-2 rounded-full" style={{ background: priorityColor(task.priority, colors) }} aria-hidden />
                    Presunúť do
                    <select className="rounded border bg-surface px-1 py-0.5" value={task.status} onChange={(event) => onMove(task.id, event.target.value as TaskStatus)}>
                      {TASK_STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {TASK_STATUS_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
