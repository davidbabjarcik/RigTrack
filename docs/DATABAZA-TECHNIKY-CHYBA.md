# Spoločná databáza techniky – čo chýba

Zoznam modelov, ku ktorým v spoločnej databáze techniky chýbajú údaje (alebo sú neúplné). Aktualizuje sa po každom
doplnení katalógov. Stačí poslať PDF (celý katalóg výrobcu alebo list ku konkrétnemu modelu) – údaje prepíšem.

**Naposledy aktualizované:** 8. 11. 2026, po verzii 8.18.

Všetky údaje sú zatiaľ **neoverené** – overujú sa vo Vývojár → Databáza techniky. Od 8.18 tam hore vidno aj modely,
ktoré firmy označili ako správne, a zmeny údajov, ktoré firmy navrhli. Zoradenie „Najpoužívanejšie vo firmách“ ukáže,
čo overovať najskôr.

## Prehľad

V databáze je **4306 modelov**.

| Druh | Modelov | S typom | S váhou | Stav |
|---|---:|---:|---:|---|
| Zvuk | 1518 | 1518 | 156 | boxy z katalógov výrobcov úplné; pulty, mikrofóny, bezdrôty, stageboxy, zosilňovače, procesory a Technics Hi-Fi so základnými údajmi |
| Svetlá (vrátane výrobníkov hmly a pultov na svetlá) | 871 | 591 | 619 | 32 bez údajov, ~250 bez typu svetla |
| Hliník a stojany | 598 | 598 | 569 | úplné okrem 5 všeobecných záznamov a svetelných stojanov K&M / Gravity |
| DJ technika (vrátane prenosiek a slúchadiel) | 489 | 489 | 0 | len typ |
| IT | 301 | 301 | 0 | len typ |
| Video | 297 | 297 | 0 | typ, pri kamerách snímač, pri LED procesoroch výstupy, pri projektoroch rozlíšenie a lm |
| Káble (DI a reamp boxy) | 103 | 103 | 0 | typ, aktívny / pasívny, počet kanálov |
| Pódium (Nivtec) | 49 | 49 | 49 | úplné |
| Ostatné (stojany na klávesy, gitary, tašky…) | 31 | – | 0 | len názov |
| Spotrebiče | 25 | 25 | 0 | typ, pri elektrických ohrievačoch príkon |
| Spotrebný materiál | 24 | – | 0 | len názov (batérie, gaffer páska, náplne) |

Značka **Unknown** (82 modelov) je pre techniku bez značky – má len typ, ďalšie údaje sa pri nej nedopĺňajú.

**Najviac by pomohli (podľa poradia):**

1. **d&b audiotechnik** – katalóg boxov aj tabuľka, ktoré zosilňovače box poháňajú (ako pri L-Acoustics).
2. **JBL** – listy k VTX A / V / B / S a SRX900 (výkon, frekvencie, SPL, váha, rozmery).
3. **Váhy** – pulty Behringer a starší DiGiCo, stageboxy, procesory, zosilňovače QSC / Crown / Lab.gruppen.
4. **Bezdrôty a in-ear** – frekvenčné pásma konkrétnych verzií (napr. G51, Q1-6), ktoré máte.
5. **Svetlá bez údajov** – GDTF súbory (gdtf-share.com) alebo listy.
6. **DJ technika** – Pioneer DJ / Denon DJ (váha, konektory).

## Aké údaje treba podľa druhu

- **Boxy, monitory, suby, line array:** výkon (RMS / program / peak), frekvenčný rozsah (−10 dB), citlivosť alebo
  max SPL, impedancia (pri pasívnych), vyžarovací uhol, meniče, váha, rozmery (V × Š × H), konektory.
- **Zosilňovače:** výkon pri 2 / 4 / 8 Ω na kanál a v bridge, analógový / DSP, počet kanálov, váha.
- **Pulty:** počet kanálov, analógový / digitálny, sloty a karty (Dante, MADI…), váha.
- **Mikrofóny:** dynamický / kondenzátorový / páskový, frekvenčný rozsah, ktoré kapsule pasujú.
- **Bezdrôty a in-ear:** frekvenčné pásmo (napr. G51 470–534 MHz), prijímač, vysielače.
- **Stageboxy a procesory:** vstupy / výstupy, protokol, váha.
- **Hliník:** kód dielu, dĺžka, váha (tabuľka „straight segments“ v katalógu).
- **Svetlá:** typ (beam / wash / spot…), zdroj svetla, príkon, váha, DMX módy – najľahšie GDTF súbor z gdtf-share.com
  (vo formulári techniky „Nahrať GDTF súbor“).
- **Video:** výstupy, pixely na výstup, vstupy (procesory), rozlíšenie a svietivosť (projektory, TV).

## Zvuk – len základné údaje

| Čo | Je zadané | Chýba |
|---|---|---|
| Pulty (Yamaha, Allen & Heath, DiGiCo, Midas, Behringer, Soundcraft) | počet kanálov, väčšinou váha, fadery a sloty | váha: Behringer, DiGiCo Quantum 5 / 852 / 326 / 638 / 112 a SD okrem SD12, Soundcraft Vi, Yamaha RIVAGE |
| Mikrofóny (Shure, Sennheiser, AKG, Audix, Neumann, DPA, Audio-Technica, EV, Beyerdynamic, Røde) | káblový, typ, frekvenčný rozsah | frekvenčný rozsah pri pár modeloch z 8.16 (napr. Shure KSM137, Beyerdynamic TG I53c) |
| Bezdrôty a in-ear (Shure, Sennheiser, Wisycom, Audio-Technica) | typ, prijímač, pri zostavách vysielače | frekvenčné pásmo (závisí od verzie), váha prijímačov |
| Stageboxy (Yamaha, Allen & Heath, Behringer, Midas, DiGiCo, Soundcraft) | vstupy / výstupy a protokol | váha |
| Zosilňovače (Powersoft, Lab.gruppen, Crown, Yamaha, QSC, d&b, MC², Linea, EV, Behringer) | počet kanálov, pri časti výkon a váha | výkon pri 2 / 4 / 8 Ω a váha pri väčšine (Lab.gruppen PLM / D / FP, QSC, Crown, MC², EV, Behringer) |
| Procesory (dbx, Lake, XTA, Klark Teknik) | vstupy / výstupy, rozhrania | váha |
| Boxy d&b a dB Technologies, JBL PRX815W / SRX835P / SRX828SP, RCF ART 745-A, Pioneer XPRS, Yamaha DZR | typ, aktívny / pasívny | výkon, frekvencie, SPL, uhol, váha, rozmery; pri d&b aj zosilňovače |
| Technics Hi-Fi | typ | všetko ostatné (Hi-Fi technika, len na evidenciu) |
| Stojany K&M a Gravity | typ | výška, nosnosť, váha |

## Zvuk – neúplné boxy

| Model | Chýba |
|---|---|
| JBL VRX915S, VRX918S | váha, rozmery |
| JBL VRX918SP, VRX932LAP | citlivosť / max SPL, váha, rozmery |
| JBL VTX A6, A8, A12, A12W | výkon, citlivosť / max SPL, impedancia, váha, rozmery (A12: aj frekvencie a uhol) |
| JBL VTX V20, V25-II, V25-II-CS | výkon, frekvencie, citlivosť / max SPL, impedancia, váha, rozmery |
| JBL VTX F12, F15, F35 | impedancia, váha, rozmery |
| JBL VTX F18S | všetko okrem typu a meniča (v katalógu 2026 sú pri ňom chybné čísla) |
| JBL VTX M20, M22 | váha |
| JBL VTX B15, B18, B28, S25, S28 | výkon, frekvencie, citlivosť / max SPL, impedancia, váha, rozmery |
| JBL SRX906LA, SRX910LA, SRX912M, SRX915M, SRX922 | výkon, frekvencie, citlivosť / max SPL, uhol, váha, rozmery |
| JBL SRX918S, SRX928S, SRX915SF, SRX918SF | výkon, frekvencie, citlivosť / max SPL, váha, rozmery |
| JBL PRX412M, PRX415M, PRX425, PRX418S | váha, rozmery |

Tieto čísla si nevymýšľam – treba listy (spec sheets) od JBL.

## Hliník

- **Prolyte** H30V, H40V a **Eurotruss** FD34 – všeobecné záznamy bez dĺžky a váhy (katalóg Prolyte / Eurotruss).
- **Global Truss** F34 a F44P (všeobecné záznamy) – diely s váhou z katalógu 2023 už sú, tieto sa dajú zmazať.
- **Svetelné stojany** K&M a Gravity – len typ, chýba výška, nosnosť a váha.

## DJ, video, IT, spotrebiče a spotrebný materiál

- **DJ technika** (Pioneer DJ, AlphaTheta, Denon DJ, Technics, Allen & Heath Xone, Rane, PLAYdifferently, Native
  Instruments, Reloop, Numark) a **prenosky** (Ortofon, Shure, Audio-Technica, JICO, Stanton…): len typ – chýba váha
  a konektory.
- **LED procesory Novastar** (VX400 / 600 / 1000 / 16s, MCTRL300 / 660 PRO / 4K): výstupy a pixely na výstup sú
  zadané, **vstupy sú zatiaľ len „1 vstup“** – treba doplniť podľa listu (HDMI / DVI / SDI / DP). Ostatné Novastar
  (COEX, H séria, karty, prevodníky) majú len popis.
- **Blackmagic Design**: prepínače ATEM s počtom vstupov v popise; prevodníky, Videohub, HyperDeck a ďalšie len popis.
- **Kamery**: snímač a HDMI výstup; chýba váha.
- **IT**: len typ (mobil / tablet / notebook / počítač / sieť).
- **Spotrebiče**: typ, pri elektrických ohrievačoch Master príkon.
- **Spotrebný materiál a Ostatné**: len názov.

## Svetlá

Vyše 650 svetiel je z Open Fixture Library (s DMX módmi). Úplne bez údajov je 32 – najrýchlejšie ich doplníte cez
GDTF súbor pri svetle, alebo pošlite list / GDTF súbor:

| Výrobca | Modely bez údajov |
|---|---|
| Robe | Esprite, LEDBeam 150, MegaPointe, Spiider, T1 Profile |
| Lupo | Actionpanel Dual Color, Actionpanel Full Color, Superpanel Dual Color 60, Ultrapanel Dual Color 60, Ultrapanel Full Color 60 |
| Clay Paky | K10 B-EYE, K20 B-EYE, Mythos 2 |
| Ayrton | Diablo, Khamsin |
| Kino Flo | Celeb 250-DMX, Celeb 450-DMX |
| Martin | MAC Aura XB |
| Elation | Proteus Maximus |
| Chauvet | Intimidator Spot 360X, Maverick Force 3 Profile |
| GLP | impression X5 |
| ETC | Source Four |
| Astera | AX1 PixelTube |
| Showtec | Phantom 140 LED Spot |
| Stairville | MH-x30 |
| Cameo | TS60 |
| ADJ | Focus Spot 4Z |
| Minuit Une | M-Carré |
| Lixada, U`King | Mini Beam RGBW, Mini Moving Head RGBW, Mini Gobo Moving Head Light |
| Výrobníky hmly (hazery) | MDG theONE, Look Solutions Unique 2.1, Showtec Compact Hazer – typ je zadaný, chýba príkon, váha a DMX |

**Pulty na svetlá** (vyše 100 – MA Lighting, Avolites, ChamSys, ETC, Hog, Obsidian…) majú len typ; chýba počet
univerz, fadery a váha.

Pri asi 250 svetlách chýba **typ** (beam / wash / spot / PAR…) – Open Fixture Library ho nemá jednoznačne. Najviac pri
Eurolite (22), Generic (15), LiteGear (13), American DJ a Stairville (po 12), Cameo (11), Briteq a Lupo (po 10).
Typ sa dá doplniť priamo vo Vývojár → Databáza techniky (filter Svetlo + Neúplné).
