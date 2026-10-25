import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Building2, CalendarDays, ChartColumn, Check, ChevronRight, Pin, Smartphone, Speaker, UserRound, UserRoundPen, type LucideIcon } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/auth-context'
import { ROLE_LABELS } from '@/lib/roles'
import { getSupabase } from '@/lib/supabase/client'
import { acceptInvitation, companyKeys, deleteInvitation, fetchMyInvitations } from './api'
import { useCompany } from './company-context'
import { CompanyLogo } from './CompanyLogo'
import { demoKeys, fetchMyDemo } from './demo'
import { DemoSettings } from './DemoSettings'
import { NewCompanyButton } from './NewCompanyButton'
import { useCompanyPins } from './pins'
import { profileComplete, usePersonalProfile } from '@/features/profile/api'
import { MyCalendar } from '@/features/profile/MyCalendarView'
import { MyDevicesEverywhere } from '@/features/profile/MyDevicesEverywhere'
import { MyStatsCard } from '@/features/profile/MyStatsCard'
import { MyEquipmentEverywhere } from '@/features/profile/MyEquipmentEverywhere'
import { ProfileForm } from '@/features/profile/ProfileForm'
import { ProfilePhoto } from '@/features/profile/ProfilePhoto'

const VIEWS: { id: 'companies' | 'profile' | 'calendar' | 'equipment' | 'devices' | 'stats'; label: string; hint: string; icon: LucideIcon }[] = [
  { id: 'companies', label: 'Firmy', hint: '', icon: Building2 },
  { id: 'profile', label: 'Môj profil', hint: 'Meno, fotka, kontakty', icon: UserRound },
  { id: 'calendar', label: 'Môj kalendár', hint: 'Akcie zo všetkých firiem', icon: CalendarDays },
  { id: 'equipment', label: 'Moja technika', hint: 'Vo všetkých firmách', icon: Speaker },
  { id: 'devices', label: 'Moje zariadenia', hint: 'Mobil, notebook, MAC', icon: Smartphone },
  { id: 'stats', label: 'Moje štatistiky', hint: 'Akcie, hodiny, odmeny', icon: ChartColumn },
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
  const demo = useQuery({ queryKey: demoKeys.mine(user.id), queryFn: fetchMyDemo })
  const realCompanies = memberships.filter((item) => item.companyId !== demo.data).length
  // Pripnuté firmy sú hore – pri účte, rovnaké na každom zariadení.
  const { pins, toggle: togglePin } = useCompanyPins(user.id)
  const sortedMemberships = [...memberships].sort((a, b) => Number(pins.includes(b.companyId)) - Number(pins.includes(a.companyId)))

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
          <h1 id="profile-heading" className="mb-3 text-2xl font-semibold">Môj profil</h1>
          <div className="grid items-start gap-4 md:grid-cols-[15rem_1fr]">
            <ProfilePhoto userId={user.id} memberships={memberships} />
            <ProfileForm userId={user.id} accountEmail={user.email ?? ''} />
          </div>
        </section>
      )}
      {view === 'calendar' && (
        <section aria-labelledby="calendar-heading">
          <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => chooseView('companies')}>
            <ArrowLeft className="size-4" aria-hidden />
            Späť na firmy
          </button>
          <h1 id="calendar-heading" className="mb-3 text-2xl font-semibold">Môj kalendár</h1>
          <MyCalendar userId={user.id} memberships={memberships} />
        </section>
      )}
      {view === 'equipment' && (
        <section aria-labelledby="equipment-heading">
          <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => chooseView('companies')}>
            <ArrowLeft className="size-4" aria-hidden />
            Späť na firmy
          </button>
          <h1 id="equipment-heading" className="mb-3 text-2xl font-semibold">Moja technika</h1>
          <MyEquipmentEverywhere userId={user.id} memberships={memberships} />
        </section>
      )}
      {view === 'devices' && (
        <section aria-labelledby="devices-heading">
          <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => chooseView('companies')}>
            <ArrowLeft className="size-4" aria-hidden />
            Späť na firmy
          </button>
          <h1 id="devices-heading" className="mb-3 text-2xl font-semibold">Moje zariadenia</h1>
          <MyDevicesEverywhere userId={user.id} memberships={memberships} />
        </section>
      )}
      {view === 'stats' && (
        <section aria-labelledby="stats-heading">
          <button type="button" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => chooseView('companies')}>
            <ArrowLeft className="size-4" aria-hidden />
            Späť na firmy
          </button>
          <h1 id="stats-heading" className="mb-3 text-2xl font-semibold">Moje štatistiky</h1>
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
        <h1 id="companies-heading" className="mb-3 text-2xl font-semibold">
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
          <ul className="grid gap-3 sm:grid-cols-2">
            {sortedMemberships.map((membership) => (
              <li key={membership.companyId} className="relative">
                <button
                  type="button"
                  onClick={() => choose(membership.companyId)}
                  className={cn(
                    'flex min-h-20 w-full items-center gap-4 rounded-xl border bg-surface px-4 text-left transition-colors hover:bg-muted',
                    membership.companyId === active?.companyId && 'border-accent/60',
                  )}
                >
                  <CompanyLogo
                    companyId={membership.companyId}
                    className="size-12"
                    fallback={
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="size-5 text-muted-foreground" aria-hidden />
                      </span>
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium">{membership.companyName}</span>
                    <span className="block text-sm text-muted-foreground">{ROLE_LABELS[membership.role]}</span>
                  </span>
                  {membership.companyId === active?.companyId ? (
                    <Check className="size-5 text-accent" aria-label="Aktívna firma" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  )}
                  {/* Miesto pre tlačidlo pripnutia. */}
                  <span className="w-7" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => togglePin(membership.companyId)}
                  aria-pressed={pins.includes(membership.companyId)}
                  aria-label={pins.includes(membership.companyId) ? `Odopnúť ${membership.companyName}` : `Pripnúť ${membership.companyName} hore`}
                  title={pins.includes(membership.companyId) ? 'Odopnúť' : 'Pripnúť hore'}
                  className={cn(
                    'absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 hover:bg-muted',
                    pins.includes(membership.companyId) ? 'text-accent' : 'text-muted-foreground/60 hover:text-foreground',
                  )}
                >
                  <Pin className={cn('size-4', pins.includes(membership.companyId) && 'fill-current')} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      )}

      {view === 'companies' && (
        <nav aria-label="Môj účet">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Môj účet – platí vo všetkých firmách</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {shown
              .filter((item) => item.id !== 'companies')
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseView(item.id)}
                  className="relative flex items-center gap-3 rounded-xl border bg-surface p-3 text-left transition-colors hover:bg-muted sm:p-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.hint}</span>
                  </span>
                  {item.id === 'profile' && incomplete && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-accent" aria-label="nevyplnený" />}
                </button>
              ))}
          </div>
        </nav>
      )}

      {view === 'companies' && (
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <NewCompanyButton userId={user.id} />
        <Button variant="ghost" className="sm:ml-auto" onClick={() => void getSupabase().auth.signOut()}>
          Odhlásiť sa
        </Button>
        <div className="w-full">
          <DemoSettings userId={user.id} realCompanies={realCompanies} />
        </div>
      </div>
      )}
    </div>
  )
}
