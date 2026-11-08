# Spoločná databáza techniky – čo chýba

Zoznam modelov, ku ktorým v spoločnej databáze techniky chýbajú údaje (alebo sú neúplné). Aktualizuje sa po každom
doplnení katalógov. Stačí poslať PDF (celý katalóg výrobcu alebo list ku konkrétnemu modelu) – údaje prepíšem.

**Naposledy aktualizované:** 8. 11. 2026, po verzii 8.16.

Všetky údaje sú zatiaľ **neoverené** – overujú sa vo Vývojár → Databáza techniky.

## Prehľad

| Druh | Modelov spolu | Stav |
|---|---:|---|
| Svetlá (vrátane výrobníkov hmly) | 692 | 36 bez údajov, ~140 bez typu svetla |
| Hliník | 406 | všetky s typom; 5 všeobecných záznamov bez dĺžky a váhy |
| Zvuk | ~390 | boxy z katalógov úplné; pulty, mikrofóny, bezdrôty, stageboxy a zosilňovače z 8.16 len so základnými údajmi |
| Pódium (Nivtec) | 49 | úplné |
| DJ technika | ~72 | len typ (player / mix / gramofón / kontrolér) |
| Video | ~80 | typ; kamery so snímačom; LED procesory s výstupmi; projektory s rozlíšením a lm |
| IT | 67 | len typ |
| Spotrebiče | 25 | typ; elektrické ohrievače s príkonom |
| Káble (DI boxy) | 19 | typ a aktívny / pasívny |
| Spotrebný materiál | 24 | len názov (batérie, gaffer páska, náplne) |

**Najviac by pomohli (podľa poradia):** d&b audiotechnik (aj zosilňovače ku boxom), listy k pultom (Yamaha,
Allen & Heath, DiGiCo – váha, karty), Shure a Sennheiser (frekvenčné pásma bezdrôtov a in-ear), listy k JBL SRX900
a VTX, Pioneer DJ / Denon DJ (váha, konektory).

## Aké údaje treba podľa druhu

- **Boxy, monitory, suby, line array:** výkon (RMS / program / peak), frekvenčný rozsah (−10 dB), citlivosť alebo
  max SPL, impedancia (pri pasívnych), vyžarovací uhol, meniče, váha, rozmery (V × Š × H), konektory.
- **Zosilňovače:** výkon pri 2 / 4 / 8 Ω na kanál a v bridge, analógový / DSP, váha.
- **Pulty:** počet kanálov, analógový / digitálny, karty (Dante, MADI…), váha.
- **Mikrofóny:** dynamický / kondenzátorový, frekvenčný rozsah, ktoré kapsule pasujú.
- **Bezdrôty a in-ear:** frekvenčné pásmo (napr. G51 470–534 MHz), prijímač, vysielače.
- **Hliník:** kód dielu, dĺžka, váha (tabuľka „straight segments“ v katalógu).
- **Svetlá:** typ (beam / wash / spot…), zdroj svetla, príkon, váha, DMX módy – najľahšie GDTF súbor z gdtf-share.com
  (vo formulári techniky „Nahrať GDTF súbor“).
- **Video:** výstupy, pixely na výstup, vstupy (procesory), rozlíšenie a svietivosť (projektory, TV).

## Zvuk – len základné údaje (8.16)

| Čo | Je zadané | Chýba |
|---|---|---|
| Pulty (Yamaha, Allen & Heath, DiGiCo, Midas, Behringer, Soundcraft) | digitálny / analógový, pri väčšine počet kanálov | DiGiCo, Allen & Heath Qu / CQ, Midas HD96, Yamaha DM3 a Soundcraft: počet kanálov; všade váha a karty |
| Mikrofóny (Shure, Sennheiser, AKG, Audix, Neumann, DPA, Audio-Technica, EV, Beyerdynamic, Røde) | káblový, dynamický / kondenzátorový | frekvenčný rozsah |
| Bezdrôty a in-ear (Shure, Sennheiser, Wisycom, Audio-Technica) | typ, prijímač | frekvenčné pásmo (podľa verzie, napr. G51), vysielače |
| Stageboxy (Yamaha Rio / Tio, Allen & Heath, Behringer, Midas, DiGiCo) | typ | počet vstupov / výstupov, protokol |
| Zosilňovače d&b, Powersoft, Lab.gruppen, QSC | digitálny, počet kanálov (D80 a Quattrocanali aj výkon) | výkon pri 2 / 4 / 8 Ω, váha |
| Procesory (dbx, Lake, XTA, Klark Teknik) | typ | – |
| Boxy d&b a dB Technologies, JBL PRX815W / SRX835P / SRX828SP, RCF ART 745-A | typ, aktívny / pasívny | výkon, frekvencie, SPL, uhol, váha, rozmery; pri d&b aj zosilňovače |
| Stojany K&M | typ | – |

## Zvuk – neúplné

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
| Shure BLX, GLX-D+, SLX-D, QLX-D, ULX-D | vysielače a ich modely sú len v popise systému; váha prijímačov |

## Hliník – bez váhy

Starší všeobecný záznam bez dĺžky dielu – nové diely s váhou už v databáze sú, tieto by stačilo doplniť:

- **Prolyte** H30V, H40V – katalóg Prolyte (tabuľka dielov)
- **Eurotruss** FD34 – katalóg Eurotruss
- Global Truss F34 a F44P (všeobecné záznamy) – diely s váhou z katalógu 2023 už sú, tieto sa dajú zmazať

## DJ, video, IT, spotrebiče a spotrebný materiál (8.16)

- **DJ technika** (Pioneer DJ, AlphaTheta, Allen & Heath Xone, Technics, Denon DJ, Rane, PLAYdifferently, Native
  Instruments, Reloop, Numark): len typ – chýba váha a konektory.
- **LED procesory Novastar**: výstupy a pixely na výstup sú zadané, **vstupy sú zatiaľ len „1 vstup“** – treba
  doplniť podľa listu (HDMI / DVI / SDI / DP).
- **Video prepínače a prevodníky** (Blackmagic ATEM, Roland V, Barco E2 / S3 / EventMaster): len typ.
- **Kamery**: snímač a HDMI výstup; chýba váha.
- **IT a spotrebiče**: len typ (pri elektrických ohrievačoch Master aj príkon).
- **Spotrebný materiál**: len názov.

## Svetlá

Vyše 650 svetiel je z Open Fixture Library (s DMX módmi). Úplne bez údajov je 36 – najrýchlejšie ich doplníte cez
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
| Pulty na svetlá | MA Lighting grandMA3 compact XT a light, Avolites Titan Mobile, ChamSys MagicQ MQ80 |

Pri asi 140 svetlách chýba **typ** (beam / wash / spot / PAR…) – Open Fixture Library ho nemá jednoznačne. Najviac
pri Eurolite (22), Generic (15), Stairville, American DJ a Cameo (po 11–12). Pri „Generic“ (16) chýba aj príkon.
