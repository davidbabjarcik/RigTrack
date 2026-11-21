import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { fetchChecksBy } from '@/features/cases/api'
import { missingCount } from '@/features/cases/checkItems'
import { caseTitle } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { fetchWarehouse, warehouseKeys } from '@/features/warehouse/api'
import { formatDateTime } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'

/** Ktoré cases člen kontroloval, kedy, kde stoja v sklade a či niečo chýbalo (posledných 30). */
export function StaffCaseChecks({ companyId, memberId }: { companyId: string; memberId: string }) {
  const checks = useQuery({ queryKey: ['company', companyId, 'case-checks-by', memberId], queryFn: () => fetchChecksBy(companyId, memberId), retry: false })
  const cases = useCases(companyId)
  const plan = useQuery({ queryKey: warehouseKeys.plan(companyId), queryFn: () => fetchWarehouse(companyId), retry: false })
  if (!checks.data || checks.data.length === 0) return null
  const caseOf = (id: string) => cases.data?.find((item) => item.id === id)
  const spotOf = (spotId: string | null) => (spotId ? plan.data?.spots.find((spot) => spot.id === spotId)?.name : undefined)

  return (
    <CollapsibleSection id="staff.caseChecks" title={<span className="inline-flex items-center gap-2"><ClipboardCheck className="size-4" aria-hidden />{tf('Kontroly cases ({0})', checks.data.length)}</span>}>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {checks.data.map((check) => {
          const box = caseOf(check.caseId)
          const missing = missingCount(check.items)
          return (
            <li key={`${check.caseId}${check.checkedAt}`}>
              <Link to={`/cases/${check.caseId}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-2 text-sm hover:bg-muted">
                <span className="font-medium">{box ? caseTitle(box) : tx('Odstránený case')}</span>
                <span className="text-muted-foreground">{[formatDateTime(check.checkedAt), box && spotOf(box.spotId)].filter(Boolean).join(' · ')}</span>
                {(missing > 0 || check.note) && (
                  <span className={missing > 0 ? 'basis-full text-destructive' : 'basis-full text-muted-foreground'}>
                    {check.note || tf('Chýbalo {0} ks', missing)}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </CollapsibleSection>
  )
}
