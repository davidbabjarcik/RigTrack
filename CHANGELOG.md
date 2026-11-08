# Čo je nové v RigTracku

Zmeny po verziách, najnovšie hore. Rovnaký zoznam (bez technických poznámok o databáze) je aj v appke
v **Nastavenia → O aplikácii → Čo je nové**.

## Čo je nové

### 8.16.1 – 8. 11. 2026

- **Značka „Unknown“ v databáze techniky** pre techniku bez značky: bežné beamy (7R, 9R…), LED spoty, washe, pary,
  bary, blindre, stroboskopy, výrobníky hmly, spark machine a ďalšie efekty, boxy, suby, odposluchy, zosilňovače,
  mikrofóny, bezdrôty, stageboxy, stojany, truss, DI boxy, DJ a video technika. Vyberiete ju ako výrobcu a doplní sa
  aspoň typ.

### 8.16 – 8. 11. 2026

- **Výber značky a modelu z databázy pri každom druhu techniky**: okrem zvuku, svetiel, hliníka a pódia aj pri DJ
  technike, videu, IT, spotrebičoch, kábloch (DI boxy), spotrebnom materiáli a pri „Ostatné“.
- **Vyše 550 nových modelov v databáze techniky**: digitálne a analógové pulty (s počtom kanálov), mikrofóny
  (dynamické / kondenzátorové), bezdrôty a in-ear, stageboxy, zosilňovače, procesory, stojany, DI boxy, DJ technika
  (playery, mixy, gramofóny, kontroléry), kamery, gimbaly, statívy, objektívy, video prepínače, LED procesory,
  projektory, mobily, tablety, notebooky, sieťové prvky, kávovary, ohrievače a batérie, gaffer páska či náplne do
  výrobníkov hmly.
- Pri týchto modeloch sú zatiaľ základné údaje (najmä typ) – ostatné sa dopĺňajú postupne.

### 8.15 – 6. 11. 2026

- **L-Acoustics v spoločnej databáze techniky**: X, S (Syva, Soka), A, K (Kiva II, Kara II, K3, K2, K1), L2 / L2D
  a suby (SB, KS) s frekvenciami, max SPL, uhlom, meničmi, váhou a rozmermi, a zosilňovače LA12X, LA7.16 (i), LA4X, LA2Xi a LA1.16i.
- **Ktoré zosilňovače box poháňa**: pri boxe L-Acoustics je vidieť (pri výbere modelu aj v detaile techniky), že ide
  len na ich zosilňovače, na ktoré a koľko boxov zvládne jeden výstup a celý zosilňovač (napr. K2: LA12X 3 / 3,
  LA7.16 1 / 4, LA4X 1 / 1).
- **Pripomienka pri evente a výpožičke**: keď sú na nich boxy L-Acoustics a chýba ich zosilňovač – alebo je ich málo
  na počet boxov –, ukáže sa upozornenie. Funguje samo, netreba nastavovať pravidlo.
- U L-Acoustics „Active“ znamená bi-amp (2 kanály zosilňovača), nie vlastný zosilňovač – v databáze sú preto ako
  pasívne s bi-ampom.

### 8.14 – 6. 11. 2026

- **Databáza techniky načíta všetky modely** – predtým sa načítalo najviac 1 000, takže časť značiek a modelov
  pri výbere techniky chýbala.
- **Úprava modelu (Vývojár)**: všetky údaje, ktoré k druhu patria, aj prázdne, v mriežke vedľa seba; typy, zdroje
  a podobne sa vyberajú zo zoznamu; DMX módy po riadkoch (názov, počet kanálov, rozpis kanálov) namiesto surového
  zápisu. Tlačidlo Upraviť je rovnako veľké ako Overiť, „Overiť zobrazené“ je preč.
- V okne Vývojár je sekcia Databáza techniky len s návrhmi od firiem a odkazom na celú databázu.
- **Po novej verzii sa stránka sama obnoví**, keď stará otvorená verzia nenájde súbor inej stránky (doteraz sa
  ukázala chyba „Niečo sa pokazilo“).

### 8.13 – 5. 11. 2026

- **Vývojár → Celá databáza techniky** (samostatná stránka): filtre podľa druhu, značky, overenia a toho, či model
  má technické údaje, hľadanie a strany po 100 modeloch. Pri každom modeli úprava druhu, značky, modelu a jednotlivých
  technických údajov (pridať, zmeniť, odobrať), príznak „Údaje sú overené“ a zmazanie. „Overiť zobrazené“ overí
  naraz všetko, čo filtre ukazujú.
- Pri každom modeli je vidieť, **čo chýba** (podľa druhu – napr. pri boxe výkon, frekvencie, váha, rozmery), a filter
  „Neúplné / Úplné“.
- **Kód Thomann** (číslo artiklu) pri modeli – z neho vedie odkaz priamo na produkt v Thomanne.
- Stránka je len pre vývojára: komu to appka nedovolí, toho presmeruje preč aj pri ručne zadanej adrese.

### 8.12 – 5. 11. 2026

- **RCF v spoločnej databáze techniky** podľa katalógov Touring 2026 a Portable: line array HDL (50-A 4K, 30-A,
  28-A) a ich suby, KX, NXL / NXW, NX (aj monitory NX-SMA), ART 9 a ART MK5, EVOX, suby SUB 9000 / 8000 / AX / MK3
  a procesory DX – typ, výkon, frekvencie, max SPL, uhol, meniče, výhybka, váha a rozmery.

### 8.11 – 5. 11. 2026

- **Overené / neoverené údaje v spoločnej databáze techniky**: pri výbere modelu je vidieť, či údaje overil
  vývojár („údaje sú overené“), alebo ich treba skontrolovať. Všetko prevzaté z katalógov výrobcov a z Open Fixture
  Library je zatiaľ neoverené.
- **Vývojár → Databáza techniky**: filter Neoverené / Overené / Všetko, pri každom modeli jeho údaje a tlačidlo
  Overiť; „Overiť zobrazené“ overí naraz všetko, čo hľadanie ukazuje (napr. celú značku). Schválený návrh od firmy
  je overený hneď.
- **Global Truss podľa katalógu 2023** (Nemecko): rovné diely F14 až F54 vrátane čiernych a P verzií s kódom
  (napr. F34200), dĺžkou a váhou. Diely z amerického katalógu (iné kódy) sú odstránené.
- **Spojky Global Truss**: half coupler, swivel coupler a selflock háky s priemerom rúry a nosnosťou – pri svetlách,
  typ Klemy.
- **JBL EON700, EON ONE a PRX900**: typ, výkon, meniče, max SPL, frekvencie a uhol podľa katalógu 2026.

### 8.10.1 – 5. 11. 2026

- Výrobníky hmly (hazery) sú v spoločnej databáze techniky pri svetlách, nie pri spotrebičoch – pri svetle → typ
  Hazer ich nájdete medzi značkami.

### 8.10 – 5. 11. 2026

- **Hliník Global Truss a Duratruss v databáze techniky**: rovné diely F14, F23, F24, F31, F32, F33, F34, DT34P
  a DT44P s kódom, dĺžkou a váhou (napr. Global Truss → „F34 – 2 m (SQ-4112)“).
- **JBL 2026**: VRX900 (aj aktívne VRX932LAP a VRX918SP), VTX A, V, F a M, VTX suby (B15, B18, B28, S25, S28),
  SRX900 a PRX400 – typ, aktívny / pasívny, výkon, meniče, frekvencie, citlivosť, impedancia a uhol podľa katalógu.
- **Bezdrôtové systémy Shure**: BLX, GLX-D+, SLX-D, QLX-D a ULX-D – prijímač a frekvenčné pásmo.

### 8.9 – 5. 11. 2026

- **Hliník TAF v spoločnej databáze techniky**: vyše 300 rovných dielov (FT, HT, PT, TT, TC, FTR, GS…) s typom
  (1–4-point, ground support), dĺžkou a váhou z katalógu výrobcu – vyberiete napr. TAF → FT34-200 a vyplní sa samo.
- **Pódium Nivtec v databáze techniky**: dosky, vrchné stupne, nohy 20–200 cm (pevné, nastaviteľné, oceľové),
  schodnice a zábradlia s rozmerom a váhou. Pri pódiu sa teraz tiež vyberá značka a model.
- Z databázy sa pri hliníku dopĺňa aj dĺžka dielu.

### 8.8 – 5. 11. 2026

- **Vyše 650 svetiel v spoločnej databáze techniky** (Open Fixture Library, 138 výrobcov – Robe, Chauvet, ADJ,
  Cameo, Martin, Clay Paky a ďalší): pri svetle vyberiete značku a model a vyplní sa typ, zdroj svetla, príkon,
  váha a DMX módy s rozpisom kanálov. Údaje, ktoré už v databáze boli, ostali.
- V O aplikácii je uvedený zdroj údajov o svetlách.

### 8.7 – 5. 11. 2026

- **Nahrať GDTF súbor pri svetle**: súbor svetla z gdtf-share.com (rovnaký ako pre grandMA či Vectorworks) vyplní
  výrobcu, model, všetky DMX módy aj s rozpisom kanálov, príkon, váhu a zdroj svetla. Súbor sa číta len vo vašom
  prehliadači a nikam sa neposiela; model mimo databázy ide po uložení na overenie do spoločnej databázy techniky.

### 8.6.2 – 5. 11. 2026

- **Spoločná databáza techniky – údaje z listov výrobcu**: JBL VRX932LA-1, VRX928LA, VRX915M, SRX712M a VT4880
  (výkon, SPL, citlivosť, impedancia, frekvencie, uhol, výhybka, meniče, konektory, váha a rozmery) a zosilňovače
  Crown I-Tech 4000 / 6000 / 8000. Pri výbere modelu sa údaje vyplnia samy.
- Pri zosilňovačoch sa z databázy dopĺňa aj výkon pri 2, 4 a 8 Ω a v bridge.

### 8.6.1 – 5. 11. 2026

- **Nová verzia sa ponúkne na každej stránke** – aj pri prihlásení, výbere firmy, Návode či tlači (doteraz len vo
  vnútri firmy). Okno je nad všetkým ostatným, nič ho nezakryje, a do tlače sa nedostane.

### 8.6 – 5. 11. 2026

- **Angličtina aj tam, kde chýbala**: Prehľad (štatistiky), popisy modulov, Kancelária, hlášky pri ukladaní,
  počasie, pódium a ďalšie – vyše 400 textov navyše. Čo slovník pozná, sa v angličtine preloží všade, kde sa zobrazí.
- **Tlačidlo Aktualizovať** pri novej verzii fungovalo zle, keď vyšli dve verzie tesne po sebe – teraz prepne vždy
  (a keby nie, stránku obnoví samo).
- **Technika z databázy bez údajov**: keď model zo spoločnej databázy technické údaje ešte nemá (alebo len pár),
  hore sa ukáže, že údaje o ňom zatiaľ nie sú známe a treba ich doplniť ručne.

### 8.5 – 5. 11. 2026

- **Celá appka v angličtine**: po prepnutí na EN sú po anglicky všetky obrazovky – technika, cases, eventy,
  sklad, výpožičky, objednávky, vozidlá, servis, siete, kalkulačky, štatistiky, nastavenia, Návod a tipy aj hlášky.
  Anglický slovník sa stiahne len pri angličtine, slovenčinu nespomalí. Hárky na tlač, štítky, plagáty a cenové
  ponuky pre klientov ostávajú po slovensky.
- **Technika: výrobca a model hneď hore** pod druhom a názvom – model zo spoločnej databázy vyplní údaje nižšie
  ešte predtým, než sa k nim dostanete.

### 8.4 – 5. 11. 2026

- **Jazyk SK / EN** (1. časť): prepínač v Nastaveniach → Účet, na úvodnej stránke a pri prihlásení; jazyk sa uloží
  k účtu (na každom zariadení rovnaký). V angličtine je zatiaľ menu, Prehľad, Hľadať všade, skenovanie, prihlásenie,
  úvodná stránka a pätička; ďalšie časti appky pribudnú postupne, dovtedy ostávajú po slovensky. Hárky na tlač
  a štítky sú vždy po slovensky.
- Nový prehliadač bez zvoleného jazyka: slovenčina pre slovenský a český prehliadač, inak angličtina.

### 8.3 – 5. 11. 2026

- **Spoločná databáza techniky**: pri pridávaní techniky (zvuk, svetlá, video, DJ, hliník, IT, spotrebiče) najprv
  značka (napr. JBL), potom jej model – model z databázy doplní technické údaje. Na konci zoznamu „Iná značka / Iný
  model“: dopíšete vlastný, technika sa uloží firme a model ide ako návrh do databázy. Na začiatok asi 100 známych
  značiek a modelov.
- **Vývojár → Databáza techniky – návrhy na overenie**: rovnaký model od viacerých firiem je jeden riadok s počtom
  firiem; schváliť (aj s opravou značky, modelu a druhu) alebo zamietnuť s dôvodom; hľadanie a mazanie v katalógu.
- Do databázy idú len technické údaje modelu – nikdy sériové čísla, ceny, poznámky ani nič o firme.
- Nová migrácia: `0146` (je aj v `supabase/update-all.sql`).

### 8.2 – 5. 11. 2026

- **Úvodná stránka RigTracku** pre každého: čo appka vie, ukážky z ukážkovej firmy a ako začať, s tlačidlami
  Prihlásiť sa a Mám pozvánku (otvorí rovno vytvorenie účtu). Bez prihlásenia sa ukáže na hlavnej adrese, inak na
  /home; odkaz „Úvod“ je v pätičke.

### 8.1 – 5. 11. 2026

- **Plagát inventára – drobný údaj pri technike**: malým sivým písmom vedľa počtu reproduktor aktívny / pasívny,
  bezdrôtový systém a in-ear frekvencia (napr. 470–790 MHz) a svetlo LED, výbojka, halogén alebo laser.
- **Plagát inventára – čia technika**: zaškrtnete, či na plagáte má byť aj technika zamestnancov a technika
  zdieľaných (prepojených) firiem; technika zdieľanej firmy má vlastnú dlaždicu s názvom firmy.

### 8.0 – 3. 11. 2026

- **Hľadať všade** hore na Prehľade: jedno políčko cez techniku, cases, eventy, firmy, kontakty, úlohy, poznámky
  a miesta v sklade. Bez ohľadu na diakritiku, viac slov zúži výsledky, „#7“ nájde kus číslo 7 aj s tým, v ktorom case
  je. Enter otvorí prvý výsledok.
- **Skenovať QR** hore na Prehľade: kamera hneď, štítok techniky, case alebo miesta otvorí jeho detail.
- **Návod a tipy**: nová stránka s krátkymi „ako na to“ (sklad, sady cases, príslušenstvo, vrátenie po evente,
  tlač) a hľadaním v nej – odkaz v pätičke a v Nastaveniach → O aplikácii.

### 7.19.1 – 3. 11. 2026

- Príslušenstvo v obsahu sady: zmeny sa zapíšu až tlačidlom **Uložiť** (alebo Zrušiť). Poradie je priamo v zozname –
  príslušenstvo hore s číslom 1., 2., 3. a šípkami, ostatný obsah pod ním.

### 7.19 – 3. 11. 2026

- **Príslušenstvo naraz pre celú sadu cases**: na stránke sady (napr. K10 Case #1–#5) tlačidlo „Príslušenstvo
  v obsahu“ – zaškrtnete, čo je na hárku s obsahom príslušenstvo (lanko, hák, omega…), a platí to vo všetkých cases
  sady naraz.
- **Poradie príslušenstva** na hárku s obsahom sa dá meniť šípkami (na stránke sady aj pri hárku case); platí pre
  hárky všetkých cases.
- **Čísla kusov na hárku s obsahom**: pri technike evidovanej po kusoch (napr. svetlá) je pod názvom, ktoré kusy do
  case patria – napr. „#3, #4“.

### 7.18.1 – 3. 11. 2026

- Technika rozdelená do cases: časti sú zoradené podľa case (#1, #2, #3…), mimo case na konci.

### 7.18 – 3. 11. 2026

- **Dať do viacerých cases naraz**: pri technike počítanej na kusy (napr. háky, svorky) na stránke so všetkými časťami
  tlačidlo „Dať do viacerých cases“ – zaškrtnete cases, zadáte počet do každého a kusy mimo case sa rozdelia jedným
  klikom. Sama navrhne cases zo sady, kde technika ešte nie je, s rovnakým počtom ako v ostatných; kde už je, kusy
  sa pridajú k nej.

### 7.17 – 3. 11. 2026

- **Vrátenie po evente** v detaile eventu: čo sa pri odchode naložilo a pri návrate neodškrtlo. Pri každej veci
  **Strata** alebo **Poškodené** – zapíše sa rovno do Škôd a úrazov (s eventom a poznámkou). Tlačidlo **Uzavrieť
  vrátenie** uloží, kto a kedy ho uzavrel a čo chýbalo; event potom zmizne z „Ešte vonku“ na Prehľade. Uzavrieť môže
  posádka eventu alebo kto upravuje eventy, znova otvoriť len ten, kto upravuje eventy.
- Prehľad: klik na event v „Ešte vonku a vrátené“ otvorí rovno vrátenie v detaile eventu.
- Škody a úrazy: nový druh **Strata**.
- Nová migrácia: `0145` (je aj v `supabase/update-all.sql`).

### 7.16 – 3. 11. 2026

- **Hliník leží na Mieste spolu s cases**: samostatný druh „Hliník“ zmizol, je len Miesto. Pri mieste je tlačidlo
  „Hliník je na tomto mieste“ a potom „Otvoriť hliník“ so stohmi trussov; cases sa naň ukladajú ako doteraz.
  Existujúce miesta s hliníkom sa zmenili na Miesto samy.
- **Rozmery miesta v metroch**: v Upraviť plán pri mieste, miestnosti, stene a stĺpe zadáte dĺžku a šírku v m.
- **Uložiť case do regála bez výberu police**: tlačidlo „Uložiť sem“ už nie je sivé – bez zvolenej police sa case
  uloží na prvú policu, kde je miesto (case bez rozmerov počíta ako 60 cm). Platí aj pri skenovaní.
- **Plagát inventára na A4 aj A5**, na výšku aj na šírku (aj v tlačovej fronte).
- Nová migrácia: `0144` (je aj v `supabase/update-all.sql`).

### 7.15 – 3. 11. 2026

- **Rýchlejšia databáza**: pravidlá prístupu overujú prihláseného používateľa raz na dopyt namiesto pri každom
  riadku, pri čítaní sa kontroluje jedno pravidlo namiesto dvoch a pribudli indexy pre prepojenia tabuliek –
  zoznamy techniky, cases a eventov sa načítajú rýchlejšie, najmä keď dát pribúda. Oprávnenia sa nemenia.
- Upratanie bezpečnosti: interné funkcie databázy sa nedajú volať zvonku, rozšírenie na odosielanie push upozornení
  je vo vlastnej schéme.
- Vývoj: testy bežia asi 3,5× rýchlejšie, zostavenie stránky má pevnú verziu systému.
- Nová migrácia: `0143` (je aj v `supabase/update-all.sql`).

### 7.14 – 3. 11. 2026

- **Overenie, že nie ste robot** (Cloudflare Turnstile) pri prihlásení, registrácii a obnove hesla – chráni účty aj
  pred hádaním hesiel mimo appky. Väčšinou nič nepýta, len krátko overí prehliadač.
- Zásady ochrany súkromia a cookies doplnené o Cloudflare Turnstile.

### 7.13 – 3. 11. 2026

- **Demo firma doplnená**: plán skladu (regály s policami a paletami, palety na zemi, hliník, kancelária, brána, okno,
  stĺp), cases uložené na regáli a palete, hliník v stohoch, činnosti pred / na / po evente a bezdrôtový systém
  s vysielačmi. Existujúce demo firmy sa doplnili samy.
- README: nové snímky (plán skladu, regál spredu, hliník, plagát inventára, IP tabuľka), staré odstránené.
- Opravené staršie migrácie, aby sa `supabase/update-all.sql` dal znova spustiť aj na databáze s novými dátami.
- Nová migrácia: `0142` (je aj v `supabase/update-all.sql`).

### 7.12 – 3. 11. 2026

- **Registrácia**: potvrdenie „Mám aspoň 16 rokov a súhlasím s podmienkami používania“ (s odkazmi na podmienky a ochranu
  súkromia).
- **Podmienky používania**: časť Vek a postup na nahlásenie nezákonného obsahu alebo porušenia autorských práv.
- Doplňujúci právny audit (vek, sledovanie, e-maily, predplatné, autorské práva) – `docs/AUDIT-2026-11-doplnok.md`.

### 7.11 – 3. 11. 2026

- **Vlastné farby skladu** (Nastavenia → Sklad → Farby v pláne): regál, miesto, hliník, miestnosť, dvere, okno, stĺp a stena;
  „Predvolená“ vráti pôvodnú farbu.
- **Farba typu palety**: pri každom type palety vlastná farba v pláne (inak drevená hnedá, plastová čierna).
- Nová migrácia: `0141` (je aj v `supabase/update-all.sql`).

### 7.10.1 – 3. 11. 2026

- **Sada cases**: QR štítky, Obsahy a Štítky všetkých; tlačidlá „do tlače“ sú až na stránke tlače. „Pridať ďalší do sady“
  je sivý riadok pod posledným case. Späť z tlače vráti do sady.
- **Tlačiť všetko naraz**: pri obsahoch výber A4 / A5 a na výšku / na šírku; obsahy aj štítky sa dajú pridať do tlačovej
  fronty (obsahy s vybraným formátom).
- Z Tlače → „Otvoriť a tlačiť“ (obsah, štítok case, plagát, IP tabuľka) sa tlačidlom Späť vrátite do Tlače.

### 7.10 – 3. 11. 2026

- **Siete – pekná tlač IP tabuľky a MAC adries**: hlavička s firmou, sieťou a počtom, prehľadná tabuľka (duplicitné IP
  červené), dátum vygenerovania; A4 alebo A5, na výšku alebo na šírku; Tlačiť, PDF, PNG aj do tlačovej fronty (s formátom).
- Nová migrácia: `0140` (je aj v `supabase/update-all.sql`).

### 7.9 – 3. 11. 2026

- **Tlačová fronta si pamätá formát**: obsah case aj plagát sa pridajú s papierom a orientáciou, ako ich máte práve
  nastavené (napr. A5 na šírku); vo fronte je to vidno a tlač z fronty ich použije (aj hromadná, ak majú rovnaký formát).
- V appke už nie je názov výrobcu štítkovačky – všade len „Štítky“.
- Nová migrácia: `0139` (je aj v `supabase/update-all.sql`).

### 7.8.1 – 3. 11. 2026

- Sada cases (napr. 8× Beam 7R Case): **Obsahy všetkých** a **Štítky všetkých** naraz (jedna tlač / PDF) a obe aj do tlačovej
  fronty jedným klikom.

### 7.8 – 3. 11. 2026

- **Dátum vygenerovania** na každom hárku s obsahom case, štítku case a plagáte inventára (v PDF, PNG aj pri tlači).
- Hromadná tlač štítkov a obsahov bez hlavičky a pätičky prehliadača (dátum, adresa stránky, číslo strany).

### 7.7.3 – 3. 11. 2026

- **Štítok na pásku „Sieť (IP / MAC)“**: IP adresa s prefixom (napr. 2.1.0.1/8), MAC a názov. Zo Sietí → IP tabuľka sa otvára
  rovno tento štítok (predtým sa omylom ponúkla DMX adresa).

### 7.7.2 – 3. 11. 2026

- **Bez QR štítku** prehľadnejšie a bez omylov: pri každej položke zaškrtávacie políčko, „vybrať všetko“ po stĺpcoch,
  hľadanie; „Do tlače“ a „Už olepené“ pracujú len s vybranými (olepené sa ešte potvrdí). Pri technike je vidno, v ktorom
  je case; zoradené prirodzene (#1, #2 … #10).

### 7.7.1 – 3. 11. 2026

- Poznámka → úlohy: úlohy dostanú číslo podľa poradia riadkov (1., 2., 3. …) a v Úlohách sa tak aj zoradia (aj 2 pred 10).

### 7.7 – 3. 11. 2026

- **Bezdrôtový systém – návrh názvu a modelu**: z prijímača, vysielačov a kapsúl appka navrhne názov (napr. „Výrobca
  RX – 2× vysielač + kapsula, bodypack“) aj model; klik na návrh ho použije, inak sa nič nemení.
- V detaile techniky samostatné riadky **Prijímač** a **Vysielače** (vedľa Kapsúl).

### 7.6 – 3. 11. 2026

- **Siete – tlač**: IP tabuľka aj MAC adresy sa dajú vytlačiť (s nadpisom, firmou, sieťou a dátumom; tlačí sa to, čo je
  vyfiltrované).
- **Štítok pri IP tabuľke**: pri technike ikona štítku – páska Brother s IP / MAC; „Štítky na pásku“ pre všetku
  vyfiltrovanú techniku naraz.
- **QR kódy Wi-Fi na tlač** (Siete → QR kódy sietí na tlač): A4, výber sietí, heslo pod kódom voliteľne.

### 7.5.3 – 3. 11. 2026

- Oprava: v Tlač → Bez QR štítku sa zoznamy cases a techniky zobrazovali ako bodky.

### 7.5.2 – 3. 11. 2026

- Ochrana súkromia a Podmienky používania doplnené o prevádzkovateľa a kontakt na žiadosti k osobným údajom.

### 7.5.1 – 3. 11. 2026

- Činnosti: tlačidlo **Upraviť** (ceruzka) – zmena názvu s tlačidlom Uložiť a kto / ktoré roly k činnosti patria;
  Zavrieť.

### 7.5 – 3. 11. 2026

- **Tlač patch listov**: šablóny patch listov (zvuk aj DMX) sa dajú vytlačiť alebo uložiť do PDF (ikona tlačiarne pri
  šablóne). Patch list a DMX patch eventu sa dajú pridať do tlačovej fronty (Tlač → Patch listy eventov).
- Nová migrácia: `0138` (je aj v `supabase/update-all.sql`).

### 7.4 – 3. 11. 2026

- **Kanban úloh**: do strán sa dá posúvať ťahaním myšou aj za prázdny stĺpec alebo medzeru (karty sa presúvajú ako
  doteraz).

### 7.3 – 3. 11. 2026

- **Poznámka → úlohy** (ako v TickTicku): riadky dlhej poznámky prevediete na úlohy jedným klikom – vyberiete riadky,
  kategória sa predvyplní z nadpisu, ľudia z poznámky. Prevedené riadky z poznámky zmiznú (prázdna sa môže zmazať).
- Pri poznámke je tlačidlo **Upraviť** (netreba klikať na text).

### 7.2 – 3. 11. 2026

- **Komu činnosť patrí**: v Nastaveniach → Pripomienky a limity pri každej činnosti vyberiete ľudí alebo roly (napr.
  „Fotky na soc. siete“ → konkrétny človek, „Kontrola kabeláže“ → skladníci). Pri evente sa ponúknu na jedno kliknutie.
- Nová migrácia: `0137` (je aj v `supabase/update-all.sql`).

### 7.1.1 – 3. 11. 2026

- Ochrana súkromia, Cookies a Podmienky používania sú na PC v širokom zobrazení (nie úzke ako na mobile).

### 7.1 – 3. 11. 2026

- **Bezdrôtový systém – vysielače ako zoznam**: „Pridať vysielač“ – ručný (handka) aj bodypack, každý s modelom a počtom
  kusov; systém môže byť aj len prijímač bez vysielača. Doterajší jeden vysielač sa prevzal do zoznamu.

### 7.0 – 3. 11. 2026

- **Ochrana prihlásenia**: po 5 neúspešných pokusoch sa prihlasovanie na 5 minút zablokuje (rieši to server, odpočet
  pokračuje aj po obnovení stránky alebo v novej karte). Chráni aj pred skúšaním mnohých účtov z jednej siete.
- **Ochrana súkromia, Cookies, Podmienky používania**: nové verejné stránky (odkazy v pätičke).
- **Súhlas s ukladaním v prehliadači**: RigTrack nepoužíva cookies, analytiku ani reklamu; vaše nastavenia zobrazenia
  (vzhľad, filtre, rozloženie) sa uložia len so súhlasom. Zmeníte ho v pätičke „Nastavenia ukladania“.
- **Moje údaje** (Nastavenia → Účet): stiahnutie všetkých vašich osobných údajov a zmazanie účtu.
- Bezpečnosť: kontrola odkazov zadaných používateľmi, prísnejšia Content-Security-Policy, bezpečnostné hlavičky na
  serveri. Správa z auditu je v `docs/AUDIT-2026-11.md`.
- Nové migrácie: `0134`–`0136` (sú aj v `supabase/update-all.sql`) a Edge Function `login`.

### 6.12.2 – 3. 11. 2026

- **Moje zodpovednosti** na Prehľade: klik pri jednom druhu techniky (napr. len Beam 7R) otvorí techniku vyhľadanú
  podľa názvu, inak Kontroly; bez názvu zodpovednosti a bez opakovania rovnakých názvov.
- Prevádzkové hodiny, ktoré máte v „Moje zodpovednosti“, sa už neopakujú v upozorneniach hore.
- Oprávnenia: stĺpec Helper je pred „Len na čítanie“.

### 6.12.1 – 3. 11. 2026

- **QR štítky** vo farbách appky; štítky sú na bielom „papieri“ v šírke A4, takže veľkosť na obrazovke sedí s tlačou.
- QR štítky miest v sklade bez stien, okien, dverí, stĺpov a miestností.
- Z Tlače → „Tlačiť na A4“ sa tlačidlom Späť vrátite do Tlače, nie na techniku.
- **Bez QR štítku**: bez káblov a spotrebného materiálu; cases a technika vedľa seba.
- Tlačidlá „QR do tlače“ / „V tlači“ rovnako vysoké ako ostatné.

### 6.12 – 3. 11. 2026

- **Upraviť plán → Pridať**: hore Regál, Miesto, Paleta a zvlášť Stavba (miestnosť, dvere, okno, stĺp, stena). Pri
  mieste vyberiete, na čo je – cases a iné veci, alebo hliník.
- Čo je vybrané, sa dá **nakresliť ťahaním** v pláne (regál zvoleného typu, paleta, miesto, okno…), alebo tlačidlom
  pridať doprostred.
- **Dvere a okná** majú pevnú hrúbku – natiahnuť sa dajú len pozdĺž steny.
- Pri vybranom mieste už nie je Druh ani Poschodia (pridáva sa hore; police regála sú v poliach).

### 6.11 – 3. 11. 2026

- **Činnosti pred, počas a po evente**: každá činnosť má, kedy sa robí – pred eventom (nakladanie), na evente alebo
  po evente (vykladanie, kontrola a naskladnenie hliníka, kontrola kabeláže). V Nastaveniach aj pri evente sú
  zoskupené podľa toho; existujúcim sa to nastavilo podľa názvu a dá sa zmeniť.
- Nová migrácia: `0133` (je aj v `supabase/update-all.sql`).

### 6.10 – 3. 11. 2026

- **Bezdrôtový systém** (napr. Wisycom MRK960 + MTH410): okrem frekvencie a kapsúl aj **model prijímača**, **vysielač**
  (ručný mikrofón / bodypack / oba) a **model vysielača**. Ukáže sa v detaile aj v zozname techniky.
- V detaile techniky sú vidno **kapsule**, ktoré k mikrofónu pasujú.

### 6.9.1 – 3. 11. 2026

- Plagát inventára: všetky tlačidlá (tlačová fronta, Tlačiť, PDF, PNG) rovnakej farby.
- QR štítky: „QR do tlače“ je na bielej stránke čitateľné aj v tmavej téme.
- Páska Brother otvorená zo stránky QR štítkov sa tlačidlom Späť vráti na QR štítky, nie na techniku.

### 6.9 – 3. 11. 2026

- **Nastavenia → Pripomienky a limity**: pripomienky pri eventoch, činnosti, úrovne kontroly aj limity hodín a revízie
  sú na jednej záložke.
- **Zodpovedné osoby** už nemajú vlastné „odčítať hodiny / skontrolovať case každých … dní“ – kedy pripomenúť, určujú
  Úrovne kontroly (pri technike úroveň hodín, pri case úroveň kontroly).

### 6.8 – 2. 11. 2026

- **Upraviť plán → Pridať**: jedno miesto, kde vyberiete, čo pridať – regál (podľa typu), paletu (podľa typu), miesto /
  zónu, hliník, miestnosť, dvere, okno, stĺp alebo stenu. Pridá sa doprostred a posuniete ho ťahaním.
- **Dvere a okná na obvode skladu**: pridajú sa na stenu a pri posunutí k inej stene skladu sa k nej prichytia.
- **Miestnosť** (kancelária, dielňa…): v pláne obrys s názvom, nedá sa na ňu kliknúť – rovnako ako stĺp, stena, dvere
  a okno.
- **Hliník ako miesto v pláne**: klik naň otvorí stohy trussov (tlačidlo Hliník hore už nie je).
- **Typy paliet** v Nastaveniach → Sklad (predvolené EUR 120 × 80 drevená a plastová): paleta sa pridáva podľa typu;
  drevená je v pláne hnedá, plastová čierna.
- „Nastavenia skladu“ sú až v Upraviť plán (s oprávnením spravovať sklad).
- Pripomienky zodpovedným osobám (odčítať hodiny, skontrolovať case) idú podľa Úrovní kontroly.
- Nová migrácia: `0132` (je aj v `supabase/update-all.sql`).

### 6.7 – 2. 11. 2026

- **Plagát inventára** po novom: A4 **na výšku** alebo na šírku, čierno-sivý na bielom papieri (bez modrej). Nakreslí sa
  ako obrázok, takže náhľad sa vždy zmestí na obrazovku a tlač, **PDF** aj **PNG** vyzerajú rovnako. Veľa techniky
  pokračuje na ďalšej strane.
- Plagát sa dá pridať do **tlačovej fronty** (Tlač → Plagáty inventára).
- Svetlá na plagáte sa rozdelia na pohyblivé, statické, efektové, výrobníky a príslušenstvo; zvuk, video, DJ, IT a
  spotrebiče podľa typu, ostatné podľa kategórie.
- Nová migrácia: `0131` (je aj v `supabase/update-all.sql`).

### 6.6.2 – 2. 11. 2026

- Oprava: pri výbere z automatického dopĺňania prehliadača (napr. uložený text v políčku) appka hlásila chybu – zachytilo
  ju hlásenie chýb vo Vývojárovi.

### 6.6.1 – 2. 11. 2026

- Plagát inventára je vždy na bielom pozadí (na tlač na biely papier); svetlé logo sa na ňom prefarbí na čierno.

### 6.6 – 2. 11. 2026

- **Hliník v sklade** (Sklad → Hliník): miesto na trussy ako mriežka zhora – na každom políčku stoh dielov nastojato.
  Zhora vidno stohy vo farbe dielu s počtom kusov, spredu diely na sebe (farba podľa dĺžky, zadné rady bledšie) s
  výškou v metroch. Klik na políčko ukáže stoh: pridať diely navrch (aj viac kusov naraz), poradie hore / dole,
  vybrať, presunúť celý stoh. Zoznam trussov ukáže, koľko kusov je uložených z koľkých. Počet stĺpcov, radov a veľkosť
  políčka sa dá nastaviť (spravovať sklad).
- Nová migrácia: `0130` (je aj v `supabase/update-all.sql`).

### 6.5 – 2. 11. 2026

- **Plagát inventára** (Technika → Plagát inventára): technika jedného druhu na A4 na šírku – veľký počet kusov,
  rozmer, názov a fotka. Pódium sa rozdelí na platne a nohy / zábradlia / schody, hliník na rovné diely (zvlášť podľa
  série), rohy / T / kríže a základne. Rovnaká technika rozdelená do viacerých cases sa zráta dokopy, vyradená sa
  nepočíta. Nadpis, podnadpis, poznámky dole, tmavý alebo svetlý vzhľad a ktoré časti ukázať; tlač alebo PDF.

### 6.4 – 2. 11. 2026

- **Palety na zemi** v Sklade → Upraviť plán: „Pridať paletu“ s rozmerom (EUR 120 × 80, priemyselná 120 × 100,
  polovičná 80 × 60, štvrťová 60 × 40 alebo vlastný) a materiálom (drevená / plastová). Pridá sa doprostred, potom ju
  posuniete ťahaním a otočíte o 90°. Pri vybranej palete sa dá zmeniť rozmer aj materiál.
- Nová migrácia: `0129` (je aj v `supabase/update-all.sql`).

### 6.3 – 2. 11. 2026

- **Cases na paletách**: v pohľade spredu stoja cases na paletách, nie vedľa nich. Bez voľby sa poskladajú samy – na
  prvú paletu, kde je miesto, a keď je rad plný, na seba (ak to výška police dovolí). Čo sa nezmestí, ide vedľa paliet
  alebo svieti na červeno.
- **Klik na paletu** ju vyberie: vidíte, čo na nej leží, a case uložíte rovno na ňu. Pri každom case na polici sa dá
  zvoliť paleta ručne alebo nechať „auto“.
- **Rozmery case priamo v sklade** (ikona pravítka): spredu, dozadu a na výšku – bez nich appka nevie, koľko miesta case
  zaberá.
- Nová migrácia: `0128` (je aj v `supabase/update-all.sql`).

### 6.2.1 – 2. 11. 2026

- Aktualizované knižnice (React, React Router, Supabase, Vite, ikony, čítanie PDF a Excelu) – opravy chýb, bez zmien vo
  funkciách.

### 6.2 – 2. 11. 2026

- **Chyby v appke** pre vývojára: keď niekomu spadne stránka alebo nastane neošetrená chyba, appka ju sama uloží – kto,
  na ktorej stránke, v akej verzii a koľkokrát. Vývojár ich vidí pri výbere firmy v časti Vývojár → Chyby v appke,
  zoskupené, a môže ich označiť ako vyriešené.
- Nová migrácia: `0127` (je aj v `supabase/update-all.sql`).

### 6.1 – 2. 11. 2026

- **Typy regálov** v Nastaveniach → Sklad: regály, ktoré používate – názov, hĺbka, polia so šírkou, police s výškou a
  paletami. Tlačidlo „Rozmiestniť regály v sklade“ otvorí rovno úpravu plánu.
- **Úprava plánu**: „Pridať regál typu…“ ho pridá doprostred skladu, potom ho posuniete ťahaním. Vybrané miesto sa dá
  **otočiť o 90°** a už nakreslený regál nastaviť podľa typu.
- **Palety na polici**: rozložené, natesno zľava alebo natesno sprava – voľné miesto ostane na jednom kraji. Polica bez
  paliet = 0 paliet.
- **Pohľad spredu vedľa panelu**: na širokej obrazovke je regál vľavo a polica (čo na nej je, uložiť case) alebo úprava
  polí vpravo.
- Stĺp, stena, dvere a okno sa v pôdoryse nedajú kliknúť (upravujú sa v Upraviť plán).
- QR štítky miest v sklade sa dajú pridať do tlačovej fronty.
- Nová migrácia: `0126` (je aj v `supabase/update-all.sql`).

### 6.0.1 – 2. 11. 2026

- Regál spredu ako technický výkres: tenké stojky a nosníky, kóty výšky políc a šírky polí, drobné písmo rovnako veľké
  pri každom regáli, farby podľa svetlej / tmavej témy.
- Pri stĺpe, stene, dverách a okne už nie je „Uložiť sem case“.

### 6.0 – 2. 11. 2026

- **Nastavenia → Sklad**: rozmery skladu a všetky regály na jednom mieste – pri každom regáli polia (šírka), police
  (výška každej zvlášť), palety a hĺbka. Dĺžka regála na pláne sa podľa polí nastaví sama. Na stránke Sklad je tlačidlo
  „Nastavenia skladu“.
- **Nové oprávnenie „Spravovať sklad“** (rozmery, regály, police, palety) – dá sa dať role, skupine aj jednému človeku.
  Doteraz to patrilo pod „Spravovať kategórie“; kto mal tam výnimku, má ju aj pri sklade.
- Nová migrácia: `0125` (je aj v `supabase/update-all.sql`).

### 5.19 – 2. 11. 2026

- **Regál spredu**: klik na regál na pôdoryse prepne na pohľad spredu – stojky, nosníky, police, palety a cases ako škatule
  podľa ich rozmerov. Pri každej polici je jej výška a koľko cm ostáva voľných; čo sa na výšku nezmestí, je červené.
- **Polia regála**: regál sa skladá z polí (napr. 267 cm) a každé pole má vlastné police – každá inak vysoká, niekde 3,
  niekde 4. Pri polici sa dá zadať počet paliet; appka ukáže, koľko europaliet sa zmestí (267 cm = 3 palety + 27 cm).
  Nastaví sa tlačidlom „Upraviť polia a police“ (kopírovanie poľa jedným klikom).
- Case sa ukladá na konkrétnu policu konkrétneho poľa (klikom na policu, výberom alebo skenovaním); na pôdoryse
  sú polia regála vidieť ako deliace stojky.
- Nová migrácia: `0124` (je aj v `supabase/update-all.sql`).

### 5.18 – 2. 11. 2026

- **Tlačiť všetko naraz**: v tlačovej fronte jedno tlačidlo pre všetky štítky a obsahy cases – štítky po dvoch na A4,
  hárky s obsahom podľa vašich volieb hárku (A4/A5, na výšku/na šírku). Vytlačiť alebo stiahnuť ako jedno PDF.
- **Bez QR štítku**: tlačová fronta ukáže techniku a cases, ktoré ešte nemajú vytlačený QR – jedným klikom ich pridáte do
  tlače, alebo označíte, že už sú olepené. Vytlačené sa zapamätá pri „Vytlačené – vyprázdniť“.
- Nová migrácia: `0123` (je aj v `supabase/update-all.sql`).

### 5.17 – 2. 11. 2026

- **Vrátený case treba spočítať**: keď sa case vráti z eventu (naskenuje alebo odškrtne v pack liste – Návrat), appka
  pripomenie spočítať a skontrolovať obsah (napr. káblovku). Na stránke case svieti upozornenie a v **Kontrolách** je
  sekcia „Vrátené z eventu – spočítať obsah“, kým niekto neklikne Skontrolované.
- **Ešte vonku**: v Kontrolách aj na Prehľade (nový blok „Ešte vonku a vrátené“) je, čo sa z eventov, ktoré už skončili,
  naložilo, ale nevrátilo – s odkazom rovno do pack listu.

### 5.16 – 2. 11. 2026

- **Limity hodín**: napr. Výbojka 1 500 h alebo servis každých 500 h prevádzky. Upozorní pri nastavenom % (predvolene 90 %).
  Po výmene alebo servise sa zapíše stav počítadla a limit sa počíta odznova (funguje aj s vynulovaným počítadlom).
- **Revízie**: elektro revízia káblov, spotrebičov alebo akákoľvek pravidelná kontrola – interval v mesiacoch a koľko dní
  vopred upozorniť. Revízia sa zapisuje po kusoch alebo všetkým naraz, s výsledkom vyhovela / nevyhovela.
- Všetko sa nastavuje v **Nastavenia → Limity a revízie** (predvoľby jedným klikom) – pre druhy techniky, kategórie
  alebo vybranú techniku. Voliteľne vznikne aj úloha.
- Stav je pri technike (sekcia Limity a revízie, aj na prehľade skupiny) a v **Kontrolách**. Raz denne príde upozornenie
  tým, čo smú limity nastavovať, a zodpovedným za daný druh techniky.
- Nové oprávnenia: **Nastavovať limity hodín a revízie** a **Zapisovať výmeny, servis a revízie**.
- Nová migrácia: `0122` (je aj v `supabase/update-all.sql`).

### 5.15.1 – 2. 11. 2026

- **Text pod QR kódom na A4 podľa výberu**: zaškrtávacie políčka Názov, V ktorom case, Číslo / inventár, Firma –
  bez všetkých ostane len samotný QR. Voľba sa uloží k účtu.

### 5.15 – 2. 11. 2026

- **Do tlače priamo tam, kde sa tlačí**: QR štítky (technika aj cases) – „QR do tlače“ na stránke QR štítkov,
  páska Brother – „Páska do tlače“ na stránke štítkov na pásku, **štítok case** – „Štítok do tlače“ a **obsah case**
  – „Obsah do tlače“. Z detailov techniky a cases tlačidlo zmizlo.
- Tlačová fronta má nové skupiny Štítky cases a Obsah cases (každý sa otvorí a vytlačí zvlášť).
- V nastaveniach sú pri @todo a @toprint aj číselné kódy (31121800, 01001800).
- Nová migrácia: `0121` (je aj v `supabase/update-all.sql`).

### 5.14.1 – 2. 11. 2026

- **Vlastná veľkosť QR na A4**: „Vlastná (mm)“ – stranu QR zadáte v milimetroch (15–180 mm), písmo sa prispôsobí a na
  stranu sa zmestí toľko štítkov, koľko sa vojde. Dá sa nastaviť v Nastaveniach aj priamo pri tlači.
- **@toprint do čísla a dátumu**: v číselnom políčku 01001800, v dátume 1. 1. 1800.

### 5.14 – 2. 11. 2026

- **Tlač** (nová položka v menu): tlačová fronta štítkov. Pri technike, rozdelenej technike, case aj sade cases je
  tlačidlo **Do tlače**, pri svetlách aj **Páska do tlače**. Vo fronte sú štítky rozdelené (QR techniky, QR cases,
  pásky Brother) a jedným klikom sa vytlačia; „Vytlačené – vyprázdniť“ frontu vyprázdni.
- **QR štítky na A4 alebo Brother** (Nastavenia → Zoznamy → Tlač a kľúčové slová) a **veľkosť QR na A4**:
  20, 12, 6 alebo 2 na stranu – veľké štítky s veľkým písmom sa dobre skenujú aj iPhonom. Veľkosť sa dá zmeniť
  aj priamo pri tlači. Adresy, módy a odber idú vždy na pásku Brother.
- **@toprint**: napíšte do políčka (napr. pri čísle case) @toprint – vznikne úloha „Vytlačiť: …“ a QR štítok tej
  techniky alebo case sa pridá do tlačovej fronty. Do číselného políčka 01001800, do dátumu 1. 1. 1800.
- **Komu ukázať @todo a @toprint**: v nastaveniach vyberiete ľudí, ktorým sa úlohy priradia (inak tomu, kto
  kľúčové slovo napísal).
- Nová migrácia: `0120` (je aj v `supabase/update-all.sql`).

### 5.13 – 29. 10. 2026

- **Nový pohľad na sklad zhora**: betónová podlaha s mriežkou po 1 m, hrubé obvodové steny, rozmery skladu a mierka;
  regál ako police so stĺpikmi, počtom poschodí a pásikom obsadenosti, paleta s doskami, zóna prerušovanou čiarou,
  stĺp šrafovaný, dvere s oblúkom otvárania dovnútra a okno dvojitou čiarou. Vybrané miesto je zvýraznené.

### 5.12.1 – 29. 10. 2026

- **Logo firmy cez Ctrl+V** (Nastavenia → Firma → Logo a štítky na cases): skopírované logo stačí vložiť, nahrá sa
  rovnako ako cez tlačidlo (aj s odstránením jednofarebného pozadia).

### 5.12 – 29. 10. 2026

- **Presety zosilňovača – tlač a Excel**: pri digitálnom zosilňovači (napr. Crown) v detaile „Tlačiť / stiahnuť“ –
  tabuľka všetkých presetov (aj voľných), reprobox a poznámka; tlač na A4 alebo stiahnutie do Excelu (CSV).
- **Poznámky** (nová položka v menu): zdieľané firemné poznámky – nadpis, text, pripnutie hore, hľadanie a označenie
  ľudí z firmy; označený dostane upozornenie a nájde ich cez „Kde som označený“. Upraviť môže každý člen, zmazať
  autor alebo admin.
- **Sklad**: na plán sa dajú zakresliť stĺpy, steny / priečky, dvere / brány a okná; pri regáli výška poschodia
  a pri každom mieste poznámka. Pri poschodí appka z rozmerov cases ukáže obsadenosť plochy, koľko m² je ešte
  voľných a ktoré cases sa nezmestia na výšku.
- **Vývojár → Používatelia** ako prehľadná tabuľka (účet · naposledy v appke · firmy a role).
- Nové migrácie: `0118`, `0119` (opravná `0072` je aktualizovaná; všetko je aj v `supabase/update-all.sql`).

### 5.11 – 29. 10. 2026

- **Vývojár → Používatelia**: všetky účty – meno, e-mail, od kedy majú účet, kedy boli naposledy v appke (dnes, včera,
  pred X dňami), či potvrdili e-mail a v ktorých firmách sú s akou rolou (demo firmy označené). Vyhľadávanie podľa
  e-mailu, mena aj firmy. Vidí to len vývojár.
- Nová migrácia: `0117` (je aj v `supabase/update-all.sql`).

### 5.10 – 29. 10. 2026

- **Rýchlejšie načítanie appky**: hlavný súbor je 4× menší (Nastavenia a výber firmy sa sťahujú až pri otvorení,
  knižnice zvlášť – pri novej verzii ich prehliadač nesťahuje znova).
- **Ctrl+V s obrázkom funguje všade rovnako** (fotka techniky, case, sady, štítku).
- README: nové snímky hárku s obsahom case.

### 5.9 – 29. 10. 2026

- **Hárok s obsahom case: Tlačiť, PDF aj PNG** – tlač priamo z appky (strana podľa A4 / A5 a orientácie, bez okrajov),
  PDF so všetkými hárkami a PNG ako doteraz.
- **Voľby hárku sa ukladajú k účtu** (veľkosť, orientácia, rozloženie typov káblov, poradie, čo ukázať, DMX) –
  rovnaké na PC aj v mobile.
- **Odčítať hodiny všetkým aj pre ďalšie počítadlá** (napr. Výbojka): výber počítadla a „Pridať počítadlo“.
- **Pack list ako hárok obsahu**: case s číslom (Beam 7R Case #3) a pod ním čo v ňom má byť, príslušenstvo zvlášť.

### 5.8 – 29. 10. 2026

- **Viac počítadiel hodín** (napr. prevádzka a výbojka): štandardne jedno počítadlo, pri zápise odčítania tlačidlom
  **Pridať počítadlo** pridáte ďalšie s názvom (napr. Výbojka) a vyberiete, ktoré odčítavate. Posledný stav každého
  počítadla je v sekcii Prevádzkové hodiny, v histórii pri odčítaní názov počítadla. Prevádzkové hodiny (a pripomienky
  odčítania) sa riadia len hlavným počítadlom.
- Nová migrácia: `0116` (opravná `0072` je aktualizovaná; všetko je aj v `supabase/update-all.sql`).

### 5.7.2 – 29. 10. 2026

- Tlačidlo **DMX adresy** hore v detaile je pri každom svetle – aj bez „Evidovať každý kus zvlášť“ (kusy 1…počet).
  Takéto adresy prevezme aj DMX patch list eventu.

### 5.7.1 – 29. 10. 2026

- **DMX adresy kusov už nie sú vo formulári techniky** (ani pri úprave). Zadávajú sa v detaile svetla tlačidlom
  **DMX adresy**, alebo pri rozdelenej technike cez „DMX všetkým“.

### 5.7 – 29. 10. 2026

- **Rozpis kanálov pri DMX módoch** (nepovinné): pri svetle pod každým módom „+ Rozpis kanálov“ – riadok = kanál
  (Dimmer, Red, Green…). V detaile techniky sa rozpis rozbalí pri móde.
- **DMX na hárku s obsahom case**: keď je v case svetlo (nie príslušenstvo), dá sa zapnúť časť DMX – len módy
  (napr. A – 6 ch, D – 8 ch), alebo módy s rozpisom kanálov. Voľba sa zapamätá.
- Tlačidlo **Obsah** pri case (namiesto „Obsah A4“ – hárok je aj na A5 a na šírku).

### 5.6 – 29. 10. 2026

- **Hárok s obsahom case na šírku**: voľba Na výšku / Na šírku nad náhľadom (aj pri A5). Voľba sa zapamätá.
- **Upraviť všetky cases sady naraz – aj názov**: nový názov dostanú všetky cases sady a každý si nechá svoje číslo
  (napr. „Blinder 2×100 W #3“ → „Blinder 2×100 W Case #3“).
- **Patch listy – DMX adresy z techniky**: prehľad všetkých kusov svetiel so zapísanou adresou (podľa linky a adresy,
  prekrývanie červenou) a „Uložiť ako šablónu“.

### 5.5 – 29. 10. 2026

- **DMX patch list – Prevziať adresy z techniky**: linky, adresy a módy zapísané pri kusoch svetiel (aj neskôr, po
  vytvorení patch listu) sa prenesú do patch listu jedným tlačidlom. „Doplniť chýbajúce adresy“ najprv berie adresy
  z techniky a až potom čísluje za sebou.
- **Štatistiky** (namiesto „Čísla“): „Kusov techniky“ je bez káblov, pribudli dlaždice **Káble (ks)** a **Metrov káblov**.

### 5.4 – 29. 10. 2026

- **Fotka pre celú sadu cases**: na stránke sady (napr. 8× Wash 19×15W Case) kliknete na fotku hore alebo vložíte
  obrázok cez Ctrl+V – každý case sady dostane rovnakú fotku.
- **Jednoduchšie vkladanie kusov do case** na stránke techniky: pri každom kuse mimo case je výber „dať do…“ (presunie
  hneď) a tlačidlo **Rozložiť do sady** rozdelí voľné kusy do ďalších cases tej istej sady po rovnakom počte
  (napr. Wash Case #4 – #8 po 2 ks). Kusy v tom istom case sa spoja do jedného riadku.

### 5.3 – 28. 10. 2026

- **Triedenie techniky „Podľa kategórie / druhu“**: technika v skupinách (Svetlo, Zvuk, Hliník…) s nadpisom, v skupine podľa
  abecedy. Poradie skupín si každý nastaví v Nastavenia → Účet → **Poradie techniky (moje zameranie)**.
- **Do case priamo zo stránky techniky**: pri kusoch mimo case zaškrtnete kusy (alebo „Vybrať všetky mimo case“),
  vyberiete case a „Dať do case“. Časť „Mimo case“ je v zozname častí dole.

### 5.2.1 – 28. 10. 2026

- **Nová technika bez DMX adries kusov**: linka, adresa a mód pri jednotlivých kusoch sú až v úprave pridanej
  techniky (alebo hromadne cez „DMX všetkým“), nie pri pridávaní.

### 5.2 – 28. 10. 2026

- **Verzia softvéru** pri mixpulte na svetlá (napr. Titan v17.1, grandMA3 2.0) a verzia firmvéru pri prevodníku –
  vidno ju aj v zozname a v detaile techniky.
- **Kategória pri technike** sa vo formulári ukáže, len keď firma kategórie používa (alebo ich technika už má).
  Kategórie sa zakladajú v Nastavenia → Zoznamy.
- **Štítky na čiernu pásku**: pri štítkoch je vysvetlené, prečo je stiahnuté PNG čierne na bielom (tlačiareň ho
  vytlačí bielou na čiernu pásku).

### 5.1 – 28. 10. 2026

- **Farby druhov techniky** (Nastavenia → Zoznamy → Farby druhov techniky): farebný pruh v zozname pre Svetlo, Zvuk,
  Pódium, Truss… si nastavíte sami (alebo „Bez farby“). Platí pre techniku bez kategórie; farba kategórie má prednosť.
- **Fotky na hárku s obsahom case bez bieleho pozadia**: produktové fotky na bielom sa „vystrihnú“ a výrobok sedí
  priamo na karte. Dá sa vypnúť políčkom „Fotky bez bieleho pozadia“.
- Oprava: na hárku sa ukazujú fotky aj pri príslušenstve.
- Nová migrácia: `0115` (je aj v `supabase/update-all.sql`).

### 5.0 – 28. 10. 2026

- **Príslušenstvo pri akejkoľvek technike v case**: tlačidlo **Príslušenstvo** (zástrčka) majú v obsahu case všetky
  veci, nielen káble – napr. poistné lanká pri svetlách. Na hárku s obsahom je potom časť **Obsah** (napr. Beam 7R)
  a pod ňou **Príslušenstvo**. Nastavuje sa len v case (vo formulári techniky už políčko nie je).
- **Fotka pre všetky časti naraz**: na stránke rozdelenej techniky (napr. B-EYE K10 v 5 cases, XLR vo všetkých
  dĺžkach) stačí kliknúť na fotku alebo vložiť obrázok cez Ctrl+V.
- **Farby kategórií** sú v Nastavenia → Zoznamy → **Kategórie techniky a ich farby** (sekcia premenovaná, s popisom).
- **Karty na hárku**: pri málo položkách sú väčšie a vycentrované (2 vedľa seba, 1 cez celú šírku s fotkou vľavo
  a počtom vpravo); bez tabuľky káblov majú karty veľké fotky.
- **Hárok aj na A5**: voľba A4 / A5 nad náhľadom, PNG sa stiahne v zvolenej veľkosti (A5 pri 300 dpi).
- **Čo bude na hárku**: zaškrtávacie políčka nad náhľadom – Číslo case, QR kód, Celkom kusov, Hmotnosť, Kontroloval,
  Dátum. Napr. len QR bez čísla, alebo bez súhrnu dole. Voľba sa zapamätá.
- **Zoznam techniky** už nepíše „vyrobil …“ – je to pri jednotlivých dĺžkach kábla (rozbalený riadok aj stránka kábla)
  a v detaile. Rozbalené časti ukazujú počet vždy, aj „1 ks“.

### 4.20 – 28. 10. 2026

- **Variant kábla** (napr. stereo, silent jack): v úprave kábla nové pole **Variant** (prázdne = obyčajný). Na hárku
  s obsahom case ostane kábel v stĺpci svojho typu (Jack) a pod počtom je rozpis, napr. „7 KS – z toho 2× STEREO,
  1× SILENT“. Variant je aj v detaile kábla.

### 4.19 – 28. 10. 2026

- **Kábel ako príslušenstvo na hárku**: v obsahu case má každý kábel tlačidlo **Príslušenstvo** (zástrčka). Označený
  kábel (napr. jack v XLR case) nie je v tabuľke dĺžok, ale dole medzi príslušenstvom ako karta s fotkou a počtom.
  To isté sa dá zaškrtnúť v úprave kábla.

### 4.18.1 – 28. 10. 2026

- **Hárok s obsahom case**: svetlé farby (žltá, béžová, svetlozelená) už nemajú obrys – názov a dĺžka sú v tmavšom
  odtieni tej istej farby, farebný pruh ostáva v presnej farbe.
- **Poradie typov káblov** pri „Každý typ zvlášť pod sebou“ a „Každý typ na vlastnom hárku“: šípkami určíte, čo je
  hore a čo dole (alebo ktorý hárok je prvý). Poradie sa zapamätá.

### 4.18 – 28. 10. 2026

- **Nový vzhľad hárku s obsahom case (Flightcase content)**: hlavička s logom, názvom case a boxom s číslom case
  a QR kódom; nadpis „Káble podľa dĺžky“, farebný pruh a názov farby pri každej dĺžke, striedavé riadky a počty
  „20 KS“; príslušenstvo ako karty; dole súhrn – kusov spolu, hmotnosť a prázdne políčka Kontroloval a Dátum.
- **Viac typov káblov v jednom case** (napr. XLR a Jack): na hárku si vyberiete **V jednej tabuľke**, **Každý typ
  zvlášť pod sebou** (každý typ vlastná tabuľka s vlastnými farbami) alebo **Každý typ na vlastnom hárku** (stiahne
  sa viac PNG). Voľba sa zapamätá.
- Vlastný typ kábla, ktorý databáza ešte nepozná, ukáže zrozumiteľnú hlášku (treba spustiť `supabase/update-all.sql`).

### 4.17.1 – 28. 10. 2026

- **Vlastný obsah štítku case – fotka cez Ctrl+V**: skopírovaný obrázok (z webu, snímka obrazovky) stačí vložiť
  na stránke štítku, nahrá sa ako fotka štítku.

### 4.17 – 28. 10. 2026

- **Vlastné typy káblov s farbami** (Nastavenia → Zoznamy → Farby dĺžok káblov): okrem XLR / DMX, powerCON a 230 V si
  pridáte vlastný typ, napr. „Káblovka“ – platí pre káble, ktorých „Konektor / typ“ obsahuje tento text.
- **Pri zadávaní kábla** je pod farbou dĺžky napísané, pre ktoré káble farba platí (všetky danej dĺžky, alebo len
  daný typ).
- Nová migrácia: `0114` (je aj v `supabase/update-all.sql`).

### 4.16 – 28. 10. 2026

- **Farby dĺžok káblov – spoločné ako predvolené**: platia pre všetky káble. Ak chcete pre niektorý typ iné, pridáte mu
  vlastné tlačidlom „Iné farby pre: XLR / DMX, powerCON, 230 V“ – stačí nastaviť len dĺžky, ktoré majú byť iné
  („Skopírovať spoločné farby“ ich pripraví na úpravu). „Zrušiť“ vráti typ na spoločné farby.
- **Predloha farieb**: „Doplniť predlohu“ nastaví 1 m zelená, 2 m žltá, 3 m červená, 5 m fialová, 8 m béžová,
  10 m modrá, 15 m oranžová. Rovnaká farba sa ponúkne aj pri zadávaní kábla s touto dĺžkou.
- **Hárok s obsahom case – príslušenstvo ako karty**: redukcie, adaptéry a ostatný obsah sú pod tabuľkou káblov
  ako karty s názvom, fotkou a počtom kusov (pri viac ako 18 položkách zoznam).

### 4.15 – 28. 10. 2026

- **Farby dĺžok káblov** (Nastavenia → Zoznamy → Farby dĺžok káblov): prepínač **Rovnaké pre všetky káble** alebo
  **Rozdielne pre XLR / DMX, powerCON a 230 V**. Pri rozdielnych má každý typ vlastné dĺžky s farbou a názvom farby; typ
  sa určí podľa konektora a dĺžky, ktoré typ nemá, dostanú spoločnú farbu. Pri zadávaní kábla aj na hárku s obsahom
  case sa použije farba podľa typu.
- **Káble – upraviť všetky dĺžky naraz** (napr. pridať fotku všetkým XLR): fotka, výrobca, konektor, kategória
  a poznámka sa prenesú, názov s dĺžkou, dĺžka, cena a kto kábel vyrobil ostanú pri každej dĺžke vlastné.
- **Nový case** už neponúka „Rovno do nich dať techniku“ – techniku pridáte v detaile case.
- Nová migrácia: `0113` (je aj v `supabase/update-all.sql`).

### 4.14 – 27. 10. 2026

- **Vývojár je pri výbere firmy** (dlaždica „Vývojár“ pod firmami) – už nie v Nastaveniach firmy, takže je dostupný
  aj bez otvorenej firmy.
- **Pozvánky do dema so stavom**: pri každom e-maile vidno, či sa už zaregistroval, kedy sa naposledy prihlásil a či
  si založil demo firmu.
- Nová migrácia: `0112` (je aj v `supabase/update-all.sql`).

### 4.13.1 – 27. 10. 2026

- **Blesk pri skenovaní QR kódov**: tlačidlo „Blesk“ hore vedľa „Zavrieť“ zapne baterku telefónu – v tme sa štítky
  čítajú ľahšie. Ukáže sa tam, kde to telefón a prehliadač dovolia (Android Chrome; na iPhone zatiaľ väčšinou nie).

### 4.13 – 27. 10. 2026

- **Pozvať len do dema** (Nastavenia → Vývojár): pozvaný e-mail sa smie zaregistrovať, ale nevidí žiadnu firmu –
  po prihlásení si otvorí vlastnú demo firmu.
- **Push upozornenia – nastavenie** sa skontroluje samo; keď je všetko nastavené, kroky s kľúčmi sa skryjú.
- **Štítky techniky v case**: na štítku je aj case, v ktorom kus je (napr. #3 a #4 → „Beam case #2“) – na páske
  aj na QR štítkoch. Na páske sa dá vypnúť v „Upraviť obsah štítkov“.
- **Filter „Mimo cases“** ukáže aj zvyšné kusy techniky, ktorej časť je v case (napr. 4 z 8 mimo case).
- **Háky, klemy a iné príslušenstvo svetiel** už nemajú „Sedí s Capture“ ani „Kópia čoho“.
- Nová migrácia: `0111` (opravná `0072` je aktualizovaná; všetko je aj v `supabase/update-all.sql`).

### 4.12.2 – 26. 10. 2026

- **Štítky na pásku – nový vzhľad** v štýle appky (aj tmavý režim): voľby v jednej karte, „Ako tlačiť“ zbalené,
  náhľady pások s menom, komu štítok patrí, dĺžkou a PNG.
- **Štítky cases** bez volieb pre techniku (DMX adresa, módy, odber, váha) a zoradené #1, #2 … #8.
- **Len QR kód** bez prázdneho miesta za ním – štítok je presne taký dlhý ako QR.

### 4.12.1 – 26. 10. 2026

- **Art-Net / sACN node**: každý port má universe pre Art-Net aj pre sACN zvlášť (napr. port 1 = Art-Net 0,
  sACN 9); „Všetkým rovnaká“ a „Za sebou od“ pre zvolený protokol. V detaile „Art-Net 1–4 → U0 · sACN 1 → U9 …“.

### 4.12 – 26. 10. 2026

- **Art-Net / sACN node** (svetlá → typ „Prevodníky (DMX / sieť)“): aktuálne zapnuté protokoly (Art-Net, sACN
  alebo oba), počet výstupov a ktorý port posiela ktorú universe – aj pri oboch protokoloch po portoch.
  Rýchle tlačidlá „Všetkým rovnaká“ (splitter, napr. porty 1–4 = universe 0) a „Za sebou od“ (9, 10, 11 …).
  V detaile „1–4 → U0“, na tlači DMX patch listu pri každej linke, z ktorého nodu a portu ide.

### 4.11 – 26. 10. 2026

- **Vybrať z case = spojiť späť**: keď kusy vyberiete z case (krížik), spoja sa s tou istou technikou mimo case
  (napr. omylom 2 ks do case a späť → znova 10 ks v jednom riadku).
- **Spojiť časti mimo case**: na prehľade skupiny techniky tlačidlo, ktoré spojí rozdelené časti mimo case do jednej
  – kusy, čísla kusov aj história (eventy, výpožičky, servis, hodiny) sa prenesú.
- **Sada cases**: v obsahu case je hlavný prvok štítku tučne, vedľajší normálne a technika bez označenia menšia a sivá.
- Nová migrácia: `0110` (je aj v `supabase/update-all.sql`).

### 4.10 – 26. 10. 2026

- **DIP prepínače pri svetlách**: vo formulári svetla „DMX adresa sa nastavuje“ – displejom / v menu, alebo
  DIP prepínačmi (8, 9, 10 alebo 12) s poznámkou (napr. „10. prepínač = mód“). Pri takom svetle appka ukáže,
  **ktoré prepínače zapnúť**: pri „DMX všetkým“ pri každom kuse, na tlači DMX patch listu (stĺpec DIP ON)
  a na štítku „Moja DMX adresa“ (DIP ON: 1, 5).

### 4.9.1 – 26. 10. 2026

- **Aktualizácia databázy jedným súborom**: `supabase/update-all.sql` – všetky migrácie od 0086 po najnovšiu
  a opravné 0071 a 0072; vložiť celý do Supabase → SQL Editor a spustiť (aj opakovane bez chýb).
- **Oprava 0070** už pri opätovnom spustení nesprístupní heslá ani adresy Wi-Fi.
- **Pack list**: naskenované jednotlivé kusy (QR kusu) sa ukladajú aj **bez signálu** a odošlú sa, keď sa chytí sieť.
- **README**: nové snímky – technika po kusoch, kanban úloh, DMX patch list, štítky na pásku.

### 4.9 – 26. 10. 2026

- **Technika vo vlastnom obale** (napr. reprobox v obale): vo formulári „Má vlastný obal (nie case)“ a aký obal.
  Taký kus nie je v cases, ale ani sa nehlási ako „mimo case“; v zozname „v obale“, v detaile riadok Obal.
- **Taška** pri cases (vedľa case a racku) – napr. taška na stojany; filter „Len tašky“, „Taška je prázdna“.
- Nová migrácia: `0109`.

### 4.8 – 26. 10. 2026

- **IP a MAC adresy stráži databáza** (oprávnenie „Vidieť IP a MAC adresy“): IP a MAC techniky sú v chránenej
  tabuľke, adresy Wi-Fi sietí (IP rozsah, gateway, DHCP) sa čítajú len s oprávnením, zariadenia hostí tiež.
  Kto oprávnenie nemá, adresy nevidí a pri úprave techniky či siete ich ani nezmaže.
- **Štítky na pásku**: pri tlači z PC má každý štítok **svoju dĺžku** (bez prázdneho konca pásky).
- **Firmy a kontakty**: v zozname právna forma (OZ, s.r.o. …) a štatutár / konateľ.
- **Pack list – QR jednotlivých kusov**: naskenovaný kus (Beam 7R #7) sa zapíše („naskenované 7/16 ks“); keď sú
  všetky kusy, položka sa odškrtne sama. Kus v case, ktorý je v pack liste celý, povie „naskenujte QR case“.
- Upratanie kódu (lint bez upozornení).
- Nové migrácie: `0107`, `0108` (opravné `0071` a `0072` sú aktualizované).

### 4.7.2 – 26. 10. 2026

- Štítky na pásku sú dostupné cez **QR štítky → Na pásku Brother** (tlačidlá v detailoch techniky a cases odstránené).

### 4.7.1 – 26. 10. 2026

- **Štítky na pásku**: pri každom štítku jeho **dĺžka v mm** (na nastavenie v tlačiarni / aplikácii);
  na štítok „Moja DMX adresa“ sa dá zapnúť aj **odber (W / A)** – predvolene vypnutý.

### 4.7 – 26. 10. 2026

- **Obsah štítkov na pásku si nastavíte**: „Upraviť obsah štítkov“ – pri každom druhu zapnete / vypnete jednotlivé
  údaje (QR kód, názov, číslo kusu, kategória, názov firmy; linka, adresa, mód, kanály; W, A, kg; pri case kategória,
  rack v U, firma). Kategória a firma sú predvolene vypnuté. Uloží sa k účtu (PC aj mobil).
- **Farba pásky**: biela (čierny text) alebo čierna (biely text) – náhľad ukazuje, ako bude štítok vyzerať.

### 4.6.1 – 26. 10. 2026

- **Demo firma** ukazuje novinky od 4.0: DMX adresy pri každom kuse svetla, príkon a váhu (štítky na pásku),
  zvukový aj DMX patch list na festivale, šablóny patch listov, občianske združenie medzi firmami a zapnuté
  „Našli ste…“ pri QR. Existujúce demo firmy sa doplnia samé.
- **Upozornenia** (celý zoznam): pri zlúčenej technike počet kusov („Beam 7R (16 ks)“).
- Nová migrácia: `0106` (opravné `0071` a `0072` sú aktualizované).

### 4.6 – 26. 10. 2026

- **QR bez účtu – „Našli ste…“**: kto naskenuje QR štítok fotoaparátom a nemá účet, uvidí názov veci (aj číslo kusu),
  názov firmy a kontakt (telefón na klik, e-mail, web) – ak to admin zapne v Nastaveniach → Firma → Údaje o firme
  („QR štítok bez prihlásenia ukáže Našli ste…“). Predvolene vypnuté; ostatné údaje ostávajú skryté.
  Ľudia z firmy majú na tej istej stránke „Som z firmy – prihlásiť sa“ a po prihlásení sa otvorí daná vec.
- Nová migrácia: `0105` (opravné `0071` a `0072` sú aktualizované).

### 4.5 – 26. 10. 2026

- **Štítky na pásku (Brother P-touch, napr. PT-D460BT)**: páska 9 / 12 / 18 mm, pre každý kus zvlášť –
  **QR + názov** (Beam 7R #3), **moja DMX adresa** (L1 · A017 · mód), **DMX módy** svetla a **odber a váha**
  (W, A pri 230 V, kg). Tlač z PC cez ovládač (každý štítok na vlastnú „stranu“ veľkosti pásky), alebo **PNG**
  do aplikácie Brother iPrint&Label v mobile. Aj pre **cases a racky** (QR + názov s číslom + kategória).
  Tlačidlo „Štítky na pásku“ je v detaile techniky, na prehľade skupiny, pri case, pri sade cases a pri QR štítkoch.
- **Príkon svetla**: pri zadaní wattov sa ukáže prúd pri 230 V (stačí zapísať watty zo štítku svetla).

### 4.4 – 26. 10. 2026

- **DMX patch list pri evente** (nová sekcia v detaile eventu): linka, adresa od–do, počet kanálov, mód a svetlo
  z techniky. **Zo svetiel eventu** – naplní sa zo svetiel na evente s ich predvolenou linkou, adresou a módom
  (chýbajúce adresy doplní za sebou); kontrola prekrytia adries a presahu 512; **tlač / PDF** po linkách
  s počtom použitých kanálov.
- **Šablóny patch listov** zvuku aj DMX: pri evente **Uložiť ako šablónu** a **Zo šablóny** jedným klikom.
- **Patch listy** (nová karta): všetky šablóny na jednom mieste – vytvoriť, upraviť riadky (kanály / svetlá),
  premenovať, zmazať.
- Záloha obsahuje aj DMX patch listy a šablóny.
- Nová migrácia: `0104` (opravné `0071` a `0072` sú aktualizované).

### 4.3.1 – 26. 10. 2026

- **Pohľad na jeden kus** (QR alebo klik na #1): namiesto počtu kusov „Kus #1 · v tejto časti spolu 2 ks“,
  prevádzkové hodiny len tohto kusu a zápis odčítania rovno preň.

### 4.3 – 26. 10. 2026

- **Cases ako technika**: sada rovnakých cases má vlastný prehľad – klik na riadok (šípka vpravo rozbalí v zozname).
  Pri každom case čo je vnútri (aj čísla kusov) a kontrola; **Upraviť všetky naraz**, **QR štítky všetkých**,
  **Skontrolované všetky** a **Pridať ďalší do sady**.
- **Kus techniky**: QR alebo klik na kus (#1) ukáže len ten kus, s odkazom na celú časť.
- **DMX všetkým naraz** (prehľad skupiny svetiel): linka, adresa a mód pri každom kuse; **Rozpočítať adresy**
  podľa kanálov módu (1, 17, 33…), upozornenie na prekročenie 512.
- **Oprávnenia sietí** (Nastavenia → Oprávnenia → Siete): vidieť siete, vidieť IP a MAC adresy, vidieť heslá Wi-Fi
  (stráži databáza), správa sietí (prihlásenie do routerov).
- **Kontroly – oprávnenie** „Vidieť aj veci, za ktoré zodpovedajú iní“; bez neho len moje.
- **Wi-Fi firmy**: sieť môže patriť k technike, alebo byť sieťou firmy (sídlo, kancelária, sklad).
- **Právna forma** pri firmách a kontaktoch a v „Ponuka pre“: s.r.o., a.s., živnosť, občianske združenie (OZ),
  nadácia, obec; podľa nej konateľ / štatutár / predseda… (v PDF ponuky aj štatutár).
- **Upozornenia**: technika sa ráta v kusoch („Beam 7R (16 ks)“); po **Do úloh** upozornenie zmizne, kým je úloha
  otvorená.
- **Cenové ponuky**: nápoveda o vystavovateľoch sa neukazuje, keď sú nastavení.
- Nové migrácie: `0102`, `0103` (opravné `0071` a `0072` sú aktualizované).

### 4.2.1 – 26. 10. 2026

- **Svetlá – DMX pri každom kuse** (nepovinné): pri evidencii po kusoch ku každému kusu predvolená linka (universe),
  DMX adresa a mód (výber z DMX módov svetla). V detaile pri kuse „linka A · adr. 017 · mód 16ch“.

### 4.2 – 26. 10. 2026

- **Kontroly** (nová karta): na jednom mieste cases a racky na kontrolu, technika na odčítanie prevádzkových hodín
  a servis. Predvolene len to, za čo zodpovedáte (Nastavenia → zodpovednosti); po vypnutí „Len to, za čo zodpovedám“
  aj veci ostatných. Rozdelená technika (napr. 8× Beam v cases) je jeden riadok – odkaz na prehľad, kde odčítate
  hodiny všetkým naraz.
- **Hromadná úprava techniky**: Zrušiť aj Uložiť vráti na prehľad skupiny (nie na jednu časť).
- **Celý názov case s číslom** (Beam 7R Case #4) v detaile techniky, vo výbere case vo formulári a v sklade.

### 4.1.2 – 26. 10. 2026

- **Zariadenia z profilu v ďalšej firme**: keď ich máte zapísané v inej firme, už sa neukazuje červené „Chýbajú
  vaše zariadenia“, ale „Vaše zariadenia z profilu v tejto firme ešte nie sú“ s tlačidlom **Pridať aj sem**.
- **„Doplňte svoje údaje“** sa už neukazuje, keď máte vyplnený profil (údaje sa do karty zapíšu z profilu).

### 4.1.1 – 26. 10. 2026

- **Odčítať hodiny všetkým**: na prehľade skupiny techniky (napr. Beam 7R v 8 cases) jeden dátum a pri každom
  kuse stav počítadla – uloží sa naraz, prázdne sa preskočia.
- V zozname techniky pod šípkou už nie je „Upraviť všetky naraz“ (je na prehľade skupiny).

### 4.1 – 26. 10. 2026

- **Oprava QR kódov**: QR viedol na adresu bez priečinka appky (…github.io/equipment/…), takže fotoaparát
  v mobile otvoril cudziu 404. Nové štítky vedú správne – **QR štítky treba vytlačiť znova**.
- **Upozornenia**: rovnaké sa zlúčia („Beam 7R (8×) – prevádzkové hodiny…“, klik otvorí prehľad všetkých častí);
  pri každom **Do úloh** – vznikne moja úloha s vysokou (červenou) prioritou a odkazom.
- **Môj panel na mobile**: na Prehľade v mobile už nie sú bloky pod sebou – je tam tlačidlo **Môj panel**
  (samostatná karta). PC a mobil majú **vlastné rozloženie** blokov.
- **Blok Čísla si nastavíte**: kusy techniky, v servise, kusy mimo case, prázdne cases, eventy do 30 dní,
  výpožičky, moje úlohy, po termíne, na doplnenie.

### 4.0 – 26. 10. 2026

Veľká verzia: technika a cases po kusoch, úlohy ako tabuľa, vlastný Prehľad. Spolu s 3.19–3.20:

- **Prehľad skupiny techniky**: klik na zoskupený riadok (napr. Beam 7R alebo XLR) otvorí stránku so všetkými
  kusmi #1…#16 – pri každom, v ktorom case je (odkaz na case), stav, časti a dĺžky; odtiaľ **Upraviť všetky naraz**
  a **QR štítky všetkých**. Šípka vpravo v zozname rozbalí časti priamo v zozname.
- **QR pre každý kus**: technika po kusoch má na štítkoch vlastný QR pre každý kus (Beam 7R #7). QR nájde kus,
  aj keď ho presuniete do iného case. Štítky cases majú aj číslo (Beam 7R Case #4).
- **Tlač bez hlavičky a pätičky prehliadača** (dátum, adresa, číslo strany) – QR štítky, ponuky, listy, event.
- **Zosilňovač digitálny**: **ID zosilňovača** (napr. HiQnet / ID v sieti; pri viacerých kusoch „#1: 101, #2: 102“).
- **Mimo case** sa ráta v kusoch („37 kusov techniky nie je v žiadnom case“) s tým, o čo ide; technika s „Nepatrí
  do case“ sa nezobrazí ani vo filtri „Mimo cases“.
- **Demo firma** ukazuje novinky: sadu cases s číslami, rack 12U, svetlá po kusoch v cases, digitálny zosilňovač
  s ID a presetmi, XLR v dĺžkach, prázdny case, úlohy s prioritami a úlohu „Doplniť“ (aj existujúce demo firmy).
- **Mobil**: v obsahu case je celý názov techniky (stav a tlačidlá sú pod ním).
- Nové migrácie: `0101` (opravné `0071` a `0072` sú aktualizované).

### 3.20 – 26. 10. 2026

- **Kanban úloh podľa čohokoľvek**: stĺpce podľa stavu, priority, kategórie, človeka alebo termínu. Presunom karty
  sa zmení stav, priorita, kategória alebo riešiteľ (termín sa mení v úlohe).
- **Filter a triedenie úloh**: stav (aj hotové), priorita, kategória, kto, termín (po termíne, dnes, do 7 dní…),
  hľadanie; triedenie podľa dôležitosti, termínu, priority, názvu alebo najnovšie. Zapamätá sa.
- **Doplniť**: tlačidlo s počtom úloh z @todo / 31121800 – jedným klikom len to, čo treba doplniť.
- **Upraviť všetky naraz** (technika) namiesto počtu a čísel jednej časti ukazuje súhrn „16 ks v 8 častiach (#1–#16)“.

### 3.19.7 – 26. 10. 2026

- **Duplikovať techniku**: tlačidlo v detaile techniky otvorí formulár novej techniky predvyplnený údajmi
  (aj s kópiou fotky) – upravíte, čo treba, a uložíte. Sériové a inventárne číslo, MAC, IP, case a čísla kusov sa
  nekopírujú.
- **Káble v jednom riadku**: všetky dĺžky jedného typu (napr. XLR 1 m … 25 m) sú v zozname techniky pod jedným
  riadkom „XLR · 1, 2, 3 … 25 m · 151 ks“; po rozbalení jednotlivé dĺžky od najkratšej.

### 3.19.6 – 26. 10. 2026

- **Upraviť všetky naraz** – technika: po rozbalení rozdelenej techniky (napr. Beam 7R v 8 cases) jeden formulár
  pre všetky časti. Názov, výrobca, model, kategória, parametre, poznámka, fotka a ďalšie spoločné údaje sa prenesú
  do všetkých; počet, čísla kusov, case, sériové a inventárne čísla a stav ostanú pri každej časti.
- **Upraviť všetky naraz** – cases: pri sade rovnakých cases rozmery, hmotnosť, kategória na štítku, case / rack (U),
  priorita kontroly, vlastník a poznámka pre všetky naraz.

### 3.19.5 – 25. 10. 2026

- **Pridať do case** podľa druhu techniky: technika len na počet má „10 / 10 ks“ a Pridať; technika po kusoch
  rovno čísla kusov na výber (#13 #14 …, aj „Všetky“) – bez počtu.
- **Technika v jednom riadku** je po rozbalení zoradená: najprv kusy mimo case, potom cases podľa čísel kusov
  (Case #1, #2 … #8).

### 3.19.4 – 25. 10. 2026

- **Pridať techniku do case** ponúka len techniku, ktorá ešte nie je v žiadnom case. Presun z iného case
  je na zaškrtnutie „Aj technika, ktorá už je v inom case“; pri technike vidno aj čísla kusov a celý názov case (#).

### 3.19.3 – 25. 10. 2026

- **Technika v jednom riadku**: technika rozdelená do cases (napr. 12 ks v sklade a po 2 ks v cases) je v zozname
  techniky pod jedným riadkom – „16 ks · 12 mimo case · 4 v 2 cases“; po kliknutí sa rozbalí, ktoré kusy sú
  v ktorom case.
- **Obsah case** ukazuje aj čísla kusov („Beam 7R · 2 ks · #1, #2“).

### 3.19.2 – 25. 10. 2026

- **Duplikovať case**: tlačidlo v detaile case vytvorí ďalší kus sady s ďalším číslom (Case 3 → Case 4) –
  rovnaké rozmery, hmotnosť, kategória, case / rack (aj U), umiestnenie, vlastník, priorita kontroly, poznámka
  a fotka (aj fotka na štítku). **Technika sa nekopíruje** – nový case je prázdny.
- **Prázdny case**: upozornenie v detaile (s tlačidlom Pridať techniku), štítok „prázdny“ v zozname a pruh
  „Prázdne cases a racky“, ktorý ich jedným klikom vyfiltruje.

### 3.19.1 – 25. 10. 2026

- **Do case presné kusy**: pri pridávaní techniky do case „Vybrať čísla“ – zvolíte napr. #7 a #8 a do case idú
  presne tie; zvyšok si nechá svoje čísla. Doteraz odtrhnutá časť dostala znova #1, #2.
- **Technika**: pri rozdelenej technike vidno čísla kusov a v ktorom case sú („#7, #8 · v Beam 7R Case #4“).
- **Úloha z čísla a dátumu**: do číselného políčka (kg, ks…) sa „@“ napísať nedá – napíšte **31121800**;
  do dátumu zadajte **31. 12. 1800**. Vznikne úloha „Doplniť: …“ ako pri @todo a hodnota sa vymaže.
- Nová migrácia: `0100` (opravné `0071` a `0072` sú aktualizované).

### 3.19 – 25. 10. 2026

- **@todo v ľubovoľnom políčku**: napíšete `@todo` (alebo `@addtodo`) napr. do Hmotnosti a vznikne úloha
  „Doplniť: Hmotnosť – názov techniky“ s odkazom späť na formulár. Dá sa použiť viackrát, aj pri jednej veci.
- **Úlohy**: farebná priorita (sivá bez priority, modrá nízka, žltá stredná, červená vysoká – farby si zmeníte
  v Nastaveniach → Účet), filter podľa priority, človeka a textu a **zobrazenie Kanban** (presúvanie medzi stĺpcami).
- **Prehľad**: stĺpec na kraji je stále – Moje úlohy (aj keď žiadne nemáte), **kalendár mesiaca**, **čísla**;
  „Upraviť tento stĺpec“ – zapnete, vypnete a zoradíte bloky (uloží sa k účtu).
- **Case alebo rack**: pri racku výška v **U** (napr. 12U), filter „len racky“. Rovnaké cases sú v zozname pod
  jedným riadkom („4× case“); po rozkliknutí Case #1, #2… aj s tým, ktoré kusy sú vnútri. V detaile „… #4“.
- **Štítok**: tlačidlo „Z názvu case“ pri vlastnom obsahu štítku.
- **Technika, ktorá nepatrí do case** (zaškrtnete vo formulári) sa už nehlási ako „mimo case“.
- **Štatistiky a zoznam cases** rátajú **kusy** (20 káblov pod jednou položkou = 20 kusov).
- **Upozornenia na prevádzkové hodiny a servis** vidí len ten, kto za danú techniku zodpovedá (ak je určený).
- **Platiteľ DPH**: IČ DPH sa ukáže až po zaškrtnutí „Platiteľ DPH“ (firma, partneri, s.r.o. / živnosť, ponuka).
  Kontakt vystavovateľa je v troch políčkach – telefón, e-mail, web (web je aj v PDF).
- Nové migrácie: `0098`, `0099` (opravné `0071` a `0072` sú aktualizované).

### 3.18.1 – 25. 10. 2026

- **PDF cenovej ponuky** v rozložení bežnej firemnej ponuky: „CENOVÁ PONUKA“ s číslom, vpravo dodávateľ
  (IČO, DIČ, telefón, e-mail), „Ponuka pre:“, dátum vystavenia, podujatie, miesto a termín dodania služby,
  časti „A. …“ s riadkom „Cena za časť A“, celková cena, ZHRNUTIE a „Vyhotovil“.

### 3.18 – 25. 10. 2026

- **Cenová ponuka odkazom**: „Odkaz pre klienta“ vytvorí adresu, cez ktorú si klient ponuku pozrie bez prihlásenia,
  vytlačí ju a **potvrdí alebo odmietne** (aj s poznámkou). Stav ponuky sa zmení sám a príde vám upozornenie.
- **Event z ponuky**: jedným klikom vznikne event s názvom, miestom a klientom z ponuky; technika vybraná zo skladu
  v cenách sa pridá na event.
- **S.r.o. / živnosť pri firme** (Nastavenia → Firma → Vystavovanie ponúk): zaškrtnete, ako firma vystavuje, a
  vyplníte údaje; v ponuke sú tlačidlá len pre to, čo je zapnuté.
- **Ponuka**: „Vyhotovil“ jedným klikom ja alebo CEO; klienta uložíte do Firiem a kontaktov; zoznam v časti sa dá
  klikať z vlastnej techniky; **nový dizajn PDF** ako klasický doklad (dodávateľ / odberateľ, tabuľka, podpis).
- **Zosilňovač analógový / digitálny**; pri digitálnom počet presetov (pri známych modeloch sa navrhne sám) a
  zoznam presetov s prepojením na reprobox – v detaile reproboxu vidno, v ktorom zosilňovači má preset.
- **Siete → MAC adresy**: pri zariadeniach členov je označené, či ide o Wi-Fi alebo LAN (ethernet) kartu.
- **Pripnuté firmy** sa pamätajú pri účte – rovnaké na každom zariadení.
- **Skontrolovať aktualizácie** v Nastaveniach → Účet a v O aplikácii.
- Nové migrácie: `0097` (opravné `0071` a `0072` sú aktualizované).

### 3.17.1 – 25. 10. 2026

- Technická údržba: formulár techniky je rozdelený na menšie časti (Svetlo, Zvuk, Video zvlášť), takže ďalšie
  úpravy sú rýchlejšie a bezpečnejšie; funkcia na posielanie push upozornení má automatické testy.

### 3.17 – 25. 10. 2026

- **Cenové ponuky** (nový modul v menu; aj z detailu eventu tlačidlom „Cenová ponuka“): hlavička s číslom a dátumom,
  podujatie, miesto a termín dodania, **Ponuka pre** (dá sa vybrať z Firiem a kontaktov) a **časti A, B, C…**
  aj s podčasťami **A1, A2** – popis, zoznam (odrážky), „Cena zahŕňa“ a cena.
- **Cena časti tromi spôsobmi**: napíšete sumu (alebo text, napr. „podľa dopytu“), poskladáte ju **z techniky zo
  skladu** (kusy × dni × cena prenájmu) alebo z **vlastných položiek** (doprava, technik…) – aj kombinovane.
- **Max. rozpočet**: hore stále vidno súčet, koľko ostáva a lištu; pri výbere techniky je vidno, čo je nad rozpočet.
- **Vystavovatelia**: jedna firma môže ponuky vystavovať za viac subjektov (napr. s.r.o. a živnosť) – vyberiete pri
  ponuke; neplatiteľ DPH má ceny bez DPH. Ceny s DPH, + DPH alebo bez DPH.
- **Zhrnutie** a **celková (zvýhodnená) cena**, poznámky a „Vyhotovil“; **šablóny častí** na opakované použitie;
  **Náhľad a tlač / PDF** na A4 s logom firmy; stav ponuky (koncept, poslaná, prijatá, odmietnutá).
- **Oprávnenia** v Nastaveniach → Oprávnenia → Cenové ponuky: kto ich vidí, kto ich vytvára a upravuje a kto maže
  (predvolene skladník vidí a upravuje, mazať len admin).
- Pôvodná ponuka z eventu podľa cenníka ostáva ako „Rýchla ponuka“.
- Nové migrácie: `0096` (opravné `0071` a `0072` sú aktualizované).

### 3.16 – 25. 10. 2026

- **Pack list bez signálu**: odškrtnutie sa ukáže hneď; bez siete sa uloží do telefónu a odošle sa samo, keď sa
  chytí signál (hore „Čaká na odoslanie: 3“, pri položke „čaká na odoslanie“). Posledný načítaný pack list sa
  pamätá, takže sa dá otvoriť aj offline.
- **Nastavenia → Vývojár** (vidí len vývojár aplikácie): Stav databázy, sprievodca nastavením push upozornení
  a žiadosti o novú firmu sú na jednom mieste.

### 3.15 – 25. 10. 2026

- **Plán pódia Nivtec k eventu**: v kalkulačke pódia vyberte event a „Uložiť plán k eventu“ – uloží sa celé zadanie
  (rozmery, výška, schody, plachta, zábradlie, molo, rizery). Ukladá sa aj pri „Pridať diely na event“.
- V **detaile eventu** je karta „Pódium 8 × 5 m“ so súhrnom; „Otvoriť plán a tlač“ otvorí kalkulačku s načítaným
  plánom (nákres, poradie dosiek, nohy, tlač). Pri inom evente sa uložený plán dá načítať tlačidlom.
- Uložiť plán ide aj vtedy, keď diely ešte nie sú priradené k technike.
- Nové migrácie: `0095` (opravné `0071` a `0072` sú aktualizované).

### 3.14 – 25. 10. 2026

- **Zakladanie nových firiem so schválením**: novú firmu založí len správca aplikácie (vývojár) alebo ten, komu to
  povolí. Ostatní namiesto „Vytvoriť novú firmu“ pošlú **žiadosť** (názov a poznámka) a vidia, že čaká na
  schválenie. Správca dostane upozornenie a v Nastaveniach žiadosť schváli alebo zamietne; žiadateľovi príde
  upozornenie a po schválení si firmu založí sám. Demo firma a založenie firmy partnerovi ostávajú bez zmeny.
- Nové migrácie: `0094` (opravné `0071` a `0072` sú aktualizované). Správcu (vývojára) zapíšete v SQL Editore
  do tabuľky `app_developers` – kým tam nikto nie je, zakladať firmy môže každý.

### 3.13 – 25. 10. 2026

- **História cenových ponúk**: na stránke ponuky „Uložiť ponuku“ uloží presnú kópiu (riadky, sumy, DPH) s číslom
  v rámci roka (napr. 2026/012). V zozname „Uložené ponuky“ je dátum, suma a stav (koncept, poslaná, prijatá,
  odmietnutá); „Zobraziť“ otvorí uloženú verziu presne tak, ako bola, a dá sa vytlačiť.
- **Vlastná technika vo viacerých firmách**: zmena pôvodnej položky (názov, počet, parametre) sa do kópií
  v iných firmách prenesie sama – tlačidlo „Dorovnať kópie“ ostalo len pre istotu.
- Nové migrácie: `0093` (opravné `0071` a `0072` sú aktualizované).

### 3.12 – 25. 10. 2026

- **Mesačný výkaz dochádzky** (Dochádzka, pre admina): za zvolený mesiac po ľuďoch hodiny na firme, doma
  a na eventoch (z výkazov pri evente), hodinové sadzby a navrhovaná odmena.
- **Hodinové sadzby** na firme, doma a na evente sa zadajú priamo v tabuľke; vidí ich len admin a daný človek.
- **Zapísať do Odmien**: odmena sa pridá jedným klikom aj s rozpisom („Dochádzka 10/2026 – firma 8 h, …“);
  pri už zapísanej je „v Odmenách“.
- **Export do Excelu** pre účtovníka: hárok Súhrn (hodiny a odmeny po ľuďoch) a Záznamy (každý deň zvlášť).
- Nové migrácie: `0092` (opravné `0071` a `0072` sú aktualizované).

### 3.11 – 25. 10. 2026

- **Môj kalendár** („Vyberte firmu“ → Môj kalendár): všetky akcie zo všetkých firiem, kde ste v posádke, po
  mesiacoch, s farbou firmy; akcie, ktoré sa prekrývajú, sú červené („Prekrýva sa s …“). Ťuknutím sa otvorí event.
- **Posádka eventu**: kto je v termíne v posádke inej firmy, je v skupine „V inej firme“ (s dátumom) a vo výbere
  „– v inej firme“; firma sa nedozvie kde.
- **Technika eventu**: pri vlastnej technike zdieľanej s inou firmou sa odpočítajú kusy, ktoré sú v termíne na
  evente tej firmy, s upozornením.
- Nové migrácie: `0091` (opravné `0071` a `0072` sú aktualizované).

### 3.10 – 25. 10. 2026

- **Zvonček s upozorneniami** v hlavičke: počet neprečítaných, zoznam upozornení zo všetkých firiem (aj bez
  zapnutého push), ťuknutím sa otvorí event / úloha (pri inej firme sa firma prepne sama), „Všetko prečítané“
  a „Zmazať prečítané“.
- **Nové upozornenia**:
  - posádke, keď sa eventu zmení termín alebo miesto, alebo keď sa zruší,
  - tomu, kto event založil, keď niekto z posádky odmietne (aj s dôvodom),
  - posádke hodinu pred stretávkou,
  - tomu, kto výpožičku založil, keď je po termíne (raz za týždeň).
  Stretávky a výpožičky kontroluje plánovač `pg_cron` v Supabase (každých 15 minút).
- Nové migrácie: `0090` (opravné `0071` a `0072` sú aktualizované).

### 3.9.1 – 25. 10. 2026

- Firmy a kontakty: nové nápovedy v poliach Názov a Obchodné meno.

### 3.9 – 25. 10. 2026

- **Zodpovedné osoby** (Nastavenia → Oprávnenia → Zodpovedné osoby, pre admina): napr. „Svetlá“ – všetka technika
  druhu svetlo, „Zvuk“ alebo „Case LED“ – konkrétne case; kto za ne zodpovedá (aj viac ľudí) a čo má robiť:
  odčítať prevádzkové hodiny každých N dní, skontrolovať case každých N dní.
- Zodpovedný vidí na **Prehľade** „Moje zodpovednosti“ – čo je po termíne (napr. odčítať hodiny 16 svetiel),
  s odkazom do Techniky alebo Cases.
- **Upozornenie na mobil** príde ráno, keď je niečo po termíne (najviac raz za týždeň za úlohu) – ak je v Supabase
  zapnutý plánovač `pg_cron` a nastavený push.
- V detaile **case** aj **techniky** je „Zodpovedá: Jano (Svetlá)“.
- Nové migrácie: `0089` (opravné `0071` a `0072` sú aktualizované).

### 3.8 – 25. 10. 2026

- **Push upozornenia – sprievodca** (Nastavenia → Účet, pre admina): kľúče sa vygenerujú v prehliadači, odkazy
  vedú rovno na správne miesta v Supabase, kód funkcie sa skopíruje jedným tlačidlom a namiesto Database
  Webhooku stačí jeden SQL príkaz. Tlačidlo „Skontrolovať nastavenie“ ukáže, čo ešte chýba.
- **Firmy a kontakty**:
  - pri firme **obchodné meno** (oficiálny názov, ak sa líši od toho, ako firmu voláte), **IČ DPH** a **CEO / konateľ**,
  - voľba **RigTrack: Nepoužívajú / Už majú firmu v RigTracku / Založiť im firmu**; existujúcu firmu nájde podľa
    IČO, názvu alebo obchodného mena a sama ponúkne prepojenie – už sa neponúka zakladať firmu, ktorá existuje,
  - ľudí pri firme sa dá **upravovať** a majú aj **dátum narodenia**.
- **Logo firmy**: pri nahratí sa dá vypnúť odstránenie pozadia a v nastavení zvoliť zobrazenie – automaticky,
  pôvodné farby bez podložky, s bielou podložkou, vždy biele alebo vždy čierne (s náhľadom na svetlom aj tmavom).
- **Vyberte firmu**: firmu si pripnete špendlíkom – pripnuté sú hore.
- Nový kábel: aj prvá dĺžka má dĺžku v názve („XLR 5 m“, „XLR 10 m“), nevznikne „XLR“ a vedľa „XLR 1 m“.
- Nové migrácie: `0088` (opravné `0071` a `0072` sú aktualizované).

### 3.7.6 – 24. 10. 2026

- Pódium Nivtec: zrušené samostatné „Chcem lišty na okraje“ – „Chcem plachtu“ pridá na zvolené strany
  plachtu aj lišty, na ktoré sa vešia.

### 3.7.5 – 24. 10. 2026

- **Kto káble vyrobil**: „Všetky jeden človek“ (len meno, platí pre všetky dĺžky a kusy) alebo „Rôzni ľudia“ –
  pri každej dĺžke kto koľko kusov (napr. 5 m: Jano 2, Fero 8), s počtom kusov bez výrobcu. Viac kusov, ako
  má dĺžka, sa uložiť nedá. Predtým sa pri viacerých dĺžkach rovnakí výrobcovia skopírovali ku každej.
- Delay a LED kalkulačka majú upozornenie „Vo fáze vývoja“ ako Pódium.

### 3.7.4 – 24. 10. 2026

- Nový kábel: dĺžky a počty kusov sú v jednom zozname (Dĺžka – Kusov); „Pridať dĺžku“ pridá ďalší riadok
  a každá dĺžka sa uloží ako samostatná položka. Dĺžka už nie je vo formulári dvakrát.

### 3.7.3 – 24. 10. 2026

- **Zručnosti v Mojom profile** (napr. Avolites, GrandMA, Crown, práca vo výškach): zadávajú sa ako štítky,
  s návrhmi pri písaní, a prenesú sa do kariet zamestnanca vo všetkých firmách. Na karte aj v zozname Ľudia
  sú ako štítky; hľadanie v Ľuďoch nájde aj podľa zručnosti.
- Nové migrácie: `0087` (opravné `0071` a `0072` sú aktualizované).

### 3.7.2 – 24. 10. 2026

- Karta zamestnanca: so zapnutým „Brať údaje z osobného profilu“ sú telefón, e-mail, narodeniny, meniny,
  vodičák aj sociálne siete hneď zamknuté – menia sa v Mojom profile. Po vypnutí sa dajú upraviť v danej firme.

### 3.7.1 – 24. 10. 2026

- Opravené: údaje z Môjho profilu (telefón, e-mail, narodeniny, meniny, vodičák, sociálne siete) sa znova
  prenášajú do kariet zamestnanca vo všetkých firmách; pri spustení `0086` sa všetky karty raz dorovnajú.

### 3.7 – 24. 10. 2026

- **Na PC širšie a prehľadnejšie**: „Vyberte firmu“ s firmami v mriežke a dlaždicami Môj profil, Moja technika,
  Moje zariadenia a Moje štatistiky; širšie sú aj O aplikácii a Čo je nové (s bočným zoznamom verzií).
  Na Prehľade sú Moje úlohy na PC v stĺpci na kraji. Demo firma je pri vlastných firmách len malý odkaz.
- **Môj profil – fotka**: nahrá sa do vašej karty zamestnanca vo všetkých firmách naraz (aj pomocníkom).
- **Moja technika**: vlastnú techniku aj vlastný case / rack pridáte priamo z „Vyberte firmu“ – do jednej
  alebo do všetkých svojich firiem; „Upraviť“ otvorí položku vo firme.
- **Moje zariadenia → „Aj do techniky“**: výkonný notebook či tablet sa dá dať na event ako vaša technika.
- **Moje štatistiky**: filter podľa firmy, roka a mesiaca; akcie a dni na akciách, odpracované hodiny
  (eventy, firma, doma), odmeny a priemer na akciu, jazdy a kilometre, graf po mesiacoch, čo ste robili
  najčastejšie, najčastejší klienti a miesta.
- **Siete**: hore prepínač Wi-Fi siete / IP tabuľka / MAC adresy (IP zoradené podľa čísel).
  **Zariadenia hostí** (napr. hosťujúci zvukár): meno a priezvisko, kontakt, zariadenie, MAC, pevná IP
  (s návrhom voľnej) a dokedy platí – vidí ich len kto upravuje techniku.
- **Cases**: viac case naraz ide vždy (aj bez šablóny) a rovno sa do nich rozdelí technika – napr. 8 case
  po 2 svetlá zo 16. V detaile case pri technike s viac kusmi zvolíte, koľko kusov dať dnu (zvyšok ostane).
  V zozname cases sa ukáže fotka case, inak fotka hlavného prvku štítku alebo techniky vnútri.
  Na štítku pribudli kategórie Truss a Stage.
- **Technika po kusoch**: stĺpce Sériové číslo, Dátum nákupu a nové **Odkiaľ kúpené**; inventárne číslo pri
  kuse odpadlo (kus označuje jeho číslo #1, #2…). Dátum nákupu dole sa pri evidencii po kusoch neukazuje.
- Filtre v Technike a Cases: triedenie vľavo, vedľa „Viac filtrov“.
- Opravené: sociálne siete z profilu sa znova prenášajú do kariet zamestnanca.
- Nové migrácie: `0086` (opravné `0071` a `0072` sú aktualizované).

### 3.6 – 24. 10. 2026

- **Moja technika vo viacerých firmách** („Vyberte firmu“ → Moja technika): technika, ktorej vlastníkom ste vy,
  sa dá jedným klikom pridať aj do ďalšej vašej firmy – bude tam ako vaša vlastná technika (dá sa dať na event).
  Pri každom kuse vidno, v ktorých firmách je; „Aktualizovať kópie“ prenesie zmeny (názov, počet, parametre)
  a z firmy sa dá aj odobrať.
- Nové migrácie: `0085` (opravné `0071` a `0072` sú aktualizované).

### 3.5 – 24. 10. 2026

- **Push upozornenia na mobil** (Nastavenia → Účet → Upozornenia na mobil): upozornenie príde, keď vás niekto
  pridá do posádky eventu alebo vám priradí úlohu – aj keď appku nemáte otvorenú. Zapína sa na každom
  zariadení zvlášť, tlačidlom „Poslať skúšobné“ overíte, že chodia. Na iPhone len z appky pridanej na plochu.
- **Môj profil – sociálne siete**: Instagram, Facebook, TikTok, LinkedIn, YouTube a web sa zadajú raz a prenesú
  sa do kariet zamestnanca vo všetkých firmách.
- **„Vyberte firmu“**: firmy sú znova hlavné; Môj profil, Moje zariadenia a Moje štatistiky sú malé tlačidlá
  vedľa nadpisu (s odkazom späť na firmy).
- **Nivtec**: poradie stavania ide po radoch – najprv celý zadný rad, potom ďalšie smerom dopredu.
- Nové migrácie: `0084` (opravné `0071` a `0072` sú aktualizované). Nastavenie push je v časti
  „Push upozornenia na mobil – nastavenie“.

### 3.4 – 24. 10. 2026

- **Nivtec – plán pódia**: na nákrese má každá doska číslo (poradie stavania od dosky 1) a rozmer a modré bodky
  ukazujú, v ktorých rohoch ktorej dosky je noha – roh bez bodky leží na nohe susednej dosky. Dá sa vypnúť.
- **Tlačiť / PDF** pri pódiu: vytlačí sa nákres so zoznamom dielov (bez menu a ovládania).
- **Káble – kto ich vyrobil**: pri kábli sa zapíše, kto ho spravil, aj rozdelene (z 10 XLR spravil 8 Jano
  a 2 Fero). V Štatistikách → Ľudia je rebríček, kto spravil najviac káblov.
- **Štatistiky → Technika**: koľko metrov káblov máte podľa konektora (XLR, predlžovačky…).
- **Vlastník techniky**: správca tímu vie vo výbere vlastníka rovno pridať človeka bez účtu (napr. brigádnika).

### 3.3 – 24. 10. 2026

- **Faktúra ku kusom techniky**: v objednávke pri položke „Už to mám v technike – len prepojiť“ vyberiete
  techniku a kusy (napr. `1-4`). Počet kusov v technike sa nezmení, nákup sa len priradí.
- Prepojiť sa dá aj **dodatočne** pri staršej objednávke („Prepojiť s technikou, ktorú už mám“) a prepojenie
  sa dá zrušiť.
- **Detail techniky**: pri každom kuse vidno „faktúra (dodávateľ, dátum)“ alebo „bez faktúry“; pri nákupoch
  ktoré kusy pokrývajú a či je k nim faktúra.
- Nové migrácie: `0083` (opravné `0071` a `0072` sú aktualizované).

### 3.2.1 – 24. 10. 2026

- **„Vyberte firmu“ prehľadnejšie**: hore sú tlačidlá Firmy, Môj profil, Moje zariadenia a Moje štatistiky –
  ukáže sa vždy len vybraná časť. Pri nevyplnenom profile svieti na tlačidle bodka.

### 3.2 – 24. 10. 2026

- **Kto šoféroval** (detail eventu, pod Dopravou): ku každému dňu sa zapíše šofér (člen alebo externista), auto,
  smer (tam, späť, tam aj späť) a kilometre – prázdne km sa dopočítajú podľa vzdialenosti zo skladu. Šofér
  z posádky sa môže zapísať aj sám.
- **Karta zamestnanca**: nová sekcia „Šoféroval“ – kde, kedy, akým autom a koľko km spolu.
- **Štatistiky → Ľudia**: rebríček šoférov podľa najazdených km (aj s počtom jázd) za zvolený rok.
- Nové migrácie: `0082` (opravné `0071` a `0072` sú aktualizované).

### 3.1 – 24. 10. 2026

- **Moje štatistiky (všetky firmy)** na obrazovke „Vyberte firmu“: pri každej firme koľko akcií máte v zvolenom
  roku, koľko ste zarobili, koľko hodín odpracovali (eventy aj firma / doma) a súčty za celý čas aj za všetky firmy.
- **Stránka O aplikácii**: čo RigTrack vie, ako začať a ako narába s vašimi údajmi. Odkaz je v pätičke –
  na prihlásení, pri výbere firmy aj v appke.

### 3.0 – 24. 10. 2026

- **Môj profil pre všetky firmy** (obrazovka „Vyberte firmu“): meno, telefón, e-mail, narodeniny, meniny, vodičák
  a adresa domov sa zadávajú raz. Do karty zamestnanca v každej firme sa prepíšu samy – aj v novej firme hneď
  po vstupe. Kým profil nie je vyplnený (meno a telefón), appka to pripomína.
- **Karta zamestnanca – „Brať údaje z osobného profilu“**: predvolene zapnuté; po vypnutí sa karta v danej firme
  upravuje samostatne, po zapnutí sa znova dorovná s profilom.
- **Moje zariadenia pre všetky firmy**: mobil, notebook či tablet s MAC adresou sa zapíše naraz do všetkých
  firiem; pri zariadení vidno, v ktorej firme chýba, a jedným klikom ho tam doplníte. Siete a IP adresy ostávajú
  pre každú firmu zvlášť.
- Adresa domov z profilu sa prenesie aj do dochádzky (práca doma).
- Nové migrácie: `0081` (opravné `0071` a `0072` sú aktualizované).

### 2.19 – 24. 10. 2026

- **Klienti a ich história**: firma v „Firmy a kontakty“ má vlastnú stránku – počet akcií, prvá, posledná
  a najbližšia akcia, tržby z akcií (pre toho, kto vidí príjmy), zoznam všetkých akcií (ako organizátor aj
  partner) s odkazom na ponuku a výpožičky (podľa IČO alebo mena).
- Rátajú sa aj staršie akcie, kde je firma len napísaná ako organizátor.
- V zozname firiem je pri každej počet akcií a dá sa zoradiť podľa názvu, počtu akcií alebo poslednej akcie.
  V detaile eventu je pri firme odkaz „História“.
- Objednávky: Štatistiky už nie sú dvakrát – ostalo tlačidlo vedľa „Pridať“.

### 2.18 – 23. 10. 2026

- **Dochádzka aj mimo eventov**: na Prehľade „Začať na firme“ a „Začať doma“ – začať sa dá na mieste (do 300 m
  od adresy skladu, resp. domova), potom Prestávka, Čakám a Končím ako pri evente.
- **Adresa domov** (Nastavenia → Účet → Dochádzka): vidí ju len človek sám a ten, kto spravuje tím.
- **Stránka Dochádzka** (v menu): moje časy za 7 dní, mesiac alebo 3 mesiace so súčtom; kto spravuje tím, vidí
  všetkých, filtruje podľa človeka a časy vie opraviť alebo zmazať.
- **Štatistiky → Odpracované hodiny** rátajú eventy aj prácu na firme a doma.
- Nové migrácie: `0080` (opravné `0071` a `0072` sú aktualizované).

### 2.17 – 23. 10. 2026

- **Skupiny ľudí v oprávneniach** (Nastavenia → Oprávnenia): vytvoríte skupiny (napr. Šoféri, Zvukári), pridáte
  do nich členov a v tabuľke má každá skupina vlastný stĺpec. Člen skupiny smie to, čo jeho rola, a navyše
  všetko, čo má skupina zaškrtnuté. Výnimka pre jedného člena má stále prednosť.
- **Formulár techniky prehľadnejší**: pri „Evidovať každý kus zvlášť“ sa kusy (inventárne a sériové číslo,
  dátum nákupu) ukážu hneď pod tým a počet kusov sa zadáva len raz – vlastné čísla kusov sú schované
  v „Kusy majú iné čísla?“.
- Skupiny polí (Zvuk, Svetlo, Sieť…) sa dajú kliknutím na nadpis zbaliť a appka si to pamätá. **Sieť** sa ukáže
  až po zaškrtnutí „Zariadenie je v sieti“ a **Servis** po zaškrtnutí „Pravidelný servis“.
- Nové migrácie: `0079` (opravné `0071` a `0072` sú aktualizované).

### 2.16 – 23. 10. 2026

- **Zosilňovače**: výkon pri 2 Ω, 4 Ω a 8 Ω na kanál, bridge 4 Ω a 8 Ω a krajina výroby.
- **Údaje po kusoch**: pri technike evidovanej po kusoch má každý kus vlastné inventárne a sériové číslo aj dátum
  nákupu (vo formulári „Údaje po kusoch“, v detaile pri Kusoch). Vyhľadávanie v Technike nájde aj tieto čísla.
- **Prevádzkové hodiny po kusoch**: pri odčítaní sa vyberie kus (napr. každý zosilňovač má svoje počítadlo),
  prehľad posledného stavu každého kusu a graf pre zvolený kus.
- **Sklad – skenovanie**: „Skenovať“ ukáže, kde naskenovaný case alebo technika leží (označí miesto na pláne).
  Pri vybranom mieste „Uložiť sem skenovaním“ ukladá cases jeden za druhým. Miesta (regály) majú vlastné
  QR štítky – naskenovanie ukáže, čo na nich leží.
- **Sklad – hľadanie podľa čísla**: case nájdete aj podľa označenia, čísla na štítku a **starých čísel**
  (nové pole pri case).
- **QR kód ako PNG**: pri QR štítkoch sa dá stiahnuť samotný QR kód bez textu (jeden aj všetky).
- V „Čo je nové“ v appke sa už nezobrazujú technické poznámky o databáze.
- Nové migrácie: `0078` (opravné `0071` a `0072` sú aktualizované).

### 2.15 – 23. 10. 2026

- **Činnosti pri eventoch** (Nastavenia → Pripomienky, len admin): vlastný zoznam, napr. nakladanie, vykladanie,
  kontrola a naskladnenie hliníka, kontrola kabeláže – jedným klikom predvolené, dajú sa pridať, preusporiadať
  aj vypnúť.
- **Kto čo robil** (detail eventu): ku každej činnosti sa zapíšu ľudia – členovia aj externisti. Človek z posádky
  sa môže zapísať aj sám („Robil(a) som“).
- **Štatistiky → Ľudia**: odpracované hodiny podľa ľudí (z výkazov času aj dochádzky) a pri každej činnosti
  rebríček, kto ju robil najčastejšie – za zvolený rok.
- Nové migrácie: `0077` (opravné `0071` a `0072` sú aktualizované).

### 2.14 – 23. 10. 2026

- **Stretávka pri evente** (detail eventu → Stretávka a dochádzka): dátum, čas a miesto – na firme (sklad),
  na mieste akcie, hotel alebo iná adresa (predvyplní sa) a polomer, v ktorom sa príchod uzná (predvolene 300 m).
- **Dochádzka podľa polohy** (dobrovoľná – zapína si ju každý v Nastaveniach → Účet → Dochádzka): okolo času
  stretávky sa na Prehľade ukáže karta s tlačidlom **Som tu**, ktoré sa odomkne, keď ste na mieste. Čas príchodu
  dá server, poloha sa nikam neukladá.
- **Prestávka a Čakám** (napr. keď sa na niekoho čaká): čas sa nepočíta, kým nekliknete Pokračovať.
  **Končím** dochádzku sám zapíše do výkazu času eventu (prestávky a čakanie sa odpočítajú).
- **Prehľad pre vedúceho**: kto kedy prišiel, či bol príchod overený polohou, prestávky, čakanie a odpracovaný čas.
  Vedúci vie časy aj minúty opraviť – výkaz sa opraví s nimi.
- Nové migrácie: `0076` (opravné `0071` a `0072` sú aktualizované).

### 2.13.2 – 20. 10. 2026

- **Oprava: Moje zariadenia sa nedali pridať ani upraviť** (chyba „Nepodarilo sa uložiť“) – appka posielala MAC
  ethernet / LAN pod nesprávnym názvom stĺpca.
- **Hodnota techniky bez odpisov**: pri technike je len nákupná cena (za kus a spolu), v Štatistikách súčet
  nákupných cien celkom a podľa kategórií.
- Opravná migrácia `0072` je upratanejšia (netreba ju spúšťať znova, ak už prebehla bez chyby).

### 2.13.1 – 20. 10. 2026

- **Pódium bez zdvojených polí**: značka dosiek je teraz vo „Výrobca / značka“ (s ponukou Nivtec, Bütec, Litec)
  a všeobecná Kategória sa pri pódiu nezobrazuje – typ (dosky, nohy…) ju nahrádza. Doteraz zadaná značka sa pri
  úprave sama presunie do Výrobcu.

### 2.13 – 19. 10. 2026

- **Kedy nemôžem** (Kalendár): každý si sám zapíše, kedy nemôže (dovolenka, škola…). V kalendári pribudol druh
  „Kto nemôže“, takže vidno, kto kedy chýba.
- **Dostupnosť posádky v evente**: nad výberom posádky je prehľad, kto v termíne môže, kto nemôže (aj prečo) a kto je
  na inom evente. Vo výbere „Kto“ je to pri mene a po zvolení vyskočí upozornenie.
- **Podpis na mobile pri výpožičke**: v detaile výpožičky sú Podpisy – pri odovzdaní aj vrátení sa podpíše
  vypožičiavateľ aj firma prstom na mobile. Podpisy sa vytlačia na zapožičacej listine (PDF).
- Nové migrácie: `0075` (opravné `0071` a `0072` sú aktualizované).

### 2.12 – 19. 10. 2026

- **QR štítky**: v detaile techniky aj case je tlačidlo „QR štítok“ a v Cases „QR štítky“ (všetky naraz, 3 v rade
  na A4). Na flight case štítku je QR kód vpravo hore, dá sa vypnúť. QR je obyčajný odkaz: fotoaparát v mobile
  otvorí detail aj bez appky.
- **Skenovanie**: tlačidlo „Skenovať“ v Technike a v Cases otvorí kameru a naskenovaný štítok otvorí detail.
  V **pack liste** sa naskenovaný case alebo technika rovno odškrtne – stačí prechádzať popri cases s mobilom.
- **Hodnota techniky**: pri technike sa dá zadať nákupná cena za kus a za koľko rokov sa odpíše (predvolene 4).
  Detail ukazuje hodnotu dnes (pri evidencii po kusoch podľa dátumu nákupu každého kusu), Štatistiky celkovú
  hodnotu a hodnotu podľa kategórií. Ceny vidí len ten, kto môže techniku upravovať.
- **História kusu**: v detaile techniky pribudla „História zmien a škody“ – kto čo menil (presun, stav, počet…)
  a zapísané škody, spolu s eventami, výpožičkami, servisom a nákupmi, ktoré tam už boli.
- Bez nových migrácií.

### 2.11 – 19. 10. 2026

- **Pack list** (detail eventu → Pack list): pri nakladaní a pri návrate posádka odškrtáva cases a voľnú techniku,
  vidno kto a kedy odškrtol a čo sa ešte nevrátilo. Odškrtávať môže každý, kto je v posádke eventu.
- **Cenová ponuka** (detail eventu → Ponuka): technika s cenami prenájmu × dni, doprava podľa km, obsluha, zľava
  a DPH, s hlavičkou firmy – na tlač alebo do PDF. Nastavenia ponuky si prehliadač pamätá.
- **Harmonogram pre posádku** (detail eventu → Pre posádku): prehľad na mobil – kam ísť (navigácia), ktoré dni ideš
  ty, program po dňoch, kto ide s telefónmi, organizátor a odkazy (rider, lightplot…).
- **Čo nesmieš, to nevidíš**: v menu aj na prehľade sa ukazujú len moduly, ku ktorým máte oprávnenie. Helper navyše
  nevidí kalkulačky, siete, kanceláriu ani štatistiky.
- Nové migrácie: `0074` (opravné `0071` a `0072` sú aktualizované).

### 2.10.1 – 19. 10. 2026

- **Nastavenia sa dajú zbaliť** – klik na nadpis sekcie ju zbalí / rozbalí a prehliadač si to pamätá.
- **Tabuľka oprávnení na mobile**: názov oprávnenia ostáva pri posúvaní do strany viditeľný a je tam návod, že sa
  tabuľka posúva prstom.

### 2.10 – 19. 10. 2026

- **Úrovne kontroly** (Nastavenia → Pripomienky): žiadna / malá / stredná / veľká a po koľkých dňoch sa pri každej
  kontroluje. Platí pre **cases a racky** (úroveň „žiadna“ = bez kontroly) aj pre prevádzkové hodiny.
- **Prevádzkové hodiny** (zosilňovače, svetlá a iné): zaškrtnete „Sledovať prevádzkové hodiny“ a zvolíte úroveň
  kontroly; v detaile techniky **graf**, ako hodiny rastú, a priemer hodín za mesiac.
- **Výbojka / halogén**: kedy sa naposledy menila a stav počítadla pri výmene – detail ukáže, koľko hodín odvtedy
  nabehala.
- **Úlohy po evente** môžu mať riešiteľov – napr. soc media maker dostane „Fotky na soc. siete“ po každej akcii.
- Opravné migrácie 0071 a 0072 obsahujú aj tieto zmeny.

Nové migrácie: `0073`.

### 2.9.3 – 19. 10. 2026

- **Oprava kontrol hodnôt a funkcií**: `0072_repair_checks_functions.sql` nastaví všetky kontroly hodnôt (check
  constraints) a funkcie databázy na aktuálnu verziu – napr. „violates check constraint event_payments_method_check“
  pri demo firme. Vygenerované z výslednej schémy, dáta nemení, dá sa spustiť aj viackrát (po 0071).

Nové migrácie: `0072`.

### 2.9.2 – 19. 10. 2026

- **Oprava celej databázy jedným súborom**: `0071_repair_all_columns.sql` doplní každý chýbajúci stĺpec vo všetkých
  tabuľkách aj s oprávneniami (napr. „column vat of relation event_payments does not exist“ pri demo firme).
  Je vygenerovaná z výslednej schémy, existujúce dáta nemení a dá sa spustiť aj viackrát.

Nové migrácie: `0071`.

### 2.9.1 – 19. 10. 2026

- **Oprava Wi-Fi sietí** („Siete sa nepodarilo načítať“): migrácia `0070` založí alebo doplní tabuľky sietí, ak 0055
  nebola spustená alebo prebehla v staršej verzii. Dá sa spustiť aj viackrát. Hláška pri Sieťach ukáže aj technický dôvod.
- Kontrola databázy odhalí aj staršiu verziu 0055 a 0052.

Nové migrácie: `0070`.

### 2.9 – 19. 10. 2026

- **Kamery**: snímač full frame / APS-C alebo akčná kamera a či má HDMI výstup.
- **Stojany** na repráky a na mikrofóny (Zvuk → skupina Stojany).
- **Oprava demo firmy** („column networks of relation member_devices does not exist“): migrácia `0069` doplní
  chýbajúce stĺpce zariadení a vlastníkov, ak 0052 / 0059 prebehli len čiastočne. Dá sa spustiť aj viackrát.

Nové migrácie: `0069`.

### 2.8 – 19. 10. 2026

- **Nové druhy techniky**: **IT** (mobil, tablet / iPad, notebook, počítač, router / sieť) a **Spotrebiče**
  (kávovar, chladnička, rýchlovarná kanvica, ohrievač – s príkonom).
- **Video**: aj kamery, statívy, objektívy a gimbaly.

Nové migrácie: `0068`.

### 2.7 – 19. 10. 2026

- **DJ technika**: rok a krajina výroby, farba a stav (nový / výborný / dobrý / opotrebovaný / poškodený).
- **Kábel bez „sady“**: pri novom kábli tlačidlo „Pridať ďalšiu dĺžku“ – každá dĺžka sa uloží ako samostatná položka.
- **Eventy**: klient a organizátor sú jedno (zadáva sa organizátor); nahrávanie dokumentov zrušené (ridery cez odkazy,
  staré dokumenty ostávajú); tlačidlo Pódium z eventu preč; kalendár len „Add to Google kalendár“.
- **Upozornenia** sú hore v appke ako zbaliteľný pruh (nie samostatná stránka v menu).
- **Chýbajúce migrácie** vidí len vývojár (Prehľad, Nastavenia → Stav databázy); ostatným sa pri funkcii ukáže
  „kontaktujte vývojára aplikácie“.
- **DMX dip switch**: aj otočené prepínače (ON dole).

### 2.6 – 19. 10. 2026

- **Svetlá – typ v skupinách**: pohyblivé (beam, wash, spot, hybrid), statické (LED PAR, LED bar), efektové
  (blinder, strobo, pixel line, laser, špeciálne efekty), profilové / divadelné (profil, fresnel), výrobníky
  (dymostroj, hazer, fazer) a **príslušenstvo** (háky, klemy, klapky, prevodníky, mixpult na svetlá, licenčné
  kľúče, kvapaliny) – príslušenstvo bez príkonu, zdroja a DMX.
- **Truss**: 1- / 2- / 3- / 4-point, ground support, príslušenstvo, stojany / lifty; pri 1–4-point tvar (rovný,
  roh, T, kríž, kocka, kruh) a dĺžka dielu.
- **Pódium**: dosky (značka – napr. Nivtec originál – a veľkosť) alebo príslušenstvo.
- **Video**: typ sa vyberá zo zoznamu (LED panel, LED procesor, TV, monitor, projektor) namiesto zaškrtávania.
- **Príkon (W)** sa pýta len tam, kde má zmysel (svetlá, aktívne PA, zosilňovače, procesory) a v zozname techniky
  sa už neukazuje – je v detaile.

### 2.5 – 19. 10. 2026

Podrobnejšia technika:

- **Zvuk – skupina PA**: Line array (LA systém), Live / portable PA (vrch), Monitor, Sub (basák), Mixpult, Zosilňovač,
  Procesor / DSP a Stagebox. Pri PA (vrch, monitor, sub, LA) údaje z katalógového listu: aktívny / pasívny,
  výkon continuous / program / peak, impedancia, LF a HF driver, max SPL continuous a peak, citlivosť, frekvenčný
  rozsah a odozva, vyžarovací uhol, výhybka, **bi-amp**, konektory a hniezdo na stojan; pri sube konštrukcia
  (priamy / horna / slimák) a vlastný delay.
- **Mixpult**: analógový / digitálny, počet kanálov, pri digitálnom karta (Dante, MADI…). **Stagebox**: karta / protokol.
- **Mikrofón**: káblový / bezdrôtový, dynamický / kondenzátorový (kondenzátorový v patch liste sám zapne 48 V);
  pri bezdrôtovom kapsule, ktoré pasujú (aj „Nová kapsula“). **Bezdrôtový systém a in-ear**: frekvenčný rozsah.
- **Káble**: typ Kábel / Redukcia / **DI box** (aktívny / pasívny) – DI box sa ponúka aj v patch liste.
- **Váha (kg)** pri každej technike.
- **DMX dip switch**: prepínač 9 / 10, ON hore / OFF dole, poradie (prepínač 1 vľavo alebo vpravo).

### 2.4 – 19. 10. 2026

- **DMX dip switch** v Kalkulačkách: adresa → ktoré prepínače zapnúť (aj s hodnotami 1 + 4 + 32…), klikom na
  prepínače späť na adresu, 9 alebo 10 prepínačov; adresy pre rad svetiel (štart, kanálov na svetlo, počet) aj
  s prechodom do ďalšieho univerza a dip nastavením pre každé svetlo.
- **Nová technika**: v „Druh“ je aj **Sada káblov** a **Kapsula k mikrofónu** (otvoria svoj formulár); „Pridať“
  v Technike je znova jedno tlačidlo.

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
