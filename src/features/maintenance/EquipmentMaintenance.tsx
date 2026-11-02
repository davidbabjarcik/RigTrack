import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { formatNumber, type Equipment } from '@/features/equipment/model'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { errorDetail } from '@/lib/supabase/errors'
import {
  addMaintenanceRecords,
  deleteMaintenanceRecord,
  describeDue,
  fetchMaintenanceRecords,
  isLate,
  maintenanceKeys,
  useMaintenanceDue,
  useMaintenanceRules,
  type MaintenanceDue,
} from './api'

type Props = {
  companyId: string
  /** Jedna technika alebo celá skupina (napr. všetky dĺžky kábla, 8× Beam v cases). */
  items: Equipment[]
  /** Pohľad na jeden kus. */
  only?: number | null
}

const stateClass = (due: MaintenanceDue) => (isLate(due.state) && due.state !== 'unknown' ? 'text-destructive' : due.state === 'soon' ? 'text-accent' : 'text-muted-foreground')

/**
 * Limity hodín a revízie, ktoré pre túto techniku platia (nastavené v Nastaveniach → Limity a revízie):
 * stav po kusoch, zápis výmeny / servisu / revízie a história. Bez pravidiel sa sekcia neukáže.
 */
export function EquipmentMaintenance({ companyId, items, only = null }: Props) {
  const company = useCompany().active!
  const queryClient = useQueryClient()
  const today = todayIso()
  const rules = useMaintenanceRules(companyId).data ?? []
  const ids = items.map((item) => item.id)
  const due = useMaintenanceDue(companyId, rules.length > 0)
  const records = useQuery({ queryKey: maintenanceKeys.records(companyId, ids), queryFn: () => fetchMaintenanceRecords(companyId, ids), enabled: rules.length > 0 })
  const canRecord = can(company, 'maintenance.record')
  const canDelete = can(company, 'maintenance.manage')

  const mine = (due.data ?? []).filter((row) => ids.includes(row.equipmentId) && (only === null || row.unit === null || row.unit === only))
  const ruleIds = [...new Set(mine.map((row) => row.ruleId))]
  const shownRules = rules.filter((rule) => ruleIds.includes(rule.id))

  const [open, setOpen] = useState(false)
  const [ruleId, setRuleId] = useState('')
  // Cieľ: '*' = všetko zobrazené naraz, inak "equipmentId|unit" (unit prázdny = celá položka).
  const [target, setTarget] = useState('*')
  const [doneOn, setDoneOn] = useState(today)
  const [hours, setHours] = useState('')
  const [result, setResult] = useState<'ok' | 'fail'>('ok')
  const [note, setNote] = useState('')

  const refresh = () => queryClient.invalidateQueries({ queryKey: maintenanceKeys.all(companyId) })
  const rule = shownRules.find((item) => item.id === ruleId) ?? shownRules[0]
  const ruleRows = rule ? mine.filter((row) => row.ruleId === rule.id) : []
  const hoursValue = hours.trim() === '' ? null : Number(hours.replace(',', '.'))
  // Pri limite hodín má každý kus iný stav počítadla, preto sa zapisuje po jednom.
  const singleTarget = rule?.kind === 'hours'
  const effectiveTarget = singleTarget && target === '*' ? '' : target
  const valid = Boolean(rule) && doneOn !== '' && effectiveTarget !== '' && (rule?.kind !== 'hours' || (hoursValue !== null && Number.isFinite(hoursValue) && hoursValue >= 0))

  const add = useMutation({
    mutationFn: () => {
      const targets =
        effectiveTarget === '*'
          ? ruleRows.map((row) => ({ equipmentId: row.equipmentId, unit: row.unit }))
          : [{ equipmentId: effectiveTarget.split('|')[0], unit: effectiveTarget.split('|')[1] ? Number(effectiveTarget.split('|')[1]) : null }]
      return addMaintenanceRecords(
        companyId,
        targets.map((item) => ({ ruleId: rule!.id, ...item, doneOn, hours: rule!.kind === 'hours' ? hoursValue : null, result: rule!.kind === 'revision' ? result : 'ok', note })),
      )
    },
    onSuccess: () => {
      setOpen(false)
      setHours('')
      setNote('')
      setResult('ok')
    },
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteMaintenanceRecord(companyId, id), onSettled: refresh })

  if (shownRules.length === 0) return null

  const itemName = (id: string) => items.find((item) => item.id === id)?.name ?? ''
  const label = (row: { equipmentId: string; unit: number | null }) => [items.length > 1 && itemName(row.equipmentId), row.unit !== null && `#${row.unit}`].filter(Boolean).join(' ') || 'celá položka'
  const history = (records.data ?? []).filter((record) => only === null || record.unit === null || record.unit === only)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (valid) add.mutate()
  }

  return (
    <section aria-labelledby="maintenance-heading" className="mt-6 rounded-xl border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id="maintenance-heading" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ShieldCheck className="size-4" aria-hidden />
          Limity a revízie
        </h2>
        {canRecord && !open && (
          <Button
            size="sm"
            onClick={() => {
              setRuleId(shownRules[0].id)
              setTarget(shownRules[0].kind === 'hours' ? '' : '*')
              setOpen(true)
            }}
          >
            Zapísať výmenu / revíziu
          </Button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {shownRules.map((item) => {
          const rows = mine.filter((row) => row.ruleId === item.id)
          return (
            <div key={item.id}>
              <p className="text-sm font-medium">{item.name}</p>
              <ul className="mt-1 grid gap-1.5 text-sm sm:grid-cols-2">
                {rows.map((row) => (
                  <li key={`${row.equipmentId}|${row.unit}`} className="flex justify-between gap-2 rounded-lg border px-3 py-1.5">
                    <span className="truncate font-medium">{label(row)}</span>
                    <span className={`text-right tabular-nums ${stateClass(row)}`}>{describeDue(row, item, formatDate, formatNumber)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {open && rule && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 border-t pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField
              label="Čo"
              value={rule.id}
              onChange={(e) => {
                const next = shownRules.find((item) => item.id === e.target.value)
                setRuleId(e.target.value)
                setTarget(next?.kind === 'hours' ? '' : '*')
              }}
            >
              {shownRules.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Pre" required value={effectiveTarget} onChange={(e) => setTarget(e.target.value)}>
              {singleTarget ? <option value="">— vyberte —</option> : <option value="*">Všetko zobrazené ({ruleRows.length})</option>}
              {ruleRows.map((row) => (
                <option key={`${row.equipmentId}|${row.unit}`} value={`${row.equipmentId}|${row.unit ?? ''}`}>
                  {label(row)}
                </option>
              ))}
            </SelectField>
            <Field label="Dátum" type="date" required max={today} value={doneOn} onChange={(e) => setDoneOn(e.target.value)} />
            {rule.kind === 'hours' ? (
              <Field label="Stav počítadla pri výmene (h)" required inputMode="decimal" placeholder="0 ak sa vynulovalo" value={hours} onChange={(e) => setHours(e.target.value)} />
            ) : (
              <SelectField label="Výsledok" value={result} onChange={(e) => setResult(e.target.value as 'ok' | 'fail')}>
                <option value="ok">Vyhovela</option>
                <option value="fail">Nevyhovela (nepoužívať)</option>
              </SelectField>
            )}
            <Field label="Poznámka" maxLength={500} className="sm:col-span-2" placeholder={rule.kind === 'hours' ? 'napr. nová lampa Osram' : 'napr. revízna správa č. …'} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {add.isError && (
            <p role="alert" className="text-sm text-destructive">
              Nepodarilo sa zapísať. {errorDetail(add.error)}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!valid || add.isPending}>
              {add.isPending ? 'Zapisujem…' : 'Uložiť'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Zrušiť
            </Button>
          </div>
        </form>
      )}

      {history.length > 0 && (
        <details className="mt-4 border-t pt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">História výmen a revízií ({history.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {history.map((record) => (
              <li key={record.id} className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{rules.find((item) => item.id === record.ruleId)?.name ?? 'Zmazané pravidlo'}</span> · {label(record)} · {formatDate(record.doneOn)}
                  {record.hours !== null && ` · pri ${formatNumber(record.hours)} h`}
                  {record.result === 'fail' && <span className="text-destructive"> · nevyhovela</span>} · {record.authorName || 'neznámy'}
                  {record.note && <span className="block text-muted-foreground">{record.note}</span>}
                </span>
                {canDelete && (
                  <Button size="sm" variant="ghost" className="size-7 p-0" aria-label="Zmazať zápis" disabled={remove.isPending} onClick={() => window.confirm('Zmazať tento zápis?') && remove.mutate(record.id)}>
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
