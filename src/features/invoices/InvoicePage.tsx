import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, Check } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PaperSheet } from '@/components/print/PaperSheet'
import { PrintButton } from '@/components/print/PrintButton'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cancelInvoice, invoiceKeys, setInvoicePaid, useInvoices } from './api'
import { invoiceState, invoiceTotals, STATE_LABELS, variableSymbol } from './model'

const PRINT_CSS = `
@page { size: A4; margin: 14mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } tr { break-inside: avoid; } }
`

const party = (lines: (string | false | undefined)[]) => lines.filter(Boolean).join('\n')

/** Faktúra na tlač / PDF a jej stav: označiť ako zaplatenú alebo stornovať (vystavená sa nemení). */
export function InvoicePage() {
  const sheet = useRef<HTMLDivElement>(null)
  const { id = '' } = useParams()
  const company = useCompany().active!
  const queryClient = useQueryClient()
  const invoices = useInvoices(company.companyId)
  const [paidOn, setPaidOn] = useState(todayIso())
  const refresh = () => queryClient.invalidateQueries({ queryKey: invoiceKeys.list(company.companyId) })
  const pay = useMutation({ mutationFn: (value: string | null) => setInvoicePaid(id, value), onSettled: refresh })
  const cancel = useMutation({ mutationFn: () => cancelInvoice(id), onSettled: refresh })
  if (invoices.isPending) return <LoadingBlock />
  const invoice = invoices.data?.find((item) => item.id === id)
  if (!invoice) return <ErrorBlock message="Faktúra sa nenašla." />

  const canEdit = can(company, 'offers.edit')
  const state = invoiceState(invoice, todayIso())
  const totals = invoiceTotals(invoice.lines)
  const payer = invoice.issuer.vatPayer
  const money = (value: number) => formatMoney(value, 'EUR')
  const title = invoice.kind === 'advance' ? 'Zálohová faktúra' : payer ? 'Faktúra – daňový doklad' : 'Faktúra'

  return (
    <div className="min-h-dvh bg-muted p-2 text-black sm:p-6 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/invoices" className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Faktúry
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-sm font-medium">{STATE_LABELS[state]}{invoice.paidOn && ` ${formatDate(invoice.paidOn)}`}</span>
          {canEdit && (state === 'open' || state === 'overdue') && (
            <>
              <input type="date" aria-label="Dátum zaplatenia" className="h-9 rounded-lg border border-neutral-300 bg-white px-2 text-sm" value={paidOn} max={todayIso()} onChange={(changed) => setPaidOn(changed.target.value)} />
              <Button variant="outline" className="border-neutral-300 bg-white text-black hover:bg-neutral-100" disabled={pay.isPending || !paidOn} onClick={() => pay.mutate(paidOn)}>
                <Check className="size-4" aria-hidden />
                Zaplatená
              </Button>
            </>
          )}
          {canEdit && state === 'paid' && (
            <Button variant="ghost" disabled={pay.isPending} onClick={() => window.confirm('Zrušiť zaplatenie?') && pay.mutate(null)}>Zrušiť zaplatenie</Button>
          )}
          {canEdit && state !== 'cancelled' && state !== 'paid' && (
            <Button variant="ghost" disabled={cancel.isPending} onClick={() => window.confirm(`Stornovať faktúru ${invoice.number}? Číslo ostane použité.`) && cancel.mutate()}>
              <Ban className="size-4" aria-hidden />
              Stornovať
            </Button>
          )}
          <PrintButton sheet={sheet} fileName={`faktura-${invoice.number}`} label="Tlačiť / PDF" />
        </div>
      </div>
      {(pay.isError || cancel.isError) && <p className="mb-4 text-sm text-red-700 print:hidden">Nepodarilo sa uložiť.</p>}

      <PaperSheet sheetRef={sheet}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {invoice.kind === 'advance' && <p className="text-sm text-neutral-600">Nie je daňový doklad.</p>}
            {invoice.cancelledAt && <p className="text-lg font-bold text-red-700">STORNOVANÁ</p>}
          </div>
          <p className="text-right text-lg font-semibold">č. {invoice.number}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">Dodávateľ</p>
            <p className="font-semibold">{invoice.issuer.name}</p>
            <p className="whitespace-pre-line">
              {party([
                invoice.issuer.address,
                invoice.issuer.ico && `IČO: ${invoice.issuer.ico}`,
                invoice.issuer.dic && `DIČ: ${invoice.issuer.dic}`,
                payer ? invoice.issuer.icDph && `IČ DPH: ${invoice.issuer.icDph}` : 'Nie je platiteľ DPH',
                invoice.issuer.registerNote,
                invoice.issuer.contact,
              ])}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">Odberateľ</p>
            <p className="font-semibold">{invoice.client.name}</p>
            <p className="whitespace-pre-line">
              {party([invoice.client.address, invoice.client.ico && `IČO: ${invoice.client.ico}`, invoice.client.dic && `DIČ: ${invoice.client.dic}`, invoice.client.icDph && `IČ DPH: ${invoice.client.icDph}`])}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1 rounded border border-neutral-300 p-3 text-sm sm:grid-cols-3">
          <div><dt className="text-neutral-500">Dátum vystavenia</dt><dd className="font-medium">{formatDate(invoice.issuedOn)}</dd></div>
          {invoice.kind === 'final' && <div><dt className="text-neutral-500">Dátum dodania</dt><dd className="font-medium">{formatDate(invoice.deliveredOn)}</dd></div>}
          <div><dt className="text-neutral-500">Dátum splatnosti</dt><dd className="font-medium">{formatDate(invoice.dueOn)}</dd></div>
          <div><dt className="text-neutral-500">IBAN</dt><dd className="font-medium break-all">{invoice.issuer.iban || '—'}</dd></div>
          <div><dt className="text-neutral-500">Variabilný symbol</dt><dd className="font-medium">{variableSymbol(invoice.number)}</dd></div>
          <div><dt className="text-neutral-500">Spôsob úhrady</dt><dd className="font-medium">Prevodom na účet</dd></div>
        </dl>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-1.5 pr-2">Položka</th>
              <th className="py-1.5 pr-2 text-right">Počet</th>
              <th className="py-1.5 pr-2 text-right">{payer ? 'Cena/MJ bez DPH' : 'Cena/MJ'}</th>
              {payer && <th className="py-1.5 pr-2 text-right">DPH</th>}
              <th className="py-1.5 text-right">{payer ? 'Spolu bez DPH' : 'Spolu'}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, index) => (
              <tr key={index} className="border-b border-neutral-300">
                <td className="py-1.5 pr-2">{line.label}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{String(line.quantity).replace('.', ',')} {line.unit}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{money(line.unitPrice)}</td>
                {payer && <td className="py-1.5 pr-2 text-right tabular-nums">{line.vatRate} %</td>}
                <td className="py-1.5 text-right tabular-nums">{money(Math.round(line.quantity * line.unitPrice * 100) / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-full max-w-xs text-sm">
          {payer &&
            totals.rates.map((row) => (
              <div key={row.rate} className="flex justify-between gap-4">
                <span>Základ {row.rate} % / DPH</span>
                <span className="tabular-nums">{money(row.base)} / {money(row.vat)}</span>
              </div>
            ))}
          <div className="mt-2 flex justify-between gap-4 border-t-2 border-black pt-2 text-base font-bold">
            <span>Na úhradu</span>
            <span className="tabular-nums">{money(invoice.total)}</span>
          </div>
        </div>
        {invoice.note && <p className="mt-6 text-sm whitespace-pre-wrap">{invoice.note}</p>}
      </PaperSheet>
    </div>
  )
}
