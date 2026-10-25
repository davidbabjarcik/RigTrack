import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, formatMoney } from '@/lib/format'
import { can } from '@/lib/permissions'
import { isAdminRole } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { deleteIssuer, offerKeys, saveIssuer, useIssuers, useOffers, type Issuer } from './api'
import { EMPTY_ISSUER, OFFER_STATUS_LABELS, sumPrices, type OfferIssuer } from './model'

const STATUS_TONES = { draft: 'bg-muted text-muted-foreground', sent: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', accepted: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', rejected: 'bg-destructive/10 text-destructive' } as const

/** Zoznam cenových ponúk a vystavovatelia (s.r.o., živnosť…). */
export function OffersPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const offers = useOffers(companyId)
  const canEdit = can(company, 'offers.edit')

  return (
    <>
      <PageHeader
        title="Cenové ponuky"
        description="Ponuky pre klientov s časťami, cenami a rozpočtom"
        action={
          canEdit ? (
            <LinkButton to="/offers/new">
              <Plus className="size-4" aria-hidden />
              Nová ponuka
            </LinkButton>
          ) : undefined
        }
      />
      {offers.isPending ? (
        <LoadingBlock />
      ) : offers.isError ? (
        <ErrorBlock message="Ponuky sa nepodarilo načítať. Táto časť databázy ešte nemusí byť pripravená (migrácia 0096)." />
      ) : offers.data.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 size-6" aria-hidden />
          Zatiaľ žiadne ponuky. Novú vytvoríte tlačidlom hore alebo z detailu eventu.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {offers.data.map((offer) => {
            const total = offer.totalOverride ?? sumPrices(offer.sections)
            return (
              <li key={offer.id}>
                <Link to={`/offers/${offer.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-muted">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{offer.title || 'Bez názvu'}</span>
                    <span className="block text-sm text-muted-foreground">
                      {[`č. ${offer.number || '—'}`, formatDate(offer.issuedOn), offer.client.name, offer.issuer.name].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_TONES[offer.status])}>{OFFER_STATUS_LABELS[offer.status]}</span>
                  <span className="w-28 text-right font-semibold tabular-nums">{total > 0 ? formatMoney(total, 'EUR') : '—'}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {isAdminRole(company.role) && (
        <div className="mt-8">
          <CollapsibleSection id="offers.issuers" title="Vystavovatelia">
            <IssuersSettings companyId={companyId} />
          </CollapsibleSection>
        </div>
      )}
    </>
  )
}

/** Za koho sa ponuky vystavujú – napr. s.r.o. a živnosť; pri ponuke sa vyberie. */
function IssuersSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const issuers = useIssuers(companyId)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [fields, setFields] = useState<OfferIssuer>(EMPTY_ISSUER)
  const refresh = () => queryClient.invalidateQueries({ queryKey: offerKeys.issuers(companyId) })
  const save = useMutation({ mutationFn: () => saveIssuer(companyId, editing === 'new' ? null : editing, fields), onSuccess: () => setEditing(null), onSettled: refresh })
  const remove = useMutation({ mutationFn: (id: string) => deleteIssuer(companyId, id), onSettled: refresh })
  const open = (issuer: Issuer | null) => {
    setFields(issuer ? { name: issuer.name, address: issuer.address, ico: issuer.ico, dic: issuer.dic, icDph: issuer.icDph, contact: issuer.contact, vatPayer: issuer.vatPayer } : EMPTY_ISSUER)
    setEditing(issuer?.id ?? 'new')
  }
  const set = (patch: Partial<OfferIssuer>) => setFields({ ...fields, ...patch })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (fields.name.trim()) save.mutate()
  }
  if (issuers.isError) return <p className="text-sm text-muted-foreground">Vystavovatelia zatiaľ nie sú dostupní – treba spustiť migráciu 0096.</p>
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Ak firma vystavuje ponuky za viac subjektov (napr. s.r.o. a živnosť), uložte ich sem. Bez vystavovateľa sa použijú Údaje o firme.</p>
      {(issuers.data ?? []).length > 0 && (
        <ul className="divide-y rounded-xl border bg-surface">
          {issuers.data!.map((issuer) => (
            <li key={issuer.id} className="flex items-start gap-3 p-3 text-sm">
              <Building className="mt-0.5 size-4 text-accent" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{issuer.name}</span>
                <span className="block text-muted-foreground">{[issuer.ico && `IČO ${issuer.ico}`, issuer.vatPayer ? 'platiteľ DPH' : 'neplatiteľ DPH'].filter(Boolean).join(' · ')}</span>
              </span>
              <Button variant="ghost" size="sm" aria-label={`Upraviť ${issuer.name}`} onClick={() => open(issuer)}>
                <Pencil className="size-4" aria-hidden />
              </Button>
              <Button variant="ghost" size="sm" aria-label={`Zmazať ${issuer.name}`} onClick={() => window.confirm(`Zmazať vystavovateľa ${issuer.name}?`) && remove.mutate(issuer.id)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
          <Field label="Názov *" className="sm:col-span-2" placeholder="napr. Firma s.r.o. alebo Meno Priezvisko" maxLength={160} value={fields.name} onChange={(e) => set({ name: e.target.value })} />
          <TextareaField label="Adresa" className="sm:col-span-2" rows={2} maxLength={300} value={fields.address} onChange={(e) => set({ address: e.target.value })} />
          <Field label="IČO" maxLength={20} value={fields.ico} onChange={(e) => set({ ico: e.target.value })} />
          <Field label="DIČ" maxLength={20} value={fields.dic} onChange={(e) => set({ dic: e.target.value })} />
          <Field label="IČ DPH" maxLength={20} value={fields.icDph} onChange={(e) => set({ icDph: e.target.value })} />
          <label className="flex items-center gap-2 self-end pb-3 text-sm">
            <input type="checkbox" className="size-4" checked={fields.vatPayer} onChange={(e) => set({ vatPayer: e.target.checked })} />
            Platiteľ DPH
          </label>
          <TextareaField label="Kontakt (telefón, e-mail, web)" className="sm:col-span-2" rows={2} maxLength={300} value={fields.contact} onChange={(e) => set({ contact: e.target.value })} />
          {save.isError && <p className="text-sm text-destructive sm:col-span-2">Nepodarilo sa uložiť.</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={!fields.name.trim() || save.isPending}>
              Uložiť
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Zrušiť
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="self-start" onClick={() => open(null)}>
          <Plus className="size-4" aria-hidden />
          Pridať vystavovateľa
        </Button>
      )}
    </div>
  )
}
