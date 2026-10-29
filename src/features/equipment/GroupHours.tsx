import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gauge } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { todayIso } from '@/lib/format'
import { addHourReading, fetchHourCounters } from './api'
import { unitIdsOf, type Equipment } from './model'

type Row = { key: string; label: string; part: Equipment; unit: number | null }

/** Odčítanie prevádzkových hodín všetkým kusom rozdelenej techniky naraz (jeden dátum, pri každom kuse stav). */
type Props = { companyId: string; parts: Equipment[]; caseName: (caseId: string | null) => string; open?: boolean; onOpen?: () => void; onClose?: () => void }

export function GroupHours({ companyId, parts, caseName, open = false, onOpen, onClose }: Props) {
  const queryClient = useQueryClient()
  const [readOn, setReadOn] = useState(todayIso())
  const [values, setValues] = useState<Record<string, string>>({})
  // Počítadlo: '' = prevádzkové hodiny, inak ďalšie (napr. Výbojka) – známe z odčítaní alebo nové.
  const [counter, setCounter] = useState('')
  const [newCounter, setNewCounter] = useState('')
  const [added, setAdded] = useState<string[]>([])
  const known = useQuery({
    queryKey: ['company', companyId, 'hour-counters', parts.map((part) => part.id).join(',')],
    queryFn: () => fetchHourCounters(companyId, parts.map((part) => part.id)),
    enabled: open,
  })
  const counters = [...new Set([...(known.data ?? []), ...added])]
  // Pri evidencii po kusoch (viac kusov v časti) má každý kus svoje počítadlo, inak celá časť.
  const rows: Row[] = parts
    .flatMap((part): Row[] =>
      part.trackUnits && part.quantity > 1
        ? unitIdsOf(part).map((unit) => ({ key: `${part.id}-${unit}`, label: `#${unit}`, part, unit }))
        : [{ key: part.id, label: part.trackUnits && part.unitIds.length === 1 ? `#${part.unitIds[0]}` : part.name, part, unit: null }],
    )
    .sort((a, b) => (a.unit ?? 0) - (b.unit ?? 0))
  const filled = rows.filter((row) => {
    const value = Number((values[row.key] ?? '').replace(',', '.'))
    return (values[row.key] ?? '').trim() !== '' && Number.isFinite(value) && value >= 0
  })

  const save = useMutation({
    mutationFn: async () => {
      for (const row of filled) {
        await addHourReading(companyId, row.part.id, { readOn, hours: Number(values[row.key].replace(',', '.')), note: '', unit: row.unit, counter })
      }
    },
    onSuccess: () => {
      setValues({})
      onClose?.()
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['company', companyId] }),
  })

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={onOpen}>
        <Gauge className="size-4" aria-hidden />
        Odčítať hodiny všetkým
      </Button>
    )
  }
  return (
    <section aria-labelledby="group-hours-heading" className="mb-6 w-full rounded-xl border border-accent/40 bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 id="group-hours-heading" className="font-medium">
          {counter ? `Odčítať počítadlo ${counter}` : 'Odčítať prevádzkové hodiny'}
        </h2>
        <Field label="Dátum odčítania" type="date" className="w-44" value={readOn} onChange={(event) => setReadOn(event.target.value)} />
      </div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <SelectField label="Počítadlo" className="sm:w-56" value={counter} onChange={(event) => setCounter(event.target.value)}>
          <option value="">Prevádzkové hodiny</option>
          {counters.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </SelectField>
        <Field label="Nové počítadlo" hideLabel placeholder="+ nové počítadlo, napr. Výbojka" maxLength={40} className="sm:w-64" value={newCounter} onChange={(event) => setNewCounter(event.target.value)} />
        <Button
          variant="outline"
          size="sm"
          disabled={!newCounter.trim() || counters.includes(newCounter.trim())}
          onClick={() => {
            setAdded([...added, newCounter.trim()])
            setCounter(newCounter.trim())
            setNewCounter('')
          }}
        >
          Pridať počítadlo
        </Button>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">Vyplňte stav počítadla pri kusoch, ktoré ste odčítali; prázdne sa preskočia.</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-sm">
              <span className="block font-medium">{row.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{row.part.caseId ? caseName(row.part.caseId) : 'mimo case'}</span>
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              aria-label={`Stav počítadla ${row.label}`}
              placeholder="hodiny"
              className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3"
              value={values[row.key] ?? ''}
              onChange={(event) => setValues({ ...values, [row.key]: event.target.value })}
            />
          </li>
        ))}
      </ul>
      {save.isError && <p className="mt-2 text-sm text-destructive">Niektoré odčítania sa nepodarilo uložiť.</p>}
      <div className="mt-4 flex gap-2">
        <Button disabled={filled.length === 0 || !readOn || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Ukladám…' : `Uložiť ${filled.length > 0 ? `(${filled.length})` : ''}`}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Zrušiť
        </Button>
      </div>
    </section>
  )
}
