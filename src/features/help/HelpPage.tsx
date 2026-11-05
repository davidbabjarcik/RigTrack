import { ArrowLeft, Lightbulb, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { plain } from '@/features/search/searchAll'
import { tx } from '@/lib/i18n'

type Tip = { title: string; steps: string[]; link?: { to: string; label: string } }
type Topic = { title: string; tips: Tip[] }

/** Návod a tipy – krátke „ako na to“ k veciam, ktoré nie sú hneď vidieť. */
const TOPICS: Topic[] = [
  {
    title: 'Rýchle hľadanie a skenovanie',
    tips: [
      {
        title: 'Nájsť čokoľvek z Prehľadu',
        steps: [
          'Na Prehľade hore napíšte do „Hľadať všade“ aspoň dva znaky – hľadá sa v technike, cases, eventoch, firmách, kontaktoch, úlohách, poznámkach aj v sklade.',
          'Na diakritike ani veľkých písmenách nezáleží; viac slov zúži výsledky (napr. „beam case 3“).',
          'Číslo kusu: „#7“ nájde kus č. 7 techniky evidovanej po kusoch, „#7 beam“ len medzi beamami.',
          'Enter otvorí prvý výsledok, Esc hľadanie vymaže.',
        ],
        link: { to: '/', label: 'Prehľad' },
      },
      {
        title: 'Skenovať QR štítok',
        steps: ['Na Prehľade (aj v Technike a Cases) „Skenovať QR“ zapne kameru.', 'Štítok techniky, case alebo miesta v sklade otvorí rovno jeho detail.'],
      },
    ],
  },
  {
    title: 'Technika a cases',
    tips: [
      {
        title: 'Značka a model zo spoločnej databázy techniky',
        steps: [
          'Pri pridávaní techniky zvoľte druh (napr. Zvuk), potom značku (napr. JBL) a jej model – technické údaje sa doplnia samy.',
          'Značka alebo model chýba? Na konci zoznamu „Iná značka / Iný model“ a dopíšte ho.',
          'Technika sa uloží vašej firme hneď; model ide ako návrh do spoločnej databázy a po overení ho uvidia všetci. Do databázy idú len údaje modelu, nie sériové čísla ani ceny.',
        ],
        link: { to: '/equipment/new', label: 'Pridať techniku' },
      },
      {
        title: 'Rozdeliť kusy do viacerých cases naraz (napr. háky)',
        steps: [
          'Otvorte techniku, ktorá je rozdelená vo viacerých cases (zoznam „Časti“).',
          '„Dať do viacerých cases“ → zaškrtnite cases a zadajte, koľko kusov do každého.',
          'Appka sama navrhne cases zo sady, kde technika ešte nie je, s rovnakým počtom ako v ostatných.',
        ],
      },
      {
        title: 'Príslušenstvo na hárku s obsahom pre celú sadu',
        steps: [
          'Otvorte sadu cases (napr. K10 Case #1–#5) → „Príslušenstvo v obsahu“.',
          'Zaškrtnite, čo je príslušenstvo (lanko, hák, omega…), šípkami nastavte poradie na hárku a dajte Uložiť.',
          'Platí to vo všetkých cases sady naraz; poradie aj pre ostatné hárky.',
        ],
      },
      {
        title: 'Obsahy a štítky všetkých cases sady naraz',
        steps: ['Na stránke sady „Obsahy všetkých“ alebo „Štítky všetkých“ – jedno PDF, tlač alebo do tlačovej fronty.', 'Pri obsahoch vyberiete A4 / A5 a na výšku / na šírku.'],
      },
      {
        title: 'Pridať ďalší case do sady',
        steps: ['Na stránke sady sivý riadok „Pridať ďalší do sady“ pod posledným case – skopíruje rozmery, fotku a kategóriu s ďalším číslom.'],
      },
    ],
  },
  {
    title: 'Sklad',
    tips: [
      {
        title: 'Uložiť case do regála',
        steps: [
          'V Sklade kliknite na regál → „Uložiť sem case“.',
          'Bez zvolenej police sa case uloží na prvú policu, kde je miesto (case bez rozmerov ráta ako 60 cm).',
          'Rýchlejšie: „Uložiť sem skenovaním“ a postupne naskenujte štítky cases.',
        ],
        link: { to: '/warehouse', label: 'Sklad' },
      },
      {
        title: 'Hliník a cases na jednom mieste',
        steps: ['Kliknite na miesto v pláne → „Hliník je na tomto mieste“.', 'Potom „Otvoriť hliník“ ukáže stohy trussov; cases sa na miesto ukladajú ako doteraz.'],
      },
      {
        title: 'Rozmery miesta v metroch',
        steps: ['Upraviť plán → vyberte miesto → Dĺžka (m) a Šírka (m), napr. 3,5.'],
      },
    ],
  },
  {
    title: 'Eventy',
    tips: [
      {
        title: 'Nakladanie a návrat (pack list)',
        steps: ['V detaile eventu „Balenie“ – pri odchode fáza Nakladanie, po návrate fáza Návrat.', 'Funguje aj bez signálu; odškrtnutia sa odošlú, keď sa chytí sieť.'],
      },
      {
        title: 'Čo sa nevrátilo po evente',
        steps: [
          'V detaile eventu časť „Vrátenie po evente“ ukáže, čo sa naložilo, ale nevrátilo.',
          'Pri každej veci „Strata“ alebo „Poškodené“ – zapíše sa do Škôd a úrazov.',
          '„Uzavrieť vrátenie“ uloží, čo chýbalo, a event zmizne z „Ešte vonku“ na Prehľade.',
        ],
      },
    ],
  },
  {
    title: 'Tlač',
    tips: [
      {
        title: 'Tlačová fronta',
        steps: [
          'Pri štítkoch, obsahoch, plagáte inventára či IP tabuľke „Do tlače“ – vec sa pridá do fronty aj s formátom (A4 / A5, orientácia).',
          'V Tlači potom všetko naraz vytlačíte alebo otvoríte a vytlačíte jednotlivo.',
        ],
        link: { to: '/print', label: 'Tlač' },
      },
      {
        title: 'Bez QR štítku',
        steps: ['V Tlači zoznam techniky a cases, ktoré ešte nemajú štítok – zaškrtnite a dajte „Do tlače“, po nalepení „Už olepené“.'],
      },
    ],
  },
]

export function HelpPage() {
  const signedIn = Boolean(useAuth().session)
  const [search, setSearch] = useState('')
  const topics = useMemo(() => {
    const words = plain(search.trim()).split(/\s+/).filter(Boolean)
    if (words.length === 0) return TOPICS
    return TOPICS.map((topic) => ({
      ...topic,
      tips: topic.tips.filter((tip) => {
        const text = plain([topic.title, tip.title, ...tip.steps].map((part) => tx(part)).join(' '))
        return words.every((word) => text.includes(word))
      }),
    })).filter((topic) => topic.tips.length > 0)
  }, [search])

  return (
    <article className="flex flex-col gap-6">
      <Link to={signedIn ? '/' : '/auth'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {signedIn ? tx('Prehľad') : tx('Prihlásenie')}
      </Link>
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Lightbulb className="size-7 text-accent" aria-hidden />{tx('Návod a tipy')}</h1>
        <p className="mt-2 text-muted-foreground">{tx('Krátke „ako na to“ k veciam, ktoré nie sú hneď vidieť.')}</p>
      </header>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          aria-label={tx('Hľadať v návode')}
          placeholder={tx('Hľadať v návode, napr. sklad, príslušenstvo, tlač…')}
          className="h-11 w-full rounded-xl border bg-surface pr-3 pl-9 text-base outline-none focus-visible:ring-2 focus-visible:ring-accent sm:text-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {topics.length === 0 && <p className="text-sm text-muted-foreground">{tx('Nič sa nenašlo.')}</p>}
      {topics.map((topic) => (
        <section key={topic.title} aria-labelledby={`help-${plain(topic.title).replace(/\W+/g, '-')}`}>
          <h2 id={`help-${plain(topic.title).replace(/\W+/g, '-')}`} className="mb-2 text-lg font-semibold">
            {tx(topic.title)}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {topic.tips.map((tip) => (
              <div key={tip.title} className="rounded-xl border bg-surface p-4">
                <h3 className="font-medium">{tx(tip.title)}</h3>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  {tip.steps.map((step) => (
                    <li key={step}>{tx(step)}</li>
                  ))}
                </ol>
                {tip.link && signedIn && (
                  <Link to={tip.link.to} className="mt-2 inline-block text-sm text-accent hover:underline">{tx('Otvoriť')}{' '}{tx(tip.link.label)} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </article>
  )
}
