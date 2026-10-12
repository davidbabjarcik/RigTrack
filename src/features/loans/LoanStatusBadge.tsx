import { cn } from '@/lib/utils'
import { isOverdue, LOAN_STATUS_LABELS, type Loan } from './model'

const STYLES = {
  reserved: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  issued: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  returned: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  damaged: 'bg-red-500/15 text-red-700 dark:text-red-400',
  overdue: 'bg-red-500/15 text-red-700 dark:text-red-400',
}

export function LoanStatusBadge({ loan, today }: { loan: Pick<Loan, 'status' | 'endsOn'>; today: string }) {
  const overdue = isOverdue(loan, today)
  return (
    <span
      className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', STYLES[overdue ? 'overdue' : loan.status])}
    >
      {overdue ? 'Nevrátené po termíne' : LOAN_STATUS_LABELS[loan.status]}
    </span>
  )
}
