import { UserCheck } from 'lucide-react'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { cn } from '@/lib/utils'
import { responsibilitiesFor, useResponsibilities } from './api'

/** „Zodpovedá: Jano, Fero (Svetlá)“ pri case alebo technike; bez zodpovednosti sa nezobrazí. */
export function ResponsibleFor({ companyId, caseId, kinds, className }: { companyId: string; caseId?: string | null; kinds?: string[]; className?: string }) {
  const list = useResponsibilities(companyId)
  const members = useMembers(companyId)
  const matches = responsibilitiesFor(list.data ?? [], { caseId, kinds })
  if (matches.length === 0) return null
  return (
    <p className={cn('flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground', className)}>
      <UserCheck className="size-4 text-accent" aria-hidden />
      Zodpovedá:
      {matches.map((item, index) => (
        <span key={item.id}>
          <span className="font-medium text-foreground">{item.memberIds.map((id) => memberName(members.data, id)).filter(Boolean).join(', ') || 'nikto'}</span> ({item.name})
          {index < matches.length - 1 && ';'}
        </span>
      ))}
    </p>
  )
}
