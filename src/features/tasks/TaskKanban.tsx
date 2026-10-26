import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { type BoardColumn } from './board'
import type { Task } from './model'

type Props = {
  tasks: Task[]
  columns: BoardColumn[]
  columnOf: (task: Task) => string
  /** Presun myšou / výberom; bez neho sa stĺpce len zobrazujú (napr. podľa termínu). */
  onMove?: (task: Task, column: string) => void
  renderCard: (task: Task) => ReactNode
}

/** Úlohy v stĺpcoch (stav, priorita, kategória, kto, termín); kartu presuniete myšou alebo výberom pod ňou (mobil). */
export function TaskKanban({ tasks, columns, columnOf, onMove, renderCard }: Props) {
  const [over, setOver] = useState<string | null>(null)

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="grid auto-cols-[minmax(16rem,1fr)] grid-flow-col gap-3">
        {columns.map((column) => {
          const items = tasks.filter((task) => columnOf(task) === column.key)
          return (
            <section
              key={column.key || '-'}
              aria-label={column.label}
              className={cn('flex min-h-32 flex-col gap-2 rounded-xl border bg-muted/40 p-2', over === column.key && 'ring-2 ring-accent')}
              onDragOver={(event) => {
                if (!onMove) return
                event.preventDefault()
                setOver(column.key)
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(event) => {
                setOver(null)
                const task = tasks.find((item) => item.id === event.dataTransfer.getData('text/task'))
                if (task && onMove && columnOf(task) !== column.key) onMove(task, column.key)
              }}
            >
              <h2 className="flex items-center justify-between gap-2 px-2 pt-1 text-sm font-medium">
                <span className="flex items-center gap-2">
                  {column.color && <span className="size-2.5 rounded-full" style={{ background: column.color }} aria-hidden />}
                  {column.label}
                </span>
                <span className="text-muted-foreground">{items.length}</span>
              </h2>
              {items.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted-foreground">{onMove ? 'Presuňte sem úlohu' : 'Nič'}</p>}
              {items.map((task) => (
                <div key={task.id} draggable={Boolean(onMove)} onDragStart={(event) => event.dataTransfer.setData('text/task', task.id)} className={cn(onMove && 'cursor-grab active:cursor-grabbing')}>
                  {renderCard(task)}
                  {onMove && (
                    <label className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground lg:hidden">
                      Presunúť do
                      <select className="max-w-40 rounded border bg-surface px-1 py-0.5" value={columnOf(task)} onChange={(event) => onMove(task, event.target.value)}>
                        {columns.map((value) => (
                          <option key={value.key || '-'} value={value.key}>
                            {value.label}
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
    </div>
  )
}
