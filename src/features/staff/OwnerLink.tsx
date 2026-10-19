import { UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useStaff } from './useStaff'

/** „Patrí: Jano“ – odkaz na kartu zamestnanca, ktorému technika alebo case patrí. Pri firemnej veci nič. */
export function OwnerLink({ companyId, staffId, className }: { companyId: string; staffId: string | null | undefined; className?: string }) {
  const staff = useStaff(companyId)
  if (!staffId) return null
  const person = staff.people.find((candidate) => candidate.staffId === staffId)
  if (!person) return null
  return (
    <Link to={`/staff/${person.key}`} className={cn('inline-flex items-center gap-1 text-sm text-accent hover:underline', className)}>
      <UserRound className="size-4" aria-hidden />
      Patrí: {person.name} (vlastná technika)
    </Link>
  )
}
