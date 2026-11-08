import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Plus, Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import {
  addPayment,
  bothBases,
  DEFAULT_VAT_RATE,
  deletePayment,
  fetchPayments,
  incomeKeys,
  incomeTotals,
  METHOD_LABELS,
  PAYMENT_METHODS,
  VAT_LABELS,
  type PaymentMethod,
  type VatBasis,
} from './income'
import { tx, tf } from '@/lib/i18n'

const eur = (amount: number) => formatMoney(amount, 'EUR')

const EMPTY = { amount: '', method: 'cash' as PaymentMethod, invoicedBy: '', vat: 'with' as VatBasis, vatRate: String(DEFAULT_VAT_RATE), receivedOn: '', note: '' }

/** Príjmy z eventu: hotovosť, na účet alebo faktúrou (cez ktorú firmu), s DPH alebo bez. */
export function EventIncomeSection({ companyId, eventId }: { companyId: string; eventId: string }) {
  const company = useCompany().active!
  const queryClient = useQueryClient()
  const invoicedListId = useId()
  const key = incomeKeys.list(companyId, eventId)
  const payments = useQuery({ queryKey: key, queryFn: () => fetchPayments(companyId, eventId) })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY, receivedOn: todayIso() })
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }))
  // Zisk z eventu (0171) sa ráta aj z týchto údajov.
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: key }), queryClient.invalidateQueries({ queryKey: ['company', companyId, 'profit'] })])

  const add = useMutation({
    mutationFn: () =>
      addPayment(companyId, eventId, {
        amount: Number(form.amount.replace(',', '.')),
        method: form.method,
        invoicedBy: form.invoicedBy,
        vat: form.vat,
        vatRate: form.vatRate.trim() === '' ? null : Number(form.vatRate.replace(',', '.')),
        receivedOn: form.receivedOn,
        note: form.note,
      }),
    onSuccess: () => {
      setForm({ ...EMPTY, receivedOn: todayIso() })
      setOpen(false)
    },
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: deletePayment, onSettled: refresh })

  const amount = Number(form.amount.replace(',', '.'))
  const valid = Number.isFinite(amount) && amount > 0 && form.receivedOn !== ''
  function submit(event: FormEvent) {
    event.preventDefault()
    if (valid) add.mutate()
  }

  const list = payments.data ?? []
  const totals = incomeTotals(list)
  // Na výber firmy pri faktúre: aktívna firma a doteraz použité názvy.
  const invoicers = [...new Set([company.companyName, ...list.map((payment) => payment.invoicedBy).filter(Boolean)])]

  return (
    <CollapsibleSection id="event.income" title={tx('Príjmy z akcie')} actions={
        <>
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
          {!open && <Plus className="size-4" aria-hidden />}
          {open ? tx('Zavrieť') : tx('Zapísať príjem')}
        </Button>
        </>
      }>

      {payments.isError && (
        <p role="alert" className="mb-2 text-sm text-destructive">{tx('Príjmy sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.')}</p>
      )}

      {open && (
        <form onSubmit={submit} className="mb-3 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-3">
          <Field label={tx('Suma (€) *')} inputMode="decimal" autoFocus value={form.amount} onChange={(e) => set({ amount: e.target.value })} />
          <SelectField label={tx('Spôsob')} value={form.method} onChange={(e) => set({ method: e.target.value as PaymentMethod })}>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {tx(METHOD_LABELS[method])}
              </option>
            ))}
          </SelectField>
          <Field label={tx('Dátum *')} type="date" value={form.receivedOn} onChange={(e) => set({ receivedOn: e.target.value })} />
          {form.method === 'invoice' && (
            <>
              <Field
                label={tx('Faktúra cez firmu')}
                list={invoicedListId}
                placeholder={tx('napr. skratka alebo celý názov firmy')}
                maxLength={120}
                value={form.invoicedBy}
                onChange={(e) => set({ invoicedBy: e.target.value })}
              />
              <datalist id={invoicedListId}>
                {invoicers.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </>
          )}
          <SelectField label={tx('Suma je')} value={form.vat} onChange={(e) => set({ vat: e.target.value as VatBasis })}>
            <option value="with">{tx('s DPH')}</option>
            <option value="without">{tx('bez DPH')}</option>
          </SelectField>
          <Field label={tx('Sadzba DPH (%)')} inputMode="decimal" placeholder={tx('prázdne = neviem')} value={form.vatRate} onChange={(e) => set({ vatRate: e.target.value })} />
          <Field label={tx('Poznámka')} className="sm:col-span-3" maxLength={300} value={form.note} onChange={(e) => set({ note: e.target.value })} />
          {add.isError && (
            <p role="alert" className="text-sm text-destructive sm:col-span-3">{tx('Uloženie zlyhalo.')}</p>
          )}
          <Button type="submit" className="justify-self-start" disabled={!valid || add.isPending}>
            {add.isPending ? tx('Ukladám…') : tx('Uložiť príjem')}
          </Button>
        </form>
      )}

      {list.length > 0 ? (
        <>
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {list.map((payment) => {
              const bases = bothBases(payment)
              const other = payment.vat === 'with' ? bases.net : bases.gross
              return (
                <li key={payment.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {eur(payment.amount)} {tx(VAT_LABELS[payment.vat])}
                      {other !== null && (
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          ({eur(other)} {tx(VAT_LABELS[payment.vat === 'with' ? 'without' : 'with'])})
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {[
                        METHOD_LABELS[payment.method] + (payment.invoicedBy ? ` – ${payment.invoicedBy}` : ''),
                        formatDate(payment.receivedOn),
                        payment.note,
                        payment.createdByName && `zapísal ${payment.createdByName}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={tf('Zmazať príjem {0}', eur(payment.amount))}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(tf('Zmazať príjem {0}?', eur(payment.amount)))) remove.mutate(payment.id)
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              )
            })}
          </ul>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {PAYMENT_METHODS.filter((method) => totals.byMethod[method] > 0).map((method) => (
              <div key={method} className="flex gap-1">
                <dt className="text-muted-foreground">{tx(METHOD_LABELS[method])}:</dt>
                <dd className="font-medium">{eur(totals.byMethod[method])}</dd>
              </div>
            ))}
            <div className="flex gap-1">
              <dt className="text-muted-foreground">{tx('Spolu s DPH:')}</dt>
              <dd className="font-semibold">{eur(totals.gross)}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-muted-foreground">{tx('bez DPH:')}</dt>
              <dd className="font-semibold">{eur(totals.net)}</dd>
            </div>
          </dl>
          {!totals.complete && <p className="mt-1 text-xs text-muted-foreground">{tx('Pri platbách bez sadzby DPH sa suma ráta rovnaká s DPH aj bez DPH.')}</p>}
        </>
      ) : (
        !payments.isPending &&
        !open && <p className="rounded-xl border border-dashed bg-surface px-6 py-6 text-center text-sm text-muted-foreground">{tx('Zatiaľ nič zapísané.')}</p>
      )}
    </CollapsibleSection>
  )
}
