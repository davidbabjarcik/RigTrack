import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { CheckLevelsSettings } from '@/features/checks/CheckLevelsSettings'
import { bugKeys, fetchIsDeveloper } from '@/features/bugs/api'
import { LinksSettings } from '@/features/links/LinksSettings'
import { MigrationStatus } from '@/features/companies/MigrationStatus'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { InstallGuide } from '@/components/feedback/InstallGuide'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import {
  accountStatusKey,
  companyKeys,
  deleteInvitation,
  fetchAccountStatus,
  fetchInvitations,
  fetchMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  type AccountStatus,
} from '@/features/companies/api'
import { BackupSettings } from '@/features/backup/BackupSettings'
import { CaseTemplateSettings } from '@/features/cases/CaseTemplateSettings'
import { StageSettings } from '@/features/stage/StageSettings'
import { RulesSettings } from '@/features/events/RulesSettings'
import { PackagesSettings } from '@/features/packages/PackagesSettings'
import { useCompany, type Membership } from '@/features/companies/company-context'
import { BrandingSettings } from '@/features/companies/BrandingSettings'
import { CompanyRequestsAdmin } from '@/features/companies/CompanyRequestsAdmin'
import { CompanyProfileSettings } from '@/features/companies/CompanyProfileSettings'
import { DeleteCompanySettings } from '@/features/companies/DeleteCompanySettings'
import { DemoSettings } from '@/features/companies/DemoSettings'
import { MyDevicesSettings } from '@/features/devices/MyDevicesSettings'
import { AttendanceSettings } from '@/features/attendance/MyAttendance'
import { PushSettings } from '@/features/push/PushSettings'
import { CheckUpdateButton } from '@/components/feedback/CheckUpdateButton'
import { CompanyIssuersSettings } from '@/features/offers/CompanyIssuersSettings'
import { PushSetupGuide } from '@/features/push/PushSetupGuide'
import { DemoInvitesAdmin } from '@/features/companies/DemoInvitesAdmin'
import { ResponsibilitiesSettings } from '@/features/responsibilities/ResponsibilitiesSettings'
import { DutySettings } from '@/features/duties/DutySettings'
import { EmailPrefs } from '@/features/news/EmailPrefs'
import { LookupSettings } from '@/features/equipment/LookupSettings'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { PermissionsSettings } from '@/features/permissions/PermissionsSettings'
import { can } from '@/lib/permissions'
import { isAdminRole, ROLE_LABELS, ROLES, type Role } from '@/lib/roles'
import { PriorityColorsSettings } from '@/features/tasks/PriorityColorsSettings'
import { getSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { APP_VERSION } from '@/lib/version'
import { formatDateTime } from '@/lib/format'

/** Sekcia Nastavení – dá sa zbaliť; prehliadač si pamätá, čo máte zbalené. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <CollapsibleSection id={`settings.${title}`} title={title} className="mb-8">
      {children}
    </CollapsibleSection>
  )
}

/** Stav účtu člena alebo pozvaného: kto už má účet, potvrdil e-mail a kedy sa naposledy prihlásil. */
function useAccountStatus(company: Membership) {
  const status = useQuery({
    queryKey: accountStatusKey(company.companyId),
    queryFn: () => fetchAccountStatus(company.companyId),
    enabled: isAdminRole(company.role),
    retry: false,
  })
  return (email: string) => status.data?.find((item) => item.email === email.toLowerCase())
}

function AccountBadge({ status, invitation }: { status: AccountStatus | undefined; invitation?: boolean }) {
  if (!status) return null
  const [tone, text] = !status.hasAccount
    ? ['bg-muted text-muted-foreground', 'ešte nemá účet']
    : !status.confirmed
      ? ['bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200', 'účet bez potvrdeného e-mailu']
      : invitation
        ? ['bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200', 'má účet, pozvánku ešte neprijal']
        : status.lastSignInAt
          ? ['bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', `naposledy ${formatDateTime(status.lastSignInAt)}`]
          : ['bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200', 'má účet']
  return <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', tone)}>{text}</span>
}

function RoleOptions() {
  return ROLES.map((role) => (
    <option key={role} value={role}>
      {ROLE_LABELS[role]}
    </option>
  ))
}

function PermissionsSection({ companyId }: { companyId: string }) {
  const members = useQuery({ queryKey: companyKeys.members(companyId), queryFn: () => fetchMembers(companyId) })
  return <PermissionsSettings companyId={companyId} members={members.data ?? []} />
}

function Members({ company, userId }: { company: Membership; userId: string }) {
  const queryClient = useQueryClient()
  const isAdmin = isAdminRole(company.role)
  const key = companyKeys.members(company.companyId)
  const members = useQuery({ queryKey: key, queryFn: () => fetchMembers(company.companyId) })
  const statusOf = useAccountStatus(company)

  // Zmena vlastnej roly alebo odchod mení aj zoznam mojich firiem.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: companyKeys.memberships(userId) }),
    ])

  const changeRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: Role }) =>
      updateMemberRole(company.companyId, memberId, role),
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: (memberId: string) => removeMember(company.companyId, memberId),
    onSettled: refresh,
  })

  if (members.isPending) return <p className="text-sm text-muted-foreground">Načítavam…</p>
  if (members.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Členov sa nepodarilo načítať.
      </p>
    )
  }

  return (
    <>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {members.data.map((member) => (
          <li key={member.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {member.fullName || member.email}
                {member.userId === userId && <span className="text-muted-foreground"> (vy)</span>}
              </p>
              {member.fullName && <p className="truncate text-sm text-muted-foreground">{member.email}</p>}
              <AccountBadge status={statusOf(member.email)} />
            </div>
            {isAdmin ? (
              <>
                <SelectField
                  label={`Rola: ${member.email}`}
                  hideLabel
                  className="w-40"
                  value={member.role}
                  disabled={changeRole.isPending}
                  onChange={(e) => changeRole.mutate({ memberId: member.userId, role: e.target.value as Role })}
                >
                  <RoleOptions />
                </SelectField>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Odobrať: ${member.email}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm(`Odobrať ${member.email} z firmy?`)) remove.mutate(member.userId)
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">{ROLE_LABELS[member.role]}</span>
            )}
          </li>
        ))}
      </ul>
      {(changeRole.isError || remove.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zmena sa nepodarila. Firma musí mať vždy aspoň jedného admina.
        </p>
      )}
    </>
  )
}

function Invitations({ company }: { company: Membership }) {
  const queryClient = useQueryClient()
  const key = companyKeys.invitations(company.companyId)
  const invitations = useQuery({ queryKey: key, queryFn: () => fetchInvitations(company.companyId) })
  const statusOf = useAccountStatus(company)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('viewer')

  const invite = useMutation({
    mutationFn: () => inviteMember(company.companyId, email, role),
    onSuccess: () => {
      setEmail('')
      return queryClient.invalidateQueries({ queryKey: key })
    },
  })
  const cancel = useMutation({
    mutationFn: deleteInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    invite.mutate()
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-3 flex flex-col gap-3 rounded-xl border bg-surface p-4 sm:flex-row sm:items-end">
        <Field
          label="E-mail"
          type="email"
          required
          className="flex-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <SelectField label="Rola" className="sm:w-44" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <RoleOptions />
        </SelectField>
        <Button type="submit" disabled={invite.isPending}>
          Pozvať
        </Button>
      </form>
      {invite.isError && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          Pozvánku sa nepodarilo vytvoriť. Možno už pre tento e-mail existuje.
        </p>
      )}
      <p className="mb-3 text-sm text-muted-foreground">
        Pozvánka sa neposiela e-mailom. Pozvaný ju uvidí po prihlásení do RigTracku účtom s touto adresou. Pri každej pozvánke vidíte,
        či si človek už účet vytvoril.
      </p>
      {invitations.data && invitations.data.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {invitations.data.map((invitation) => (
            <li key={invitation.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate">{invitation.email}</span>
                <AccountBadge status={statusOf(invitation.email)} invitation />
              </span>
              <span className="text-sm text-muted-foreground">{ROLE_LABELS[invitation.role]}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Zrušiť pozvánku: ${invitation.email}`}
                disabled={cancel.isPending}
                onClick={() => cancel.mutate(invitation.id)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function InventoryLookups({ companyId }: { companyId: string }) {
  const { categories, locations } = useEquipmentLookups(companyId)
  return (
    <>
      <Section title="Kategórie techniky">
        <LookupSettings companyId={companyId} table="equipment_categories" items={categories} noun="kategóriu" />
        <p className="mt-2 text-sm text-muted-foreground">
          Tovar v kategórii označenej ako spotrebný materiál (viazačky, konektory…) sa pri objednávke nepridáva do techniky,
          eviduje sa len jeho nákup a cena.
        </p>
      </Section>
      <Section title="Umiestnenia">
        <LookupSettings companyId={companyId} table="locations" items={locations} noun="umiestnenie" />
      </Section>
      <Section title="Šablóny cases">
        <CaseTemplateSettings companyId={companyId} />
      </Section>
    </>
  )
}

export function SettingsPage() {
  const { session } = useAuth()
  const { active } = useCompany()
  const user = session!.user
  const company = active!

  const isAdmin = isAdminRole(company.role)
  const isDeveloper = useQuery({ queryKey: bugKeys.developer, queryFn: fetchIsDeveloper, retry: false, staleTime: 10 * 60_000 }).data === true
  const tabs = [
    { id: 'company', label: 'Firma', shown: true },
    { id: 'members', label: 'Členovia', shown: true },
    { id: 'permissions', label: 'Oprávnenia', shown: isAdmin },
    { id: 'lists', label: 'Zoznamy', shown: can(company, 'lookups.manage') },
    { id: 'stage', label: 'Nivtec', shown: can(company, 'lookups.manage') },
    { id: 'packages', label: 'Balíky', shown: can(company, 'lookups.manage') },
    { id: 'reminders', label: 'Pripomienky', shown: can(company, 'lookups.manage') },
    { id: 'account', label: 'Účet', shown: true },
    { id: 'developer', label: 'Vývojár', shown: isDeveloper },
  ].filter((tab) => tab.shown)
  // Záložka je v adrese, aby sa na ňu dalo odkázať a aby ju prežilo obnovenie stránky.
  const [params, setParams] = useSearchParams()
  const tab = tabs.find((item) => item.id === params.get('tab'))?.id ?? 'company'

  return (
    <>
      <PageHeader title="Nastavenia" description="Firma, členovia a účet" />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Časti nastavení">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setParams(item.id === 'company' ? {} : { tab: item.id }, { replace: true })}
            className={cn(
              'h-9 shrink-0 rounded-lg border px-3 text-sm font-medium',
              tab === item.id ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'company' && (
        <>
          <Section title="Firma">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-surface p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{company.companyName}</p>
                <p className="text-sm text-muted-foreground">Vaša rola: {ROLE_LABELS[company.role]}</p>
              </div>
              <Link to="/company/select" className="shrink-0 text-sm font-medium text-accent hover:underline">
                Zmeniť firmu
              </Link>
            </div>
          </Section>

          <Section title="Údaje o firme a sklad">
            <CompanyProfileSettings companyId={company.companyId} canEdit={isAdmin} />
          </Section>

          {isAdmin && (
            <Section title="Vystavovanie ponúk – s.r.o. / živnosť">
              <CompanyIssuersSettings companyId={company.companyId} />
            </Section>
          )}

          {isAdmin && (
            <Section title="Logo a štítky na cases">
              <BrandingSettings companyId={company.companyId} />
            </Section>
          )}

          {isAdmin && (
            <Section title="Prepojené firmy">
              <LinksSettings companyId={company.companyId} />
            </Section>
          )}


          {isAdmin && (
            <Section title="Import a export">
              <BackupSettings companyId={company.companyId} companyName={company.companyName} />
            </Section>
          )}

          {isAdmin && (
            <Section title="Kôš">
              <Link to="/admin/recycle-bin" className="flex items-center justify-between gap-3 rounded-xl border bg-surface p-4 hover:bg-muted">
                <span>
                  <span className="block font-medium">Zmazané záznamy</span>
                  <span className="block text-sm text-muted-foreground">Technika, cases, fotky a dokumenty sa dajú 30 dní obnoviť</span>
                </span>
                <span className="shrink-0 text-sm font-medium text-accent">Otvoriť</span>
              </Link>
            </Section>
          )}

          {can(company, 'audit.view') && (
            <Section title="História zmien">
              <Link to="/audit" className="flex items-center justify-between gap-3 rounded-xl border bg-surface p-4 hover:bg-muted">
                <span>
                  <span className="block font-medium">Kto, kedy a čo zmenil</span>
                  <span className="block text-sm text-muted-foreground">Technika, cases, výpožičky, objednávky, vozidlá, servis a eventy</span>
                </span>
                <span className="shrink-0 text-sm font-medium text-accent">Otvoriť</span>
              </Link>
            </Section>
          )}

          {isAdmin && (
            <Section title="Nebezpečná zóna">
              <DeleteCompanySettings userId={user.id} />
            </Section>
          )}
        </>
      )}

      {tab === 'members' && (
        <>
          <Section title="Členovia">
            <Members company={company} userId={user.id} />
          </Section>
          {isAdmin && (
            <Section title="Pozvánky">
              <Invitations company={company} />
            </Section>
          )}
        </>
      )}

      {tab === 'permissions' && (
        <Section title="Oprávnenia">
          <PermissionsSection companyId={company.companyId} />
        </Section>
      )}
      {tab === 'permissions' && (
        <Section title="Zodpovedné osoby">
          <ResponsibilitiesSettings companyId={company.companyId} />
        </Section>
      )}

      {tab === 'lists' && <InventoryLookups companyId={company.companyId} />}

      {tab === 'packages' && (
        <Section title="Balíky techniky">
          <PackagesSettings companyId={company.companyId} />
        </Section>
      )}

      {tab === 'reminders' && (
        <Section title="Pripomienky pri eventoch">
          <RulesSettings companyId={company.companyId} />
        </Section>
      )}

      {tab === 'reminders' && isAdmin && (
        <Section title="Činnosti pri eventoch (nakladanie, kontrola hliníka…)">
          <DutySettings companyId={company.companyId} />
        </Section>
      )}

      {tab === 'reminders' && isAdmin && (
        <Section title="Úrovne kontroly (cases, prevádzkové hodiny)">
          <CheckLevelsSettings companyId={company.companyId} />
        </Section>
      )}

      {tab === 'stage' && (
        <Section title="Pódium Nivtec">
          <StageSettings companyId={company.companyId} />
        </Section>
      )}

      {tab === 'developer' && isDeveloper && (
        <>
          <Section title="Stav databázy">
            <MigrationStatus />
          </Section>
          <Section title="Push upozornenia – nastavenie (raz pre appku)">
            <PushSetupGuide email={user.email ?? ''} />
          </Section>
          <Section title="Pozvať len do dema">
            <DemoInvitesAdmin />
          </Section>
          <Section title="Žiadosti o novú firmu">
            <CompanyRequestsAdmin />
          </Section>
        </>
      )}

      {tab === 'account' && (
        <>
          <Section title="Účet">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-surface p-4">
              <p className="min-w-0 truncate">{user.email}</p>
              <Button variant="outline" size="sm" onClick={() => void getSupabase().auth.signOut()}>
                Odhlásiť sa
              </Button>
            </div>
          </Section>
          <Section title="Farby priorít úloh">
            <PriorityColorsSettings />
          </Section>
          <Section title="Upozornenia na mobil">
            <PushSettings userId={user.id} />
          </Section>
          <Section title="Dochádzka">
            <AttendanceSettings companyId={company.companyId} />
          </Section>
          <Section title={`Moje zariadenia (${company.companyName})`}>
            <MyDevicesSettings companyId={company.companyId} userId={user.id} />
          </Section>
          {isAdminRole(company.role) && (
            <Section title="E-mailové upozornenia">
              <EmailPrefs companyId={company.companyId} />
            </Section>
          )}
          <Section title="Aplikácia na ploche">
            <InstallGuide />
          </Section>
          <Section title="Demo">
            <DemoSettings userId={user.id} />
          </Section>
          <Section title="O aplikácii">
            <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4 text-sm">
              <p>
                RigTrack <strong>verzia {APP_VERSION}</strong>
              </p>
              <CheckUpdateButton />
            </div>
          </Section>
        </>
      )}
    </>
  )
}
