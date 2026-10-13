# RigTrack

Webová aplikácia (PWA) pre firmu z event/AV prostredia: evidencia techniky a cases, výpožičky,
eventy, servis, vozidlá, sklad a interná agenda firmy na jednom mieste. Beží v prehliadači na
počítači aj na mobile a dá sa nainštalovať ako aplikácia.

Jedna inštalácia obslúži viac firiem; každá vidí len svoje dáta.

**Technológie:** React + TypeScript + Vite, Tailwind CSS, React Router, TanStack Query,
Supabase (prihlásenie, databáza, súbory), `vite-plugin-pwa`.

## Čo aplikácia dokáže

### Technika

- Evidencia zariadení, káblov, svetiel, zvuku a spotrebného materiálu; každý druh má vlastné polia
  (dĺžka a konektory kábla, výkon svetla…), plus výrobca, model, sériové a inventárne číslo, MAC a IP.
- Fotky (aj vložením zo schránky cez Ctrl+V), náhľady v zoznamoch.
- **Evidencia po kusoch** — svetlá či repráky môžu mať očíslované kusy (#1, #2… alebo vlastné čísla,
  napr. 1, 4, 8). Každý kus má vlastnú históriu servisu a výpožičiek a prehľad, kde práve je.
  Háky, káble či viazačky sa rátajú len na počet.
- Servisný interval a interval odčítania prevádzkových hodín s pripomienkami.
- Zásoby: upozornenie „treba dokúpiť“, keď počet klesne pod zadanú hranicu.
- Hromadné pridanie sady káblov podľa dĺžok, farebné značenie dĺžok.
- Cena prenájmu za kus a deň (cenník pre výpožičky).
- Pri každej technike história nákupov, servisu, výpožičiek a eventov.

### Cases

- Obsah, hmotnosť, rozmery, umiestnenie, kontroly obsahu (kto a kedy kontroloval).
- **Šablóny** — typ case s rozmermi sa zadá raz; nový case (aj viac kusov naraz) vznikne výberom šablóny.
- **Flight case štítok** (PNG) s logom firmy, hlavným a vedľajšími prvkami alebo vlastným názvom a fotkou.
- **Hárok FLIGHTCASE CONTENT** (A4) s farebne rozlíšenými dĺžkami káblov.
- Upozornenie na techniku, ktorá nie je v žiadnom case.

### Sklad

- Pôdorys skladu zhora: regály (s poschodiami), palety a zóny nakreslené myšou alebo prstom.
- Uloženie cases na miesta, vyhľadanie case na pláne, zoznam cases bez miesta.

### Výpožičky

- Rezervácia → vydanie → vrátenie. Kolízie termínov stráži databáza, vrátane techniky na eventoch.
- Výber cez **cases** (celý case, alebo jednotlivé kusy z neho) alebo cez zoznam **zariadení**.
- Pri technike po kusoch sa vyberajú konkrétne kusy; ten istý kus nemôže byť naraz na dvoch výpožičkách.
- **Ceny** — cena za kus a deň z cenníka, účtované dni, dohodnutá cena, kaucia; IČO a adresa vypožičiavateľa.
- Rezerváciu možno upraviť, kým sa technika nevydá.
- Pri vrátení sa označí, čo je poškodené (konkrétne kusy alebo počet); poškodeným kusom sa otvorí servisný záznam.
- **Zapožičacia listina** na tlač alebo uloženie do PDF: po vydaní a vrátení sa doplní dátum, meno
  toho, kto odovzdal a prijal, a zoznam poškodení.

### Eventy

- Technika (aj celé cases), posádka a dokumenty k akcii; upozornenie na kolízie s inými eventmi a výpožičkami.
- **Opakované akcie** — podľa názvu sa nájde minulý ročník: našepkávanie názvu, doplnenie klienta
  a miesta, návrh posádky z minula.
- **Plán nakladania** — z rozmerov cases a nákladného priestoru vozidiel sa vypočíta, koľko vozidiel
  treba a kam ktorý case uložiť (aj na seba). Pohľad zhora aj 3D, poradie nakladania.
  Je to výpočet podľa pravidiel, nie záruka; nepozná rozloženie váhy na nápravy.

### Servis

- Opravy, kontroly a údržba s prílohami, časom práce a nákladmi.
- Do servisu môže ísť len časť kusov; stav „v servise“ dostane technika, až keď sú tam všetky.

### Vozidlá

- Termíny STK, EK, diaľničnej známky, poistiek a leasingu s pripomienkami.
- Záznamy o prevádzke (tankovanie, servis, pneumatiky…), spotreba, náklady, fotka, prílohy.
- **Nákladný priestor** — nosnosť, rozmery a miesta, kam sa nedá nakladať (podbehy kolies);
  zadávajú sa číslami alebo v grafickom editore.

### Objednávky a nákupy

- Nákupy s cenami a položkami; **import faktúr z Thomannu** (PDF sa číta priamo v prehliadači).
- Z položiek objednávky vzniká technika; spotrebný materiál sa eviduje len ako nákup.
- Zoznamy „kúpiť“ a „chceme časom“.

### Firma a ľudia

- **Odmeny** — odmeny a zálohy členov, vyplatené a nevyplatené, filter podľa rokov, koláčový graf.
  Člen vidí len svoje. Pri opakovanej akcii sa navrhne suma z minulého ročníka a upozorní sa na nižšiu.
- **Úlohy a Návrhy** — interná agenda firmy.
- **Kalendár** — termíny zo všetkých modulov ako zoznam alebo mesačná mriežka, farebne podľa druhu.
- **Upozornenia** a **Štatistiky** — čo treba riešiť a prehľady; v štatistikách si každý vyberie, čo chce vidieť.
- **História zmien** — kto, kedy a čo zmenil.
- **Kôš** — zmazaná technika, cases, fotky a dokumenty sa dajú 30 dní obnoviť (`/admin/recycle-bin`, iba admin).

### Nastavenia a vzhľad

- Členovia, pozvánky e-mailom, roly: admin, skladník, technik, len na čítanie.
- **Oprávnenia** — admin určí, čo ktorá rola smie vidieť a robiť, a môže dať výnimku jednému členovi.
- Logo firmy (pozadie sa odstráni samo, logo sa prispôsobí svetlému aj tmavému podkladu),
  kategórie, umiestnenia, šablóny cases.
- Svetlý a tmavý režim: podľa zariadenia, alebo prepínačom v hlavičke.

## Bezpečnosť

Oddelenie firiem a všetky oprávnenia stráži databáza (Row Level Security v Supabase).
Kontroly v aplikácii iba skrývajú ovládanie, ktoré by aj tak neprešlo. Admin má vždy všetko,
aby sa firma nemohla zamknúť. Tajný (service-role) kľúč Supabase do aplikácie nepatrí —
používa sa len verejný publishable kľúč.

## Čo aplikácia nerobí

- Bez internetu nefunguje: dáta sa načítavajú aj zapisujú priamo do databázy.
- Notifikácie e-mailom a na telefón zatiaľ nie sú; upozornenia sú len v aplikácii.
- Kôš sa po 30 dňoch nečistí na serveri sám — vyčistí sa, keď aplikáciu otvorí admin.
- Plán nakladania aj plán skladu sú pomôcky; nič nemerajú ani nerozpoznávajú z fotiek.

## Spustenie

```bash
npm install
npm run dev
```

Aplikácia beží na `http://localhost:5173`. Bez databázy sa zobrazí iba kostra bez prihlásenia.

## Pripojenie Supabase

1. Vytvor projekt na supabase.com.
2. V SQL Editore spusti postupne **všetky** súbory zo `supabase/migrations/` podľa čísla (0001 až najvyššie).
   Pri aktualizácii aplikácie spusti tie, ktoré pribudli. Súbor `0026` je prázdny, fotky vozidiel zakladá `0027`.
3. V Authentication → URL Configuration nastav Site URL (`http://localhost:5173`, neskôr produkčnú doménu)
   a medzi Redirect URLs pridaj `<adresa>/auth/update-password`.
4. Potvrdzovanie e-mailu (Authentication → Sign In / Providers → Email → Confirm email) nechaj **zapnuté** —
   pozvánky do firmy sa viažu na potvrdenú adresu.
5. Skopíruj `.env.example` do `.env.local` a doplň Project URL a publishable kľúč.

Migrácie a pravidlá prístupu overujú testy v `supabase/tests/` (bežia v pamäti cez PGlite, bez Supabase).

## Nasadenie na vlastný server (Docker + Cloudflare Tunnel)

Netreba otvárať porty na routeri ani riešiť certifikát — HTTPS zabezpečuje Cloudflare.

### Hotový balík na NAS (odporúčané)

1. `npm run package` vytvorí priečinok `release/`.
2. Skopíruj `release/` na NAS a spusti v ňom `docker compose up -d`. Aplikácia beží na porte 8080.
3. V existujúcom Cloudflare tuneli pridaj Public Hostname `rigtrack.jef-sp.sk` so službou `http://IP-NAS:8080`.

Aktualizácia: znova `npm run package` a prepíš na NAS priečinok `release/dist`.

### Zostavenie priamo na serveri

Naklonuj repozitár, skopíruj `.env.example` do `.env` a spusti `docker compose up -d --build`.
Ak ešte nemáš tunel, doplň `TUNNEL_TOKEN` a pridaj `--profile tunnel`; služba v tuneli je potom `http://web:80`.

## Skripty

- `npm run dev` — vývojový server
- `npm run build` — kontrola typov a produkčný build (vrátane service workera)
- `npm run preview` — náhľad produkčného buildu, tu sa dá vyskúšať inštalácia PWA
- `npm run package` — balík `release/` na nasadenie
- `npm run lint` — ESLint
- `npm run test` — testy (Vitest)

## Štruktúra

- `src/features/<modul>/` — každý modul má `model.ts` (pravidlá a výpočty, s testami), `api.ts` (dotazy) a obrazovky.
- `src/lib/`, `src/components/` — spoločné veci: navigácia, oprávnenia, formátovanie, prvky rozhrania.
- `supabase/migrations/` — schéma databázy a pravidlá prístupu; `supabase/tests/` — ich testy.

---

Made by DejvoLD
