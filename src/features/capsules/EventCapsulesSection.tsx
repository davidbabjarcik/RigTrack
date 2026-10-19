import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Mic, Minus, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { addEventCapsule, capsuleKeys, fetchEventCapsules, removeEventCapsule, setEventCapsuleQuantity, useCapsules } from './api'

/** Ktoré kapsule bezdrôtových mikrofónov idú na event a koľko. */
export function EventCapsulesSection({ companyId, eventId, canEdit }: { companyId: string; eventId: string; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const capsules = useCapsules(companyId)
  const key = capsuleKeys.ofEvent(companyId, eventId)
  const chosen = useQuery({ queryKey: key, queryFn: () => fetchEventCapsules(companyId, eventId), retry: false })
  const [adding, setAdding] = useState(false)
  const [capsuleId, setCapsuleId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const add = useMutation({
    mutationFn: () => addEventCapsule(companyId, eventId, capsuleId, quantity, note),
    onSuccess: () => {
      setCapsuleId('')
      setQuantity(1)
      setNote('')
      setAdding(false)
    },
    onSettled: refresh,
  })
  const change = useMutation({ mutationFn: ({ id, value }: { id: string; value: number }) => setEventCapsuleQuantity(id, value), onSettled: refresh })
  const remove = useMutation({ mutationFn: removeEventCapsule, onSettled: refresh })
  // Bez migrácie 0060 alebo bez kapsúl v zozname sa sekcia neukáže.
  if (capsules.isError || chosen.isError || !capsules.data || !chosen.data) return null
  if (capsules.data.length === 0 && chosen.data.length === 0) return null

  const rows = chosen.data.map((item) => ({ ...item, capsule: capsules.data.find((capsule) => capsule.id === item.capsuleId) })).filter((row) => row.capsule)
  const available = capsules.data.filter((capsule) => !chosen.data.some((item) => item.capsuleId === capsule.id))
  const total = rows.reduce((sum, row) => sum + row.quantity, 0)
  function submit(event: FormEvent) {
    event.preventDefault()
    if (capsuleId && quantity >= 1) add.mutate()
  }

  return (
    <CollapsibleSection
      id="event.capsules"
      title={`Kapsule k mikrofónom (${total})`}
      actions={
        canEdit &&
        !adding &&
        available.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />
            Pridať kapsulu
          </Button>
        )
      }
    >
      {rows.length > 0 ? (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface">
          {rows.map((row) => {
            const capsule = row.capsule!
            const over = row.quantity > capsule.quantity
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Mic className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{[capsule.manufacturer, capsule.name].filter(Boolean).join(' ')}</span>
                  <span className={over ? 'block text-sm text-destructive' : 'block text-sm text-muted-foreground'}>
                    {[`máme ${capsule.quantity} ks`, over && 'na evente je viac, ako máme', capsule.fits && `pasuje na ${capsule.fits}`, row.note].filter(Boolean).join(' · ')}
                  </span>
                </span>
                {canEdit ? (
                  <span className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" aria-label="Menej" disabled={row.quantity <= 1 || change.isPending} onClick={() => change.mutate({ id: row.id, value: row.quantity - 1 })}>
                      <Minus className="size-4" aria-hidden />
                    </Button>
                    <span className="w-10 text-center font-medium">{row.quantity} ks</span>
                    <Button variant="ghost" size="sm" aria-label="Viac" disabled={change.isPending} onClick={() => change.mutate({ id: row.id, value: row.quantity + 1 })}>
                      <Plus className="size-4" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="sm" aria-label={`Odobrať ${capsule.name}`} disabled={remove.isPending} onClick={() => remove.mutate(row.id)}>
                      <X className="size-4" aria-hidden />
                    </Button>
                  </span>
                ) : (
                  <span className="font-medium">{row.quantity} ks</span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        !adding && <p className="mb-3 text-sm text-muted-foreground">Zatiaľ nie sú vybrané žiadne kapsule.</p>
      )}
      {adding && (
        <form onSubmit={submit} className="mb-3 grid gap-2 rounded-xl border bg-surface p-4 sm:grid-cols-[1fr_6rem_1fr_auto] sm:items-end">
          <SelectField label="Kapsula" value={capsuleId} onChange={(e) => setCapsuleId(e.target.value)}>
            <option value="">— vyberte —</option>
            {available.map((capsule) => (
              <option key={capsule.id} value={capsule.id}>
                {[capsule.manufacturer, capsule.name].filter(Boolean).join(' ')} ({capsule.quantity} ks)
              </option>
            ))}
          </SelectField>
          <Field label="Kusov" type="number" inputMode="numeric" min={1} step={1} value={Number.isNaN(quantity) ? '' : quantity} onChange={(e) => setQuantity(e.target.valueAsNumber)} />
          <Field label="Poznámka" placeholder="napr. pre moderátora" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!capsuleId || !(quantity >= 1) || add.isPending}>
              Pridať
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Zrušiť
            </Button>
          </div>
        </form>
      )}
      <p className="text-xs text-muted-foreground">
        Zoznam kapsúl spravujete v{' '}
        <Link to="/equipment/capsules" className="text-accent hover:underline">
          Technika → Kapsule
        </Link>
        .
      </p>
    </CollapsibleSection>
  )
}
