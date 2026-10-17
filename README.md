# RigTrack

**Evidencia techniky, cases, výpožičiek a eventov pre event / AV firmy.** · Verzia **1.7**

RigTrack je webová aplikácia (PWA), ktorá drží na jednom mieste všetko, čo sa v požičovni a na akciách
deje: technika a jej kusy, cases a sklad, výpožičky s listinami, eventy s posádkou a plánom nakladania,
servis, vozidlá, nákupy aj interná agenda firmy. Beží v prehliadači na počítači aj na mobile a dá sa
nainštalovať ako aplikácia. Jedna inštalácia obslúži viac firiem – každá vidí len svoje dáta.

| | |
|---|---|
| **Frontend** | React · TypeScript · Vite · Tailwind CSS · React Router · TanStack Query |
| **Backend** | Supabase – prihlásenie, Postgres s Row Level Security, úložisko súborov |
| **Ďalej** | `vite-plugin-pwa`, `pdfjs-dist` (čítanie PDF), `read-excel-file` / `write-excel-file` |

**Obsah:** [Čo je nové](#čo-je-nové) · [Moduly](#moduly) · [Bezpečnosť](#bezpečnosť) ·
[Obmedzenia](#obmedzenia) · [Spustenie](#spustenie) · [Supabase](#pripojenie-supabase) ·
[Nasadenie](#nasadenie-na-vlastný-server) · [Pre vývojárov](#pre-vývojárov)

---

## Čo je nové

### 1.7 – 17. 10. 2026

- **Zamestnanci** – nový modul: tím s fotkou, pozíciou, telefónom, e-mailom, zručnosťami a poznámkou,
  stav na dnes (voľný / na evente / nemôže), **kedy nemôže** (dovolenka, škola…) a najbližšie eventy.
  Členovia sa zobrazujú sami, brigádnici bez účtu sa dajú pridať menom. Svoju kartu a svoje „kedy nemôžem“
  si upraví každý sám; ostatných spravuje ten, kto má nové oprávnenie *Zamestnanci – spravovať*.
- V posádke eventu sa ukáže, keď niekto v termíne nemôže.
- **Pódium Nivtec:** na pôdoryse je označená doska, ktorou začať stavať (1), a pero sa kreslí podľa otočenia
  dosiek (dlhšou stranou dozadu: pero dozadu a doprava, začína sa vľavo vzadu; dlhšou stranou dopredu:
  pero dozadu a doľava, začína sa vpravo vzadu). V kalkulačke sa dá vybrať, ktorými menšími doskami doplniť
  zvyšok (napr. len 2 × 0,5 m alebo len 1 × 0,5 m); doska 2 × 0,5 m pribudla medzi predvolené.

Nové migrácie: `0046`.

### 1.6 – 17. 10. 2026

- **Balíky techniky** – v Nastaveniach → Balíky sa poskladajú sady z celých cases a techniky s počtami
  (napr. „Malý zvukový balík“, „Veľký svetelný balík“), zoradené podľa kategórie.
- Pri evente aj výpožičke sa balík pridá jedným klikom; počty sa pripočítajú k tomu, čo už je vybrané,
  a technika, ktorá už je v pridanom case, sa nepridá druhýkrát.
- Balíky sú aj v zálohe firmy.

Nové migrácie: `0045`.

### 1.5 – 17. 10. 2026

- **Pripomienky aj pri výpožičkách** – rovnaké pravidlá sa ukazujú pri vytváraní a úprave výpožičky.
- **Koľko treba:** pravidlo môže chcieť aspoň jeden kus, alebo **daný počet na každý kus** (napr. 4 repráky =
  4 káble NL4). Pripomienka napíše, koľko chýba, a tlačidlo **Pridať 3 ks** pridá presne toľko
  (pri technike, ktorá už je vybraná, počet navýši).

Nové migrácie: žiadne.

### 1.4 – 17. 10. 2026

- **Pripomienky pri eventoch** – v Nastaveniach → Pripomienky sa zadajú pravidlá „keď je na evente X,
  pripomeň Y“ (podľa techniky, kategórie, case, druhu, typu zvuku alebo textu v názve). Napr. zosilňovač →
  kabeláž NL4, svetlá → case s hákmi. Keď na evente chýba, pri technike sa ukáže pripomienka
  s tlačidlom **Pridať** (alebo výber techniky) a **Netreba**.
- Pravidlá sú aj v zálohe firmy.

Nové migrácie: `0044`.

### 1.3 – 15. 10. 2026

- **Štatistiky:** okrem toho, čo chcem vidieť, sa dá aj **preskladať poradie** – sekcie aj jednotlivé
  štatistiky šípkami hore/dole; „Pôvodné poradie“ ich vráti.
- **Pódium Nivtec** *(vo vývoji)*:
  - **molo** – výbežok z pódia (strana, poloha, šírka, dĺžka) v rovnakej výške, so spoločnými nohami
    s pódiom, voliteľnou plachtou a otvorom v plachte, lištách a zábradlí pódia;
  - **rizery** – jeden alebo viac (napr. pre bicie), rozmer, výška, poloha na pódiu, **pevné na nohách alebo
    na kolieskach**, voliteľná plachta vo výške rizera;
  - v nastavení Nivtec pribudla noha s kolieskom pre pojazdné rizery.

Nové migrácie: žiadne.

### 1.2 – 15. 10. 2026

- **Štatistiky → Peniaze** s výberom roka:
  - pre firmu (kto má oprávnenie): príjmy z akcií s DPH aj bez, odmeny členom, koľko zostáva po odmenách,
    príjmy podľa mesiacov, koláč podľa spôsobu platby, podľa členov a podľa role na evente;
  - pre každého: **moje zárobky**, koláč podľa role (osvetľovač, zvukár…), najlepšie mesiace a zárobky podľa rokov.
- Widgety, na ktoré člen nemá oprávnenie, sa v štatistikách ani neponúkajú.

Nové migrácie: žiadne.

### 1.1 – 15. 10. 2026

- **Export do Excelu** v Koši (zmazané záznamy, aj s filtrom druhu) a v Histórii zmien
  (kto, kedy a čo zmenil – celá história, nielen posledných 200 záznamov, podľa zvoleného filtra).

Nové migrácie: žiadne.

### 1.0 – 15. 10. 2026

Prvá ucelená verzia. Oproti predošlým priebežným verziám pribudlo:

- **Technika:** DMX módy svetiel, typy zvuku (mixpult, mikrofón, reprobox…), druhy *Hliník / truss*
  a *Pódium*, farebný prúžok podľa kategórie, tabuľka **IP / MAC adries** s hľadaním a kontrolou duplicít.
- **Excel:** export a import techniky a cases v jednom súbore – hárok na každú kategóriu, prázdna šablóna
  s vysvetlivkami, náhľad a kontrola chýb pred zápisom.
- **Eventy:** organizátor, popis a časy, fotky, **tlač A4 / PDF** s checklistom techniky,
  **príjmy z akcie** (hotovosť / účet / faktúra cez firmu, s DPH aj bez), **import techniky z Capture**
  (Equipment Report v HTML alebo PDF), upozornenie na case bez kontroly obsahu.
- **Pódium Nivtec** *(vo vývoji)*: kalkulačka dosiek, nôh, schodov, líšt, plachiet, zábradlia, výstuh
  a príslušenstva s pôdorysom a pridaním na event.
- **Objednávky:** nákupy z bazárov (Bazoš, Kleinanzeigen, Willhaben, eBay…) a fotka nákupu.
- **Fotky** ku cases a k položkám „kúpiť / chceme časom“.
- **Demo firma** pre každého používateľa s resetom do pôvodného stavu.
- **Záloha celej firmy** ako ZIP s Excelmi.
- Číslo verzie v pätičke a v nastaveniach.

Potrebné migrácie: do `0043`.

---

## Moduly

### 🎛️ Technika

- Zariadenia, káble, svetlá, zvuk, hliník/truss, pódium a spotrebný materiál – každý druh má vlastné polia
  (dĺžka a konektor kábla, výkon a zdroj svetla, **DMX módy**, typ zvuku, dĺžka trussu…).
- Výrobca, model, sériové a inventárne číslo, MAC a IP; fotky aj cez Ctrl+V, náhľady v zoznamoch.
- **Farebný prúžok** podľa kategórie (svetlá zelené, zvuk ružový, pódium žlté, truss červený) – nastaviteľný.
- **Evidencia po kusoch** (#1, #2… alebo vlastné čísla 1, 4, 8) s vlastnou históriou každého kusu;
  háky, káble či viazačky sa rátajú len na počet.
- Servisné intervaly a odčítanie prevádzkových hodín s pripomienkami, hranica „treba dokúpiť“.
- Sada káblov naraz podľa dĺžok s farebným značením, cenník prenájmu za deň.
- **IP / MAC tabuľka** zoradená podľa IP, hľadanie v ľubovoľnom zápise, upozornenie na rovnakú IP.
- **Excel** – export a import techniky aj cases (hárok na kategóriu, hárok „Cases“, prázdna šablóna).
- Pri každej technike história nákupov, servisu, výpožičiek a eventov.

### 📦 Cases a sklad

- Obsah, hmotnosť, rozmery, umiestnenie, fotka a kontroly obsahu (kto a kedy).
- **Šablóny cases** – rozmery sa zadajú raz, nové cases (aj viac naraz) vzniknú výberom šablóny.
- **Flight case štítok** (PNG) a hárok **FLIGHTCASE CONTENT** (A4) s farbami dĺžok káblov.
- **Plán skladu** *(vo vývoji)* – regály, palety a zóny zhora, kde ktorý case leží.

### 🔁 Výpožičky

- Rezervácia → vydanie → vrátenie; kolízie termínov (aj s eventmi) stráži databáza.
- Výber celých cases alebo jednotlivých kusov, pri technike po kusoch konkrétne čísla.
- Ceny z cenníka, účtované dni, dohodnutá cena, kaucia, IČO a adresa.
- Pri vrátení sa označia poškodenia; poškodeným kusom sa otvorí servisný záznam.
- **Zapožičacia listina** na tlač / PDF s dátumami, menami a poškodeniami.

### 🎪 Eventy

- Technika (aj celé cases), posádka, fotky a dokumenty (rider, stage plot…), kolízie s inými akciami.
- Organizátor s kontaktom, popis, časy príchodu a programu.
- **Tlač eventu** na A4 / PDF – technika ako checklist, obsah case malým sivým písmom.
- **Príjmy z akcie** – hotovosť, na účet alebo faktúra (cez JEF, JEF Production…), s DPH / bez DPH.
- **Import z Capture** – Equipment Report sa spáruje s technikou, neznáme veci treba rozhodnúť,
  zapíše sa až po kontrole; priradenia si appka pamätá.
- Upozornenie na case, ktorý od poslednej kontroly obsahu bol na eventoch.
- **Opakované akcie** – návrh údajov, posádky a odmien z minulého ročníka.
- **Balíky** – vopred poskladané sady (malý / veľký zvukový, svetelný…) sa na event aj do výpožičky pridajú jedným klikom.
- **Pripomienky** – podľa pravidiel z nastavení upozorní pri evente aj výpožičke, čo k technike ešte chýba
  (napr. 4 repráky → 4 káble NL4, svetlá → case s hákmi).
- **Plán nakladania** *(vo vývoji)* – koľko vozidiel treba a kam ktorý case uložiť, zhora aj v 3D.
- **Pódium Nivtec** *(vo vývoji)* – z rozmerov a výšky spočíta dosky (aj 1 × 0,5 m a trojuholníky),
  nohy (susedné dosky sa delia o nohu – sedí s papierovou tabuľkou), schody po 20 cm, lišty na pero /
  drážku (každá na jednu dosku), plachty so štipcami, zábradlie s otvormi pre schody, výstuhy od 80 cm,
  **molo**, **rizery** (pevné alebo na kolieskach)
  a príslušenstvo; nakreslí pôdorys (pero vzadu a vpravo), porovná so skladom a pridá diely na event.

### 🔧 Servis a 🚐 vozidlá

- Opravy, kontroly a údržba s prílohami, časom a nákladmi; do servisu môže ísť len časť kusov.
- STK, EK, diaľničná známka, poistky a leasing s pripomienkami; tankovanie, servis, spotreba, fotka.
- **Nákladný priestor** – nosnosť, rozmery a prekážky (podbehy), aj v grafickom editore.

### 🛒 Objednávky a nákupy

- Nákupy s položkami, z ktorých vzniká technika; **import faktúr z Thomannu** (PDF v prehliadači).
- **Nákupy z bazárov** (Bazoš, Hudebnibazar, Kleinanzeigen, Willhaben, eBay, Reverb…) s predajcom.
- Fotka nákupu; zoznamy „kúpiť“ a „chceme časom“ s fotkami.

### 👥 Firma a ľudia

- **Zamestnanci** – tím s fotkou, pozíciou, kontaktom a zručnosťami, kto kedy nemôže a na ktorých eventoch je;
  upozornenie v posádke eventu, keď niekto v termíne nemôže.
- **Odmeny** – odmeny a zálohy členov, filter podľa rokov, koláčový graf; člen vidí len svoje.
- **Úlohy, Návrhy, Kalendár** (zoznam aj mesačná mriežka), **Upozornenia**, **História zmien**.
- **Štatistiky** (čo vidieť aj v akom poradí si nastaví každý sám) – technika, servis, vozidlá a **peniaze**: príjmy firmy, odmeny a zostatok (s oprávnením)
  a každému jeho vlastné zárobky podľa role, mesiacov a rokov, s koláčovými grafmi.
- **Záloha** – admin stiahne celú firmu ako ZIP s Excelmi (fotky a dokumenty v nej nie sú).
- **Kôš** – zmazané veci sa dajú 30 dní obnoviť (`/admin/recycle-bin`, iba admin); kôš aj história zmien sa dajú exportovať do Excelu.

### ⚙️ Nastavenia

- Členovia a pozvánky, roly admin / skladník / technik / len na čítanie.
- **Oprávnenia** pre každú rolu aj výnimky pre jednotlivých členov.
- Logo firmy (pozadie sa odstráni, logo sa prispôsobí svetlému aj tmavému podkladu), kategórie s farbami,
  umiestnenia, šablóny cases, záložky **Nivtec**, **Balíky** a **Pripomienky**.
- Svetlý / tmavý režim, **demo firma** s resetom, verzia aplikácie.

---

## Bezpečnosť

Oddelenie firiem a všetky oprávnenia stráži databáza (Row Level Security v Supabase); aplikácia
len skrýva ovládanie, ktoré by aj tak neprešlo. Admin má vždy všetko, aby sa firma nemohla zamknúť.
Tajný (service-role) kľúč Supabase do aplikácie nepatrí – používa sa len verejný publishable kľúč.

## Obmedzenia

- Bez internetu nefunguje – dáta sa čítajú aj zapisujú priamo do databázy.
- Notifikácie e-mailom a na telefón zatiaľ nie sú, upozornenia sú len v aplikácii.
- Kôš sa po 30 dňoch vyčistí, až keď aplikáciu otvorí admin.
- **Plán nakladania, plán skladu a pódium Nivtec sú vo fáze vývoja** a nemusia fungovať na 100 % –
  výsledok treba skontrolovať.
- Import techniky na event pozná zatiaľ len Equipment Report z Capture.
- Fotky a dokumenty sú v úložisku Supabase (v databáze je len cesta k nim); presun na vlastný NAS zatiaľ nie je.

---

## Spustenie

```bash
npm install
npm run dev
```

Aplikácia beží na `http://localhost:5173`. Bez databázy sa zobrazí iba kostra bez prihlásenia.

## Pripojenie Supabase

1. Vytvor projekt na supabase.com.
2. V SQL Editore spusti postupne **všetky** súbory zo `supabase/migrations/` podľa čísla (0001 až najvyššie).
   Pri aktualizácii spusti tie, ktoré pribudli – ktoré to sú, je v [Čo je nové](#čo-je-nové).
   Súbor `0026` je prázdny (fotky vozidiel zakladá `0027`), `0037` sa dá spustiť aj opakovane.
3. V Authentication → URL Configuration nastav Site URL (`http://localhost:5173`, neskôr produkčnú doménu)
   a medzi Redirect URLs pridaj `<adresa>/auth/update-password`.
4. Potvrdzovanie e-mailu (Authentication → Sign In / Providers → Email → Confirm email) nechaj **zapnuté** –
   pozvánky do firmy sa viažu na potvrdenú adresu.
5. Skopíruj `.env.example` do `.env.local` a doplň Project URL a publishable kľúč.

## Nasadenie na vlastný server

Docker + Cloudflare Tunnel: netreba otvárať porty na routeri ani riešiť certifikát, HTTPS zabezpečí Cloudflare.

**Hotový balík na NAS (odporúčané)**

1. `npm run package` vytvorí priečinok `release/`.
2. Skopíruj `release/` na NAS a spusti v ňom `docker compose up -d`. Aplikácia beží na porte 8080.
3. V existujúcom Cloudflare tuneli pridaj Public Hostname `rigtrack.jef-sp.sk` so službou `http://IP-NAS:8080`.

Aktualizácia: znova `npm run package` a prepíš na NAS priečinok `release/dist`.

**Zostavenie priamo na serveri**

Naklonuj repozitár, skopíruj `.env.example` do `.env` a spusti `docker compose up -d --build`.
Ak ešte nemáš tunel, doplň `TUNNEL_TOKEN` a pridaj `--profile tunnel`; služba v tuneli je potom `http://web:80`.

---

## Pre vývojárov

| Príkaz | Čo robí |
|---|---|
| `npm run dev` | vývojový server |
| `npm run build` | kontrola typov a produkčný build (vrátane service workera) |
| `npm run preview` | náhľad produkčného buildu, skúška inštalácie PWA |
| `npm run package` | balík `release/` na nasadenie |
| `npm run lint` | ESLint |
| `npm test` | testy (Vitest) vrátane testov databázy v PGlite |

- `src/features/<modul>/` – každý modul má `model.ts` (pravidlá a výpočty s testami), `api.ts` (dotazy) a obrazovky.
- `src/lib/`, `src/components/` – navigácia, oprávnenia, formátovanie, prvky rozhrania, verzia, ZIP.
- `supabase/migrations/` – schéma a pravidlá prístupu; `supabase/tests/` – ich testy (bežia v pamäti, bez Supabase).
- Verzia sa berie z `package.json`; pri novej verzii sa zvýši tam a pribudne záznam v [Čo je nové](#čo-je-nové).

---

Made by **DejvoLD** © 2026
