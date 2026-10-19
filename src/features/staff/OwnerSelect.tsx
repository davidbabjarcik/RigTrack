import type { SelectHTMLAttributes } from 'react'
import { SelectField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { useStaff } from './useStaff'

/**
 * Komu technika patrí: firme, alebo zamestnancovi (jeho vlastná). Člen bez karty zamestnanca má hodnotu
 * „m-<id>“ a karta sa mu založí pri uložení – za iného to smie len správca tímu.
 */
export function OwnerSelect({ companyId, error, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { companyId: string; error?: string }) {
  const company = useCompany().active!
  const userId = useAuth().session?.user.id
  const staff = useStaff(companyId)
  const canManage = can(company, 'staff.manage')
  const people = staff.people.filter((person) => person.active && (person.staffId || person.memberId === userId || canManage))

  // Select sa zaregistruje do formulára až s načítanými možnosťami, inak by neukázal uloženú hodnotu.
  if (staff.isPending) {
    return (
      <SelectField label="Vlastník" disabled>
        <option>Načítavam…</option>
      </SelectField>
    )
  }
  return (
    <SelectField label="Vlastník" error={error} {...props}>
      <option value="">Firma ({company.companyName})</option>
      {people.map((person) => (
        <option key={person.key} value={person.staffId ?? `m-${person.memberId}`}>
          {person.name} (vlastná technika)
        </option>
      ))}
    </SelectField>
  )
}
