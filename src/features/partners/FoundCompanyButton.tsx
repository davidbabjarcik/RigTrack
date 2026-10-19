import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { companyKeys } from '@/features/companies/api'
import { useCompany } from '@/features/companies/company-context'
import { createPartnerCompany } from '@/features/companies/partnerCompany'
import { errorDetail } from '@/lib/supabase/errors'
import type { Partner } from './api'

/**
 * Partnerovi, ktorý chce RigTrack používať, založí firmu („založená nami“, bez CEO) s jeho údajmi.
 * Zakladateľ je v nej admin a pozve ich ľudí; ich ľudia potom môžu firmu prevziať.
 */
export function FoundCompanyButton({ partner }: { partner: Partner }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const userId = useAuth().session?.user.id ?? ''
  const { setActive, memberships } = useCompany()
  const found = useMutation({
    mutationFn: () => createPartnerCompany(partner.id),
    onSettled: () => Promise.all([queryClient.invalidateQueries({ queryKey: companyKeys.memberships(userId) }), queryClient.invalidateQueries({ queryKey: ['company'] })]),
  })
  // Bez migrácie 0064 väzba nie je známa – tlačidlo sa neukáže.
  if (partner.linkedCompanyId === undefined) return null
  const linked = partner.linkedCompanyId ?? found.data ?? null
  const canOpen = linked && memberships.some((membership) => membership.companyId === linked)

  if (linked) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Building className="size-4" aria-hidden />
        Majú vlastnú firmu v RigTracku (založenú nami).
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
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={found.isPending}
        onClick={() => window.confirm(`Založiť firme ${partner.name} vlastnú firmu v RigTracku? Budete v nej admin a pozvete do nej ich ľudí; údaje (IČO, DIČ, adresa) sa prenesú.`) && found.mutate()}
      >
        <Building className="size-4" aria-hidden />
        Založiť im firmu v RigTracku
      </Button>
      {found.isError && <span className="text-sm text-destructive">Nepodarilo sa. {errorDetail(found.error)}</span>}
    </div>
  )
}
