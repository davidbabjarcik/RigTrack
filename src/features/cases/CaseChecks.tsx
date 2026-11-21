import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, PackageCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useEvents } from '@/features/events/useEvents'
import { lastReturns, returnedUnchecked, returnKeys, useRecentPackMarks } from '@/features/pack/returns'
import { formatDateTime } from '@/lib/format'
import { addCaseCheck, caseKeys, fetchCaseChecks } from './api'
import { checkRows, missingCount, missingText, type CheckItem } from './checkItems'
import { placeables } from './layout'
import { tf, tx } from '@/lib/i18n'

type Piece = { id: string; name: string; quantity: number; trackUnits: boolean; unitIds: number[] }
type Props = { companyId: string; caseId: string; canCheck: boolean; content?: Piece[] }

/** Posledná kontrola obsahu case, jej história a zápis novej kontroly. */
export function CaseChecks({ companyId, caseId, canCheck, content = [] }: Props) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  // Po položkách: čo sa malo nájsť a koľko sa našlo (na začiatku všetko; odškrtnete, čo chýba).
  const [rows, setRows] = useState(() => checkRows(content))
  const labels = new Map(placeables(content).map((item) => [`${item.equipmentId}#${item.unit ?? ''}`, item.label]))
  const labelOf = (item: { equipmentId: string; unit: number | null }) => labels.get(`${item.equipmentId}#${item.unit ?? ''}`) ?? tx('Technika')
  const items: CheckItem[] = rows.map((row) => ({ equipmentId: row.equipmentId, unit: row.unit, expected: row.expected, found: row.found }))
  const missing = missingText(items, labelOf)
  const setFound = (index: number, found: number) => setRows(rows.map((row, at) => (at === index ? { ...row, found: Math.max(0, Math.min(row.expected, found)) } : row)))
  const checks = useQuery({
    queryKey: caseKeys.checks(companyId, caseId),
    queryFn: () => fetchCaseChecks(companyId, caseId),
  })

  const add = useMutation({
    mutationFn: () => addCaseCheck(companyId, caseId, [missing && tf('Chýba: {0}', missing), note.trim()].filter(Boolean).join(' · '), items),
    onSuccess: async () => {
      setOpen(false)
      setNote('')
      // Prefix zoznamu pokrýva aj históriu kontrol tohto case.
      await queryClient.invalidateQueries({ queryKey: caseKeys.list(companyId) })
      void queryClient.invalidateQueries({ queryKey: returnKeys.recent(companyId) })
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    add.mutate()
  }

  const [last, ...older] = checks.data ?? []
  // Vrátený z eventu a odvtedy nekontrolovaný: obsah (napr. káblovku) treba spočítať.
  const returned = lastReturns(useRecentPackMarks(companyId).data ?? []).get(caseId)
  const events = useEvents(companyId)
  const mustCheck = !checks.isPending && returnedUnchecked(returned, last?.checkedAt)
  const fromEvent = returned ? events.data?.find((event) => event.id === returned.eventId)?.name : undefined

  return (
    <section aria-labelledby="checks-heading" className={mustCheck ? 'mb-6 rounded-xl border border-accent bg-surface p-4' : 'mb-6 rounded-xl border bg-surface p-4'}>
      {mustCheck && returned && (
        <p role="status" className="mb-3 flex items-start gap-2 rounded-lg bg-accent/10 p-3 text-sm">
          <PackageCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>{tx('Vrátený z eventu')}{fromEvent ? ` ${fromEvent}` : ''} {formatDateTime(returned.checkedAt)}
            {returned.checkedByName && ` (${returned.checkedByName})`} – <strong>{tx('spočítajte a skontrolujte obsah')}</strong>{tx(', potom kliknite na Skontrolované.')}</span>
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="checks-heading" className="text-sm font-medium text-muted-foreground">{tx('Posledná kontrola')}</h2>
          {checks.isPending ? (
            <p className="mt-1 text-sm text-muted-foreground">{tx('Načítavam…')}</p>
          ) : checks.isError ? (
            <p role="alert" className="mt-1 text-sm text-destructive">{tx('Kontroly sa nepodarilo načítať.')}</p>
          ) : last ? (
            <>
              <p className="mt-1 font-medium">
                {formatDateTime(last.checkedAt)} · {last.checkedByName || tx('neznámy')}
              </p>
              {last.note && <p className="mt-1 text-sm whitespace-pre-wrap">{last.note}</p>}
              {last.items && last.items.length > 0 && missingCount(last.items) === 0 && <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">{tx('Všetko bolo na mieste.')}</p>}
            </>
          ) : (
            <p className="mt-1 font-medium">{tx('Zatiaľ nekontrolované')}</p>
          )}
        </div>
        {canCheck && !open && (
          <Button
            size="sm"
            onClick={() => {
              setRows(checkRows(content))
              setOpen(true)
            }}
          >
            <ClipboardCheck className="size-4" aria-hidden />{tx('Skontrolované')}</Button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 border-t pt-4">
          {rows.length > 0 && (
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-medium">{tx('Čo v case je (odškrtnite, čo chýba, alebo upravte počet)')}</legend>
              <ul className="divide-y rounded-lg border">
                {rows.map((row, index) => (
                  <li key={`${row.equipmentId}#${row.unit ?? ''}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                    {row.unit !== null || row.expected === 1 ? (
                      <label className="flex flex-1 items-center gap-2">
                        <input type="checkbox" className="size-5" checked={row.found >= row.expected} onChange={(changed) => setFound(index, changed.target.checked ? row.expected : 0)} />
                        <span className={row.found < row.expected ? 'text-destructive line-through' : undefined}>{row.label}</span>
                      </label>
                    ) : (
                      <>
                        <span className={row.found < row.expected ? 'flex-1 text-destructive' : 'flex-1'}>{row.label}</span>
                        <span className="flex items-center gap-1">
                          <Button size="sm" variant="outline" aria-label={tf('Menej: {0}', row.label)} onClick={() => setFound(index, row.found - 1)}>−</Button>
                          <input
                            aria-label={tf('Našlo sa: {0}', row.label)}
                            inputMode="numeric"
                            className="h-8 w-14 rounded-md border bg-background text-center tabular-nums"
                            value={row.found}
                            onChange={(changed) => setFound(index, Number(changed.target.value.replace(/\D/g, '')) || 0)}
                          />
                          <span className="text-muted-foreground tabular-nums">/ {row.expected}</span>
                          <Button size="sm" variant="outline" aria-label={tf('Viac: {0}', row.label)} onClick={() => setFound(index, row.found + 1)}>+</Button>
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <p className={missing ? 'text-sm text-destructive' : 'text-sm text-emerald-700 dark:text-emerald-400'}>
                {missing ? tf('Chýba: {0}', missing) : tx('Všetko je na mieste.')}
              </p>
            </fieldset>
          )}
          <Field
            label={tx('Poznámka ku kontrole (nepovinné)')}
            placeholder={tx('napr. všetko je, alebo čo chýba')}
            maxLength={500}
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {add.isError && (
            <p role="alert" className="text-sm text-destructive">{tx('Kontrolu sa nepodarilo zapísať.')}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={add.isPending}>
              {add.isPending ? 'Zapisujem…' : tx('Potvrdiť kontrolu')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{tx('Zrušiť')}</Button>
          </div>
        </form>
      )}

      {older.length > 0 && (
        <details className="mt-4 border-t pt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">{tx('Staršie kontroly (')}{older.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {older.map((check) => (
              <li key={check.checkedAt}>
                <span className="font-medium">{formatDateTime(check.checkedAt)}</span> · {check.checkedByName || tx('neznámy')}
                {check.note && <span className="block text-muted-foreground">{check.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
