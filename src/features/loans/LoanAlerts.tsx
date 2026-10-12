import { ArrowLeftRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate, todayIso } from '@/lib/format'
import { isAwaitingIssue, isOverdue } from './model'
import { useLoans } from './useLoans'

/** Upozornenie na prehľade: nevrátená technika po termíne a rezervácie, ktoré už mali byť vydané. */
export function LoanAlerts({ companyId }: { companyId: string }) {
  const loans = useLoans(companyId)
  const today = todayIso()
  const overdue = (loans.data ?? []).filter((loan) => isOverdue(loan, today))
  const waiting = (loans.data ?? []).filter((loan) => isAwaitingIssue(loan, today))
  if (overdue.length + waiting.length === 0) return null

  return (
    <section aria-labelledby="loan-alerts-heading" className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <h2 id="loan-alerts-heading" className="mb-2 flex items-center gap-2 font-medium">
        <ArrowLeftRight className="size-5 text-destructive" aria-hidden />
        Výpožičky na vybavenie ({overdue.length + waiting.length})
      </h2>
      <ul className="divide-y divide-destructive/20">
        {overdue.map((loan) => (
          <li key={loan.id}>
            <Link to={`/loans/${loan.id}`} className="flex items-center justify-between gap-4 py-2 hover:underline">
              <span className="min-w-0 truncate font-medium">{loan.borrower}</span>
              <span className="shrink-0 text-sm text-destructive">nevrátené, malo sa vrátiť {formatDate(loan.endsOn)}</span>
            </Link>
          </li>
        ))}
        {waiting.map((loan) => (
          <li key={loan.id}>
            <Link to={`/loans/${loan.id}`} className="flex items-center justify-between gap-4 py-2 hover:underline">
              <span className="min-w-0 truncate font-medium">{loan.borrower}</span>
              <span className="shrink-0 text-sm">rezervácia od {formatDate(loan.startsOn)} čaká na vydanie</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
