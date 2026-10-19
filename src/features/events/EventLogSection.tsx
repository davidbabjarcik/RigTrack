import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { formatDate, formatMoney } from '@/lib/format'
import { isAdminRole } from '@/lib/roles'
import type { CompanyEvent } from './model'
import { EXPENSE_CATEGORIES, EXPENSE_LABELS, eventDates, formatMinutes, workedMinutes, type ExpenseCategory } from './plan'
import { addExpense, addWorkLog, deleteExpense, deleteWorkLog, fetchLogs, planKeys } from './planApi'

/**
 * Osobný výkaz k eventu: kedy som robil (od–do, prestávky) a čo som kde minul. Ostatní ho nevidia,
 * admin / CEO vidí výkazy všetkých (napr. kvôli odmenám a preplateniu výdavkov).
 */
export function EventLogSection({ companyId, event }: { companyId: string; event: CompanyEvent }) {
  const company = useCompany().active!
  const userId = useAuth().session!.user.id
  const queryClient = useQueryClient()
  const members = useMembers(companyId)
  const key = planKeys.logs(companyId, event.id)
  const logs = useQuery({ queryKey: key, queryFn: () => fetchLogs(companyId, event.id), retry: false })
  const dates = eventDates(event.startsOn, event.endsOn)
  const [mode, setMode] = useState<'work' | 'expense' | null>(null)
  const [work, setWork] = useState({ date: dates[0], startsAt: '08:00', endsAt: '18:00', breakMinutes: 30, note: '' })
  const [expense, setExpense] = useState({ date: dates[0], amount: '', category: 'food' as ExpenseCategory, place: '', note: '' })
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const addWork = useMutation({ mutationFn: () => addWorkLog(companyId, event.id, work), onSuccess: () => setMode(null), onSettled: refresh })
  const addSpend = useMutation({
    mutationFn: () => addExpense(companyId, event.id, { ...expense, amount: Number(expense.amount.replace(',', '.')) }),
    onSuccess: () => {
      setMode(null)
      setExpense({ ...expense, amount: '', place: '', note: '' })
    },
    onSettled: refresh,
  })
  const removeWork = useMutation({ mutationFn: deleteWorkLog, onSettled: refresh })
  const removeExpense = useMutation({ mutationFn: deleteExpense, onSettled: refresh })
  if (logs.isError || !logs.data) return null

  const admin = isAdminRole(company.role)
  const people = [...new Set([...logs.data.work.map((log) => log.userId), ...logs.data.expenses.map((item) => item.userId)])].sort((a, b) =>
    a === userId ? -1 : b === userId ? 1 : memberName(members.data, a).localeCompare(memberName(members.data, b), 'sk'),
  )
  const amountValid = Number(expense.amount.replace(',', '.')) > 0

  function submitWork(form: FormEvent) {
    form.preventDefault()
    addWork.mutate()
  }
  function submitExpense(form: FormEvent) {
    form.preventDefault()
    if (amountValid) addSpend.mutate()
  }

  return (
    <CollapsibleSection
      id="event.log"
      title={admin ? 'Výkazy a výdavky' : 'Môj výkaz a výdavky'}
      actions={
        mode === null && (
          <>
            <Button variant="outline" size="sm" onClick={() => setMode('work')}>
              <Plus className="size-4" aria-hidden />
              Čas
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMode('expense')}>
              <Plus className="size-4" aria-hidden />
              Výdavok
            </Button>
          </>
        )
      }
    >
      <p className="mb-3 text-xs text-muted-foreground">Vidíte len svoje zápisy{admin ? ' (ako admin vidíte všetkých)' : ''}. Ostatní členovia ich nevidia.</p>

      {mode === 'work' && (
        <form onSubmit={submitWork} className="mb-3 flex flex-col gap-3 rounded-xl border bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <SelectField label="Deň" className="sm:w-40" value={work.date} onChange={(input) => setWork({ ...work, date: input.target.value })}>
            {dates.map((date) => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </SelectField>
          <Field label="Od" type="time" className="sm:w-32" value={work.startsAt} onChange={(input) => setWork({ ...work, startsAt: input.target.value })} />
          <Field label="Do" type="time" className="sm:w-32" value={work.endsAt} onChange={(input) => setWork({ ...work, endsAt: input.target.value })} />
          <Field label="Prestávky (min)" type="number" min={0} className="sm:w-32" value={work.breakMinutes} onChange={(input) => setWork({ ...work, breakMinutes: Math.max(0, Number(input.target.value) || 0) })} />
          <Field label="Poznámka" className="min-w-40 flex-1" maxLength={300} value={work.note} onChange={(input) => setWork({ ...work, note: input.target.value })} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={addWork.isPending || !work.startsAt || !work.endsAt}>
              Zapísať {formatMinutes(workedMinutes(work))}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
              Zrušiť
            </Button>
          </div>
        </form>
      )}
      {mode === 'expense' && (
        <form onSubmit={submitExpense} className="mb-3 flex flex-col gap-3 rounded-xl border bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <SelectField label="Deň" className="sm:w-40" value={expense.date} onChange={(input) => setExpense({ ...expense, date: input.target.value })}>
            {dates.map((date) => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </SelectField>
          <Field label="Suma (€)" inputMode="decimal" className="sm:w-28" autoFocus value={expense.amount} onChange={(input) => setExpense({ ...expense, amount: input.target.value })} />
          <SelectField label="Na čo" className="sm:w-48" value={expense.category} onChange={(input) => setExpense({ ...expense, category: input.target.value as ExpenseCategory })}>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_LABELS[category]}
              </option>
            ))}
          </SelectField>
          <Field label="Kde" placeholder="napr. Shell Prešov" className="min-w-40 flex-1" maxLength={160} value={expense.place} onChange={(input) => setExpense({ ...expense, place: input.target.value })} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!amountValid || addSpend.isPending}>
              Zapísať
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode(null)}>
              Zrušiť
            </Button>
          </div>
        </form>
      )}
      {(addWork.isError || addSpend.isError) && <p className="mb-3 text-sm text-destructive">Zápis sa nepodaril.</p>}

      {people.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">Zatiaľ nič zapísané.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {people.map((person) => {
            const myWork = logs.data.work.filter((log) => log.userId === person)
            const mySpend = logs.data.expenses.filter((item) => item.userId === person)
            const minutes = myWork.reduce((sum, log) => sum + workedMinutes(log), 0)
            const spent = Math.round(mySpend.reduce((sum, item) => sum + item.amount, 0) * 100) / 100
            const editable = person === userId || admin
            return (
              <div key={person} className="rounded-xl border bg-surface">
                <p className="flex flex-wrap justify-between gap-2 border-b px-4 py-2 text-sm">
                  <span className="font-medium">{person === userId ? 'Ja' : memberName(members.data, person) || 'Bývalý člen'}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatMinutes(minutes)} · výdavky {formatMoney(spent, 'EUR')}
                  </span>
                </p>
                <ul className="divide-y text-sm">
                  {myWork.map((log) => (
                    <li key={log.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="w-24">{formatDate(log.date)}</span>
                      <span className="tabular-nums">
                        {log.startsAt} – {log.endsAt}
                        {log.breakMinutes > 0 && `, prestávky ${log.breakMinutes} min`}
                      </span>
                      <span className="flex-1 truncate text-muted-foreground">{log.note}</span>
                      <span className="font-medium tabular-nums">{formatMinutes(workedMinutes(log))}</span>
                      {editable && (
                        <button type="button" aria-label="Zmazať zápis času" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => removeWork.mutate(log.id)}>
                          <X className="size-4" aria-hidden />
                        </button>
                      )}
                    </li>
                  ))}
                  {mySpend.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="w-24">{formatDate(item.date)}</span>
                      <span>{EXPENSE_LABELS[item.category]}</span>
                      <span className="flex-1 truncate text-muted-foreground">{item.place}</span>
                      <span className="font-medium tabular-nums">{formatMoney(item.amount, 'EUR')}</span>
                      {editable && (
                        <button type="button" aria-label="Zmazať výdavok" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => removeExpense.mutate(item.id)}>
                          <X className="size-4" aria-hidden />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </CollapsibleSection>
  )
}
