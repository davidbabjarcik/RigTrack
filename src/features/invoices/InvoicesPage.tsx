import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useInvoices } from './api'
import { INVOICE_KIND_LABELS, invoiceState, STATE_LABELS } from './model'

const STATE_TONE = {
  open: 'bg-muted text-foreground',
  overdue: 'bg-destructive/15 text-destructive',
  paid: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  cancelled: 'bg-muted text-muted-foreground line-through',
} as const

/** Vystavené faktúry: čo je nezaplatené, po splatnosti a zaplatené. */
export function InvoicesPage() {
  const company = useCompany().active!
  const invoices = useInvoices(company.companyId)
  const today = todayIso()
  const [filter, setFilter] = useState<'all' | 'unpaid'>('unpaid')
  const all = invoices.data ?? []
  const unpaid = all.filter((invoice) => ['open', 'overdue'].includes(invoiceState(invoice, today)))
  const shown = filter === 'unpaid' ? unpaid : all
  const owed = unpaid.reduce((sum, invoice) => sum + invoice.total, 0)

  return (
    <>
      <PageHeader
        title={tx('Faktúry')}
        description={unpaid.length > 0 ? tf('Nezaplatené: {0} ({1})', unpaid.length, formatMoney(owed, 'EUR')) : undefined}
        action={
          can(company, 'offers.edit') && (
            <LinkButton to="/invoices/new">
              <Plus className="size-4" aria-hidden />{tx('Nová faktúra')}</LinkButton>
          )
        }
      />
      <div className="mb-4 flex gap-2" role="group" aria-label={tx('Filter')}>
        {(['unpaid', 'all'] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
            className={cn('h-9 rounded-lg border px-3 text-sm font-medium', filter === option ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
          >
            {option === 'unpaid' ? tx('Nezaplatené') : tx('Všetky')}
          </button>
        ))}
      </div>
      {invoices.isPending ? (
        <LoadingBlock />
      ) : invoices.isError ? (
        <ErrorBlock message={tx('Faktúry sa nepodarilo načítať. Táto časť databázy ešte nemusí byť pripravená (migrácia 0185).')} />
      ) : shown.length === 0 ? (
        <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">
          {filter === 'unpaid' ? tx('Žiadne nezaplatené faktúry.') : tx('Zatiaľ žiadne faktúry. Vystavíte ich z prijatej cenovej ponuky alebo cez „Nová faktúra“.')}
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {shown.map((invoice) => {
            const state = invoiceState(invoice, today)
            return (
              <li key={invoice.id}>
                <Link to={`/invoices/${invoice.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{invoice.client.name || tx('Bez odberateľa')}</span>
                    <span className="block text-sm text-muted-foreground">
                      {[`${tx(INVOICE_KIND_LABELS[invoice.kind])} ${invoice.number}`, tf('splatná {0}', formatDate(invoice.dueOn))].join(' · ')}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">{formatMoney(invoice.total, 'EUR')}</span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATE_TONE[state])}>{tx(STATE_LABELS[state])}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
