import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Building2, ChartColumn, Check, ChevronRight, Plus, Smartphone, Speaker, UserRound, UserRoundPen, type LucideIcon } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { ROLE_LABELS } from '@/lib/roles'
import { getSupabase } from '@/lib/supabase/client'
import { acceptInvitation, companyKeys, deleteInvitation, fetchMyInvitations } from './api'
import { useCompany } from './company-context'
import { CompanyLogo } from './CompanyLogo'
import { DemoSettings } from './DemoSettings'
import { profileComplete, usePersonalProfile } from '@/features/profile/api'
import { MyDevicesEverywhere } from '@/features/profile/MyDevicesEverywhere'
import { MyStatsCard } from '@/features/profile/MyStatsCard'
import { MyEquipmentEverywhere } from '@/features/profile/MyEquipmentEverywhere'
import { ProfileForm } from '@/features/profile/ProfileForm'

const VIEWS: { id: 'companies' | 'profile' | 'equipment' | 'devices' | 'stats'; label: string; icon: LucideIcon }[] = [
  { id: 'companies', label: 'Firmy', icon: Building2 },
  { id: 'profile', label: 'Môj profil', icon: UserRound },
  { id: 'equipment', label: 'Moja technika', icon: Speaker },
  { id: 'devices', label: 'Moje zariadenia', icon: Smartphone },
  { id: 'stats', label: 'Moje štatistiky', icon: ChartColumn },
]
type View = (typeof VIEWS)[number]['id']

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
  const profile = usePersonalProfile(user.id)
  const incomplete = profile.isSuccess && !profileComplete(profile.data)
  // Zvolená časť je v adrese (?view=profile), aby na ňu viedli odkazy z upozornení.
  const [params, setParams] = useSearchParams()
  const shown = VIEWS.filter((item) => memberships.length > 0 || item.id === 'companies' || item.id === 'profile')
  const view: View = shown.find((item) => item.id === params.get('view'))?.id ?? 'companies'
  const chooseView = (next: View) => setParams(next === 'companies' ? {} : { view: next }, { replace: true })

  return (
    <div className="flex flex-col gap-6">

      {incomplete && view !== 'profile' && (
        <button
          type="button"
          role="alert"
          onClick={() => chooseView('profile')}
          className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-left text-sm hover:bg-accent/20"
        >
          <UserRoundPen className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="flex-1">
            <span className="font-medium">Doplňte svoj profil</span> – meno a telefón stačí zadať raz, prenesú sa do všetkých vašich firiem.
          </span>
        </button>
      )}

      {view === 'profile' && (
        <section aria-labelledby="profile-heading">
          <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => chooseView('companies')}>
            <ArrowLeft className="size-4" aria-hidden />
            Späť na firmy
          </button>
          <h1 id="profile-heading" className="mb-2 text-xl font-semibold">Môj profil</h1>
          <ProfileForm userId={user.id} accountEmail={user.email ?? ''} />
        </section>
      )}
      {view === 'equipment' && (
        <section aria-labelledby="equipment-heading">
          <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => chooseView('companies')}>
            <ArrowLeft className="size-4" aria-hidden />
            Späť na firmy
          </button>
          <h1 id="equipment-heading" className="mb-2 text-xl font-semibold">Moja technika</h1>
          <MyEquipmentEverywhere userId={user.id} memberships={memberships} />
        </section>
      )}
      {view === 'devices' && (
        <section aria-labelledby="devices-heading">
          <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => chooseView('companies')}>
            <ArrowLeft className="size-4" aria-hidden />
            Späť na firmy
          </button>
          <h1 id="devices-heading" className="mb-2 text-xl font-semibold">Moje zariadenia</h1>
          <MyDevicesEverywhere userId={user.id} memberships={memberships} />
        </section>
      )}
      {view === 'stats' && (
        <section aria-labelledby="stats-heading">
          <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => chooseView('companies')}>
            <ArrowLeft className="size-4" aria-hidden />
            Späť na firmy
          </button>
          <h1 id="stats-heading" className="mb-2 text-xl font-semibold">Moje štatistiky</h1>
          <MyStatsCard userId={user.id} memberships={memberships} />
        </section>
      )}

      {view === 'companies' && pending.length > 0 && (
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

      {view === 'companies' && (
      <section aria-labelledby="companies-heading">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h1 id="companies-heading" className="text-xl font-semibold">
            Vyberte firmu
          </h1>
          <nav aria-label="Môj účet" className="flex flex-wrap gap-1.5">
            {shown
              .filter((item) => item.id !== 'companies')
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseView(item.id)}
                  className="relative inline-flex h-8 items-center gap-1.5 rounded-full border bg-surface px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <item.icon className="size-3.5" aria-hidden />
                  {item.label}
                  {item.id === 'profile' && incomplete && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-accent" aria-label="nevyplnený" />}
                </button>
              ))}
          </nav>
        </div>
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

      )}

      {view === 'companies' && (
      <div className="flex flex-col gap-3">
        <Link
          to="/company/create"
          className="flex h-11 items-center justify-center gap-2 rounded-lg border bg-surface text-sm font-medium hover:bg-muted"
        >
          <Plus className="size-4" aria-hidden />
          Vytvoriť novú firmu
        </Link>
        <DemoSettings userId={user.id} />
        <Button variant="ghost" onClick={() => void getSupabase().auth.signOut()}>
          Odhlásiť sa
        </Button>
      </div>
      )}
    </div>
  )
}
