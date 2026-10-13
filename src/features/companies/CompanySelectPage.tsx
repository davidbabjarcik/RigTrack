import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Check, ChevronRight, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { ROLE_LABELS } from '@/lib/roles'
import { getSupabase } from '@/lib/supabase/client'
import { acceptInvitation, companyKeys, deleteInvitation, fetchMyInvitations } from './api'
import { useCompany } from './company-context'
import { CompanyLogo } from './CompanyLogo'

export function CompanySelectPage() {
  const { session } = useAuth()
  const { memberships, active, loading, setActive } = useCompany()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = session!.user

  const invitations = useQuery({
    queryKey: companyKeys.myInvitations(user.id),
    queryFn: () => fetchMyInvitations(user.email!),
  })

  function choose(companyId: string) {
    setActive(companyId)
    navigate('/')
  }

  const accept = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: async (companyId) => {
      await queryClient.invalidateQueries({ queryKey: companyKeys.memberships(user.id) })
      await queryClient.invalidateQueries({ queryKey: companyKeys.myInvitations(user.id) })
      choose(companyId)
    },
  })

  const decline = useMutation({
    mutationFn: deleteInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyKeys.myInvitations(user.id) }),
  })

  const pending = invitations.data ?? []

  return (
    <div className="flex flex-col gap-6">
      {pending.length > 0 && (
        <section aria-labelledby="invitations-heading">
          <h2 id="invitations-heading" className="mb-2 text-sm font-medium text-muted-foreground">
            Pozvánky
          </h2>
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {pending.map((invitation) => (
              <li key={invitation.id} className="flex flex-col gap-3 p-4">
                <div>
                  <p className="font-medium">{invitation.companyName}</p>
                  <p className="text-sm text-muted-foreground">Rola: {ROLE_LABELS[invitation.role]}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={accept.isPending} onClick={() => accept.mutate(invitation.id)}>
                    Prijať
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={decline.isPending}
                    onClick={() => decline.mutate(invitation.id)}
                  >
                    Odmietnuť
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {(accept.isError || decline.isError) && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              Operácia zlyhala. Skúste to znova.
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="companies-heading">
        <h1 id="companies-heading" className="mb-2 text-xl font-semibold">
          Vyberte firmu
        </h1>
        {loading ? (
          <p className="text-sm text-muted-foreground">Načítavam…</p>
        ) : memberships.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-surface p-6 text-center text-sm text-muted-foreground">
            Zatiaľ nie ste členom žiadnej firmy. Vytvorte novú, alebo požiadajte admina vašej firmy o pozvánku na adresu{' '}
            <span className="font-medium text-foreground">{user.email}</span>.
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
            {memberships.map((membership) => (
              <li key={membership.companyId}>
                <button
                  type="button"
                  onClick={() => choose(membership.companyId)}
                  className="flex min-h-16 w-full items-center gap-3 px-4 text-left hover:bg-muted"
                >
                  <CompanyLogo
                    companyId={membership.companyId}
                    className="size-10"
                    fallback={
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Building2 className="size-5 text-muted-foreground" aria-hidden />
                      </span>
                    }
                  />
                  <span className="flex-1">
                    <span className="block font-medium">{membership.companyName}</span>
                    <span className="block text-sm text-muted-foreground">{ROLE_LABELS[membership.role]}</span>
                  </span>
                  {membership.companyId === active?.companyId ? (
                    <Check className="size-5 text-accent" aria-label="Aktívna firma" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-3">
        <Link
          to="/company/create"
          className="flex h-11 items-center justify-center gap-2 rounded-lg border bg-surface text-sm font-medium hover:bg-muted"
        >
          <Plus className="size-4" aria-hidden />
          Vytvoriť novú firmu
        </Link>
        <Button variant="ghost" onClick={() => void getSupabase().auth.signOut()}>
          Odhlásiť sa
        </Button>
      </div>
    </div>
  )
}
