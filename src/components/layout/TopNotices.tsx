import { profileComplete, usePersonalProfile } from '@/features/profile/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, FileChartColumn, Gift, Smartphone, Sparkles, UserRoundPen, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { exemptionKeys, fetchExemptions, missingDeviceKinds, useDevices } from '@/features/devices/api'
import { DEVICE_KIND_LABELS } from '@/features/devices/model'
import { markNewsRead, newsKeys, useNews } from '@/features/news/api'
import { NotificationsStrip } from '@/features/notifications/NotificationsStrip'
import { describeCelebration, upcomingCelebrations } from '@/features/staff/celebrations'
import { useStaff } from '@/features/staff/useStaff'
import { formatDateTime, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { yearReportYear } from '@/features/report/model'
import { APP_VERSION } from '@/lib/version'

/** Novinky vo firme (nový event, priradenie do posádky) s tlačidlom „prečítané“. */
function NewsBell({ companyId, userId }: { companyId: string; userId: string }) {
  const queryClient = useQueryClient()
  const news = useNews(companyId, userId)
  const [open, setOpen] = useState(false)
  const read = useMutation({
    mutationFn: () => markNewsRead(companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: newsKeys.read(companyId) }),
  })
  if (!news.ready || news.unread.length === 0) return null
  return (
    <div className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm dark:border-sky-900 dark:bg-sky-950/40">
      <div className="flex flex-wrap items-center gap-2">
        <Bell className="size-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
        <button type="button" className="flex-1 text-left font-medium" aria-expanded={open} onClick={() => setOpen(!open)}>
          {news.unread.length === 1 ? '1 novinka' : news.unread.length < 5 ? `${news.unread.length} novinky` : `${news.unread.length} noviniek`} vo firme
          <span className="font-normal text-muted-foreground"> – {open ? 'skryť' : 'ukázať'}</span>
        </button>
        <Button variant="outline" size="sm" disabled={read.isPending} onClick={() => read.mutate()}>
          <CheckCheck className="size-4" aria-hidden />
          Prečítané
        </Button>
      </div>
      {open && (
        <ul className="mt-2 flex flex-col gap-1">
          {news.unread.map((item) => (
            <li key={item.id}>
              <Link to={item.link || '/'} className="flex flex-wrap justify-between gap-x-3 rounded-lg px-2 py-1 hover:bg-sky-100 dark:hover:bg-sky-900/40">
                <span className="font-medium">{item.title}</span>
                <span className="text-xs text-muted-foreground">{[item.actorName, formatDateTime(item.createdAt)].filter(Boolean).join(' · ')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const SEEN_VERSION_KEY = 'rigtrack.seenVersion'

function readSeenVersion() {
  try {
    return localStorage.getItem(SEEN_VERSION_KEY)
  } catch {
    return APP_VERSION
  }
}

function saveSeenVersion() {
  try {
    localStorage.setItem(SEEN_VERSION_KEY, APP_VERSION)
  } catch {
    // Bez úložiska sa oznam len znova ukáže po ďalšom načítaní.
  }
}

/**
 * Ročná správa sa hore ukáže len 31. 12. (za tento rok) a 1. 1. (za minulý); inak je v Štatistikách.
 * Dá sa zavrieť (zapamätá sa pre daný rok).
 */
function YearReportNotice() {
  const company = useCompany().active
  const year = yearReportYear(todayIso())
  const key = `rigtrack.yearReport.${year}`
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  })
  if (!year || hidden || !company || !can(company, 'report.view')) return null
  const close = () => {
    try {
      localStorage.setItem(key, '1')
    } catch {
      // Bez úložiska sa oznam len skryje do obnovenia stránky.
    }
    setHidden(true)
  }
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
      <FileChartColumn className="size-5 shrink-0 text-accent" aria-hidden />
      <span className="flex-1">
        <span className="font-medium">Ročná správa {year} je pripravená.</span>{' '}
        <Link to={`/report?year=${year}`} className="text-accent hover:underline" onClick={close}>
          Pozrieť
        </Link>
      </span>
      <button type="button" aria-label="Zavrieť" className="rounded p-1 text-muted-foreground hover:bg-accent/20" onClick={close}>
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

/** Po aktualizácii appky: „Nová verzia – pozrite, čo je nové“, kým ho človek nezavrie alebo neotvorí. */
function UpdateNotice() {
  const [seen, setSeen] = useState(readSeenVersion)
  // Prvé spustenie (nič uložené) nie je aktualizácia – len si verziu zapamätá.
  if (seen === null) {
    saveSeenVersion()
    return null
  }
  if (seen === APP_VERSION) return null
  const close = () => {
    saveSeenVersion()
    setSeen(APP_VERSION)
  }
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
      <Sparkles className="size-5 shrink-0 text-emerald-600" aria-hidden />
      <span className="flex-1">
        <span className="font-medium">RigTrack má novú verziu {APP_VERSION}.</span>{' '}
        <Link to="/changelog" className="text-accent hover:underline" onClick={close}>
          Pozrite, čo je nové
        </Link>
      </span>
      <button type="button" aria-label="Zavrieť" className="rounded p-1 text-muted-foreground hover:bg-emerald-100 dark:hover:bg-emerald-900/40" onClick={close}>
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

/**
 * Pás upozornení nad obsahom stránky: úvodný dotazník, chýbajúce zariadenia (červené),
 * narodeniny a meniny kolegov a novinky vo firme.
 */
export function TopNotices() {
  const company = useCompany().active
  const userId = useAuth().session?.user.id
  // Bez firmy a prihlásenia (napr. vývoj bez backendu) nie je čo ukazovať.
  if (!company || !userId) return null
  return <Notices companyId={company.companyId} userId={userId} />
}

function Notices({ companyId, userId }: { companyId: string; userId: string }) {
  const location = useLocation()
  const staff = useStaff(companyId)
  const devices = useDevices(companyId)
  const exemptions = useQuery({ queryKey: exemptionKeys.list(companyId), queryFn: () => fetchExemptions(companyId), retry: false })
  const [hiddenCelebrations, setHiddenCelebrations] = useState(false)

  const today = todayIso()
  const me = staff.people.find((person) => person.memberId === userId)
  const missing = devices.isSuccess && exemptions.isSuccess ? missingDeviceKinds(devices.data, exemptions.data, userId) : []
  const celebrations = upcomingCelebrations(staff.people, today, 2)
  const onWelcome = location.pathname === '/welcome'
  const profile = usePersonalProfile(userId)
  const profileIncomplete = profile.isSuccess && !profileComplete(profile.data)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 pt-4 empty:hidden md:px-8 print:hidden">
      <UpdateNotice />
      <YearReportNotice />
      {profileIncomplete && (
        <Link to="/company/select?view=profile" className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm hover:bg-accent/20">
          <UserRoundPen className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="flex-1">
            <span className="font-medium">Doplňte svoj profil</span> – meno, telefón a ďalšie údaje zadáte raz pre všetky firmy.
          </span>
        </Link>
      )}
      {me && !me.onboarded && !onWelcome && !profileIncomplete && (
        <Link to="/welcome" className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm hover:bg-accent/20">
          <UserRoundPen className="size-5 shrink-0 text-accent" aria-hidden />
          <span className="flex-1">
            <span className="font-medium">Doplňte svoje údaje</span> – telefón, e-mail, fotka a pozícia. Zapíšu sa do vašej karty zamestnanca.
          </span>
        </Link>
      )}
      {missing.length > 0 && !onWelcome && (
        <Link
          to="/settings?tab=account"
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm hover:bg-destructive/15"
        >
          <Smartphone className="size-5 shrink-0 text-destructive" aria-hidden />
          <span className="flex-1">
            <span className="font-medium text-destructive">Chýbajú vaše zariadenia:</span> {missing.map((kind) => DEVICE_KIND_LABELS[kind]).join(', ')}. Zapíšte ich s MAC adresou
            v Nastaveniach → Účet. Ak niektoré nemáte, výnimku vám dá admin.
          </span>
        </Link>
      )}
      {celebrations.length > 0 && !hiddenCelebrations && (
        <div className="flex items-start gap-3 rounded-xl border border-pink-300 bg-pink-50 p-3 text-sm dark:border-pink-900 dark:bg-pink-950/40">
          <Gift className="mt-0.5 size-5 shrink-0 text-pink-600" aria-hidden />
          <ul className="flex-1">
            {celebrations.map((item) => (
              <li key={`${item.kind}-${item.person.key}-${item.date}`}>
                {item.person.memberId === userId && item.date === today ? (
                  <span className="font-medium">Všetko najlepšie {item.kind === 'birthday' ? 'k narodeninám' : 'k meninám'}! 🎉</span>
                ) : (
                  <>
                    {describeCelebration(item, today)} –{' '}
                    <Link to={`/staff/${item.person.key}`} className="text-accent hover:underline">
                      zablahoželajte
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
          <button type="button" aria-label="Skryť" className="rounded p-1 text-muted-foreground hover:bg-pink-100 dark:hover:bg-pink-900/40" onClick={() => setHiddenCelebrations(true)}>
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
      <NotificationsStrip />
      <NewsBell companyId={companyId} userId={userId} />
    </div>
  )
}
