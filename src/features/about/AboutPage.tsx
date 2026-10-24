import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { CREDITS } from '@/lib/credits'
import { NAV_ITEMS } from '@/lib/navigation'
import { APP_VERSION } from '@/lib/version'

/** O aplikácii: čo RigTrack je, čo vie, ako narába s údajmi a kto ho robí. Verejná stránka (aj bez prihlásenia). */
export function AboutPage() {
  const signedIn = Boolean(useAuth().session)
  const modules = NAV_ITEMS.filter((item) => item.id !== 'dashboard')

  return (
    <article className="flex flex-col gap-6">
      <Link to={signedIn ? '/company/select' : '/auth'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {signedIn ? 'Späť' : 'Prihlásenie'}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">O aplikácii RigTrack</h1>
        <p className="mt-1 text-muted-foreground">
          Evidencia techniky a eventov pre zvukárov, osvetľovačov a celé produkčné firmy – od skladu cez nakladanie až po vyúčtovanie. Verzia{' '}
          <Link to="/changelog" className="text-accent hover:underline">
            {APP_VERSION}
          </Link>
          .
        </p>
      </header>

      <section>
        <h2 className="mb-2 font-medium">Čo vie</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {modules.map((item) => (
            <li key={item.id} className="flex items-start gap-3 rounded-xl border bg-surface p-3">
              <item.icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="block font-medium">{item.label}</span>
                <span className="block text-sm text-muted-foreground">{item.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border bg-surface p-4 text-sm">
        <h2 className="mb-2 text-base font-medium">Ako začať</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Prihláste sa e-mailom a vytvorte firmu – alebo prijmite pozvánku od admina vašej firmy.</li>
          <li>Na obrazovke „Vyberte firmu“ si raz vyplňte svoj profil; prenesie sa do všetkých vašich firiem.</li>
          <li>Pridajte techniku a cases, pozvite kolegov a nastavte, kto čo smie (Nastavenia → Oprávnenia).</li>
          <li>Na mobile si appku pridajte na plochu – funguje ako bežná aplikácia (Nastavenia → Účet → Aplikácia na ploche).</li>
        </ol>
      </section>

      <section className="rounded-xl border bg-surface p-4 text-sm">
        <h2 className="mb-2 text-base font-medium">Vaše údaje</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Každá firma vidí len svoje údaje; čo kto smie vidieť a meniť, určuje admin firmy.</li>
          <li>Osobný profil a adresu domov vidíte len vy (a kto spravuje tím vo vašej firme).</li>
          <li>Poloha pri dochádzke sa zistí len pri otvorení appky a nikam sa neukladá – uloží sa len, či ste boli na mieste.</li>
          <li>Zálohu všetkých údajov firmy si admin stiahne v Nastaveniach (Import a export).</li>
        </ul>
      </section>

      <section className="text-sm text-muted-foreground">
        Aplikáciu vyvíja <span className="font-medium text-foreground">{CREDITS.author}</span>. Nápady a chyby môžete poslať priamo v appke (Návrhy) alebo cez profily v pätičke.
      </section>
    </article>
  )
}
