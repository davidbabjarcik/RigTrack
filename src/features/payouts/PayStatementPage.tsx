import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PaperSheet } from '@/components/print/PaperSheet'
import { PrintButton } from '@/components/print/PrintButton'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { useEvents } from '@/features/events/useEvents'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { fetchPayments, payoutKeys } from './api'
import { monthStatement, PAYMENT_KIND_LABELS, paymentMonths } from './model'

const PRINT_CSS = `
@page { size: A4; margin: 14mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } tr { break-inside: avoid; } }
`

const monthLabel = (month: string) => {
  const [year, number] = month.split('-').map(Number)
  return new Date(year, number - 1, 1).toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })
}

/**
 * Výpis odmien za mesiac na tlač / PDF: akcie, bonusy, zálohy a doplatok. Kto vidí odmeny všetkých, vyberie člena;
 * ostatní vidia len seba (záznamy filtruje databáza).
 */
export function PayStatementPage() {
  const sheet = useRef<HTMLDivElement>(null)
  const company = useCompany().active!
  const userId = useAuth().session!.user.id
  const isAdmin = can(company, 'payouts.view_all')
  const [params, setParams] = useSearchParams()
  const payments = useQuery({ queryKey: payoutKeys.list(company.companyId), queryFn: () => fetchPayments(company.companyId) })
  const members = useMembers(company.companyId)
  const events = useEvents(company.companyId)
  if (payments.isPending) return <LoadingBlock />
  if (payments.isError) return <ErrorBlock message="Odmeny sa nepodarilo načítať." />

  const memberId = isAdmin ? params.get('member') || userId : userId
  const months = paymentMonths(payments.data, memberId)
  const month = params.get('month') && /^\d{4}-\d{2}$/.test(params.get('month')!) ? params.get('month')! : (months[0] ?? todayIso().slice(0, 7))
  const statement = monthStatement(payments.data, memberId, month)
  const who = memberName(members.data, memberId) || 'Člen'
  const eventName = (eventId: string | null) => events.data?.find((event) => event.id === eventId)?.name ?? ''
  const money = (value: number) => formatMoney(value, 'EUR')
  const set = (key: string, value: string) => setParams((current) => ({ ...Object.fromEntries(current), [key]: value }), { replace: true })
  const payers = [...new Set(payments.data.map((payment) => payment.memberId))]

  return (
    <div className="min-h-dvh bg-muted p-2 text-black sm:p-6 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/payouts" className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Späť
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm">
              Člen
              <select className="h-9 rounded-lg border border-neutral-300 bg-white px-2" value={memberId} onChange={(changed) => setParams({ member: changed.target.value }, { replace: true })}>
                {[...new Set([userId, ...payers])].map((id) => (
                  <option key={id} value={id}>{memberName(members.data, id) || 'Bývalý člen'}</option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            Mesiac
            <input type="month" className="h-9 rounded-lg border border-neutral-300 bg-white px-2" value={month} onChange={(changed) => changed.target.value && set('month', changed.target.value)} />
          </label>
          <PrintButton sheet={sheet} fileName={`odmeny-${who}-${month}`} disabled={statement.rows.length === 0} label="Tlačiť" />
        </div>
      </div>
      <PaperSheet sheetRef={sheet}>
        <h1 className="text-xl font-bold">Výpis odmien – {monthLabel(month)}</h1>
        <p className="mb-4 text-sm text-neutral-600">{[who, company.companyName, `vytlačené ${formatDate(todayIso())}`].join(' · ')}</p>
        {statement.rows.length === 0 ? (
          <p>V tomto mesiaci nie sú zapísané žiadne odmeny ani zálohy.</p>
        ) : (
          <>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-1.5 pr-2">Dátum</th>
                  <th className="py-1.5 pr-2">Druh</th>
                  <th className="py-1.5 pr-2">Akcia / poznámka</th>
                  <th className="py-1.5 pr-2">Vyplatené</th>
                  <th className="py-1.5 text-right">Suma</th>
                </tr>
              </thead>
              <tbody>
                {statement.rows.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-300">
                    <td className="py-1.5 pr-2 tabular-nums">{formatDate(row.happenedOn)}</td>
                    <td className="py-1.5 pr-2">{PAYMENT_KIND_LABELS[row.kind]}</td>
                    <td className="py-1.5 pr-2">{[eventName(row.eventId), row.note].filter(Boolean).join(' – ')}</td>
                    <td className="py-1.5 pr-2">{row.paidAt ? formatDate(row.paidAt.slice(0, 10)) : '—'}</td>
                    <td className="py-1.5 text-right tabular-nums">{row.kind === 'advance' ? `−${money(row.amount)}` : money(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-6 ml-auto grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
              <dt>Zárobok spolu</dt>
              <dd className="text-right tabular-nums">{money(statement.earned)}</dd>
              <dt>Z toho už vyplatené</dt>
              <dd className="text-right tabular-nums">−{money(statement.paid)}</dd>
              <dt>Zálohy</dt>
              <dd className="text-right tabular-nums">−{money(statement.advances)}</dd>
              <dt className="border-t-2 border-black pt-1 font-bold">Zostáva doplatiť</dt>
              <dd className="border-t-2 border-black pt-1 text-right font-bold tabular-nums">{money(statement.toPay)}</dd>
            </dl>
            <div className="mt-16 grid grid-cols-2 gap-12 text-sm">
              <p className="border-t border-black pt-1">Vyplatil(a)</p>
              <p className="border-t border-black pt-1">Prevzal(a) – {who}</p>
            </div>
          </>
        )}
      </PaperSheet>
    </div>
  )
}
