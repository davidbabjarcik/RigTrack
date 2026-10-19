import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gauge } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { formatDate, todayIso } from '@/lib/format'
import { addHourReading, equipmentKeys, fetchHourReadings, hourReadingKeys } from './api'
import { useCheckLevels } from '@/features/checks/levels'
import { HoursChart } from './HoursChart'
import { formatNumber, hoursState, type Equipment } from './model'

type Props = { companyId: string; equipment: Equipment; canEdit: boolean }

/**
 * Prevádzkové hodiny zariadenia s vlastným počítadlom (hlavy, zosilňovače):
 * posledný odčítaný stav, kedy ho treba odčítať znova a história odčítaní.
 * Bez nastaveného intervalu a bez odčítaní sa sekcia nezobrazí.
 */
export function OperatingHours({ companyId, equipment, canEdit }: Props) {
  const queryClient = useQueryClient()
  const today = todayIso()
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState('')
  const [readOn, setReadOn] = useState(today)
  const [note, setNote] = useState('')
  const checkDays = useCheckLevels(companyId).days
  const tracked = Boolean(equipment.attributes.trackHours) || equipment.hoursIntervalMonths !== null || equipment.operatingHours !== null

  const readings = useQuery({
    queryKey: hourReadingKeys.list(companyId, equipment.id),
    queryFn: () => fetchHourReadings(companyId, equipment.id),
    enabled: tracked,
  })
  const value = Number(hours.replace(',', '.'))
  const valid = hours.trim() !== '' && Number.isFinite(value) && value >= 0 && readOn !== ''

  const add = useMutation({
    mutationFn: () => addHourReading(companyId, equipment.id, { readOn, hours: value, note }),
    onSuccess: () => {
      setOpen(false)
      setHours('')
      setNote('')
    },
    // Prefix zoznamu techniky pokrýva detail aj históriu odčítaní.
    onSettled: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.list(companyId) }),
  })

  if (!tracked) return null

  const state = hoursState(equipment, today, checkDays)
  const lower = equipment.operatingHours !== null && valid && value < equipment.operatingHours

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (valid) add.mutate()
  }

  return (
    <section aria-labelledby="hours-heading" className="mt-6 rounded-xl border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="hours-heading" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Gauge className="size-4" aria-hidden />
            Prevádzkové hodiny
          </h2>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {equipment.operatingHours !== null ? `${formatNumber(equipment.operatingHours)} h` : 'neodčítané'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {equipment.hoursReadOn && `odčítané ${formatDate(equipment.hoursReadOn)}`}
            {state.state === 'unknown' && 'Počítadlo ešte nebolo odčítané.'}
            {'dueOn' in state && (
              <span className={state.state === 'overdue' ? 'text-destructive' : state.state === 'soon' ? 'text-accent' : undefined}>
                {' '}
                · ďalšie odčítanie {formatDate(state.dueOn)}
                {state.state === 'overdue' && ' (po termíne)'}
              </span>
            )}
          </p>
        </div>
        {canEdit && !open && (
          <Button size="sm" onClick={() => setOpen(true)}>
            Zapísať odčítanie
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 border-t pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Stav počítadla (h)"
              inputMode="decimal"
              required
              autoFocus
              placeholder="napr. 1350"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <Field label="Dátum odčítania" type="date" required max={today} value={readOn} onChange={(e) => setReadOn(e.target.value)} />
            <Field label="Poznámka" maxLength={500} placeholder="napr. po výmene lampy" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {lower && (
            <p role="status" className="text-sm text-accent">
              Stav je nižší ako posledný odčítaný ({formatNumber(equipment.operatingHours!)} h). Ak bolo počítadlo
              vynulované, napíšte to do poznámky.
            </p>
          )}
          {add.isError && (
            <p role="alert" className="text-sm text-destructive">
              Odčítanie sa nepodarilo zapísať.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={add.isPending || !valid}>
              {add.isPending ? 'Zapisujem…' : 'Uložiť odčítanie'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Zrušiť
            </Button>
          </div>
        </form>
      )}

      {readings.data && readings.data.length > 1 && <HoursChart readings={readings.data} />}

      {readings.data && readings.data.length > 0 && (
        <details className="mt-4 border-t pt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">História odčítaní ({readings.data.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {readings.data.map((reading) => (
              <li key={reading.id}>
                <span className="font-medium tabular-nums">{formatNumber(reading.hours)} h</span> · {formatDate(reading.readOn)} ·{' '}
                {reading.authorName || 'neznámy'}
                {reading.note && <span className="block text-muted-foreground">{reading.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
