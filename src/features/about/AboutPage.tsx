import { ArrowLeft, Building2, ListChecks, Sparkles, ShieldCheck, Smartphone, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CheckUpdateButton } from '@/components/feedback/CheckUpdateButton'
import { useAuth } from '@/features/auth/auth-context'
import { CREDITS } from '@/lib/credits'
import { NAV_ITEMS } from '@/lib/navigation'
import { APP_VERSION } from '@/lib/version'
import { tx } from '@/lib/i18n'

/** O aplikácii: čo RigTrack je, čo vie, ako narába s údajmi a kto ho robí. Verejná stránka (aj bez prihlásenia). */
export function AboutPage() {
  const signedIn = Boolean(useAuth().session)
  const modules = NAV_ITEMS.filter((item) => item.id !== 'dashboard')

  return (
    <article className="flex flex-col gap-6">
      <Link to={signedIn ? '/company/select' : '/auth'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {signedIn ? tx('Späť') : tx('Prihlásenie')}
      </Link>

      <header className="flex flex-col gap-5 rounded-2xl border bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
        <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" className="size-20 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">{tx('O aplikácii RigTrack')}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{tx('Evidencia techniky a eventov pre zvukárov, osvetľovačov a celé produkčné firmy – od skladu cez nakladanie až po vyúčtovanie.')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/changelog" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Sparkles className="size-4" aria-hidden />{tx('Čo je nové vo verzii')}{' '}{APP_VERSION}
            </Link>
            <CheckUpdateButton />
            {!signedIn && (
              <Link to="/auth" className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">{tx('Prihlásiť sa')}</Link>
            )}
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={tx('V skratke')}>
        {[
          { icon: Building2, title: tx('Viac firiem'), text: tx('Jeden účet, prepínanie medzi firmami.') },
          { icon: UserRound, title: tx('Môj profil'), text: tx('Profil, technika a zariadenia raz pre všetky firmy.') },
          { icon: Smartphone, title: tx('Na mobile'), text: 'Pridajte si appku na plochu, funguje aj s push upozorneniami.' },
          { icon: ShieldCheck, title: tx('Oprávnenia'), text: tx('Admin určí, kto čo vidí a smie meniť.') },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border bg-surface p-4">
            <item.icon className="size-5 text-accent" aria-hidden />
            <p className="mt-2 font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <ListChecks className="size-5 text-accent" aria-hidden />{tx('Čo vie')}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => (
            <li key={item.id} className="flex items-start gap-3 rounded-xl border bg-surface p-4">
              <item.icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="block font-medium">{tx(item.label)}</span>
                <span className="block text-sm text-muted-foreground">{tx(item.description)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid items-start gap-4 md:grid-cols-2">
      <section className="rounded-xl border bg-surface p-5 text-sm">
        <h2 className="mb-2 text-base font-semibold">{tx('Ako začať')}</h2>
        <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed">
          <li>{tx('Prihláste sa e-mailom a vytvorte firmu – alebo prijmite pozvánku od admina vašej firmy.')}</li>
          <li>{tx('Na obrazovke „Vyberte firmu“ si raz vyplňte svoj profil; prenesie sa do všetkých vašich firiem.')}</li>
          <li>{tx('Pridajte techniku a cases, pozvite kolegov a nastavte, kto čo smie (Nastavenia → Oprávnenia).')}</li>
          <li>{tx('Na mobile si appku pridajte na plochu – funguje ako bežná aplikácia (Nastavenia → Účet → Aplikácia na ploche).')}</li>
        </ol>
      </section>

      <section className="rounded-xl border bg-surface p-5 text-sm">
        <h2 className="mb-2 text-base font-semibold">{tx('Vaše údaje')}</h2>
        <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
          <li>{tx('Každá firma vidí len svoje údaje; čo kto smie vidieť a meniť, určuje admin firmy.')}</li>
          <li>{tx('Osobný profil a adresu domov vidíte len vy (a kto spravuje tím vo vašej firme).')}</li>
          <li>{tx('Poloha pri dochádzke sa zistí len pri otvorení appky a nikam sa neukladá – uloží sa len, či ste boli na mieste.')}</li>
          <li>{tx('Zálohu všetkých údajov firmy si admin stiahne v Nastaveniach (Import a export).')}</li>
        </ul>
      </section>
      </div>

      <section className="text-center text-xs text-muted-foreground">
        {tx('Údaje o svetlách v spoločnej databáze techniky sú z')}{' '}
        <a href="https://open-fixture-library.org" target="_blank" rel="noreferrer" className="text-accent hover:underline">
          Open Fixture Library
        </a>{' '}
        {tx('(licencia MIT, © Florian & Felix Edelmann a prispievatelia).')}
      </section>
      <section className="text-center text-sm text-muted-foreground">{tx('Aplikáciu vyvíja')}{' '}<span className="font-medium text-foreground">{CREDITS.author}</span>{tx('. Nápady a chyby môžete poslať priamo v appke (Návrhy) alebo cez profily v pätičke.')}</section>
    </article>
  )
}
