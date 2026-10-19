import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { cn } from '@/lib/utils'
import type { CompanyEvent } from './model'
import { DAY_KIND_LABELS, DAY_KINDS, eventDates, onDay, type DayKind, type EventDay } from './plan'
import { deleteDay, fetchCrewDays, planKeys, saveDay, setCrewDays, useEventDays } from './planApi'

const KIND_TONES: Record<DayKind, string> = {
  build: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  show: 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200',
  teardown: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
  travel: 'bg-muted text-muted-foreground',
  rest: 'bg-muted text-muted-foreground',
}

const weekday = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric' })

/** Jeden deň programu: druh, časy, poznámka a kto ide. */
function DayRow({
  companyId,
  eventId,
  date,
  dates,
  day,
  crew,
  crewDays,
  canEdit,
}: {
  companyId: string
  eventId: string
  date: string
  /** Všetky dni eventu. */
  dates: string[]
  day: EventDay | undefined
  crew: { id: string; label: string }[]
  crewDays: Record<string, string[]>
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Omit<EventDay, 'id'> | null>(null)
  const current = draft ?? { day: date, kind: day?.kind ?? 'show', startsAt: day?.startsAt ?? '', endsAt: day?.endsAt ?? '', note: day?.note ?? '' }
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company', companyId, 'events', eventId] })
  const save = useMutation({ mutationFn: () => saveDay(companyId, eventId, { ...current, id: day?.id }), onSuccess: async () => (await refresh(), setDraft(null)) })
  const remove = useMutation({ mutationFn: () => deleteDay(day!.id), onSettled: refresh })
  const toggleCrew = useMutation({
    mutationFn: ({ crewId, days }: { crewId: string; days: string[] }) => setCrewDays(crewId, days),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...planKeys.days(companyId, eventId), 'crew'] }),
  })
  const going = crew.filter((person) => onDay(crewDays[person.id] ?? [], date))

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-24 shrink-0 font-medium capitalize">{weekday(date)}</span>
        {canEdit ? (
          <>
            <select
              aria-label="Druh dňa"
              className="h-9 rounded-lg border bg-surface px-2 text-sm"
              value={current.kind}
              onChange={(event) => setDraft({ ...current, kind: event.target.value as DayKind })}
            >
              {DAY_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {DAY_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
            <input type="time" aria-label="Od" className="h-9 rounded-lg border bg-surface px-2 text-sm" value={current.startsAt} onChange={(event) => setDraft({ ...current, startsAt: event.target.value })} />
            <span className="text-muted-foreground">–</span>
            <input type="time" aria-label="Do" className="h-9 rounded-lg border bg-surface px-2 text-sm" value={current.endsAt} onChange={(event) => setDraft({ ...current, endsAt: event.target.value })} />
            <input
              aria-label="Poznámka k dňu"
              placeholder="poznámka (napr. príchod kamióna)"
              className="h-9 min-w-40 flex-1 rounded-lg border bg-surface px-2 text-sm"
              maxLength={300}
              value={current.note}
              onChange={(event) => setDraft({ ...current, note: event.target.value })}
            />
            {(draft || !day) && (
              <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
                {day ? 'Uložiť' : 'Pridať deň'}
              </Button>
            )}
            {day && !draft && (
              <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}>
                Odstrániť
              </Button>
            )}
          </>
        ) : day ? (
          <>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', KIND_TONES[day.kind])}>{DAY_KIND_LABELS[day.kind]}</span>
            {(day.startsAt || day.endsAt) && <span className="text-sm tabular-nums">{[day.startsAt, day.endsAt].filter(Boolean).join(' – ')}</span>}
            {day.note && <span className="text-sm text-muted-foreground">{day.note}</span>}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">bez programu</span>
        )}
      </div>
      {crew.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pl-0 text-sm sm:pl-26">
          <span className="text-xs text-muted-foreground">Ide:</span>
          {crew.map((person) => {
            const days = crewDays[person.id] ?? []
            const on = onDay(days, date)
            return canEdit ? (
              <button
                key={person.id}
                type="button"
                aria-pressed={on}
                disabled={toggleCrew.isPending}
                onClick={() => {
                  // Prázdny zoznam = všetky dni; prvé odškrtnutie ho zmení na konkrétne dni.
                  const base = days.length === 0 ? dates : days
                  toggleCrew.mutate({ crewId: person.id, days: on ? base.filter((item) => item !== date) : [...base, date].sort() })
                }}
                className={cn('rounded-full border px-2 py-0.5 text-xs', on ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted-foreground line-through')}
              >
                {person.label}
              </button>
            ) : (
              on && (
                <span key={person.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {person.label}
                </span>
              )
            )
          })}
          {!canEdit && going.length === 0 && <span className="text-xs text-muted-foreground">nikto</span>}
        </div>
      )}
    </li>
  )
}

/** Program viacdňového eventu po dňoch (stavba, event, balenie…) a kto ide v ktorý deň. */
export function EventPlanSection({ companyId, event, canEdit }: { companyId: string; event: CompanyEvent; canEdit: boolean }) {
  const [editing, setEditing] = useState(false)
  const days = useEventDays(companyId, event.id)
  const members = useMembers(companyId)
  const crewDays = useQuery({ queryKey: [...planKeys.days(companyId, event.id), 'crew'], queryFn: () => fetchCrewDays(companyId, event.id), retry: false })
  const dates = eventDates(event.startsOn, event.endsOn)
  if (days.isError) return null
  const crew = event.crew.map((person) => ({ id: person.id, label: person.memberId ? memberName(members.data, person.memberId) || 'Bývalý člen' : person.name }))
  return (
    <CollapsibleSection
      id="event.plan"
      title={dates.length > 1 ? `Program po dňoch (${dates.length} ${dates.length < 5 ? 'dni' : 'dní'})` : 'Program'}
      actions={
        canEdit && (
          <Button variant={editing ? 'default' : 'outline'} size="sm" onClick={() => setEditing(!editing)}>
            {editing ? 'Hotovo' : 'Upraviť program'}
          </Button>
        )
      }
    >
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {dates.map((date) => (
          <DayRow
            key={date}
            companyId={companyId}
            eventId={event.id}
            date={date}
            dates={dates}
            day={days.data?.find((item) => item.day === date)}
            crew={crew}
            crewDays={crewDays.data ?? {}}
            canEdit={canEdit && editing}
          />
        ))}
      </ul>
      {editing && <p className="mt-2 text-xs text-muted-foreground">Pri každom dni zvoľte druh (stavba, event, balenie…), časy a uložte. Kliknutím na meno určíte, či človek v ten deň ide (preškrtnutý = nejde).</p>}
    </CollapsibleSection>
  )
}
