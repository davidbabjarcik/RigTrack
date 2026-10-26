import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gauge } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { formatDate, todayIso } from '@/lib/format'
import { addHourReading, equipmentKeys, fetchHourReadings, hourReadingKeys } from './api'
import { useCheckLevels } from '@/features/checks/levels'
import { HoursChart } from './HoursChart'
import { formatNumber, hoursState, unitIdsOf, type Equipment } from './model'

type Props = { companyId: string; equipment: Equipment; canEdit: boolean; /** Len tento kus (pohľad na jeden kus). */ only?: number | null }

/**
 * Prevádzkové hodiny zariadenia s vlastným počítadlom (hlavy, zosilňovače):
 * posledný odčítaný stav, kedy ho treba odčítať znova a história odčítaní.
 * Bez nastaveného intervalu a bez odčítaní sa sekcia nezobrazí.
 */
export function OperatingHours({ companyId, equipment, canEdit, only = null }: Props) {
  const queryClient = useQueryClient()
  const today = todayIso()
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState('')
  const [readOn, setReadOn] = useState(today)
  const [note, setNote] = useState('')
  // Pri evidencii po kusoch sa odčítava každý kus zvlášť (napr. každý zosilňovač má svoje počítadlo).
  const units = equipment.trackUnits && equipment.quantity > 1 ? (only !== null ? [only] : unitIdsOf(equipment)) : []
  const [unit, setUnit] = useState(only !== null ? String(only) : '')
  const [chartUnit, setChartUnit] = useState(only !== null ? String(only) : '')
  const checkDays = useCheckLevels(companyId).days
  const tracked = Boolean(equipment.attributes.trackHours) || equipment.hoursIntervalMonths !== null || equipment.operatingHours !== null

  const readings = useQuery({
    queryKey: hourReadingKeys.list(companyId, equipment.id),
    queryFn: () => fetchHourReadings(companyId, equipment.id),
    enabled: tracked,
  })
  const value = Number(hours.replace(',', '.'))
  const valid = hours.trim() !== '' && Number.isFinite(value) && value >= 0 && readOn !== '' && (units.length === 0 || unit !== '')

  const add = useMutation({
    mutationFn: () => addHourReading(companyId, equipment.id, { readOn, hours: value, note, unit: units.length > 0 ? Number(unit) : null }),
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
  const all = readings.data ?? []
  // Posledné odčítanie každého kusu (odčítania sú od najnovších).
  const latestOf = (unitId: number) => all.find((reading) => reading.unit === unitId)
  const previous = units.length > 0 ? (unit ? latestOf(Number(unit))?.hours : undefined) : (equipment.operatingHours ?? undefined)
  const lower = previous !== undefined && valid && value < previous
  const shownUnit = chartUnit || String(units.find((unitId) => all.filter((reading) => reading.unit === unitId).length > 1) ?? '')
  const chartReadings = units.length > 0 ? all.filter((reading) => String(reading.unit) === shownUnit) : all.filter((reading) => reading.unit === null)

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
            {equipment.operatingHours !== null ? `${units.length > 0 ? 'najviac ' : ''}${formatNumber(equipment.operatingHours)} h` : 'neodčítané'}
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

      {units.length > 0 && (
        <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {units.map((unitId) => {
            const latest = latestOf(unitId)
            return (
              <li key={unitId} className="flex justify-between gap-2 rounded-lg border px-3 py-1.5">
                <span className="font-medium">#{unitId}</span>
                <span className="tabular-nums">{latest ? `${formatNumber(latest.hours)} h · ${formatDate(latest.readOn)}` : <span className="text-muted-foreground">neodčítané</span>}</span>
              </li>
            )
          })}
        </ul>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 border-t pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {units.length > 0 && (
              <SelectField label="Kus" required value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="">— vyberte kus —</option>
                {units.map((unitId) => (
                  <option key={unitId} value={unitId}>
                    #{unitId}
                    {equipment.unitInfo?.[String(unitId)]?.serial ? ` · SN ${equipment.unitInfo[String(unitId)].serial}` : ''}
                  </option>
                ))}
              </SelectField>
            )}
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
              Stav je nižší ako posledný odčítaný ({formatNumber(previous!)} h). Ak bolo počítadlo
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

      {units.length > 0 && all.some((reading) => reading.unit !== null) && (
        <SelectField label="Graf pre kus" className="mt-4 sm:w-56" value={shownUnit} onChange={(e) => setChartUnit(e.target.value)}>
          {units.map((unitId) => (
            <option key={unitId} value={unitId}>
              #{unitId}
            </option>
          ))}
        </SelectField>
      )}
      {chartReadings.length > 1 && <HoursChart readings={chartReadings} />}

      {readings.data && readings.data.length > 0 && (
        <details className="mt-4 border-t pt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">História odčítaní ({readings.data.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {readings.data.map((reading) => (
              <li key={reading.id}>
                {reading.unit !== null && <span className="font-medium">#{reading.unit} · </span>}
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
