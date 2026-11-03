import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { CONSENT_VERSION, openConsentSettings } from '@/lib/consent'

// Právne stránky (verejné, aj bez prihlásenia). Obsah vychádza zo skutočnej implementácie appky (databáza, služby,
// automatické mazanie) a z údajov, ktoré dodal prevádzkovateľ (3. 11. 2026).

const UPDATED = '3. 11. 2026'
const OPERATOR = 'Dávid Babjarčík'
const CONTACT = 'davidbabjarcik@gmail.com'
const Mail = () => (
  <a href={`mailto:${CONTACT}`} className="text-accent hover:underline">
    {CONTACT}
  </a>
)

function Page({ title, children }: { title: string; children: ReactNode }) {
  const signedIn = Boolean(useAuth().session)
  return (
    <article className="flex flex-col gap-6">
      <Link to={signedIn ? '/company/select' : '/auth'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {signedIn ? 'Späť' : 'Prihlásenie'}
      </Link>
      <header className="rounded-2xl border bg-surface p-6 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Platné od {UPDATED}</p>
        <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Právne informácie">
          <Link to="/ochrana-sukromia" className="text-accent hover:underline">
            Ochrana súkromia
          </Link>
          <Link to="/cookies" className="text-accent hover:underline">
            Cookies a úložisko
          </Link>
          <Link to="/podmienky-pouzivania" className="text-accent hover:underline">
            Podmienky používania
          </Link>
        </nav>
      </header>
      <div className="flex flex-col gap-5 rounded-2xl border bg-surface p-6 text-sm leading-relaxed sm:p-8 [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_table]:w-full [&_td]:border-t [&_td]:py-1.5 [&_td]:pr-3 [&_td]:align-top [&_th]:pb-1 [&_th]:pr-3 [&_th]:text-left [&_th]:font-medium">
        {children}
      </div>
    </article>
  )
}

function Operator() {
  return (
    <ul>
      <li>Prevádzkovateľ aplikácie RigTrack: {OPERATOR} – fyzická osoba, ktorá aplikáciu vyvíja a prevádzkuje ako pracovný nástroj (nie podnikateľ, preto bez IČO).</li>
      <li>
        E-mail na otázky a žiadosti k osobným údajom: <Mail />
      </li>
      <li>Zodpovedná osoba (DPO): nie je určená – pri tomto rozsahu spracúvania nie je povinná.</li>
    </ul>
  )
}

export function PrivacyPage() {
  return (
    <Page title="Zásady ochrany osobných údajov">
      <p>
        Tieto zásady vysvetľujú, aké osobné údaje spracúva webová aplikácia RigTrack (evidencia techniky, cases, eventov, výpožičiek, posádky a
        servisu pre produkčné firmy), prečo, ako dlho a aké máte práva podľa nariadenia (EÚ) 2016/679 (GDPR) a zákona č. 18/2018 Z. z. o ochrane
        osobných údajov.
      </p>

      <h2>1. Kto je prevádzkovateľ</h2>
      <Operator />
      <p>
        <strong>Firmy v aplikácii.</strong> Každá firma (napr. produkčná spoločnosť), ktorá RigTrack používa, je vo vzťahu k údajom svojich
        zamestnancov, posádky, kontaktov a klientov, ktoré do aplikácie zadá, samostatným prevádzkovateľom; prevádzkovateľ RigTracku je pre ňu
        sprostredkovateľom. Písomná zmluva o spracúvaní (čl. 28 GDPR) zatiaľ uzavretá nie je; firma si ju môže vyžiadať e-mailom.
      </p>

      <h2>2. Aké údaje spracúvame</h2>
      <table>
        <thead>
          <tr>
            <th>Kategória</th>
            <th>Údaje</th>
            <th>Odkiaľ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Účet</td>
            <td>e-mail, meno, heslo (uložené len ako bcrypt odtlačok – nikto ho nevie prečítať), čas registrácie a posledného prihlásenia</td>
            <td>od vás pri vytvorení účtu z pozvánky</td>
          </tr>
          <tr>
            <td>Členstvo vo firme</td>
            <td>firma, rola a oprávnenia, pozvánky (e-mail pozvaného)</td>
            <td>admin firmy</td>
          </tr>
          <tr>
            <td>Osobný profil a karta zamestnanca</td>
            <td>
              telefón, e-mail, dátum narodenia, meniny, vodičské oprávnenia, adresa bydliska (s polohou na overenie dochádzky z domu), sociálne siete,
              zručnosti, pozícia, fotka, poznámky
            </td>
            <td>od vás alebo od admina firmy (vyplnenie je dobrovoľné)</td>
          </tr>
          <tr>
            <td>Zariadenia</td>
            <td>názov zariadenia, MAC adresy (Wi-Fi, ethernet) – kvôli prístupu do firemných sietí</td>
            <td>od vás alebo admina</td>
          </tr>
          <tr>
            <td>Práca a dochádzka</td>
            <td>
              posádka eventov, potvrdenie účasti, výkazy času a prestávok, dochádzka (čas začiatku a konca, overenie polohou – ukladá sa len, či ste
              boli na mieste a vzdialenosť v metroch, nie súradnice), šoférovanie, činnosti, sadzby a výplaty, výdavky
            </td>
            <td>od vás a firmy</td>
          </tr>
          <tr>
            <td>Škody a úrazy</td>
            <td>popis udalosti, dotknutá osoba, závažnosť, náklady – pri úraze môže ísť o údaje o zdraví (osobitná kategória, čl. 9 GDPR)</td>
            <td>firma</td>
          </tr>
          <tr>
            <td>Kontakty a klienti</td>
            <td>mená, telefóny, e-maily, firmy organizátorov, partnerov a klientov, ponuky, výpožičky a podpisy pri odovzdaní techniky</td>
            <td>firma</td>
          </tr>
          <tr>
            <td>Súbory</td>
            <td>fotky techniky, cases, eventov, dokumenty eventov, prílohy, logo firmy, snímky obrazovky pri nahlásení chyby</td>
            <td>nahrajú používatelia</td>
          </tr>
          <tr>
            <td>História zmien</td>
            <td>kto, kedy a čo zmenil vo firme (meno autora pri zázname)</td>
            <td>automaticky</td>
          </tr>
          <tr>
            <td>Upozornenia</td>
            <td>upozornenia v appke; pri zapnutých push upozorneniach adresa odberu prehliadača a typ zariadenia</td>
            <td>automaticky / po vašom zapnutí</td>
          </tr>
          <tr>
            <td>Chyby a hlásenia</td>
            <td>nahlásené chyby (text, stránka, verzia, prehliadač, snímka); automaticky zachytené chyby appky (e-mail, stránka, verzia, prehliadač)</td>
            <td>od vás / automaticky</td>
          </tr>
          <tr>
            <td>Bezpečnosť prihlásenia</td>
            <td>počet neúspešných pokusov a čas blokovania; e-mail a IP adresa len ako jednosmerný odtlačok (HMAC), nie čitateľne</td>
            <td>automaticky pri prihlasovaní</td>
          </tr>
          <tr>
            <td>Technické údaje</td>
            <td>IP adresa a údaje o prehliadači v prevádzkových záznamoch hostingu a databázy</td>
            <td>automaticky (poskytovatelia nižšie)</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Účely a právne základy</h2>
      <ul>
        <li>Poskytovanie aplikácie a účtu (prihlásenie, firmy, evidencia) – plnenie zmluvy, čl. 6 ods. 1 písm. b) GDPR.</li>
        <li>
          Údaje zamestnancov a posádky zadané firmou – oprávnený záujem firmy na organizácii práce a plnenie jej povinností ako zamestnávateľa, čl. 6
          ods. 1 písm. b), c), f); za správny právny základ zodpovedá firma.
        </li>
        <li>Údaje o úrazoch (zdravie) – plnenie povinností v oblasti BOZP, čl. 9 ods. 2 písm. b) GDPR; zodpovedá firma.</li>
        <li>Dobrovoľné údaje v profile (narodeniny, meniny, sociálne siete, fotka) – súhlas, čl. 6 ods. 1 písm. a); dajú sa kedykoľvek zmazať.</li>
        <li>Overenie dochádzky polohou – súhlas (zapína sa v appke na zariadení) a oprávnený záujem firmy na evidencii práce.</li>
        <li>Bezpečnosť (ochrana prihlásenia, história zmien, zachytávanie chýb) – oprávnený záujem na bezpečnej a funkčnej aplikácii, čl. 6 ods. 1 písm. f).</li>
        <li>Push upozornenia a funkčné ukladanie v prehliadači – súhlas.</li>
      </ul>

      <h2>4. Ako dlho údaje uchovávame</h2>
      <ul>
        <li>Účet a údaje firmy: počas používania aplikácie; po zmazaní firmy alebo účtu sa zmažú. Zmazané položky ostanú v koši firmy, kým ich admin nevyprázdni.</li>
        <li>Automaticky zachytené chyby appky: vyriešené 90 dní, ostatné najviac 180 dní (automatické mazanie).</li>
        <li>Záznamy o pokusoch o prihlásenie: 30 dní; blokovanie sa zmaže deň po skončení (automatické mazanie).</li>
        <li>Zálohy databázy a prevádzkové logy hostingu: podľa podmienok poskytovateľov (Supabase, GitHub) – spravidla dni až týždne.</li>
        <li>Údaje, ktoré firma musí uchovávať podľa zákona (napr. evidencia pracovného času, BOZP): podľa príslušných predpisov – určuje firma.</li>
      </ul>

      <h2>5. Príjemcovia a sprostredkovatelia</h2>
      <ul>
        <li>Supabase Inc. (USA) – databáza, prihlásenie, súbory a serverové funkcie; údaje sú uložené v dátovom centre v EÚ (Írsko, AWS eu-west-1).</li>
        <li>GitHub Inc. / Microsoft (USA) – hosting webovej aplikácie (GitHub Pages).</li>
        <li>OpenStreetMap Foundation (Nominatim) – vyhľadanie adresy, keď ju zadáte (napr. miesto eventu, sklad, domov); posiela sa len hľadaný text.</li>
        <li>OSRM (router.project-osrm.org) – výpočet trasy a kilometrov zo skladu na miesto eventu; posielajú sa len súradnice.</li>
        <li>Open-Meteo (Švajčiarsko) – počasie pre miesto eventu; posielajú sa len súradnice.</li>
        <li>Poskytovateľ push upozornení vášho prehliadača (napr. Google, Apple, Mozilla) – len ak upozornenia zapnete.</li>
        <li>Odosielanie e-mailov (potvrdenie účtu, obnova hesla, upozornenia) – Supabase Auth; e-maily o nahlásenej chybe a novom evente cez Resend, Inc. (USA), ak sú zapnuté.</li>
        <li>Členovia vašej firmy podľa svojich oprávnení; prepojené partnerské firmy len to, čo im firma výslovne zdieľa.</li>
      </ul>

      <h2>6. Prenos do tretích krajín</h2>
      <p>
        Niektorí poskytovatelia sídlia v USA (Supabase, GitHub, Resend, poskytovatelia push upozornení). Prenos sa opiera o rozhodnutie Komisie o
        primeranosti (EU-U.S. Data Privacy Framework) alebo štandardné zmluvné doložky, ktoré títo poskytovatelia uvádzajú vo svojich zmluvných
        podmienkach (DPA).
        Databáza a súbory sú uložené v EÚ.
      </p>

      <h2>7. Vaše práva</h2>
      <ul>
        <li>prístup k údajom a kópia (čl. 15) – svoje údaje vidíte v profile; export údajov firmy je v Nastaveniach → Import a export,</li>
        <li>oprava (čl. 16) – priamo v profile alebo cez admina firmy,</li>
        <li>vymazanie (čl. 17) – dobrovoľné údaje zmažete sami, celý účet v Nastaveniach → Účet → Moje údaje alebo na požiadanie e-mailom,</li>
        <li>obmedzenie spracúvania (čl. 18),</li>
        <li>prenosnosť (čl. 20) – export v strojovo čitateľnom formáte (Excel / JSON),</li>
        <li>námietka proti spracúvaniu na základe oprávneného záujmu (čl. 21),</li>
        <li>odvolanie súhlasu kedykoľvek (bez vplyvu na zákonnosť spracúvania predtým),</li>
        <li>
          podanie sťažnosti na Úrad na ochranu osobných údajov SR, Hraničná 12, 820 07 Bratislava,{' '}
          <a href="https://dataprotection.gov.sk" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            dataprotection.gov.sk
          </a>
          .
        </li>
      </ul>
      <p>
        Žiadosť pošlite e-mailom na <Mail />; ak ide o údaje, ktoré zadala vaša firma, aj adminovi firmy. Odpovieme do jedného
        mesiaca.
      </p>

      <h2>8. Automatizované rozhodovanie</h2>
      <p>
        Aplikácia nerobí automatizované rozhodnutia s právnymi účinkami ani profilovanie. Automatické je len dočasné zablokovanie prihlásenia po 5
        neúspešných pokusoch (na 5 minút) – ochrana účtu pred hádaním hesla.
      </p>

      <h2>9. Zabezpečenie</h2>
      <p>
        Šifrované spojenie (HTTPS), heslá len ako bcrypt odtlačok, prístup k údajom firmy riadený oprávneniami priamo v databáze (row-level
        security), ochrana prihlásenia pred hádaním hesiel, obmedzenie skriptov a spojení (Content-Security-Policy), súbory dostupné len členom
        firmy cez dočasné odkazy.
      </p>
    </Page>
  )
}

const STORAGE_ROWS: [string, string, string, string][] = [
  ['sb-…-auth-token', 'Nevyhnutné', 'Prihlásenie (Supabase) – kým sa neodhlásite', 'localStorage'],
  ['rigtrack:active-company', 'Nevyhnutné', 'Vybraná firma', 'localStorage, do zmeny'],
  ['rigtrack:login-lock', 'Nevyhnutné', 'Odpočet pri zablokovanom prihlásení', 'localStorage, kým blok trvá'],
  ['rigtrack.pack.*', 'Nevyhnutné', 'Pack list rozpracovaný bez signálu (aby sa nestratil)', 'localStorage, kým sa neodošle'],
  ['rigtrack.attendance.enabled', 'Nevyhnutné', 'Dochádzka polohou zapnutá na tomto zariadení (zapínate ju vy)', 'localStorage, do vypnutia'],
  ['rigtrack:consent', 'Nevyhnutné', 'Vaša voľba v tejto lište', 'localStorage, do zmeny pravidiel'],
  ['Cache Storage (service worker)', 'Nevyhnutné', 'Súbory appky na rýchle a offline spustenie (bez vašich údajov)', 'do novej verzie'],
  ['rigtrack:theme', 'Funkčné', 'Svetlý / tmavý režim', 'localStorage, do zmeny'],
  ['rigtrack.*.filter, rigtrack.calendar.view', 'Funkčné', 'Filtre a zobrazenie zoznamov', 'localStorage, do zmeny'],
  ['rigtrack:collapsed, rigtrack:pinned-nav, rigtrack:pinned-companies:*', 'Funkčné', 'Zbalené časti, pripnuté položky a firmy', 'localStorage, do zmeny'],
  ['rigtrack:stats-*, rigtrack:poster:*, rigtrack.quote.*, rigtrack.label.*, rigtrack.tape, rigtrack.led*', 'Funkčné', 'Rozloženie štatistík a nastavenia tlače, štítkov a kalkulačiek', 'localStorage, do zmeny'],
  ['rigtrack.seenVersion, rigtrack:install-hint-hidden, rigtrack:event-reminders-dismissed:*', 'Funkčné', 'Čo ste už videli (novinky, návod, pripomienky)', 'localStorage, do zmeny'],
]

export function CookiesPage() {
  return (
    <Page title="Zásady používania cookies a úložiska">
      <p>
        RigTrack <strong>nepoužíva cookies</strong>, analytické nástroje, reklamu ani remarketing a nenačítava písma, obrázky ani skripty z cudzích
        serverov. Do úložiska prehliadača (localStorage) ukladá len údaje uvedené nižšie. Nevyhnutné sú potrebné na fungovanie a nepotrebujú súhlas;
        funkčné sa uložia len s vaším súhlasom – bez neho sa ich zápis vôbec nevykoná.
      </p>
      <p>
        Verzia pravidiel: {CONSENT_VERSION}. Voľbu si zapamätáme v prehliadači (a po prihlásení aj v účte ako záznam o súhlase s dátumom a verziou).
        Kedykoľvek ju zmeníte alebo odvoláte:{' '}
        <button type="button" className="text-accent hover:underline" onClick={openConsentSettings}>
          Nastavenia ukladania
        </button>
        . Pri odvolaní sa funkčné údaje z prehliadača hneď zmažú.
      </p>
      <h2>Čo ukladáme</h2>
      <table>
        <thead>
          <tr>
            <th>Kľúč</th>
            <th>Kategória</th>
            <th>Účel</th>
            <th>Kde / ako dlho</th>
          </tr>
        </thead>
        <tbody>
          {STORAGE_ROWS.map(([key, category, purpose, where]) => (
            <tr key={key}>
              <td className="font-mono text-xs">{key}</td>
              <td>{category}</td>
              <td>{purpose}</td>
              <td>{where}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Analytické a marketingové</h2>
      <p>Nepoužívame. Ak by sa to v budúcnosti zmenilo, spustia sa až po vašom výslovnom súhlase a táto stránka sa aktualizuje.</p>
      <h2>Ako údaje zmazať</h2>
      <p>Odhlásením sa zmaže prihlásenie. Všetko ostatné zmažete v nastaveniach prehliadača (vymazanie údajov stránky).</p>
    </Page>
  )
}

export function TermsPage() {
  return (
    <Page title="Podmienky používania">
      <p>
        Tieto podmienky upravujú používanie webovej aplikácie RigTrack. Prevádzkovateľ: {OPERATOR}, kontakt: <Mail />.
      </p>
      <h2>1. Prístup</h2>
      <ul>
        <li>Účet sa dá vytvoriť len z pozvánky do firmy. Novú firmu zakladá prevádzkovateľ alebo ten, komu to povolí.</li>
        <li>Prihlasovacie údaje nesmiete nikomu dať. Po 5 neúspešných pokusoch o prihlásenie sa prihlasovanie na 5 minút zablokuje.</li>
        <li>Admin firmy určuje, kto čo vo firme vidí a smie (role a oprávnenia).</li>
      </ul>
      <h2>Vek</h2>
      <p>
        Účet si môže vytvoriť osoba, ktorá má aspoň 16 rokov (potvrdzuje to pri registrácii). Ak chce firma do aplikácie pozvať mladšieho
        pracovníka, zodpovedá za súhlas jeho zákonného zástupcu. Aplikácia nie je určená deťom a nezbiera údaje o veku okrem dobrovoľného dátumu
        narodenia v profile.
      </p>
      <h2>2. Údaje firmy</h2>
      <ul>
        <li>Za obsah, ktorý firma a jej členovia zadajú (vrátane osobných údajov zamestnancov, posádky a kontaktov), zodpovedá firma.</li>
        <li>Nahrávajte len súbory a fotky, na ktoré máte právo.</li>
        <li>Firma si údaje kedykoľvek vyexportuje (Nastavenia → Import a export) a môže firmu zmazať.</li>
      </ul>
      <h2>3. Zakázané konanie</h2>
      <ul>
        <li>obchádzanie oprávnení, prístup k cudzím údajom, automatizované skúšanie hesiel, zaťažovanie služby,</li>
        <li>nahrávanie škodlivého obsahu alebo obsahu porušujúceho práva tretích osôb.</li>
      </ul>
      <h2>Nahlásenie nezákonného obsahu alebo porušenia autorských práv</h2>
      <p>
        Obsah (fotky, dokumenty, texty) nahrávajú používatelia a vidia ho len členovia ich firmy. Ak si myslíte, že niektorý obsah je nezákonný alebo
        porušuje vaše práva (napr. autorské), napíšte na <Mail />: kde obsah je (firma, stránka), prečo je podľa vás nezákonný, kto ste a ako vás
        kontaktovať. Oznámenie preveríme bez zbytočného odkladu, o výsledku vás informujeme a ak je oprávnené, obsah odstránime alebo zneprístupníme;
        prijaté oznámenia a zásahy evidujeme. Kontaktné miesto pre úrady aj používateľov podľa nariadenia (EÚ) 2022/2065 (DSA) je ten istý e-mail.
      </p>
      <h2>4. Dostupnosť a zodpovednosť</h2>
      <p>
        RigTrack je pracovný nástroj, ktorý vyvíja jedna osoba, a priebežne sa mení (časti označené „Vo fáze vývoja“ si pred použitím
        skontrolujte). Poskytuje sa tak, ako je, bez záruky nepretržitej dostupnosti; prevádzkovateľ zodpovedá len v rozsahu, ktorý nemožno
        vylúčiť podľa práva SR. Dôležité údaje si pravidelne exportujte. Otázky a podporu riešte e-mailom.
      </p>
      <h2>5. Ochrana osobných údajov</h2>
      <p>
        Pozri <Link to="/ochrana-sukromia" className="text-accent hover:underline">Zásady ochrany osobných údajov</Link> a{' '}
        <Link to="/cookies" className="text-accent hover:underline">Zásady používania cookies</Link>.
      </p>
      <h2>6. Zmeny a rozhodné právo</h2>
      <p>O zmenách podmienok vás upozorníme v aplikácii. Vzťahy sa riadia právom Slovenskej republiky.</p>
    </Page>
  )
}
