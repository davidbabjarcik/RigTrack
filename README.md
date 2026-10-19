# RigTrack

**Evidencia techniky, cases, výpožičiek a eventov pre event / AV firmy.** · Verzia **1.14.1**

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

### 2.3 – 19. 10. 2026

Upratanie aplikácie:

- **Kalkulačky** sú jedna položka menu – Pódium Nivtec, Delay subov a LED stena, so záložkami medzi nimi.
- **Objednávky**: záložky Objednávky | Štatistiky | **Wantlist** (Wantlist už nie je samostatne v menu; kto nemá
  objednávky, otvorí z menu rovno Wantlist).
- **Servis**: záložky Záznamy | **Žiadosti o servis** | **Servisní technici** (už nie samostatne v menu; kto nemá
  servis, otvorí z menu svoje žiadosti).
- **Žiadosti o servis aj pre autá** – pri aute tlačidlo „Nahlásiť poruchu“, vo formulári výber auta.
- V evente sa v „Elektrika – fázy“ dá vyskúšať aj iná prípojka (napr. 32 A namiesto 16 A) bez úpravy eventu.

Nové migrácie: `0067`.

### 2.2 – 19. 10. 2026

- **Rozfázovanie elektriky v evente** (sekcia „Elektrika – fázy“): technika eventu sa rozdelí na L1–L3 (aj 2 fázy
  alebo 1) čo najrovnomernejšie, s ohľadom na iné zaťaženie fáz; ukáže kW a A na fázu oproti prípojke eventu
  (CEE 16 / 32 / 63 / 125 A, zásuvka) – preťažená fáza je červená – a čo ide na ktorú fázu. Technika bez zadaného
  výkonu sa vypíše, aby sa dala doplniť.
- **Ročná správa** už nie je v menu: hore sa ukáže len 31. 12. a 1. 1. (dá sa zavrieť), inak je v Štatistikách.
- **Kancelária bez cien**: zapisuje sa len kto, čo a koľko kúpil; štatistiky v kusoch a baleniach.

### 2.1 – 19. 10. 2026

- **Patch list zvuku** pri evente: kanál, čo na ňom ide, stagebox a vstup, zdroj – mikrofón z techniky, bezdrôtový
  mikrofón s kapsulou, DI box alebo port (XLR / madona alebo jack) – stojan, phantom 48 V a poznámka. Ďalší kanál
  sa predvyplní (kanál +1, rovnaký stagebox, ďalší vstup), duplicitné kanály appka označí, patch sa dá načítať
  z iného eventu. **Tlač / PDF** na A4 so súhrnom, čo pripraviť (mikrofóny, kapsule, DI, káble, stojany).

Nové migrácie: `0066`.

### 2.0 – 19. 10. 2026

Veľká verzia: RigTrack už nie je len pre jednu firmu – firmy sa dajú prepojiť a spolupracovať.

- **Prepojené firmy** (Nastavenia → Prepojené firmy): prepojenie kódom firmy, druhá strana potvrdí. Každá firma sama
  zvolí, čo zdieľa:
  - **techniku** – u partnera sa ukáže v Technike (Viac filtrov → Firma: naša / naša aj prepojených / len partner),
    bez cien, sériových čísel a poznámok;
  - **kontakty** – vo Firmy a kontakty zaškrtnete pri firme „Zdieľať s prepojenými firmami“; partner ich vidí
    v sekcii „Od prepojených firiem“ a môže si ich skopírovať;
  - **spoločné eventy** – v detaile eventu „Spoločný event s firmami“: vy zapíšete, čo dodáte, oni čo dodajú
    (aj prenájom techniky); partner vidí event, termín, miesto a program v Eventoch.
- **Nové druhy techniky**: **Video** (LED panel s pixel pitchom – pixely sa dopočítajú, obrazovka TV / monitor /
  projektor s rozlíšením a uhlopriečkou, LED procesor s počtom CH, čipom, ovládaním USB / Ethernet a vstupmi
  HDMI / DVI / SDI / DisplayPort / VGA) a **DJ technika** (mix, player, gramofón, all-in-one konzola, konzola na PC).
- **LED kalkulačka**: **rozfázovanie elektriky** (okruhy 16 A po stĺpcoch rozdelené na L1–L3, aj na 2 fázy alebo 1,
  s ohľadom na iné zaťaženie fáz), **pixel mapa (PNG)**, **nastavenie Novastar** (výstupy, štartovacie X / Y) a
  **slicy pre Resolume Arena** na stiahnutie; panel P3.9 500×1000 podľa vašich údajov (12,5 kg, 275 W).
- **Technika**: „Pridať“ je ponuka (technika, sada káblov, kapsule); Siete / IP sú len v menu; na mobile sú
  „Viac filtrov“ a triedenie rovnako veľké vedľa seba.

Nové migrácie: `0065`.

### 1.19 – 19. 10. 2026

- **Ročná správa** (menu → Ročná správa): eventy a dni po mesiacoch, kto bol na koľkých akciách, najčastejší klienti,
  kúpená technika, servisy, škody a úrazy, hotové úlohy; s oprávnením aj peniaze (príjmy, nákupy, kancelária, odmeny,
  príjmy − výdavky). Kto ju vidí a kto v nej vidí peniaze, nastaví admin v Oprávneniach. Dá sa vytlačiť.
- **Import a export v Nastaveniach**: export všetkého (ZIP) alebo jedného modulu (Excel), **obnova zo zálohy** (doplní
  chýbajúce záznamy, existujúce nezmení) a import / export techniky z Excelu (presunuté z Techniky). Záloha obsahuje
  aj kapsule, žiadosti o servis, kanceláriu, škody a úrazy a úlohy po evente.
- **Partnerské firmy**: v Firmy a kontakty tlačidlo „Založiť im firmu v RigTracku“ (údaje IČO, DIČ, adresa sa prenesú,
  vy ste admin a pozvete ich ľudí); keď si niekto zakladá vlastnú firmu, appka mu navrhne údaje, ktoré o ňom majú
  firmy, kde je zapísaný ako kontakt.
- LED kalkulačka predvolí procesor z vašej techniky.

Nové migrácie: `0064`.

### 1.18 – 19. 10. 2026

- **Rola helper** (brigádnik na pomoc): vidí len eventy, kde je v posádke, techniku a cases len prezerá, úlohy, tím
  a návrhy; žiadosti o servis posiela a vidí len svoje. Kontrolu cases mu admin povolí novým oprávnením
  „Kontrolovať obsah cases“ (platí pre všetky roly).
- **LED kalkulačka**:
  - **viac stien naraz** (Stena 1, 2, 3…, každá iný rozmer a panel) a súčet za všetky;
  - **LED panely zo skladu** – v technike zaškrtnite „LED panel“ (rozmer, pixely, váha, príkon); kalkulačka ukáže
    máme / treba a pri chýbajúcich vyberiete **subdodávateľa** z Firmy a kontakty;
  - **hliník podľa dielov v technike** (truss s dĺžkou) – koľko dielov akej dĺžky treba a máme;
  - **procesor** (napr. Novastar 4 / 6 / 8 / 16 výstupov alebo váš z techniky – „LED procesor“): zapojenie portov
    po stĺpcoch, koľko procesorov treba a **rozloženie stien do Full HD vstupov** (viac stien v jednom obraze,
    čo sa nezmestí, ide na HDMI 2 ako druhý obraz);
  - **nákres steny** (panely, truss, veže, motory, rozmery) so stiahnutím ako obrázok.

Nové migrácie: `0062` (samostatne), potom `0063`.

### 1.17 – 19. 10. 2026

- **LED kalkulačka** (menu → LED kalkulačka): z rozmeru steny počet panelov (zaokrúhliť na najbližší / nikdy väčšia /
  nikdy menšia), skutočný rozmer a m², rozlíšenie a pomer strán, porty procesora, váha, príkon, prúd a počet 16 A okruhov.
  Podľa stavby – zavesená na truss s motormi, hliníková brána od zeme alebo stohovaná na zemi – spočíta hliník
  z dielov, ktoré máte (3 / 2 / 1 / 0,5 m), spoje s kónusmi, čapmi a závlačkami, rohové kocky a podstavy, závesné lišty,
  úväzy, topy (2 nekonečné oká), shackle, závesné body a záťaž na bod s upozornením na prekročenú nosnosť motora.
  Panely aj materiál na lištu / bod / spoj sa dajú upraviť, nastavenie si appka pamätá.

### 1.16 – 19. 10. 2026

- **Úlohy** – viac ľudí na jednu úlohu, kategórie (web, soc. siete…), filter podľa kategórie; **úlohy po evente**
  (šablóny, ktoré sa po skončení akcie založia samé) a upozornenie na úlohy, ktoré visia viac ako mesiac.
- **Kancelária** – voda, káva, poháre, cukor, mlieko, čaj…: zásoba, kto čo kúpil (aj veľkosť balenia, napr. 1 kg kávy)
  a štatistiky (kto koľko minul, čoho sa koľko kúpilo).
- **Škody a úrazy** – zápis s človekom, eventom, technikou, nákladmi a kto platí; štatistiky po ľuďoch. Úrazy vidí
  len admin, dotknutý a ten, kto ich zapísal.
- **Sociálne siete** na karte zamestnanca; meno v profile a na karte sa zosynchronizuje.
- **Nová firma** prevezme tvoje osobné údaje (telefón, narodenie, vodičák…) z predošlej firmy.
- **Stav databázy** v Nastaveniach (a upozornenie adminovi na Prehľade) – ktoré migrácie chýbajú.
- Oznam o novej verzii s odkazom na Čo je nové; názov firmy na Prehľade; logo v Čo je nové vedie na Prehľad;
  filtre techniky sú všetky pod „Viac filtrov“; pri chybe demo firmy sa ukáže presný dôvod.

Nové migrácie: `0061`.

### 1.15 – 19. 10. 2026

- **Veľký filter techniky** – druh, typ zvuku, vlastník, výrobca, upozornenia (servis, dokúpiť, hodiny), zhoda s Capture,
  rok nákupu, s IP / MAC, s odkazmi; triedenie (názov, naposledy upravené, dátum nákupu, počet kusov). Filter ostane po návrate z detailu.
- **Technika** – dátum nákupu celej položky aj po kusoch, odkazy (návod, fixtúra, firmvér…), pri svetlách „kópia čoho“
  a či sedí s Capture (áno / čiastočne / nie + prečo).
- **Kapsule k mikrofónom** – vlastný zoznam (Technika → Kapsule), na evente sa vyberá, ktoré a koľko idú.
- **Cases a racks** – priorita kontroly (vysoká 14 dní / bežná 60 / nízka 180), „Na kontrolu“, filter (kontrola, priorita,
  umiestnenie, vlastník, kategória, obsah) a triedenie.
- **Objednávky** – kto objednal, „nie pre nás“ (pre koho), „nepridávať nič do techniky“, „bez faktúry“; filter, triedenie
  (dátum, pridané, cena) a **štatistiky** (po mesiacoch, dodávatelia, kto objednával).
- **Žiadosti o servis** – poruchu nahlási ktokoľvek (aj z detailu techniky), servis mení stav a odpíše; ostatní vidia svoje.
- **Kontakt z telefónu** – pri firmách a organizátorovi „Z telefónu“ (Android) alebo zo súboru .vcf (iPhone: Zdieľať kontakt).

Nové migrácie: `0060`.

### 1.14.1 – 19. 10. 2026

- **Kontrola databázy** – `supabase/check-migrations.sql` vypíše, ktoré migrácie databáza má a ktoré chýbajú
  (nič nemení). Chýbajúce staršie (`0020`–`0048`) sú v `supabase/upgrade/`, novšie v `supabase/migrations/`.
- Pridanie a úprava techniky aj case fungujú aj na databáze bez migrácie `0052` (vlastník sa vtedy neuloží);
  pri chybe sa ukáže presný dôvod.

Nové migrácie: žiadne.

### 1.14 – 19. 10. 2026

- **Viacdňové eventy** – program po dňoch (stavba, event, balenie, cesta, voľno) s časmi a poznámkou; pri každom
  dni kto z posádky ide (klikom na meno).
- **Firmy a kontakty** – nový adresár organizátorov a partnerov: skupina s IČO, DIČ a adresou a ľudia s číslami
  (každý sa dá uložiť do kontaktov); pri evente organizátor (aj viac firiem) a spolupracujúce firmy, či používajú RigTrack.
- **Rider, lightplot a odkazy** – pri evente odkazy so štítkom (rider, lightplot, stage plot, zmluva, fotky…),
  odporúčame zdieľaný priečinok v Google Disku.
- **Doprava a kilometre** – adresa akcie, km zo skladu **vypočítané z mapy** (alebo ručne), trasa v Google Mapách;
  po dňoch koľko áut, koľko otočiek, kde sa spalo a km navyše; spolu km za event.
- **Osobný výkaz** – pri evente si každý zapíše čas od–do, prestávky a výdavky (palivo, jedlo, ubytovanie…);
  vidí ich len on a admin / CEO.
- **Údaje o firme** v Nastaveniach – obchodné meno, IČO, DIČ, IČ DPH, sídlo, CEO, kontakt a **adresa skladu**.
- **Zariadenia** – notebook a pod. môže mať aj druhú MAC (ethernet / LAN); pri sieti sa vyberie Wi-Fi alebo kábel.
- **Organizátor vo formulári eventu** sa vyberá z Firmy a kontakty alebo sa založí nový (uloží sa do adresára);
  starý textový organizátor sa dá jedným klikom uložiť do adresára.
- Premenované: **Nákupy → Wantlist**, **Cases → Cases a racks**.

Nové migrácie: `0059`.

### 1.13 – 19. 10. 2026

- **Úvodný dotazník** – nový člen sa po prihlásení vyplní telefón, e-mail, fotku, pozíciu a narodeniny;
  všetko sa zapíše do jeho karty v Zamestnancoch.
- **Karta zamestnanca** – dátum narodenia, meniny a skupiny vodičského preukazu (klikacie).
- **Narodeniny a meniny** – upozornenie hore pre kolegov (oslávencovi blahoželanie) a v Kalendári.
- **Chýbajúce zariadenia** – kým člen nezapíše mobil, tablet / iPad a notebook s MAC, svieti mu hore červené
  upozornenie; výnimku (napr. nemá tablet) dá v jeho karte len admin.
- **Novinky vo firme** – nový event a priradenie do posádky sa ukážu hore všetkým, s tlačidlom **Prečítané**.
- **Potvrdenie účasti** – člen v posádke eventu klikne **Môžem / Nemôžem** (a napíše prečo); ostatní to vidia.
- **E-mail pri novom evente** – admin / CEO si ho zapne v Nastaveniach → Účet (Edge Function `notify-new-event`).
- **Aplikácia na ploche** – návod pre iPhone, Android aj počítač, kde sa dá aj tlačidlo Nainštalovať
  (v Nastaveniach → Účet a na mobile na Prehľade).
- **Demo firma** má viac: zamestnancov, zariadenia, Wi-Fi siete, servisných technikov, servis, odmeny, príjmy
  a vlastnú techniku zamestnanca.
- **Databáza v jednom súbore** – `supabase/baseline.sql` (stav po `0058`) pre novú inštaláciu; nové migrácie od `0059`.

Nové migrácie: `0057`, `0058`.

### 1.12 – 19. 10. 2026

- **Siete** – nový modul: Wi-Fi siete firmy (napr. router ku každému mixu) s heslom, IP rozsahom, gateway,
  IP správy, modelom routera a **DHCP** rozsahom; **QR kód na pripojenie** a načítanie siete z QR kódu;
  prihlásenie do správy routera vidí len ten, kto smie upravovať techniku.
- **Všetky IP a MAC adresy** techniky aj zariadení členov v jednej tabuľke, podľa sietí, s prefixom (/24),
  DHCP, upozornením na rovnakú IP a návrhom voľnej IP (mimo DHCP rozsahu).
- **Zariadenia členov** (mobil, notebook, iPad) nie sú technika: pri každom Wi-Fi siete s IP a MAC, dajú sa upraviť;
  skladník a admin ich zapíšu aj za iného a vidia ich v karte zamestnanca.
- **Kto má účet** – admin vidí pri členoch aj pozvánkach, či človek má účet, potvrdený e-mail a kedy sa naposledy prihlásil.
- **Len na pozvánky** – účet si vytvorí len e-mail s pozvánkou (treba zapnúť hook v Supabase, pozri nižšie).
- **Rola CEO** – rovnaké práva ako admin.
- **Vlastná technika a cases / racky zamestnancov** – vlastník pri technike aj case, „Patrí: …“ v zozname a detaile.
- **Karta zamestnanca** – každý člen ju má automaticky; zariadenia, vlastná technika, minulé eventy a pre admina /
  vedúceho prehľad za rok: na koľkých eventoch bol a nebol, dni na akciách, role a zárobky.
- **Technika podľa druhu** – zvuk, svetlo, stage, pódium, káble…: DMX módy len pri svetlách, káble a spotrebný
  materiál bez siete a servisu, prázdne údaje sa v detaile neukazujú; IP s prefixom a voľba „IP z DHCP“.
- **Delay kalkulačka** – vlastný delay subu (hornový / slimák) pri technike aj v kalkulačke, pri každom sube zvlášť
  a čo nastaviť v procesore; započíta sa aj pri zarovnaní s topmi.
- Klik na **RigTrack** vedie na Prehľad; v spodnej lište na mobile je **Prehľad vždy prvý**.
- Opravené „vaša verzia“ v Čo je nové (1.1 vs 1.11); úprava techniky ukáže presný dôvod, ak sa nenačíta.

Nové migrácie: `0052`, `0053` (spustiť samostatne pred `0054`), `0054`, `0055`, `0056`.

### 1.11 – 18. 10. 2026

- **Servisní technici** – adresár ľudí a servisov pre techniku aj autá (firma, telefón, e-mail, adresa, na čo sú).
  Vyberajú sa pri servise techniky, pri zázname auta a ako **stály servis** auta.
- **Do kontaktov** – organizátor eventu, zákazník výpožičky, servisný technik aj zamestnanec sa dá jedným klikom
  uložiť do telefónu (.vcf).
- **Do kalendára** – event aj výpožička sa pridá do telefónu / Outlooku (.ics) alebo rovno do Google Kalendára;
  v Kalendári export všetkých eventov a výpožičiek naraz.
- **Zbaľovanie sekcií** – technika, posádka, počasie, fotky, dokumenty… pri evente, výpožičke, aute, technike
  aj zamestnancovi sa dajú zbaliť kliknutím na nadpis; prehliadač si to pamätá.
- **Počasie** – klik na deň ukáže hodinovú predpoveď (dážď, vietor), odkazy na Windy a Meteoblue.
- **Delay kalkulačka** – zarovnanie topov a subov, delay veža, **cardioid** (za sebou, vedľa seba v rade, stack),
  **end-fire**, rovný rad a **arc delay**; teplota vzduchu, výber subu z techniky s rozmermi boxu,
  odhad dopredu / dozadu podľa frekvencie, nákres zhora.
- **Rozmery boxu** pri reproboxoch, suboch a odposluchoch.
- **Moje zariadenia** – každý si v Nastaveniach → Účet zapíše mobil, notebook či iPad s MAC adresou;
  admin a skladník ich vidia v tabuľke IP / MAC.
- **Zmazanie firmy** – admin v Nastaveniach natrvalo zmaže firmu so všetkými údajmi aj súbormi (potvrdí sa názvom).
- **Čo je nové** – klik na „RigTrack v…“ v pätičke otvorí prehľad zmien po verziách.

Nové migrácie: `0049`, `0050`, `0051`.

### 1.10.3 – 18. 10. 2026

- V pätičke je už len „Nahlásiť chybu“; zoznam „Hlásenia chýb“ je tlačidlo na stránke hlásenia (a admin ho má aj v Upozorneniach).
- Nasadenie na GitHub Pages vidí premenné Supabase aj z prostredia github-pages a bez nich sa zastaví s jasnou chybou.

Nové migrácie: žiadne.

### 1.10.2 – 18. 10. 2026

- Nainštalovaná aplikácia sama hľadá novú verziu (pri návrate do aplikácie a každú hodinu) a ponúkne „Aktualizovať“.

Nové migrácie: žiadne.

### 1.10.1 – 18. 10. 2026

- „Hlásenia chýb“ už nie sú v menu, ale v pätičke vedľa „Nahlásiť chybu“.

Nové migrácie: žiadne.

### 1.10 – 18. 10. 2026

- **Nahlásenie chyby** – odkaz „Niečo nefunguje? Nahlásiť chybu“ pod každou stránkou: popis, voliteľný
  screenshot (aj Ctrl+V); stránka, verzia, firma a prehliadač sa priložia samy.
- **Hlásenia chýb** (odkaz v pätičke) – autor vidí svoje, admin firmy hlásenia svojej firmy, vývojár aplikácie všetky.
  Admin a vývojár menia stav (nové / rieši sa / vyriešené / nebude sa riešiť) a píšu odpoveď autorovi.
- Nové hlásenia sú v **Upozorneniach** a prídu **e-mailom** vývojárovi a adminovi firmy
  (Supabase Edge Function `notify-bug-report` + Resend – návod v časti Nahlasovanie chýb).

Nové migrácie: `0048`.

### 1.9 – 18. 10. 2026

- **Nasadenie na GitHub Pages** – pri každom pushe do `main` sa appka otestuje, zbuilduje a nasadí na
  `https://<používateľ>.github.io/RigTrack/` (návod v časti Nasadenie).
- Appka vie bežať v podpriečinku (adresy, ikonky, PWA, odkazy z e-mailov); priamo otvorená podstránka funguje.

Nové migrácie: žiadne.

### 1.8 – 17. 10. 2026

- **Miesto a elektrina pri evente:** interiér / exteriér / oboje, elektrická prípojka (zásuvka 230 V,
  CEE 16 / **32** / 63 / 125 A päťpól, generátor, bez prípojky), počet prípojok a poznámka. Kým prípojka
  nie je zistená, detail eventu to zvýrazní. Je to aj v tlači eventu.
- **Počasie pri akcii vonku:** predpoveď z Open-Meteo na dni eventu (do 16 dní dopredu) – teploty, dážď,
  nárazy vetra – a upozornenia na búrku, dážď, silný vietor (truss, plachty) a mráz. Miesto sa hľadá podľa
  „Miesta pre počasie“, inak podľa miesta konania.

Nové migrácie: `0047`.

### 1.7.1 – 17. 10. 2026

- Kalkulačka pódia už nezobrazuje rámik s tipmi; doska, ktorou začať stavať, je označená na pôdoryse (1).
- Vývojový server sa po zmene verzie v `package.json` reštartuje sám, takže pätička ukazuje aktuálnu verziu.

Nové migrácie: žiadne.

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
- **Siete** – Wi-Fi siete s heslom, QR kódom, routerom a DHCP; všetky IP / MAC adresy techniky aj zariadení členov.
- **Rozmery boxu** reproboxov a subov (pre delay kalkulačku).
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
- **Interiér / exteriér a elektrina** (napr. CEE 32 A päťpól, počet prípojok), pri akcii vonku **predpoveď počasia**
  s upozornením na dážď, búrku a vietor.
- **Tlač eventu** na A4 / PDF – technika ako checklist, obsah case malým sivým písmom.
- **Príjmy z akcie** – hotovosť, na účet alebo faktúra (cez JEF, JEF Production…), s DPH / bez DPH.
- **Import z Capture** – Equipment Report sa spáruje s technikou, neznáme veci treba rozhodnúť,
  zapíše sa až po kontrole; priradenia si appka pamätá.
- Upozornenie na case, ktorý od poslednej kontroly obsahu bol na eventoch.
- **Opakované akcie** – návrh údajov, posádky a odmien z minulého ročníka.
- **Viacdňový program** (stavba / event / balenie, kto ide v ktorý deň), **organizátor a firmy** s kontaktmi,
  **odkazy** (rider, lightplot…), **doprava a km zo skladu** a **osobný výkaz** času a výdavkov.
- **Balíky** – vopred poskladané sady (malý / veľký zvukový, svetelný…) sa na event aj do výpožičky pridajú jedným klikom.
- **Pripomienky** – podľa pravidiel z nastavení upozorní pri evente aj výpožičke, čo k technike ešte chýba
  (napr. 4 repráky → 4 káble NL4, svetlá → case s hákmi).
- **Plán nakladania** *(vo vývoji)* – koľko vozidiel treba a kam ktorý case uložiť, zhora aj v 3D.
- **Pódium Nivtec** *(vo vývoji)* – z rozmerov a výšky spočíta dosky (aj 1 × 0,5 m a trojuholníky),
  nohy (susedné dosky sa delia o nohu – sedí s papierovou tabuľkou), schody po 20 cm, lišty na pero /
  drážku (každá na jednu dosku), plachty so štipcami, zábradlie s otvormi pre schody, výstuhy od 80 cm,
  **molo**, **rizery** (pevné alebo na kolieskach)
  a príslušenstvo; nakreslí pôdorys (pero vzadu a vpravo), porovná so skladom a pridá diely na event.
- **Delay kalkulačka** – topy ↔ suby, delay veža, cardioid, end-fire, rovný rad a arc delay s nákresom a odhadom
  smerovosti; počíta s teplotou a rozmermi subu.
- **Do kalendára** (.ics / Google) a **do kontaktov** (.vcf) pri evente aj výpožičke; sekcie sa dajú zbaliť.

### 🔧 Servis a 🚐 vozidlá

- Opravy, kontroly a údržba s prílohami, časom a nákladmi; do servisu môže ísť len časť kusov.
- **Servisní technici** – adresár servisov pre techniku a autá, stály servis auta, uloženie do kontaktov.
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
- **Úlohy, Návrhy, Kalendár** (zoznam aj mesačná mriežka, export do .ics), **Upozornenia**, **História zmien**.
- **Štatistiky** (čo vidieť aj v akom poradí si nastaví každý sám) – technika, servis, vozidlá a **peniaze**: príjmy firmy, odmeny a zostatok (s oprávnením)
  a každému jeho vlastné zárobky podľa role, mesiacov a rokov, s koláčovými grafmi.
- **Záloha** – admin stiahne celú firmu ako ZIP s Excelmi (fotky a dokumenty v nej nie sú).
- **Hlásenia chýb** – ktokoľvek nahlási chybu (aj so screenshotom), admin a vývojár ju riešia; upozornenie v appke aj e-mailom.
- **Kôš** – zmazané veci sa dajú 30 dní obnoviť (`/admin/recycle-bin`, iba admin); kôš aj história zmien sa dajú exportovať do Excelu.

### ⚙️ Nastavenia

- Členovia a pozvánky, roly admin / skladník / technik / len na čítanie.
- **Oprávnenia** pre každú rolu aj výnimky pre jednotlivých členov.
- Logo firmy (pozadie sa odstráni, logo sa prispôsobí svetlému aj tmavému podkladu), kategórie s farbami,
  umiestnenia, šablóny cases, záložky **Nivtec**, **Balíky** a **Pripomienky**.
- Svetlý / tmavý režim, **demo firma** s resetom, verzia aplikácie a **Čo je nové**.
- Roly admin, **CEO**, skladník, technik, len na čítanie; **registrácia len na pozvánku**; stav účtov pri členoch.
- **Moje zariadenia** (MAC adresy) a **zmazanie firmy** so všetkými údajmi a súbormi.

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
- Počasie poskytuje Open-Meteo (open-meteo.com); posiela sa mu len názov miesta a dátumy akcie.
- Km z mapy rátajú OpenStreetMap Nominatim (adresa → poloha) a OSRM (trasa); posiela sa len adresa skladu a akcie.
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
2. **Nová inštalácia:** v SQL Editore spusti `supabase/baseline.sql` – celá databáza naraz (stav po migrácii `0058`).
   Potom spusti zo `supabase/migrations/` už len súbory s číslom **vyšším ako 0058** (ak nejaké sú).
   **Existujúca databáza:** spusti v SQL Editore `supabase/check-migrations.sql` – ukáže, ktoré migrácie chýbajú.
   Doplň ich podľa čísla od najnižšej: `0020`–`0048` sú v `supabase/upgrade/`, `0049` a vyššie v
   `supabase/migrations/` (`0053` samostatne pred `0054`). Pri ďalších aktualizáciách spúšťaj len nové –
   ktoré to sú, je v [Čo je nové](#čo-je-nové).
3. V Authentication → URL Configuration nastav Site URL (`http://localhost:5173`, neskôr produkčnú doménu)
   a medzi Redirect URLs pridaj `<adresa>/auth/update-password`.
4. Potvrdzovanie e-mailu (Authentication → Sign In / Providers → Email → Confirm email) nechaj **zapnuté** –
   pozvánky do firmy sa viažu na potvrdenú adresu.
5. Skopíruj `.env.example` do `.env.local` a doplň Project URL a publishable kľúč.

## Registrácia len na pozvánku

Po migrácii `0056` zapni v Supabase **Authentication → Hooks → Before User Created → Postgres function →
`public.hook_require_invitation`**. Potom si účet vytvorí len e-mail, ktorý má pozvánku do niektorej firmy
(admin ju pridá v Nastaveniach → Členovia). Bez zapnutého hooku sa môže zaregistrovať ktokoľvek, len bez
pozvánky neuvidí žiadnu firmu.

## Nahlasovanie chýb – e-maily

Hlásenia fungujú v aplikácii hneď po migrácii `0048`. Aby chodili aj e-mailom:

1. **Označ seba ako vývojára** (v SQL Editore, raz):
   `insert into public.app_developers (user_id) select id from auth.users where email = 'tvoj@email';`
2. **Resend** (resend.com, do 3 000 e-mailov mesačne zadarmo): založ účet, over doménu odosielateľa
   (bez overenej domény ide z `onboarding@resend.dev` len na tvoj vlastný e-mail) a vytvor API kľúč.
3. **Nasaď funkciu** cez Supabase CLI z koreňa repozitára:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-projektu>
   npx supabase functions deploy notify-bug-report
   npx supabase functions deploy notify-new-event
   npx supabase secrets set RESEND_API_KEY=re_... BUG_REPORT_FROM="RigTrack <chyby@tvoja-domena.sk>" APP_URL=https://<používateľ>.github.io/RigTrack
   ```
E-mail dostanú vývojári a admini firmy, v ktorej bola chyba nahlásená. Kým funkcia nie je nasadená,
hlásenia sa len uložia a ukážu v aplikácii.

## Nasadenie na GitHub Pages

Najjednoduchšie: bez servera, HTTPS zabezpečí GitHub. Workflow `.github/workflows/pages.yml` pri každom
pushe do `main` spustí testy, zbuilduje appku a nasadí ju.

1. V repozitári: **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables** – pridaj `VITE_SUPABASE_URL`
   a `VITE_SUPABASE_PUBLISHABLE_KEY` (verejný kľúč; service-role sem nikdy).
3. V Supabase → Authentication → URL Configuration pridaj `https://<používateľ>.github.io/RigTrack/`
   do Site URL (alebo Redirect URLs) a `https://<používateľ>.github.io/RigTrack/auth/update-password` do Redirect URLs.
4. Spusti workflow (push do `main` alebo Actions → GitHub Pages → Run workflow).

Appka beží v podpriečinku `/RigTrack/` (nastavuje ho premenná `BASE_PATH` pri builde). GitHub Pages zo
súkromného repozitára vyžaduje platený plán GitHubu.

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
- `supabase/baseline.sql` – celá schéma a pravidlá prístupu naraz (stav po `0058`); `supabase/migrations/` – novšie
  zmeny (a `0049`–`0058` pre staršie inštalácie); `supabase/tests/` – testy (bežia v pamäti, bez Supabase).
- Verzia sa berie z `package.json`; pri novej verzii sa zvýši tam a pribudne záznam v [Čo je nové](#čo-je-nové).

---

Made by **DejvoLD** © 2026
