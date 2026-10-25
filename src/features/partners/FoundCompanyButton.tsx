import { Building } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import type { Partner } from './api'

/**
 * Stav väzby na RigTrack pri firme z adresára. Založenie aj prepojenie sa volí vo formulári firmy
 * (RigTrack: nepoužívajú / už majú firmu / založiť im firmu); tu je len odkaz, ak som aj ich členom.
 */
export function FoundCompanyButton({ partner }: { partner: Partner }) {
  const navigate = useNavigate()
  const { setActive, memberships } = useCompany()
  const linked = partner.linkedCompanyId
  if (!linked) return null
  const canOpen = memberships.some((membership) => membership.companyId === linked)

  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Building className="size-4" aria-hidden />
      Majú firmu v RigTracku (prepojené).
      {canOpen && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setActive(linked)
            navigate('/settings')
          }}
        >
          Otvoriť a pozvať ich ľudí
        </Button>
      )}
    </p>
  )
}
