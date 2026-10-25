import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { isAdminRole } from '@/lib/roles'
import { CorrectForm } from './CorrectForm'
import { MonthlyReport } from './MonthlyReport'
import { attendanceEnabled, formatDistance, formatMinutes, isoToLocal, PAUSE_LABELS, timeOf, workedMinutes } from './model'
import { WorkCard } from './WorkCard'
import { correctSession, deleteSession, fetchSessions, WORK_PLACE_LABELS, workKeys, type WorkSession } from './workApi'

const PERIODS = [
  { days: 7, label: '7 dní' },
  { days: 31, label: 'Mesiac' },
  { days: 92, label: '3 mesiace' },
]

/** Dochádzka mimo eventov (firma, doma): moje časy, pri správcovi tímu všetkých, so súčtami a opravou. */
export function AttendancePage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session?.user.id
  const manager = can(company, 'staff.manage')
  const queryClient = useQueryClient()
  const members = useMembers(companyId)
  const [days, setDays] = useState(31)
  const [person, setPerson] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [now] = useState(() => Date.now())
  const from = new Date(now - days * 86_400_000).toISOString()
  const sessions = useQuery({ queryKey: [...workKeys.sessions(companyId), days], queryFn: () => fetchSessions(companyId, from), retry: false })
  const refresh = () => queryClient.invalidateQueries({ queryKey: workKeys.sessions(companyId) })
  const correct = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: Parameters<typeof correctSession>[1] }) => correctSession(id, fields),
    onSuccess: () => setEditing(null),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: deleteSession, onSettled: refresh })

  const header = <PageHeader title="Dochádzka" description="Práca na firme a doma (dochádzka na eventoch je pri evente)" />
  if (sessions.isPending) return <>{header}<LoadingBlock /></>
  if (sessions.isError) return <>{header}<ErrorBlock message="Dochádzku sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie." /></>

  const all = sessions.data.filter((item) => !person || item.userId === person)
  const nameOf = (id: string) => memberName(members.data, id) || 'Bývalý člen'
  const people = [...new Set(sessions.data.map((item) => item.userId))]
  // Súčty po ľuďoch za obdobie.
  const totals = new Map<string, number>()
  for (const item of all) totals.set(item.userId, (totals.get(item.userId) ?? 0) + workedMinutes(item, now))
  const byDay = new Map<string, WorkSession[]>()
  for (const item of all) {
    const day = isoToLocal(item.startedAt).date
    byDay.set(day, [...(byDay.get(day) ?? []), item])
  }

  return (
    <>
      {header}
      {attendanceEnabled() && userId && (
        <div className="mb-5">
          <WorkCard companyId={companyId} userId={userId} />
        </div>
      )}
      {isAdminRole(company.role) && <MonthlyReport companyId={companyId} />}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PERIODS.map((period) => (
          <button
            key={period.days}
            type="button"
            aria-pressed={days === period.days}
            onClick={() => setDays(period.days)}
            className={cn('h-9 rounded-lg border px-3 text-sm font-medium', days === period.days ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
          >
            {period.label}
          </button>
        ))}
        {manager && people.length > 1 && (
          <select aria-label="Človek" className="h-9 rounded-lg border bg-surface px-2 text-sm" value={person} onChange={(event) => setPerson(event.target.value)}>
            <option value="">Všetci</option>
            {people.map((id) => (
              <option key={id} value={id}>
                {nameOf(id)}
              </option>
            ))}
          </select>
        )}
      </div>

      {totals.size > 0 && (
        <ul className="mb-5 grid gap-2 sm:grid-cols-2">
          {[...totals].map(([id, minutes]) => (
            <li key={id} className="flex justify-between rounded-xl border bg-surface px-4 py-3">
              <span className="font-medium">{id === userId ? 'Ja' : nameOf(id)}</span>
              <span className="tabular-nums">{formatMinutes(minutes)}</span>
            </li>
          ))}
        </ul>
      )}

      {all.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">
          V tomto období žiadna práca mimo eventov.{!attendanceEnabled() && ' Dochádzku podľa polohy si zapnete v Nastaveniach → Účet → Dochádzka.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {[...byDay].map(([day, items]) => (
            <section key={day} aria-label={formatDate(day)}>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">{formatDate(day)}</h2>
              <ul className="divide-y overflow-hidden rounded-xl border bg-surface text-sm">
                {items.map((item) => (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {manager ? `${nameOf(item.userId)} · ` : ''}
                          {WORK_PLACE_LABELS[item.place]} · {timeOf(item.startedAt)} – {item.endedAt ? timeOf(item.endedAt) : 'pracuje'} · {formatMinutes(workedMinutes(item, now))}
                        </span>
                        <span className="block text-muted-foreground">
                          {[
                            item.verified ? `overené polohou${item.distanceM !== null ? ` (${formatDistance(item.distanceM)})` : ''}` : 'bez overenia polohou',
                            item.breakMinutes > 0 && `prestávky ${item.breakMinutes} min`,
                            item.waitMinutes > 0 && `čakanie ${item.waitMinutes} min`,
                            item.pausedAt && `${PAUSE_LABELS[item.pauseKind ?? 'break']} od ${timeOf(item.pausedAt)}`,
                            item.editedByName && `opravil(a) ${item.editedByName}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      {manager && (
                        <>
                          <Button variant="ghost" size="sm" aria-label="Opraviť časy" onClick={() => setEditing(editing === item.id ? null : item.id)}>
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Zmazať záznam"
                            disabled={remove.isPending}
                            onClick={() => window.confirm('Zmazať záznam dochádzky?') && remove.mutate(item.id)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </>
                      )}
                    </div>
                    {editing === item.id && (
                      <CorrectForm attendance={item} saving={correct.isPending} onCancel={() => setEditing(null)} onSave={(fields) => correct.mutate({ id: item.id, fields })} />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {(correct.isError || remove.isError) && <p className="mt-3 text-sm text-destructive">Zmenu sa nepodarilo uložiť.</p>}
    </>
  )
}
