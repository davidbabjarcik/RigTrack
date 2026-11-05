import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Mic, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { capsuleKeys, deleteCapsule, saveCapsule, useCapsules, type Capsule, type CapsuleFields } from './api'
import { tx, tf } from '@/lib/i18n'

const EMPTY: CapsuleFields = { name: '', manufacturer: '', quantity: 1, fits: '', note: '' }

function CapsuleForm({ companyId, current, onDone }: { companyId: string; current: Capsule | null; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [fields, setFields] = useState<CapsuleFields>(current ?? EMPTY)
  const save = useMutation({
    mutationFn: () => saveCapsule(companyId, current?.id ?? null, fields),
    onSuccess: onDone,
    onSettled: () => queryClient.invalidateQueries({ queryKey: capsuleKeys.list(companyId) }),
  })
  const set = (patch: Partial<CapsuleFields>) => setFields((value) => ({ ...value, ...patch }))
  function submit(event: FormEvent) {
    event.preventDefault()
    if (fields.name.trim() && Number.isInteger(fields.quantity) && fields.quantity >= 0) save.mutate()
  }
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
      <Field label={tx('Názov *')} autoFocus placeholder={tx('napr. Beta 58A, KSM9, SM86')} maxLength={120} value={fields.name} onChange={(e) => set({ name: e.target.value })} />
      <Field label={tx('Výrobca')} placeholder={tx('napr. Shure, Sennheiser')} maxLength={80} value={fields.manufacturer} onChange={(e) => set({ manufacturer: e.target.value })} />
      <Field label={tx('Počet kusov')} type="number" inputMode="numeric" min={0} step={1} value={Number.isNaN(fields.quantity) ? '' : fields.quantity} onChange={(e) => set({ quantity: e.target.valueAsNumber })} />
      <Field label={tx('Pasuje na')} placeholder={tx('napr. ULX-D, QLX-D, SLX-D')} maxLength={200} value={fields.fits} onChange={(e) => set({ fits: e.target.value })} />
      <Field label={tx('Poznámka')} className="sm:col-span-2" maxLength={500} value={fields.note} onChange={(e) => set({ note: e.target.value })} />
      {save.isError && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">{tx('Uloženie zlyhalo. Skúste to znova.')}</p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={!fields.name.trim() || save.isPending}>
          {current ? tx('Uložiť') : tx('Pridať kapsulu')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>{tx('Zrušiť')}</Button>
      </div>
    </form>
  )
}

/** Vlastný zoznam kapsúl k bezdrôtovým mikrofónom; na evente sa z neho vyberá. */
export function CapsulesPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'equipment.edit')
  const queryClient = useQueryClient()
  const capsules = useCapsules(companyId)
  const [params] = useSearchParams()
  // Z formulára novej techniky (druh Kapsula) sa otvorí rovno pridanie.
  const [editing, setEditing] = useState<string | null>(params.get('new') ? 'new' : null)
  const remove = useMutation({ mutationFn: deleteCapsule, onSettled: () => queryClient.invalidateQueries({ queryKey: capsuleKeys.list(companyId) }) })

  return (
    <>
      <Link to="/equipment" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />{tx('Technika')}</Link>
      <PageHeader
        title={tx('Kapsule k mikrofónom')}
        description={tx('Hlavy bezdrôtových mikrofónov – koľko ich máme a na čo pasujú. Na evente vyberiete, ktoré idú.')}
        action={
          canEdit &&
          editing === null && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />{tx('Pridať')}</Button>
          )
        }
      />
      {editing === 'new' && (
        <div className="mb-4">
          <CapsuleForm companyId={companyId} current={null} onDone={() => setEditing(null)} />
        </div>
      )}
      {capsules.isPending ? (
        <LoadingBlock />
      ) : capsules.isError ? (
        <ErrorBlock message={tx('Kapsule sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.')} onRetry={() => void capsules.refetch()} />
      ) : capsules.data.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center">
          <p className="font-medium">{tx('Zatiaľ žiadne kapsule')}</p>
          {canEdit && <p className="mt-1 text-sm text-muted-foreground">{tx('Pridajte napr. Beta 58A, KSM9 alebo SM86.')}</p>}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {capsules.data.map((capsule) =>
            editing === capsule.id ? (
              <li key={capsule.id}>
                <CapsuleForm companyId={companyId} current={capsule} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={capsule.id} className="flex items-center gap-3 rounded-xl border bg-surface px-4 py-3">
                <Mic className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium break-words">{[capsule.manufacturer, capsule.name].filter(Boolean).join(' ')}</span>
                  <span className="block text-sm text-muted-foreground">{[`${capsule.quantity} ks`, capsule.fits && `pasuje na ${capsule.fits}`, capsule.note].filter(Boolean).join(' · ')}</span>
                </span>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="sm" aria-label={tf('Upraviť {0}', capsule.name)} onClick={() => setEditing(capsule.id)}>
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={tf('Odstrániť {0}', capsule.name)}
                      disabled={remove.isPending}
                      onClick={() => window.confirm(tf('Odstrániť kapsulu {0}? Zmizne aj z eventov.', capsule.name)) && remove.mutate(capsule.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </>
  )
}
