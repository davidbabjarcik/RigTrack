import { ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, todayIso } from '@/lib/format'
import { canEditInventory } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { LoanStatusBadge } from './LoanStatusBadge'
import { isOpen, sortLoans } from './model'
import { useLoans } from './useLoans'

function piecesLabel(count: number) {
  if (count === 1) return '1 kus'
  if (count >= 2 && count <= 4) return `${count} kusy`
  return `${count} kusov`
}

export function LoansListPage() {
  const company = useCompany().active!
  const canEdit = canEditInventory(company.role)
  const loans = useLoans(company.companyId)
  const [showClosed, setShowClosed] = useState(false)
  const today = todayIso()

  const all = sortLoans(loans.data ?? [], today)
  const open = all.filter(isOpen)
  const visible = showClosed ? all : open

  return (
    <>
      <PageHeader
        title="Výpožičky"
        description="Rezervácie a vydaná technika"
        action={
          canEdit && (
            <LinkButton to="/loans/new">
              <Plus className="size-4" aria-hidden />
              Nová
            </LinkButton>
          )
        }
      />

      <div className="mb-4 flex gap-2" role="group" aria-label="Filter výpožičiek">
        {[
          { closed: false, label: `Otvorené (${open.length})` },
          { closed: true, label: `Všetky (${all.length})` },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={showClosed === option.closed}
            onClick={() => setShowClosed(option.closed)}
            className={cn(
              'h-9 rounded-lg border px-3 text-sm font-medium',
              showClosed === option.closed ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loans.isPending ? (
        <LoadingBlock />
      ) : loans.isError ? (
        <ErrorBlock message="Výpožičky sa nepodarilo načítať." onRetry={() => void loans.refetch()} />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">{all.length === 0 ? 'Zatiaľ tu nie je žiadna výpožička' : 'Žiadna otvorená výpožička'}</p>
          {canEdit && all.length === 0 && <p className="mt-1 text-sm text-muted-foreground">Začnite tlačidlom Nová.</p>}
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {visible.map((loan) => (
            <li key={loan.id}>
              <Link to={`/loans/${loan.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{loan.borrower}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {formatDate(loan.startsOn)} – {formatDate(loan.endsOn)} ·{' '}
                    {piecesLabel(loan.items.reduce((sum, item) => sum + item.quantity, 0))}
                  </span>
                </span>
                <LoanStatusBadge loan={loan} today={today} />
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
