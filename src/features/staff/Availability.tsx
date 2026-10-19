import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { formatDate, todayIso } from '@/lib/format'
import { addUnavailability, deleteUnavailability, saveStaff } from './api'
import { upcomingPeriods, type Person } from './model'
import { useStaff } from './useStaff'

/** Kedy človek nemôže: zoznam nadchádzajúcich období a zápis nového (člen si zapisuje sám, manažér za ostatných). */
export function Availability({ companyId, person, canEdit, title = 'Kedy nemôže' }: { companyId: string; person: Person; canEdit: boolean; title?: string }) {
  const queryClient = useQueryClient()
  const staff = useStaff(companyId)
  const today = todayIso()
  const [period, setPeriod] = useState({ startsOn: today, endsOn: today, note: '' })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company', companyId, 'staff'] })
  const add = useMutation({
    mutationFn: async () => {
      // Člen bez karty ju pri prvom zápise dostane.
      const staffId = person.staffId ?? (await saveStaff(companyId, null, person.memberId, { name: '', position: '', phone: '', email: '', skills: '', note: '', active: true }))
      await addUnavailability(companyId, staffId, period)
    },
    onSuccess: () => setPeriod({ startsOn: today, endsOn: today, note: '' }),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: deleteUnavailability, onSettled: refresh })
  const periods = upcomingPeriods(staff.unavailability, person.staffId, today)

  return (
    <CollapsibleSection id="staff.unavailability" title={title}>
      {periods.length > 0 ? (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface">
          {periods.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{item.startsOn === item.endsOn ? formatDate(item.startsOn) : `${formatDate(item.startsOn)} – ${formatDate(item.endsOn)}`}</span>
                {item.note && <span className="ml-2 text-sm text-muted-foreground">{item.note}</span>}
              </span>
              {canEdit && (
                <Button variant="ghost" size="sm" aria-label="Zmazať obdobie" disabled={remove.isPending} onClick={() => remove.mutate(item.id)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">Nič zapísané – môže kedykoľvek.</p>
      )}
      {canEdit && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-surface p-3">
          <Field label="Od" type="date" value={period.startsOn} onChange={(event) => setPeriod({ ...period, startsOn: event.target.value, endsOn: period.endsOn < event.target.value ? event.target.value : period.endsOn })} />
          <Field label="Do" type="date" min={period.startsOn} value={period.endsOn} onChange={(event) => setPeriod({ ...period, endsOn: event.target.value })} />
          <Field label="Dôvod (nepovinné)" className="min-w-40 flex-1" placeholder="dovolenka, škola…" maxLength={200} value={period.note} onChange={(event) => setPeriod({ ...period, note: event.target.value })} />
          <Button disabled={add.isPending || !period.startsOn || period.endsOn < period.startsOn} onClick={() => add.mutate()}>
            Zapísať
          </Button>
          {add.isError && <p className="w-full text-sm text-destructive">Zápis sa nepodaril.</p>}
        </div>
      )}
    </CollapsibleSection>
  )
}
