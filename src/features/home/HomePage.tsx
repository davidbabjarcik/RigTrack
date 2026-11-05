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
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Credits } from '@/components/layout/Credits'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuth } from '@/features/auth/auth-context'

const FEATURES = [
  { icon: Boxes, title: 'Technika a cases', text: 'Každý kus aj s číslom #1, #2…, sady cases, obsah case a príslušenstvo. Kde čo je, jedným pohľadom.' },
  { icon: QrCode, title: 'QR štítky a skenovanie', text: 'Štítok na technike, case aj mieste v sklade. Naskenujete telefónom a hneď vidíte detail.' },
  { icon: Warehouse, title: 'Sklad', text: 'Plán skladu s regálmi, policami a paletami. Case uložíte skenom, hliník v stohoch na mieste.' },
  { icon: Ticket, title: 'Eventy', text: 'Technika, posádka, balenie pri odchode aj návrate a čo sa nevrátilo – aj bez signálu.' },
  { icon: Printer, title: 'Tlač', text: 'Štítky, obsahy cases, plagát inventára, patch listy a IP tabuľky. Všetko aj do tlačovej fronty.' },
  { icon: CalendarDays, title: 'Kalendár a úlohy', text: 'Kto kedy môže, úlohy v kanbane, činnosti pred, počas a po evente.' },
  { icon: Search, title: 'Hľadať všade', text: 'Jedno políčko cez techniku, cases, eventy, kontakty aj poznámky. „#7“ nájde konkrétny kus.' },
  { icon: ShieldCheck, title: 'Bezpečne', text: 'Každá firma vidí len svoje dáta, oprávnenia podľa rolí, ochrana prihlásenia a dáta v EÚ.' },
]

const SHOTS = [
  { src: 'rack.png', alt: 'Regál spredu s policami, paletami a cases', caption: 'Regál spredu – čo leží na ktorej polici' },
  { src: 'sheet-cables.png', alt: 'Hárok s obsahom case s tabuľkou káblov', caption: 'Hárok s obsahom case na vytlačenie' },
  { src: 'poster.png', alt: 'Plagát inventára techniky', caption: 'Plagát inventára na stenu skladu' },
  { src: 'kanban.png', alt: 'Úlohy v kanbane', caption: 'Úlohy firmy v kanbane' },
  { src: 'calendar.png', alt: 'Kalendár eventov a dostupnosti', caption: 'Kalendár eventov a dostupnosti' },
  { src: 'stage.png', alt: 'Kalkulačka pódia', caption: 'Kalkulačky: pódium, LED stena, delay' },
]

const STEPS = [
  { title: 'Pozvánka', text: 'Admin vašej firmy vás pozve na váš e-mail.' },
  { title: 'Účet', text: 'Vytvoríte si účet s tým istým e-mailom a potvrdíte ho.' },
  { title: 'Hotovo', text: 'Po prihlásení prijmete pozvánku a vidíte techniku a eventy firmy.' },
]

/** Úvodná stránka RigTracku pre každého (bez prihlásenia): čo appka vie, ukážky a prihlásenie. */
export function HomePage() {
  const signedIn = Boolean(useAuth().session)
  const base = import.meta.env.BASE_URL
  const primary = 'inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90'
  const secondary = 'inline-flex h-11 items-center gap-2 rounded-xl border bg-surface px-5 text-sm font-semibold hover:bg-muted'

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/home" className="flex items-center gap-2">
            <img src={`${base}icons/icon.svg`} alt="" className="size-8 rounded-lg" />
            <span className="text-lg font-semibold tracking-tight">RigTrack</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-5 text-sm text-muted-foreground md:flex" aria-label="Úvodná stránka">
            <a href="#funkcie" className="hover:text-foreground">
              Funkcie
            </a>
            <a href="#ukazky" className="hover:text-foreground">
              Ukážky
            </a>
            <a href="#zaciatok" className="hover:text-foreground">
              Ako začať
            </a>
            <Link to="/help" className="hover:text-foreground">
              Návod
            </Link>
          </nav>
          <span className="flex-1" />
          <ThemeToggle />
          <Link to={signedIn ? '/' : '/auth'} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <LogIn className="size-4" aria-hidden />
            {signedIn ? 'Do appky' : 'Prihlásiť sa'}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              <Smartphone className="size-3.5 text-accent" aria-hidden />
              Na mobile aj na PC, funguje aj offline
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Technika, cases a eventy <span className="text-accent">na jednom mieste</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-pretty text-muted-foreground">
              RigTrack je evidencia pre zvukárov, osvetľovačov a produkčné firmy – od skladu cez nakladanie na event až po vrátenie a servis.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {signedIn ? (
                <Link to="/" className={primary}>
                  Otvoriť RigTrack
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : (
                <>
                  <Link to="/auth" className={primary}>
                    <LogIn className="size-4" aria-hidden />
                    Prihlásiť sa
                  </Link>
                  <Link to="/auth?mode=signup" className={secondary}>
                    <UserPlus className="size-4" aria-hidden />
                    Mám pozvánku
                  </Link>
                </>
              )}
            </div>
          </div>
          <figure className="overflow-hidden rounded-2xl border bg-surface shadow-xl">
            <img src={`${base}home/rack.png`} alt="Regál v sklade spredu s policami, paletami a uloženými cases" className="block w-full" loading="eager" />
          </figure>
        </section>

        <section id="funkcie" className="scroll-mt-20 border-y bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Čo RigTrack vie</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">To, čo sa inak rieši v tabuľkách, na papieri a v správach – prehľadne a pre celú firmu.</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="rounded-2xl border bg-surface p-5">
                  <feature.icon className="size-6 text-accent" aria-hidden />
                  <h3 className="mt-3 font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="ukazky" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ukážky</h2>
          <p className="mt-2 text-muted-foreground">Z ukážkovej firmy – vymyslené dáta.</p>
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {SHOTS.map((shot) => (
              <li key={shot.src}>
                <figure className="overflow-hidden rounded-2xl border bg-surface">
                  <img src={`${base}home/${shot.src}`} alt={shot.alt} className="block aspect-[16/10] w-full object-cover object-top" loading="lazy" />
                  <figcaption className="border-t px-4 py-3 text-sm font-medium">{shot.caption}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>

        <section id="zaciatok" className="scroll-mt-20 border-t bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ako začať</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">RigTrack funguje na pozvánky – účet si vytvoríte s e-mailom, na ktorý vás pozval admin firmy.</p>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl border bg-surface p-5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
                  <h3 className="mt-3 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to={signedIn ? '/' : '/auth'} className={primary}>
                <LogIn className="size-4" aria-hidden />
                {signedIn ? 'Otvoriť RigTrack' : 'Prihlásiť sa'}
              </Link>
              <Link to="/about" className={secondary}>
                Viac o aplikácii
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Credits className="px-4 py-6" />
    </div>
  )
}
