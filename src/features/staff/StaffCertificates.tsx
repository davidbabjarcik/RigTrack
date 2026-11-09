import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { formatDate, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { VALIDITY_CLASS, validity } from '@/lib/validity'
import { certificateKeys, deleteCertificate, saveCertificate, useCertificates, type Certificate, type CertificateFields } from './certificates'

const EMPTY: CertificateFields = { name: '', issuer: '', number: '', issuedOn: null, validUntil: null, note: '' }

function CertificateForm({ companyId, staffId, current, onDone }: { companyId: string; staffId: string; current: Certificate | null; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [fields, setFields] = useState<CertificateFields>(current ?? EMPTY)
  const datesOk = !fields.issuedOn || !fields.validUntil || fields.validUntil >= fields.issuedOn
  const valid = fields.name.trim() !== '' && datesOk
  const save = useMutation({
    mutationFn: () => saveCertificate(companyId, staffId, current?.id ?? null, fields),
    onSuccess: onDone,
    onSettled: () => queryClient.invalidateQueries({ queryKey: certificateKeys.list(companyId) }),
  })
  const set = (patch: Partial<CertificateFields>) => setFields((value) => ({ ...value, ...patch }))
  function submit(event: FormEvent) {
    event.preventDefault()
    if (valid) save.mutate()
  }
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
      <Field label={tx('Názov *')} autoFocus placeholder={tx('napr. práca vo výškach, elektro vyhláška, VZV')} maxLength={120} value={fields.name} onChange={(e) => set({ name: e.target.value })} />
      <Field label={tx('Kto vydal')} maxLength={120} value={fields.issuer} onChange={(e) => set({ issuer: e.target.value })} />
      <Field label={tx('Číslo preukazu')} maxLength={80} value={fields.number} onChange={(e) => set({ number: e.target.value })} />
      <Field label={tx('Vydaný')} type="date" value={fields.issuedOn ?? ''} onChange={(e) => set({ issuedOn: e.target.value || null })} />
      <Field
        label={tx('Platí do (prázdne = bez obmedzenia)')}
        type="date"
        value={fields.validUntil ?? ''}
        error={datesOk ? undefined : tx('Platnosť nemôže skončiť pred vydaním.')}
        onChange={(e) => set({ validUntil: e.target.value || null })}
      />
      <Field label={tx('Poznámka')} maxLength={500} value={fields.note} onChange={(e) => set({ note: e.target.value })} />
      {save.isError && <p role="alert" className="text-sm text-destructive sm:col-span-2">{tx('Uloženie zlyhalo. Skúste to znova.')}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={!valid || save.isPending}>
          {current ? tx('Uložiť') : tx('Pridať certifikát')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>{tx('Zrušiť')}</Button>
      </div>
    </form>
  )
}

function validityText(until: string | null, today: string) {
  const state = validity(until, today)
  if (state === 'none') return tx('bez obmedzenia')
  if (state === 'expired') return tf('platnosť skončila {0}', formatDate(until!))
  if (state === 'soon') return tf('platnosť končí {0}', formatDate(until!))
  return tf('platí do {0}', formatDate(until!))
}

/** Certifikácie a školenia človeka. Upravuje ich on sám a správca tímu. */
export function StaffCertificates({ companyId, staffId, canEdit }: { companyId: string; staffId: string; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const certificates = useCertificates(companyId)
  const [editing, setEditing] = useState<string | null>(null)
  const remove = useMutation({ mutationFn: deleteCertificate, onSettled: () => queryClient.invalidateQueries({ queryKey: certificateKeys.list(companyId) }) })
  // Bez migrácie 0172 sa sekcia neukáže.
  if (!certificates.isSuccess) return null
  const own = certificates.data.filter((item) => item.staffId === staffId)
  if (own.length === 0 && !canEdit) return null
  const today = todayIso()

  return (
    <CollapsibleSection
      id="staff.certificates"
      title={own.length > 0 ? tf('Certifikácie ({0})', own.length) : tx('Certifikácie')}
      actions={
        canEdit &&
        editing === null && (
          <Button variant="outline" size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden />{tx('Pridať')}</Button>
        )
      }
    >
      {editing === 'new' && (
        <div className="mb-3">
          <CertificateForm companyId={companyId} staffId={staffId} current={null} onDone={() => setEditing(null)} />
        </div>
      )}
      {own.length === 0 ? (
        editing === null && <p className="text-sm text-muted-foreground">{tx('Zatiaľ žiadne certifikácie. Pridajte napr. prácu vo výškach alebo elektro vyhlášku.')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {own.map((item) =>
            editing === item.id ? (
              <li key={item.id}>
                <CertificateForm companyId={companyId} staffId={staffId} current={item} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={item.id} className="flex items-start gap-3 rounded-xl border bg-surface px-4 py-3">
                <Award className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium break-words">{item.name}</span>
                  {(item.issuer || item.number || item.issuedOn) && (
                    <span className="block text-sm text-muted-foreground">
                      {[item.issuer, item.number && tf('č. {0}', item.number), item.issuedOn && tf('vydaný {0}', formatDate(item.issuedOn))].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  <span className={cn('block text-sm', VALIDITY_CLASS[validity(item.validUntil, today)])}>{validityText(item.validUntil, today)}</span>
                  {item.note && <span className="block text-sm text-muted-foreground break-words">{item.note}</span>}
                </span>
                {canEdit && (
                  <>
                    <Button variant="ghost" size="sm" aria-label={tf('Upraviť {0}', item.name)} onClick={() => setEditing(item.id)}>
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={tf('Odstrániť {0}', item.name)}
                      disabled={remove.isPending}
                      onClick={() => window.confirm(tf('Odstrániť certifikát {0}?', item.name)) && remove.mutate(item.id)}
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
    </CollapsibleSection>
  )
}
