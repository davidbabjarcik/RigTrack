import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { useIssuers, useOffer } from '@/features/offers/api'
import { EMPTY_ISSUER } from '@/features/offers/model'
import { formatMoney, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import { createInvoice, invoiceKeys, useInvoices } from './api'
import { draftFromOffer, dueAfter, EMPTY_CLIENT, INVOICE_KIND_LABELS, invoiceTotals, type InvoiceDraft, type InvoiceKind, type InvoiceLine } from './model'

const EMPTY_LINE: InvoiceLine = { label: '', quantity: 1, unit: 'ks', unitPrice: 0, vatRate: 23 }
const num = (value: string) => {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function InvoiceForm({ companyId, start }: { companyId: string; start: InvoiceDraft }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const issuers = useIssuers(companyId)
  const [draft, setDraft] = useState<InvoiceDraft>(start)
  const set = (patch: Partial<InvoiceDraft>) => setDraft({ ...draft, ...patch })
  const setLine = (index: number, patch: Partial<InvoiceLine>) => set({ lines: draft.lines.map((line, at) => (at === index ? { ...line, ...patch } : line)) })
  const totals = invoiceTotals(draft.issuer.vatPayer ? draft.lines : draft.lines.map((line) => ({ ...line, vatRate: 0 })))
  const save = useMutation({
    mutationFn: () => createInvoice(companyId, draft),
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: invoiceKeys.list(companyId) })
      navigate(`/invoices/${id}`, { replace: true })
    },
  })
  const valid = draft.issuer.name.trim() !== '' && draft.client.name.trim() !== '' && draft.lines.some((line) => line.label.trim()) && draft.dueOn >= draft.issuedOn
  const submit = (submitted: FormEvent) => {
    submitted.preventDefault()
    if (valid && window.confirm(tx('Vystaviť faktúru? Po vystavení sa už nedá meniť, len označiť ako zaplatenú alebo stornovať.'))) save.mutate()
  }
  const payer = draft.issuer.vatPayer

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1.5 text-sm font-medium">{tx('Druh')}</legend>
        {(['final', 'advance'] as InvoiceKind[]).map((kind) => (
          <label key={kind} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm has-checked:border-accent has-checked:bg-accent/10">
            <input type="radio" name="kind" className="sr-only" checked={draft.kind === kind} onChange={() => set({ kind })} />
            {tx(INVOICE_KIND_LABELS[kind])}
          </label>
        ))}
      </fieldset>

      <section className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
        <h2 className="font-medium sm:col-span-2">{tx('Dodávateľ')}</h2>
        {(issuers.data?.length ?? 0) > 0 && (
          <SelectField
            label={tx('Vystaviť ako')}
            className="sm:col-span-2"
            value=""
            onChange={(changed) => {
              const issuer = issuers.data?.find((item) => item.id === changed.target.value)
              if (issuer) set({ issuer: { name: issuer.name, address: issuer.address, ico: issuer.ico, dic: issuer.dic, icDph: issuer.icDph, contact: issuer.contact, vatPayer: issuer.vatPayer, iban: issuer.iban, registerNote: issuer.registerNote } })
            }}
          >
            <option value="">{draft.issuer.name || tx('— vyberte —')}</option>
            {issuers.data?.map((issuer) => (
              <option key={issuer.id} value={issuer.id}>{issuer.name}</option>
            ))}
          </SelectField>
        )}
        <Field label={tx('Názov *')} maxLength={160} value={draft.issuer.name} onChange={(e) => set({ issuer: { ...draft.issuer, name: e.target.value } })} />
        <Field label={tx('IBAN')} maxLength={42} value={draft.issuer.iban ?? ''} onChange={(e) => set({ issuer: { ...draft.issuer, iban: e.target.value } })} />
        {!draft.issuer.iban && <p className="text-sm text-accent sm:col-span-2">{tx('Doplňte IBAN – v Nastaveniach pri vystavovateľovi ho stačí zadať raz.')}</p>}
      </section>

      <section className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
        <h2 className="font-medium sm:col-span-2">{tx('Odberateľ')}</h2>
        <Field label={tx('Názov / meno *')} className="sm:col-span-2" maxLength={160} value={draft.client.name} onChange={(e) => set({ client: { ...draft.client, name: e.target.value } })} />
        <TextareaField label={tx('Adresa')} className="sm:col-span-2" rows={2} maxLength={300} value={draft.client.address} onChange={(e) => set({ client: { ...draft.client, address: e.target.value } })} />
        <Field label={tx('IČO')} maxLength={20} value={draft.client.ico} onChange={(e) => set({ client: { ...draft.client, ico: e.target.value } })} />
        <Field label={tx('DIČ')} maxLength={20} value={draft.client.dic} onChange={(e) => set({ client: { ...draft.client, dic: e.target.value } })} />
        <Field label={tx('IČ DPH')} maxLength={20} value={draft.client.icDph} onChange={(e) => set({ client: { ...draft.client, icDph: e.target.value } })} />
      </section>

      <section className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-3">
        <Field label={tx('Dátum vystavenia')} type="date" value={draft.issuedOn} onChange={(e) => set({ issuedOn: e.target.value, dueOn: e.target.value > draft.dueOn ? dueAfter(e.target.value, 14) : draft.dueOn })} />
        <Field label={tx('Dátum dodania')} type="date" value={draft.deliveredOn} onChange={(e) => set({ deliveredOn: e.target.value })} />
        <Field label={tx('Splatnosť')} type="date" min={draft.issuedOn} value={draft.dueOn} onChange={(e) => set({ dueOn: e.target.value })} />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
        <h2 className="font-medium">{tx('Položky')}</h2>
        {draft.lines.map((line, index) => (
          <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_5rem_4rem_7rem_5rem_auto]">
            <Field label={tf('Položka {0}', index + 1)} maxLength={300} value={line.label} onChange={(e) => setLine(index, { label: e.target.value })} />
            <Field label={tx('Počet')} inputMode="decimal" value={String(line.quantity)} onChange={(e) => setLine(index, { quantity: num(e.target.value) })} />
            <Field label={tx('MJ')} maxLength={10} value={line.unit} onChange={(e) => setLine(index, { unit: e.target.value })} />
            <Field label={payer ? tx('Cena/MJ bez DPH') : tx('Cena/MJ')} inputMode="decimal" value={String(line.unitPrice)} onChange={(e) => setLine(index, { unitPrice: num(e.target.value) })} />
            <Field label={tx('DPH %')} inputMode="decimal" disabled={!payer} value={String(payer ? line.vatRate : 0)} onChange={(e) => setLine(index, { vatRate: num(e.target.value) })} />
            <Button variant="ghost" size="sm" aria-label={tf('Odobrať položku {0}', index + 1)} disabled={draft.lines.length === 1} onClick={() => set({ lines: draft.lines.filter((_, at) => at !== index) })}>
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
        <div>
          <Button variant="outline" size="sm" onClick={() => set({ lines: [...draft.lines, { ...EMPTY_LINE, vatRate: payer ? 23 : 0 }] })}>
            <Plus className="size-4" aria-hidden />{tx('Pridať položku')}</Button>
        </div>
        <p className="text-right text-sm">
          {payer && tf('Základ {0} · DPH {1} · ', formatMoney(totals.net, 'EUR'), formatMoney(totals.vat, 'EUR'))}
          <strong>{tf('Spolu {0}', formatMoney(payer ? totals.total : totals.net, 'EUR'))}</strong>
        </p>
      </section>

      <TextareaField label={tx('Poznámka na faktúre')} rows={2} maxLength={1000} value={draft.note} onChange={(e) => set({ note: e.target.value })} />
      {save.isError && <p className="text-sm text-destructive">{save.error instanceof Error && save.error.message.startsWith('Pridajte') ? save.error.message : tx('Faktúru sa nepodarilo vystaviť (migrácia 0185).')}</p>}
      <div>
        <Button type="submit" disabled={!valid || save.isPending}>{tx('Vystaviť faktúru')}</Button>
      </div>
    </form>
  )
}

/** Nová faktúra: prázdna alebo z cenovej ponuky (?offer=…&kind=advance|final). */
export function InvoiceFormPage() {
  const company = useCompany().active!
  const [params] = useSearchParams()
  const offerId = params.get('offer') ?? ''
  const kind: InvoiceKind = params.get('kind') === 'advance' ? 'advance' : 'final'
  const offer = useOffer(company.companyId, offerId)
  const invoices = useInvoices(company.companyId)
  const issuers = useIssuers(company.companyId)
  const today = todayIso()
  let body
  if (!can(company, 'offers.edit')) body = <ErrorBlock message={tx('Faktúry vystavuje, kto upravuje cenové ponuky.')} />
  else if ((offerId && offer.isPending) || invoices.isPending || issuers.isPending) body = <LoadingBlock />
  else {
    const start: InvoiceDraft = offer.data
      ? draftFromOffer(offer.data, kind, today, invoices.data ?? [])
      : { kind, eventId: null, offerId: null, issuer: EMPTY_ISSUER, client: EMPTY_CLIENT, lines: [EMPTY_LINE], issuedOn: today, deliveredOn: today, dueOn: dueAfter(today, 14), note: '' }
    // Vystavovateľ z ponuky nemá IBAN ani zápis v registri – doplnia sa z aktuálnych nastavení (podľa IČO alebo názvu).
    const saved = issuers.data?.find((item) => (start.issuer.ico && item.ico === start.issuer.ico) || item.name === start.issuer.name) ?? (start.issuer.name ? undefined : issuers.data?.[0])
    if (saved) start.issuer = { ...start.issuer, ...(start.issuer.name ? {} : { name: saved.name, address: saved.address, ico: saved.ico, dic: saved.dic, icDph: saved.icDph, contact: saved.contact, vatPayer: saved.vatPayer }), iban: start.issuer.iban || saved.iban, registerNote: start.issuer.registerNote || saved.registerNote }
    body = <InvoiceForm key={`${offerId}-${kind}`} companyId={company.companyId} start={start} />
  }
  return (
    <>
      <PageHeader title={kind === 'advance' ? tx('Nová zálohová faktúra') : tx('Nová faktúra')} />
      {body}
    </>
  )
}
