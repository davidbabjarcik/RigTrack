import {
  ArrowRight,
  Boxes,
  CalendarDays,
  LogIn,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  Ticket,
  UserPlus,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Credits } from '@/components/layout/Credits'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuth } from '@/features/auth/auth-context'
import { useT } from '@/lib/i18n'

/** Text v oboch jazykoch: [slovensky, anglicky]. */
type Pair = [string, string]

const FEATURES: { icon: LucideIcon; title: Pair; text: Pair }[] = [
  {
    icon: Boxes,
    title: ['Technika a cases', 'Equipment & cases'],
    text: [
      'Každý kus aj s číslom #1, #2…, sady cases, obsah case a príslušenstvo. Kde čo je, jedným pohľadom.',
      'Every piece with its number #1, #2…, case sets, case contents and accessories. Where everything is, at a glance.',
    ],
  },
  {
    icon: QrCode,
    title: ['QR štítky a skenovanie', 'QR labels & scanning'],
    text: [
      'Štítok na technike, case aj mieste v sklade. Naskenujete telefónom a hneď vidíte detail.',
      'Labels on equipment, cases and warehouse spots. Scan with your phone and see the details right away.',
    ],
  },
  {
    icon: Warehouse,
    title: ['Sklad', 'Warehouse'],
    text: [
      'Plán skladu s regálmi, policami a paletami. Case uložíte skenom, hliník v stohoch na mieste.',
      'Warehouse plan with racks, shelves and pallets. Store a case with a scan, truss in stacks on its spot.',
    ],
  },
  {
    icon: Ticket,
    title: ['Eventy', 'Events'],
    text: [
      'Technika, posádka, balenie pri odchode aj návrate a čo sa nevrátilo – aj bez signálu.',
      'Gear, crew, packing out and back in, and what did not come back – even offline.',
    ],
  },
  {
    icon: Printer,
    title: ['Tlač', 'Printing'],
    text: [
      'Štítky, obsahy cases, plagát inventára, patch listy a IP tabuľky. Všetko aj do tlačovej fronty.',
      'Labels, case contents, inventory posters, patch lists and IP tables. Everything also into a print queue.',
    ],
  },
  {
    icon: CalendarDays,
    title: ['Kalendár a úlohy', 'Calendar & tasks'],
    text: ['Kto kedy môže, úlohy v kanbane, činnosti pred, počas a po evente.', 'Who is available when, tasks in a kanban, duties before, during and after an event.'],
  },
  {
    icon: Search,
    title: ['Hľadať všade', 'Search everywhere'],
    text: [
      'Jedno políčko cez techniku, cases, eventy, kontakty aj poznámky. „#7“ nájde konkrétny kus.',
      'One box across equipment, cases, events, contacts and notes. “#7” finds a specific piece.',
    ],
  },
  {
    icon: ShieldCheck,
    title: ['Bezpečne', 'Secure'],
    text: [
      'Každá firma vidí len svoje dáta, oprávnenia podľa rolí, ochrana prihlásenia a dáta v EÚ.',
      'Each company sees only its own data, role-based permissions, protected sign-in and data stored in the EU.',
    ],
  },
]

const SHOTS: { src: string; alt: Pair; caption: Pair }[] = [
  { src: 'rack.png', alt: ['Regál spredu s policami, paletami a cases', 'Rack front view with shelves, pallets and cases'], caption: ['Regál spredu – čo leží na ktorej polici', 'Rack front view – what lies on which shelf'] },
  { src: 'sheet-cables.png', alt: ['Hárok s obsahom case s tabuľkou káblov', 'Case content sheet with a cable table'], caption: ['Hárok s obsahom case na vytlačenie', 'Printable case content sheet'] },
  { src: 'poster.png', alt: ['Plagát inventára techniky', 'Equipment inventory poster'], caption: ['Plagát inventára na stenu skladu', 'Inventory poster for the warehouse wall'] },
  { src: 'kanban.png', alt: ['Úlohy v kanbane', 'Tasks in a kanban'], caption: ['Úlohy firmy v kanbane', 'Company tasks in a kanban'] },
  { src: 'calendar.png', alt: ['Kalendár eventov a dostupnosti', 'Calendar of events and availability'], caption: ['Kalendár eventov a dostupnosti', 'Calendar of events and availability'] },
  { src: 'stage.png', alt: ['Kalkulačka pódia', 'Stage calculator'], caption: ['Kalkulačky: pódium, LED stena, delay', 'Calculators: stage, LED wall, delay'] },
]

const STEPS: { title: Pair; text: Pair }[] = [
  { title: ['Pozvánka', 'Invitation'], text: ['Admin vašej firmy vás pozve na váš e-mail.', 'Your company admin invites you to your e-mail.'] },
  { title: ['Účet', 'Account'], text: ['Vytvoríte si účet s tým istým e-mailom a potvrdíte ho.', 'You create an account with the same e-mail and confirm it.'] },
  { title: ['Hotovo', 'Done'], text: ['Po prihlásení prijmete pozvánku a vidíte techniku a eventy firmy.', 'After signing in you accept the invitation and see the company equipment and events.'] },
]

/** Úvodná stránka RigTracku pre každého (bez prihlásenia): čo appka vie, ukážky a prihlásenie. SK / EN. */
export function HomePage() {
  const signedIn = Boolean(useAuth().session)
  const t = useT()
  const pick = (pair: Pair) => t(pair[0], pair[1])
  const base = import.meta.env.BASE_URL
  const primary = 'inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90'
  const secondary = 'inline-flex h-11 items-center gap-2 rounded-xl border bg-surface px-5 text-sm font-semibold hover:bg-muted'
  const signIn = signedIn ? t('Otvoriť RigTrack', 'Open RigTrack') : t('Prihlásiť sa', 'Sign in')

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
          <Link to="/home" className="flex items-center gap-2">
            <img src={`${base}icons/icon.svg`} alt="" className="size-8 rounded-lg" />
            <span className="text-lg font-semibold tracking-tight">RigTrack</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-5 text-sm text-muted-foreground md:flex" aria-label={t('Úvodná stránka', 'Home page')}>
            <a href="#funkcie" className="hover:text-foreground">
              {t('Funkcie', 'Features')}
            </a>
            <a href="#ukazky" className="hover:text-foreground">
              {t('Ukážky', 'Screenshots')}
            </a>
            <a href="#zaciatok" className="hover:text-foreground">
              {t('Ako začať', 'Get started')}
            </a>
            <Link to="/help" className="hover:text-foreground">
              {t('Návod', 'Guide')}
            </Link>
          </nav>
          <span className="flex-1" />
          <LanguageToggle />
          <ThemeToggle />
          <Link to={signedIn ? '/' : '/auth'} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <LogIn className="size-4" aria-hidden />
            <span className="hidden sm:inline">{signedIn ? t('Do appky', 'Open app') : t('Prihlásiť sa', 'Sign in')}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              <Smartphone className="size-3.5 text-accent" aria-hidden />
              {t('Na mobile aj na PC, funguje aj offline', 'On phone and PC, works offline too')}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              {t('Technika, cases a eventy', 'Equipment, cases and events')} <span className="text-accent">{t('na jednom mieste', 'in one place')}</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-pretty text-muted-foreground">
              {t(
                'RigTrack je evidencia pre zvukárov, osvetľovačov a produkčné firmy – od skladu cez nakladanie na event až po vrátenie a servis.',
                'RigTrack keeps track of gear for sound and lighting crews and production companies – from the warehouse through loading for a show to returns and service.',
              )}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {signedIn ? (
                <Link to="/" className={primary}>
                  {signIn}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : (
                <>
                  <Link to="/auth" className={primary}>
                    <LogIn className="size-4" aria-hidden />
                    {signIn}
                  </Link>
                  <Link to="/auth?mode=signup" className={secondary}>
                    <UserPlus className="size-4" aria-hidden />
                    {t('Mám pozvánku', 'I have an invitation')}
                  </Link>
                </>
              )}
            </div>
          </div>
          <figure className="overflow-hidden rounded-2xl border bg-surface shadow-xl">
            <img
              src={`${base}home/rack.png`}
              alt={t('Regál v sklade spredu s policami, paletami a uloženými cases', 'Warehouse rack front view with shelves, pallets and stored cases')}
              className="block w-full"
              loading="eager"
            />
          </figure>
        </section>

        <section id="funkcie" className="scroll-mt-20 border-y bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Čo RigTrack vie', 'What RigTrack does')}</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {t('To, čo sa inak rieši v tabuľkách, na papieri a v správach – prehľadne a pre celú firmu.', 'What you would otherwise juggle in spreadsheets, on paper and in messages – clear and for the whole company.')}
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <li key={feature.title[0]} className="rounded-2xl border bg-surface p-5">
                  <feature.icon className="size-6 text-accent" aria-hidden />
                  <h3 className="mt-3 font-semibold">{pick(feature.title)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{pick(feature.text)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="ukazky" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Ukážky', 'Screenshots')}</h2>
          <p className="mt-2 text-muted-foreground">{t('Z ukážkovej firmy – vymyslené dáta.', 'From a demo company – made-up data, shown in Slovak.')}</p>
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {SHOTS.map((shot) => (
              <li key={shot.src}>
                <figure className="overflow-hidden rounded-2xl border bg-surface">
                  <img src={`${base}home/${shot.src}`} alt={pick(shot.alt)} className="block aspect-[16/10] w-full object-cover object-top" loading="lazy" />
                  <figcaption className="border-t px-4 py-3 text-sm font-medium">{pick(shot.caption)}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>

        <section id="zaciatok" className="scroll-mt-20 border-t bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Ako začať', 'Get started')}</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {t('RigTrack funguje na pozvánky – účet si vytvoríte s e-mailom, na ktorý vás pozval admin firmy.', 'RigTrack works by invitation – you create an account with the e-mail your company admin invited.')}
            </p>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title[0]} className="rounded-2xl border bg-surface p-5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
                  <h3 className="mt-3 font-semibold">{pick(step.title)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{pick(step.text)}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={signedIn ? '/' : '/auth'} className={primary}>
                <LogIn className="size-4" aria-hidden />
                {signIn}
              </Link>
              <Link to="/about" className={secondary}>
                {t('Viac o aplikácii', 'More about the app')}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Credits className="px-4 py-6" />
    </div>
  )
}
