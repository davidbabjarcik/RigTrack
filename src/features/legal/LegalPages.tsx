import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { CONSENT_VERSION, openConsentSettings } from '@/lib/consent'
import { useLang, useT } from '@/lib/i18n'

// Právne stránky (verejné, aj bez prihlásenia). Obsah vychádza zo skutočnej implementácie appky (databáza, služby,
// automatické mazanie) a z údajov, ktoré dodal prevádzkovateľ (3. 11. 2026). Anglická verzia je preklad; pri rozpore
// platí slovenská.

const UPDATED = '3. 11. 2026'
const UPDATED_EN = '3 November 2026'
const OPERATOR = 'Dávid Babjarčík'
const CONTACT = 'davidbabjarcik@gmail.com'
const Mail = () => (
  <a href={`mailto:${CONTACT}`} className="text-accent hover:underline">
    {CONTACT}
  </a>
)

function Page({ title, children }: { title: string; children: ReactNode }) {
  const signedIn = Boolean(useAuth().session)
  const t = useT()
  const en = useLang() === 'en'
  return (
    <article className="flex flex-col gap-6">
      <Link to={signedIn ? '/company/select' : '/auth'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {signedIn ? t('Späť', 'Back') : t('Prihlásenie', 'Sign in')}
      </Link>
      <header className="rounded-2xl border bg-surface p-6 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t(`Platné od ${UPDATED}`, `Effective from ${UPDATED_EN}`)}</p>
        {en && (
          <p className="mt-1 text-xs text-muted-foreground">This is an English translation. If it differs from the Slovak version, the Slovak version applies.</p>
        )}
        <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={t('Právne informácie', 'Legal information')}>
          <Link to="/ochrana-sukromia" className="text-accent hover:underline">
            {t('Ochrana súkromia', 'Privacy')}
          </Link>
          <Link to="/cookies" className="text-accent hover:underline">
            {t('Cookies a úložisko', 'Cookies and storage')}
          </Link>
          <Link to="/podmienky-pouzivania" className="text-accent hover:underline">
            {t('Podmienky používania', 'Terms of use')}
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
  if (useLang() === 'en') return <PrivacyEn />
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
        <li>Cloudflare, Inc. (USA) – Turnstile, overenie, že nie ste robot, pri prihlásení, registrácii a obnove hesla (ochrana pred zneužitím účtov); spracúva technické údaje prehliadača a IP adresu, bez reklamných cookies.</li>
        <li>OpenStreetMap Foundation (Nominatim) – vyhľadanie adresy, keď ju zadáte (napr. miesto eventu, sklad, domov); posiela sa len hľadaný text.</li>
        <li>OSRM (router.project-osrm.org) – výpočet trasy a kilometrov zo skladu na miesto eventu; posielajú sa len súradnice.</li>
        <li>Open-Meteo (Švajčiarsko) – počasie pre miesto eventu; posielajú sa len súradnice.</li>
        <li>Poskytovateľ push upozornení vášho prehliadača (napr. Google, Apple, Mozilla) – len ak upozornenia zapnete.</li>
        <li>Odosielanie e-mailov (potvrdenie účtu, obnova hesla, upozornenia) – Supabase Auth; e-maily o nahlásenej chybe a novom evente cez Resend, Inc. (USA), ak sú zapnuté.</li>
        <li>Členovia vašej firmy podľa svojich oprávnení; prepojené partnerské firmy len to, čo im firma výslovne zdieľa.</li>
      </ul>

      <h2>6. Prenos do tretích krajín</h2>
      <p>
        Niektorí poskytovatelia sídlia v USA (Supabase, GitHub, Cloudflare, Resend, poskytovatelia push upozornení). Prenos sa opiera o rozhodnutie Komisie o
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
  ['rigtrack:stale-reload', 'Nevyhnutné', 'Čas posledného obnovenia po novej verzii (aby sa stránka neobnovovala dokola)', 'sessionStorage, do zatvorenia karty'],
  ['rigtrack:consent', 'Nevyhnutné', 'Vaša voľba v tejto lište', 'localStorage, do zmeny pravidiel'],
  ['Cache Storage (service worker)', 'Nevyhnutné', 'Súbory appky na rýchle a offline spustenie (bez vašich údajov)', 'do novej verzie'],
  ['rigtrack:theme', 'Funkčné', 'Svetlý / tmavý režim', 'localStorage, do zmeny'],
  ['rigtrack:lang', 'Funkčné', 'Jazyk appky (slovenčina / angličtina)', 'localStorage, do zmeny'],
  ['rigtrack.*.filter, rigtrack.calendar.view', 'Funkčné', 'Filtre a zobrazenie zoznamov', 'localStorage, do zmeny'],
  ['rigtrack:collapsed, rigtrack:pinned-nav, rigtrack:pinned-companies:*', 'Funkčné', 'Zbalené časti, pripnuté položky a firmy', 'localStorage, do zmeny'],
  ['rigtrack:stats-*, rigtrack:poster:*, rigtrack.quote.*, rigtrack.label.*, rigtrack.tape, rigtrack.led*', 'Funkčné', 'Rozloženie štatistík a nastavenia tlače, štítkov a kalkulačiek', 'localStorage, do zmeny'],
  ['rigtrack.seenVersion, rigtrack:install-hint-hidden, rigtrack:event-reminders-dismissed:*', 'Funkčné', 'Čo ste už videli (novinky, návod, pripomienky)', 'localStorage, do zmeny'],
]

export function CookiesPage() {
  if (useLang() === 'en') return <CookiesEn />
  return (
    <Page title="Zásady používania cookies a úložiska">
      <p>
        RigTrack <strong>nepoužíva cookies</strong>, analytické nástroje, reklamu ani remarketing a nenačítava písma ani obrázky z cudzích serverov.
        Jedinou výnimkou je overenie, že nie ste robot (Cloudflare Turnstile), na stránke prihlásenia – je nevyhnutné na ochranu účtov, preto
        nepotrebuje súhlas; Cloudflare uvádza, že nepoužíva reklamné cookies ani sledovanie. Do úložiska prehliadača (localStorage) ukladá len údaje uvedené nižšie. Nevyhnutné sú potrebné na fungovanie a nepotrebujú súhlas;
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
  if (useLang() === 'en') return <TermsEn />
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

// ---------------------------------------------------------------------------
// English (translation of the Slovak pages above – keep both in sync)
// ---------------------------------------------------------------------------

function OperatorEn() {
  return (
    <ul>
      <li>Operator of the RigTrack application: {OPERATOR} – a private individual who develops and runs the application as a work tool (not a business, therefore no company ID).</li>
      <li>
        E-mail for questions and requests about personal data: <Mail />
      </li>
      <li>Data protection officer (DPO): not appointed – not required for this scope of processing.</li>
    </ul>
  )
}

function PrivacyEn() {
  return (
    <Page title="Privacy policy">
      <p>
        This policy explains what personal data the RigTrack web application (records of equipment, cases, events, loans, crew and service for
        production companies) processes, why, for how long, and what rights you have under Regulation (EU) 2016/679 (GDPR) and Slovak Act No.
        18/2018 Coll. on the protection of personal data.
      </p>

      <h2>1. Who is the controller</h2>
      <OperatorEn />
      <p>
        <strong>Companies in the application.</strong> Each company (e.g. a production company) that uses RigTrack is a separate controller of the
        data about its employees, crew, contacts and clients that it enters into the application; the operator of RigTrack is its processor. A
        written data processing agreement (Art. 28 GDPR) has not been concluded yet; a company can request one by e-mail.
      </p>

      <h2>2. What data we process</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Data</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account</td>
            <td>e-mail, name, password (stored only as a bcrypt hash – nobody can read it), time of registration and last sign-in</td>
            <td>from you when creating the account from an invitation</td>
          </tr>
          <tr>
            <td>Company membership</td>
            <td>company, role and permissions, invitations (e-mail of the invited person)</td>
            <td>company admin</td>
          </tr>
          <tr>
            <td>Personal profile and employee card</td>
            <td>
              phone, e-mail, date of birth, name day, driving licence categories, home address (with location to verify attendance from home), social
              networks, skills, position, photo, notes
            </td>
            <td>from you or the company admin (filling in is voluntary)</td>
          </tr>
          <tr>
            <td>Devices</td>
            <td>device name, MAC addresses (Wi-Fi, ethernet) – for access to company networks</td>
            <td>from you or the admin</td>
          </tr>
          <tr>
            <td>Work and attendance</td>
            <td>
              event crew, attendance confirmation, time sheets and breaks, attendance (start and end time, location check – only whether you were on site
              and the distance in metres is stored, not coordinates), driving, activities, rates and payouts, expenses
            </td>
            <td>from you and the company</td>
          </tr>
          <tr>
            <td>Damage and injuries</td>
            <td>description of the incident, person concerned, severity, costs – an injury may involve health data (special category, Art. 9 GDPR)</td>
            <td>company</td>
          </tr>
          <tr>
            <td>Contacts and clients</td>
            <td>names, phones, e-mails, companies of organisers, partners and clients, offers, loans and signatures on equipment handover</td>
            <td>company</td>
          </tr>
          <tr>
            <td>Files</td>
            <td>photos of equipment, cases, events, event documents, attachments, company logo, screenshots when reporting a bug</td>
            <td>uploaded by users</td>
          </tr>
          <tr>
            <td>Change history</td>
            <td>who changed what in the company and when (author's name with the record)</td>
            <td>automatically</td>
          </tr>
          <tr>
            <td>Notifications</td>
            <td>in-app notifications; with push notifications switched on, the browser subscription address and device type</td>
            <td>automatically / after you switch them on</td>
          </tr>
          <tr>
            <td>Errors and reports</td>
            <td>reported bugs (text, page, version, browser, screenshot); automatically captured app errors (e-mail, page, version, browser)</td>
            <td>from you / automatically</td>
          </tr>
          <tr>
            <td>Sign-in security</td>
            <td>number of failed attempts and lock time; e-mail and IP address only as a one-way hash (HMAC), not readable</td>
            <td>automatically when signing in</td>
          </tr>
          <tr>
            <td>Technical data</td>
            <td>IP address and browser data in the operational logs of hosting and the database</td>
            <td>automatically (providers below)</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Purposes and legal bases</h2>
      <ul>
        <li>Providing the application and account (sign-in, companies, records) – performance of a contract, Art. 6(1)(b) GDPR.</li>
        <li>
          Employee and crew data entered by a company – the company's legitimate interest in organising work and fulfilling its obligations as an
          employer, Art. 6(1)(b), (c), (f); the company is responsible for the correct legal basis.
        </li>
        <li>Injury (health) data – fulfilling health and safety obligations, Art. 9(2)(b) GDPR; the company is responsible.</li>
        <li>Voluntary profile data (birthday, name day, social networks, photo) – consent, Art. 6(1)(a); can be deleted at any time.</li>
        <li>Attendance check by location – consent (switched on in the app on the device) and the company's legitimate interest in recording work.</li>
        <li>Security (sign-in protection, change history, error capture) – legitimate interest in a secure and working application, Art. 6(1)(f).</li>
        <li>Push notifications and functional browser storage – consent.</li>
      </ul>

      <h2>4. How long we keep data</h2>
      <ul>
        <li>Account and company data: while the application is used; deleted when the company or account is deleted. Deleted items stay in the company's bin until the admin empties it.</li>
        <li>Automatically captured app errors: resolved ones 90 days, others at most 180 days (automatic deletion).</li>
        <li>Records of sign-in attempts: 30 days; a lock is deleted one day after it ends (automatic deletion).</li>
        <li>Database backups and hosting logs: according to the providers' terms (Supabase, GitHub) – usually days to weeks.</li>
        <li>Data a company must keep by law (e.g. working time records, health and safety): according to the relevant regulations – set by the company.</li>
      </ul>

      <h2>5. Recipients and processors</h2>
      <ul>
        <li>Supabase Inc. (USA) – database, sign-in, files and server functions; data is stored in a data centre in the EU (Ireland, AWS eu-west-1).</li>
        <li>GitHub Inc. / Microsoft (USA) – hosting of the web application (GitHub Pages).</li>
        <li>Cloudflare, Inc. (USA) – Turnstile, the check that you are not a robot when signing in, registering and resetting a password (protection against account abuse); processes technical browser data and the IP address, without advertising cookies.</li>
        <li>OpenStreetMap Foundation (Nominatim) – address search when you enter one (e.g. event venue, warehouse, home); only the search text is sent.</li>
        <li>OSRM (router.project-osrm.org) – calculation of the route and kilometres from the warehouse to the event venue; only coordinates are sent.</li>
        <li>Open-Meteo (Switzerland) – weather for the event venue; only coordinates are sent.</li>
        <li>The push notification provider of your browser (e.g. Google, Apple, Mozilla) – only if you switch notifications on.</li>
        <li>Sending e-mails (account confirmation, password reset, notifications) – Supabase Auth; e-mails about a reported bug and a new event via Resend, Inc. (USA), if switched on.</li>
        <li>Members of your company according to their permissions; linked partner companies only what the company explicitly shares with them.</li>
      </ul>

      <h2>6. Transfers to third countries</h2>
      <p>
        Some providers are based in the USA (Supabase, GitHub, Cloudflare, Resend, push notification providers). Transfers rely on the Commission's
        adequacy decision (EU-U.S. Data Privacy Framework) or standard contractual clauses that these providers include in their terms (DPA). The
        database and files are stored in the EU.
      </p>

      <h2>7. Your rights</h2>
      <ul>
        <li>access to data and a copy (Art. 15) – you see your data in your profile; the company data export is in Settings → Import and export,</li>
        <li>rectification (Art. 16) – directly in your profile or through the company admin,</li>
        <li>erasure (Art. 17) – you delete voluntary data yourself, the whole account in Settings → Account → My data or on request by e-mail,</li>
        <li>restriction of processing (Art. 18),</li>
        <li>portability (Art. 20) – export in a machine-readable format (Excel / JSON),</li>
        <li>objection to processing based on legitimate interest (Art. 21),</li>
        <li>withdrawal of consent at any time (without affecting the lawfulness of processing before),</li>
        <li>
          lodging a complaint with the Office for Personal Data Protection of the Slovak Republic, Hraničná 12, 820 07 Bratislava,{' '}
          <a href="https://dataprotection.gov.sk" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            dataprotection.gov.sk
          </a>
          .
        </li>
      </ul>
      <p>
        Send your request by e-mail to <Mail />; if it concerns data entered by your company, also to the company admin. We reply within one month.
      </p>

      <h2>8. Automated decision-making</h2>
      <p>
        The application makes no automated decisions with legal effects and no profiling. The only automatic step is a temporary sign-in lock after
        5 failed attempts (for 5 minutes) – protecting the account against password guessing.
      </p>

      <h2>9. Security</h2>
      <p>
        Encrypted connection (HTTPS), passwords only as a bcrypt hash, access to company data controlled by permissions directly in the database
        (row-level security), sign-in protection against password guessing, restricted scripts and connections (Content-Security-Policy), files
        available only to company members through temporary links.
      </p>
    </Page>
  )
}

const STORAGE_ROWS_EN: [string, string, string, string][] = [
  ['sb-…-auth-token', 'Necessary', 'Sign-in (Supabase) – until you sign out', 'localStorage'],
  ['rigtrack:active-company', 'Necessary', 'Selected company', 'localStorage, until changed'],
  ['rigtrack:login-lock', 'Necessary', 'Countdown while sign-in is locked', 'localStorage, while the lock lasts'],
  ['rigtrack.pack.*', 'Necessary', 'Pack list in progress without signal (so it is not lost)', 'localStorage, until sent'],
  ['rigtrack.attendance.enabled', 'Necessary', 'Attendance by location switched on on this device (you switch it on)', 'localStorage, until switched off'],
  ['rigtrack:stale-reload', 'Necessary', 'Time of the last reload after a new version (so the page does not reload over and over)', 'sessionStorage, until the tab is closed'],
  ['rigtrack:consent', 'Necessary', 'Your choice in this banner', 'localStorage, until the rules change'],
  ['Cache Storage (service worker)', 'Necessary', 'App files for fast and offline start (without your data)', 'until a new version'],
  ['rigtrack:theme', 'Functional', 'Light / dark mode', 'localStorage, until changed'],
  ['rigtrack:lang', 'Functional', 'App language (Slovak / English)', 'localStorage, until changed'],
  ['rigtrack.*.filter, rigtrack.calendar.view', 'Functional', 'List filters and views', 'localStorage, until changed'],
  ['rigtrack:collapsed, rigtrack:pinned-nav, rigtrack:pinned-companies:*', 'Functional', 'Collapsed sections, pinned items and companies', 'localStorage, until changed'],
  ['rigtrack:stats-*, rigtrack:poster:*, rigtrack.quote.*, rigtrack.label.*, rigtrack.tape, rigtrack.led*', 'Functional', 'Statistics layout and settings of printing, labels and calculators', 'localStorage, until changed'],
  ['rigtrack.seenVersion, rigtrack:install-hint-hidden, rigtrack:event-reminders-dismissed:*', 'Functional', 'What you have already seen (news, guide, reminders)', 'localStorage, until changed'],
]

function CookiesEn() {
  return (
    <Page title="Cookies and storage policy">
      <p>
        RigTrack <strong>does not use cookies</strong>, analytics, advertising or remarketing, and does not load fonts or images from third-party
        servers. The only exception is the check that you are not a robot (Cloudflare Turnstile) on the sign-in page – it is necessary to protect
        accounts, so it does not need consent; Cloudflare states that it uses no advertising cookies or tracking. The app stores in browser storage
        (localStorage) only the data listed below. Necessary entries are required for the app to work and need no consent; functional entries are
        stored only with your consent – without it they are not written at all.
      </p>
      <p>
        Rules version: {CONSENT_VERSION}. We remember your choice in the browser (and after sign-in also in your account as a consent record with
        the date and version). You can change or withdraw it at any time:{' '}
        <button type="button" className="text-accent hover:underline" onClick={openConsentSettings}>
          Storage settings
        </button>
        . On withdrawal, functional data is deleted from the browser immediately.
      </p>
      <h2>What we store</h2>
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Category</th>
            <th>Purpose</th>
            <th>Where / how long</th>
          </tr>
        </thead>
        <tbody>
          {STORAGE_ROWS_EN.map(([key, category, purpose, where]) => (
            <tr key={key}>
              <td className="font-mono text-xs">{key}</td>
              <td>{category}</td>
              <td>{purpose}</td>
              <td>{where}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Analytics and marketing</h2>
      <p>We do not use them. If this ever changes, they will start only after your explicit consent and this page will be updated.</p>
      <h2>How to delete the data</h2>
      <p>Signing out deletes the sign-in. You delete everything else in your browser settings (clear site data).</p>
    </Page>
  )
}

function TermsEn() {
  return (
    <Page title="Terms of use">
      <p>
        These terms govern the use of the RigTrack web application. Operator: {OPERATOR}, contact: <Mail />.
      </p>
      <h2>1. Access</h2>
      <ul>
        <li>An account can be created only from an invitation to a company. A new company is created by the operator or by someone they allow.</li>
        <li>You must not give your sign-in details to anyone. After 5 failed sign-in attempts, signing in is locked for 5 minutes.</li>
        <li>The company admin decides who can see and do what in the company (roles and permissions).</li>
      </ul>
      <h2>Age</h2>
      <p>
        An account can be created by a person at least 16 years old (confirmed at registration). If a company wants to invite a younger worker, it is
        responsible for the consent of their legal guardian. The application is not intended for children and collects no age data except the
        voluntary date of birth in the profile.
      </p>
      <h2>2. Company data</h2>
      <ul>
        <li>The company is responsible for the content that it and its members enter (including personal data of employees, crew and contacts).</li>
        <li>Upload only files and photos you have the right to.</li>
        <li>The company can export its data at any time (Settings → Import and export) and can delete the company.</li>
      </ul>
      <h2>3. Prohibited conduct</h2>
      <ul>
        <li>bypassing permissions, accessing other people's data, automated password guessing, overloading the service,</li>
        <li>uploading harmful content or content that infringes the rights of third parties.</li>
      </ul>
      <h2>Reporting illegal content or copyright infringement</h2>
      <p>
        Content (photos, documents, texts) is uploaded by users and is visible only to members of their company. If you believe some content is
        illegal or infringes your rights (e.g. copyright), write to <Mail />: where the content is (company, page), why you think it is illegal, who
        you are and how to contact you. We review the notice without undue delay, inform you of the result and, if justified, remove or disable the
        content; we keep a record of notices received and actions taken. The point of contact for authorities and users under Regulation (EU)
        2022/2065 (DSA) is the same e-mail.
      </p>
      <h2>4. Availability and liability</h2>
      <p>
        RigTrack is a work tool developed by one person and it changes continuously (check parts marked “In development” before use). It is
        provided as is, without a guarantee of uninterrupted availability; the operator is liable only to the extent that cannot be excluded under
        Slovak law. Export important data regularly. Handle questions and support by e-mail.
      </p>
      <h2>5. Personal data protection</h2>
      <p>
        See the <Link to="/ochrana-sukromia" className="text-accent hover:underline">Privacy policy</Link> and the{' '}
        <Link to="/cookies" className="text-accent hover:underline">Cookies policy</Link>.
      </p>
      <h2>6. Changes and governing law</h2>
      <p>We will notify you of changes to the terms in the application. Relations are governed by the law of the Slovak Republic.</p>
    </Page>
  )
}
