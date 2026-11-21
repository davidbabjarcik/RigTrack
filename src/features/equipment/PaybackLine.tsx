import { useEvents } from '@/features/events/useEvents'
import { useLoans } from '@/features/loans/useLoans'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import type { Equipment } from './model'
import { payback } from './payback'

/** Riadok „Návratnosť“ v detaile techniky: odhad zárobku podľa cenníka oproti nákupnej cene. */
export function PaybackLine({ companyId, equipment }: { companyId: string; equipment: Equipment }) {
  const events = useEvents(companyId)
  const loans = useLoans(companyId)
  if (!events.data || !loans.data) return null
  const result = payback(equipment, events.data, loans.data, todayIso())
  if (!result.priced) return <span className="text-muted-foreground">{tx('Doplňte cenu prenájmu, aby sa dala odhadnúť.')}</span>
  const money = (value: number) => formatMoney(value, 'EUR')
  return (
    <span>
      {tf('zarobila odhadom {0} (eventy: {1}, výpožičky: {2})', money(result.earned), result.eventCount, result.loanCount)}
      {result.paidOn ? (
        <span className="text-emerald-700 dark:text-emerald-400">{tf(' · splatila sa {0}', formatDate(result.paidOn))}</span>
      ) : result.percent !== null ? (
        <span className="text-muted-foreground">{tf(' · {0} % nákupnej ceny, chýba {1}', result.percent, money(result.missing))}</span>
      ) : null}
    </span>
  )
}
