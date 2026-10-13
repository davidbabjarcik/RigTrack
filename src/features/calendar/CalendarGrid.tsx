import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { KIND_STYLES } from './kindStyles'
import { monthGridDays, shiftMonth, type AgendaEntry } from './model'

const WEEKDAYS = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne']
// Na širšej obrazovke sa do bunky zmestia názvy; zvyšok sa ukáže po kliknutí na deň.
const TITLES_PER_DAY = 3

type Props = {
  month: string
  today: string
  entries: Map<string, AgendaEntry[]>
  onMonthChange: (month: string) => void
  renderEntry: (entry: AgendaEntry) => ReactNode
}

/** Mesačná mriežka kalendára; kliknutie na deň vypíše jeho termíny pod mriežkou. */
export function CalendarGrid({ month, today, entries, onMonthChange, renderEntry }: Props) {
  const [selected, setSelected] = useState(today)
  const days = monthGridDays(month)
  const [year, monthNumber] = month.split('-').map(Number)
  const title = new Date(year, monthNumber - 1, 1).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })
  const selectedEntries = entries.get(selected) ?? []

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" aria-label="Predchádzajúci mesiac" onClick={() => onMonthChange(shiftMonth(month, -1))}>
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold capitalize">{title}</h2>
          {month !== today.slice(0, 7) && (
            <button
              type="button"
              className="text-sm text-accent hover:underline"
              onClick={() => {
                onMonthChange(today.slice(0, 7))
                setSelected(today)
              }}
            >
              Dnes
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" aria-label="Nasledujúci mesiac" onClick={() => onMonthChange(shiftMonth(month, 1))}>
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-surface">
        <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayEntries = entries.get(day) ?? []
            const outside = day.slice(0, 7) !== month
            return (
              <button
                key={day}
                type="button"
                aria-pressed={day === selected}
                aria-label={`${formatDate(day)}, termínov: ${dayEntries.length}`}
                onClick={() => setSelected(day)}
                className={cn(
                  'flex min-h-16 min-w-0 flex-col gap-1 border-b p-1 text-left hover:bg-muted sm:min-h-24 sm:p-1.5',
                  index % 7 !== 6 && 'border-r',
                  index >= days.length - 7 && 'border-b-0',
                  outside && 'bg-muted/40 text-muted-foreground',
                  day === selected && 'bg-accent/10 ring-2 ring-accent ring-inset',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full text-sm tabular-nums',
                    day === today && 'bg-primary font-semibold text-primary-foreground',
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                {/* Úzka obrazovka: bodky podľa druhu. */}
                <span className="flex flex-wrap gap-0.5 sm:hidden">
                  {dayEntries.slice(0, 6).map((entry) => (
                    <span key={entry.id} className={cn('size-1.5 rounded-full', KIND_STYLES[entry.kind].dot)} />
                  ))}
                </span>
                {/* Širšia obrazovka: názvy termínov. */}
                <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                  {dayEntries.slice(0, TITLES_PER_DAY).map((entry) => (
                    <span key={entry.id} className={cn('truncate rounded px-1 py-px text-xs font-medium', KIND_STYLES[entry.kind].chip)}>
                      {entry.title}
                    </span>
                  ))}
                  {dayEntries.length > TITLES_PER_DAY && (
                    <span className="text-xs text-muted-foreground">+{dayEntries.length - TITLES_PER_DAY} ďalšie</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="mt-5" aria-live="polite">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          {selected === today ? 'Dnes · ' : ''}
          {formatDate(selected)} ({selectedEntries.length})
        </h2>
        {selectedEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">V tento deň nie je žiadny termín.</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {selectedEntries.map((entry) => (
              <li key={entry.id}>{renderEntry(entry)}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
