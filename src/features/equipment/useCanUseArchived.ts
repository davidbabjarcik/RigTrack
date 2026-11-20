import { useCompany } from '@/features/companies/company-context'
import { useMembers } from '@/features/companies/useMembers'

/**
 * Smie dať archívnu techniku na event alebo výpožičku: CEO firmy, a vo firme bez CEO admin.
 * Rovnaké pravidlo stráži aj databáza (0175).
 */
export function useCanUseArchived(companyId: string) {
  const role = useCompany().active?.role
  const members = useMembers(companyId)
  if (role === 'ceo') return true
  return role === 'admin' && Boolean(members.data) && !members.data!.some((member) => member.role === 'ceo')
}
