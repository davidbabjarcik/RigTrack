import {
  ArrowRight,
  Boxes,
  CalendarDays,
  FileText,
  LogIn,
  Printer,
  QrCode,
  Route,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  UserPlus,
  Users,
  Warehouse,
  Wrench,
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
type Feature = { icon: LucideIcon; title: Pair; text: Pair }

/** Funkcie v poradí práce: sklad → akcia → podklady k akcii → firma. */
const GROUPS: { title: Pair; lead: Pair; items: Feature[] }[] = [
  {
    title: ['Sklad a technika', 'Warehouse and gear'],
    lead: ['Čo máte, kde to leží a v akom je to stave.', 'What you own, where it is and what state it is in.'],
    items: [
      {
        icon: Boxes,
        title: ['Technika a cases', 'Equipment and cases'],
        text: ['Každý kus s číslom #1, #2…, cases so šuplíkmi a priehradkami, kontrola obsahu po položkách.', 'Every piece with its number #1, #2…, cases with drawers and compartments, item-by-item content checks.'],
      },
      {
        icon: QrCode,
        title: ['QR štítky a skenovanie', 'QR labels and scanning'],
        text: ['Štítok na technike, case aj mieste v sklade. Telefónom naskenujete a vidíte detail.', 'Labels on gear, cases and warehouse spots. Scan with a phone and see the details.'],
      },
      {
        icon: Warehouse,
        title: ['Plán skladu', 'Warehouse plan'],
        text: ['Regály, police, palety a hliník v stohoch. Case uložíte skenom na jeho miesto.', 'Racks, shelves, pallets and truss in stacks. Store a case on its spot with a scan.'],
      },
      {
        icon: Wrench,
        title: ['Servis a kontroly', 'Service and checks'],
        text: ['Revízie a prevádzkové hodiny, inventúra skenovaním, návratnosť techniky a čo treba dokúpiť.', 'Inspections and operating hours, stocktake by scanning, equipment payback and what needs buying.'],
      },
    ],
  },
  {
    title: ['Akcie', 'Shows'],
    lead: ['Od plánu cez balenie až po vrátenie.', 'From the plan through packing to the return.'],
    items: [
      {
        icon: Ticket,
        title: ['Eventy a pack list', 'Events and pack list'],
        text: ['Technika, posádka a kolízie termínov. Balenie pri odchode aj návrate, aj bez signálu.', 'Gear, crew and date conflicts. Packing out and back in, even without a signal.'],
      },
      {
        icon: CalendarDays,
        title: ['Kalendár a úlohy', 'Calendar and tasks'],
        text: ['Kto kedy môže, úlohy v kanbane a činnosti pred, počas a po akcii.', 'Who is free when, tasks in a kanban and duties before, during and after a show.'],
      },
      {
        icon: Route,
        title: ['Prenájom a turné', 'Rentals and tours'],
        text: ['Dopyt viacerým požičovniam naraz s porovnaním odpovedí. Turné so zastávkami a podkladmi na ďalšie mestá.', 'One request to several rental companies with the answers compared. Tours with stops and documents for the next cities.'],
      },
      {
        icon: Printer,
        title: ['Tlač', 'Printing'],
        text: ['Štítky vo zvolenej veľkosti, obsahy cases a patch listy. Všetko naraz ako ZIP so značkami rezu.', 'Labels in the size you choose, case contents and patch lists. All at once as a ZIP with crop marks.'],
      },
    ],
  },
  {
    title: ['Podklady k akcii', 'Show documents'],
    lead: ['Pre zvukára, klub aj kapelu – s verziami a odkazom len na čítanie.', 'For the engineer, venue and band – with versions and a read-only link.'],
    items: [
      {
        icon: SlidersHorizontal,
        title: ['Input / output list a X32', 'Input / output list and X32'],
        text: ['Kanály, phantom, inserty a výstupy, návrh z PDF ridera a mená kanálov rovno do scény X32 / M32.', 'Channels, phantom, inserts and outputs, a suggestion from a PDF rider and channel names straight into an X32 / M32 scene.'],
      },
      {
        icon: Boxes,
        title: ['Stage plán, racky a synoptika', 'Stage plot, racks and signal flow'],
        text: ['Pódium v mierke s kanálmi z input listu, osadenie rackov a zapojenie s káblami a dĺžkami.', 'The stage to scale with input list channels, rack layouts and signal flow with cables and lengths.'],
      },
      {
        icon: Route,
        title: ['HF plán a site plán', 'RF plan and site plan'],
        text: ['Frekvencie bez intermodulácií a TV kanálov. Mapa miesta s trasami káblov, ktoré sa doplnia do pack listu.', 'Frequencies clear of intermodulation and TV channels. A venue map with cable routes that go into the pack list.'],
      },
      {
        icon: CalendarDays,
        title: ['Harmonogram', 'Schedule'],
        text: ['Get-in, soundcheck, vystúpenia a prestavby po dňoch, pri festivale pódiá vedľa seba.', 'Get-in, soundcheck, sets and changeovers by day, stages side by side at a festival.'],
      },
    ],
  },
  {
    title: ['Firma', 'Company'],
    lead: ['Peniaze, ľudia a poriadok v jednej appke pre celý tím.', 'Money, people and order in one app for the whole team.'],
    items: [
      {
        icon: FileText,
        title: ['Ponuky, zmluvy a faktúry', 'Quotes, contracts and invoices'],
        text: ['Ponuka z techniky akcie, zmluva s podpisom cez odkaz, zálohová a konečná faktúra.', 'A quote from the show gear, a contract signed via a link, advance and final invoices.'],
      },
      {
        icon: Users,
        title: ['Ľudia a odmeny', 'People and pay'],
        text: ['Dochádzka, odmeny a výpis za mesiac, certifikácie, externisti potvrdia termín bez účtu.', 'Attendance, pay and a monthly statement, certificates, freelancers confirm a date without an account.'],
      },
      {
        icon: Search,
        title: ['Hľadať všade', 'Search everywhere'],
        text: ['Jedno políčko cez techniku, cases, akcie, kontakty a poznámky. „#7“ nájde konkrétny kus.', 'One box across gear, cases, shows, contacts and notes. “#7” finds a specific piece.'],
      },
      {
        icon: ShieldCheck,
        title: ['Bezpečne', 'Secure'],
        text: ['Každá firma vidí len svoje dáta, oprávnenia podľa rolí, dvojfaktorové prihlásenie a dáta v EÚ.', 'Each company sees only its own data, role-based permissions, two-factor sign-in and data stored in the EU.'],
      },
    ],
  },
]

const SHOTS: { src: string; alt: Pair; caption: Pair }[] = [
  { src: 'synoptic.png', alt: ['Synoptika zapojenia', 'Signal flow diagram'], caption: ['Synoptika – zapojenie, káble a dĺžky', 'Signal flow – connections, cables and lengths'] },
  { src: 'rf-plan.png', alt: ['HF frekvenčný plán so spektrom', 'RF frequency plan with a spectrum'], caption: ['HF plán – intermodulácie a TV kanály', 'RF plan – intermodulation and TV channels'] },
  { src: 'case-layout.png', alt: ['Rozloženie v case so šuplíkmi a priehradkami', 'Case layout with drawers and compartments'], caption: ['Rozloženie v case – čo leží v ktorom šuplíku', 'Case layout – what lies in which drawer'] },
  { src: 'rack.png', alt: ['Regál spredu s policami, paletami a cases', 'Rack front view with shelves, pallets and cases'], caption: ['Regál spredu – čo leží na ktorej polici', 'Rack front view – what lies on which shelf'] },
  { src: 'sheet-cables.png', alt: ['Hárok s obsahom case s tabuľkou káblov', 'Case content sheet with a cable table'], caption: ['Hárok s obsahom case na vytlačenie', 'Printable case content sheet'] },
  { src: 'invoice.png', alt: ['Faktúra s odpočtom zálohy', 'Invoice with an advance deducted'], caption: ['Faktúry – zálohová a konečná z ponuky', 'Invoices – advance and final from a quote'] },
  { src: 'calendar.png', alt: ['Kalendár akcií a dostupnosti', 'Calendar of shows and availability'], caption: ['Kalendár akcií a dostupnosti', 'Calendar of shows and availability'] },
  { src: 'rating.png', alt: ['Hodnotenie akcie klientom', 'Client rating of a show'], caption: ['Hodnotenie od klienta cez odkaz', 'Client rating via a link'] },
]

const STEPS: { title: Pair; text: Pair }[] = [
  { title: ['Pozvánka', 'Invitation'], text: ['Admin vašej firmy vás pozve na váš e-mail.', 'Your company admin invites you to your e-mail.'] },
  { title: ['Účet', 'Account'], text: ['Vytvoríte si účet s tým istým e-mailom a potvrdíte ho.', 'You create an account with the same e-mail and confirm it.'] },
  { title: ['Hotovo', 'Done'], text: ['Po prihlásení prijmete pozvánku a vidíte techniku a akcie firmy.', 'After signing in you accept the invitation and see the company gear and shows.'] },
]

/** Úvodná stránka RigTracku pre každého (bez prihlásenia): čo appka robí, ukážky a prihlásenie. SK / EN. */
export function HomePage() {
  const signedIn = Boolean(useAuth().session)
  const t = useT()
  const pick = (pair: Pair) => t(pair[0], pair[1])
  const base = import.meta.env.BASE_URL
  const primary = 'inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90'
  const secondary = 'inline-flex h-11 items-center gap-2 rounded-lg border bg-surface px-5 text-sm font-medium transition-colors hover:bg-muted'
  const signIn = signedIn ? t('Otvoriť RigTrack', 'Open RigTrack') : t('Prihlásiť sa', 'Sign in')
  const [featured, ...shots] = SHOTS

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
          <Link to="/home" className="flex items-center gap-2">
            <img src={`${base}icons/icon.svg`} alt="" className="size-8 rounded-lg" />
            <span className="text-lg font-semibold tracking-tight">RigTrack</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label={t('Úvodná stránka', 'Home page')}>
            <a href="#funkcie" className="transition-colors hover:text-foreground">{t('Funkcie', 'Features')}</a>
            <a href="#ukazky" className="transition-colors hover:text-foreground">{t('Ukážky', 'Screenshots')}</a>
            <a href="#zaciatok" className="transition-colors hover:text-foreground">{t('Ako začať', 'Get started')}</a>
            <Link to="/help" className="transition-colors hover:text-foreground">{t('Návod', 'Guide')}</Link>
          </nav>
          <span className="flex-1" />
          <LanguageToggle />
          <ThemeToggle />
          {!signedIn && (
            <Link to="/auth" className="hidden h-9 items-center px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
              {t('Prihlásiť sa', 'Sign in')}
            </Link>
          )}
          {signedIn && (
            <Link to="/" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              <LogIn className="size-4" aria-hidden />
              <span className="hidden sm:inline">{t('Do appky', 'Open app')}</span>
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Úvod: text vľavo, náhľad skutočnej obrazovky vpravo (stage plán – podklad, ktorý sa z appky posiela zvukárovi). */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {t('Sklad, akcie a podklady pre zvuk a svetlo', 'Warehouse, shows and documents for sound and light')}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
              {t(
                'RigTrack vedie techniku od regálu cez balenie na akciu až po vrátenie a servis. K akcii pripraví input list, stage plán aj HF plán a pošle ich zvukárovi odkazom.',
                'RigTrack follows your gear from the shelf through packing for a show to the return and service. For each show it prepares the input list, stage plot and RF plan and sends them to the engineer by link.',
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
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
            <p className="mt-6 text-sm text-muted-foreground">{t('Na mobile aj na počítači, balenie funguje aj bez signálu', 'On phone and computer, packing works without a signal too')}</p>
          </div>
          <figure className="overflow-hidden rounded-xl border bg-surface shadow-lg">
            <img
              src={`${base}home/stage-plot.png`}
              alt={t('Stage plán pódia v mierke s kanálmi z input listu', 'Stage plot to scale with input list channels')}
              className="block w-full"
              loading="eager"
            />
          </figure>
        </section>

        <section id="funkcie" className="scroll-mt-20 border-y bg-surface/60">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Čo RigTrack robí', 'What RigTrack does')}</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {t('Namiesto tabuliek, papierov a správ – jedno miesto pre celý tím, v poradí, v akom práca naozaj ide.', 'Instead of spreadsheets, paper and messages – one place for the whole team, in the order the work really goes.')}
            </p>
            <div className="mt-10 grid gap-x-12 gap-y-12 md:grid-cols-2">
              {GROUPS.map((group, index) => (
                <section key={group.title[0]} aria-labelledby={`skupina-${index}`}>
                  <p className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</p>
                  <h3 id={`skupina-${index}`} className="mt-1 text-lg font-semibold">{pick(group.title)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{pick(group.lead)}</p>
                  <ul className="mt-4">
                    {group.items.map((item) => (
                      <li key={item.title[0]} className="flex gap-3 border-t py-4">
                        <item.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div>
                          <h4 className="text-sm font-medium">{pick(item.title)}</h4>
                          <p className="mt-0.5 text-sm text-muted-foreground">{pick(item.text)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section id="ukazky" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Ukážky', 'Screenshots')}</h2>
          <p className="mt-2 text-muted-foreground">{t('Z ukážkovej firmy, vymyslené údaje', 'From a demo company, made-up data, shown in Slovak')}</p>
          <figure className="mt-8 overflow-hidden rounded-xl border bg-surface">
            <img src={`${base}home/${featured.src}`} alt={pick(featured.alt)} className="block w-full" loading="lazy" />
            <figcaption className="border-t px-4 py-3 text-sm">{pick(featured.caption)}</figcaption>
          </figure>
          <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shots.map((shot) => (
              <li key={shot.src}>
                <figure className="overflow-hidden rounded-xl border bg-surface">
                  <img src={`${base}home/${shot.src}`} alt={pick(shot.alt)} className="block aspect-[16/10] w-full object-cover object-top" loading="lazy" />
                  <figcaption className="border-t px-4 py-3 text-sm">{pick(shot.caption)}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>

        <section id="zaciatok" className="scroll-mt-20 border-t bg-surface/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('Ako začať', 'Get started')}</h2>
              <p className="mt-2 text-muted-foreground">
                {t('RigTrack funguje na pozvánky – účet si vytvoríte s e-mailom, na ktorý vás pozval admin firmy.', 'RigTrack works by invitation – you create an account with the e-mail your company admin invited.')}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={signedIn ? '/' : '/auth'} className={primary}>
                  <LogIn className="size-4" aria-hidden />
                  {signIn}
                </Link>
                <Link to="/about" className={secondary}>{t('Viac o aplikácii', 'More about the app')}</Link>
              </div>
            </div>
            <ol>
              {STEPS.map((step, index) => (
                <li key={step.title[0]} className="flex gap-4 border-t py-4">
                  <span className="w-6 shrink-0 font-mono text-sm text-muted-foreground">{index + 1}</span>
                  <div>
                    <h3 className="font-medium">{pick(step.title)}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{pick(step.text)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <Credits className="px-4 py-6" />
    </div>
  )
}
