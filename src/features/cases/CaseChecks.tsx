import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { formatDateTime } from '@/lib/format'
import { addCaseCheck, caseKeys, fetchCaseChecks } from './api'

type Props = { companyId: string; caseId: string; canCheck: boolean }

/** Posledná kontrola obsahu case, jej história a zápis novej kontroly. */
export function CaseChecks({ companyId, caseId, canCheck }: Props) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const checks = useQuery({
    queryKey: caseKeys.checks(companyId, caseId),
    queryFn: () => fetchCaseChecks(companyId, caseId),
  })

  const add = useMutation({
    mutationFn: () => addCaseCheck(companyId, caseId, note),
    onSuccess: async () => {
      setOpen(false)
      setNote('')
      // Prefix zoznamu pokrýva aj históriu kontrol tohto case.
      await queryClient.invalidateQueries({ queryKey: caseKeys.list(companyId) })
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    add.mutate()
  }

  const [last, ...older] = checks.data ?? []

  return (
    <section aria-labelledby="checks-heading" className="mb-6 rounded-xl border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="checks-heading" className="text-sm font-medium text-muted-foreground">
            Posledná kontrola
          </h2>
          {checks.isPending ? (
            <p className="mt-1 text-sm text-muted-foreground">Načítavam…</p>
          ) : checks.isError ? (
            <p role="alert" className="mt-1 text-sm text-destructive">
              Kontroly sa nepodarilo načítať.
            </p>
          ) : last ? (
            <>
              <p className="mt-1 font-medium">
                {formatDateTime(last.checkedAt)} · {last.checkedByName || 'neznámy'}
              </p>
              {last.note && <p className="mt-1 text-sm whitespace-pre-wrap">{last.note}</p>}
            </>
          ) : (
            <p className="mt-1 font-medium">Zatiaľ nekontrolované</p>
          )}
        </div>
        {canCheck && !open && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <ClipboardCheck className="size-4" aria-hidden />
            Skontrolované
          </Button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 border-t pt-4">
          <Field
            label="Poznámka ku kontrole (nepovinné)"
            placeholder="napr. všetko je, alebo čo chýba"
            maxLength={500}
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {add.isError && (
            <p role="alert" className="text-sm text-destructive">
              Kontrolu sa nepodarilo zapísať.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={add.isPending}>
              {add.isPending ? 'Zapisujem…' : 'Potvrdiť kontrolu'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Zrušiť
            </Button>
          </div>
        </form>
      )}

      {older.length > 0 && (
        <details className="mt-4 border-t pt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Staršie kontroly ({older.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {older.map((check) => (
              <li key={check.checkedAt}>
                <span className="font-medium">{formatDateTime(check.checkedAt)}</span> · {check.checkedByName || 'neznámy'}
                {check.note && <span className="block text-muted-foreground">{check.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
