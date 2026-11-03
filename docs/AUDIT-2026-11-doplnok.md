# Doplňujúci právny audit – ochrana používateľov (verzia 7.12)

Doplnok k [AUDIT-2026-11.md](AUDIT-2026-11.md). Oblasti z prvého auditu sa neopakujú.
Stavy: **HOTOVÉ** · **VYŽADUJE OPRAVU** · **NEVZŤAHUJE SA NA PROJEKT** · **VYŽADUJE PRÁVNE OVERENIE**.

RigTrack je interný pracovný nástroj pre produkčné firmy: účet vzniká len z pozvánky admina firmy, nie je verejná
registrácia, platby, reklama ani verejne publikovaný obsah.

## 1. Vek používateľov – HOTOVÉ (s výhradou VYŽADUJE PRÁVNE OVERENIE)
- **Používa sa?** Registrácia z pozvánky; maloletí môžu byť napr. brigádnici (helperi), ktorých pozve firma.
- **Predpisy:** GDPR čl. 8 (súhlas dieťaťa pri službách informačnej spoločnosti ponúkaných *priamo dieťaťu* na základe
  súhlasu) a § 15 zákona č. 18/2018 Z. z. – v SR je hranica **16 rokov**. RigTrack nie je ponúkaný deťom a hlavný právny
  základ je zmluva / povinnosti zamestnávateľa (čl. 6 ods. 1 b), c)), nie súhlas. **COPPA** (USA, deti do 13 rokov,
  služby zamerané na deti v USA) sa **nevzťahuje**.
- **Opatrenie:** pri registrácii povinné potvrdenie „Mám aspoň 16 rokov a súhlasím s podmienkami“ (uloží sa k účtu
  s časom), v Podmienkach používania časť „Vek“ – mladšieho pracovníka môže firma pozvať len so súhlasom zákonného
  zástupcu (zodpovedá firma). Dátum narodenia je len dobrovoľný údaj v profile – nezbiera sa kvôli overeniu veku.
- **Výhrada:** potvrdenie je vyhlásenie, nie overenie (dá sa nepravdivo zaškrtnúť); pri pozvánkovom pracovnom nástroji
  je to primerané. Ak firma reálne zamestnáva osoby do 16 rokov, odporúčané nechať posúdiť pracovné a GDPR povinnosti.

## 2. Session replay a sledovanie správania – NEVZŤAHUJE SA NA PROJEKT
- Nepoužíva sa žiadny session replay, heatmapy, záznam kliknutí / kurzora ani behaviorálna analytika (overené v kóde
  a v CSP – skripty len z appky, spojenia len na Supabase a 4 služby z prvého auditu).
- Zachytávanie chýb (7.0) ukladá len text chyby, stránku, verziu a prehliadač – bez obsahu formulárov a hesiel.
- Tvrdenia o „odpočúvaní“ pri session replay pochádzajú zo žalôb podľa kalifornského zákona CIPA – v EÚ by išlo o GDPR /
  ePrivacy (súhlas); pre projekt bez takých nástrojov irelevantné.

## 3. E-maily a odhlásenie – NEVZŤAHUJE SA (marketing) / HOTOVÉ (upozornenia)
- **Marketingové e-maily / newsletter:** neodosielajú sa → `List-Unsubscribe` ani newsletterový systém sa nepridáva.
- **Odosiela sa:** potvrdenie účtu a obnova hesla (Supabase Auth – transakčné, nevyhnutné), e-mail o nahlásenej chybe
  vývojárovi a e-mail o novom evente adminom (servisné upozornenia).
- E-mail o novom evente sa dá vypnúť v Nastaveniach → Účet → E-mailové upozornenia.
- **Predpis:** zákon č. 452/2021 Z. z. o elektronických komunikáciách (nevyžiadaná komunikácia – priamy marketing len so
  súhlasom alebo pri existujúcom zákazníkovi s možnosťou odmietnutia) – pri servisných e-mailoch sa nevzťahuje.

## 4. Predplatné a opakované platby – NEVZŤAHUJE SA NA PROJEKT
- Žiadne platby, predplatné, skúšobné obdobia ani automatické obnovovanie. Podmienky to nespomínajú, nič sa nepridáva.
- (Pri budúcom spoplatnení by platili najmä smernica 2011/83/EÚ, zákon č. 108/2024 Z. z. o ochrane spotrebiteľa –
  pri B2B menej; kalifornský Automatic Renewal Law sa na SR nevzťahuje.)

## 5. Nahrávaný obsah, autorské práva, DMCA / DSA – HOTOVÉ (DSA), NEVZŤAHUJE SA (DMCA)
- **Používa sa?** Áno – fotky, dokumenty a texty nahrávajú používatelia; vidia ich len členovia firmy (nie verejne).
- **Predpisy:** autorský zákon č. 185/2015 Z. z.; **nariadenie (EÚ) 2022/2065 (DSA)** – RigTrack je službou „hostingu“
  (ukladá obsah na žiadosť používateľa) → mechanizmus oznamovania a konania (čl. 16) a kontaktné miesto (čl. 11, 12)
  platia aj pre mikropodniky; povinnosti online platforiem (zverejňovanie obsahu) sa nevzťahujú, obsah sa nešíri verejnosti.
- **Opatrenie:** v Podmienkach používania časť „Nahlásenie nezákonného obsahu alebo porušenia autorských práv“ – e-mail,
  čo uviesť, preverenie bez zbytočného odkladu, informovanie, odstránenie a evidencia oznámení; ten istý e-mail je kontaktné
  miesto podľa DSA.
- **DMCA** (USA) a registrácia DMCA agenta pri U.S. Copyright Office sú potrebné len na využitie amerického „safe harbor“ –
  projekt nepôsobí na trhu USA → **nevzťahuje sa**, žiadna registrácia ani poplatok sa nezavádza.

## 6. Overenie tvrdení o sankciách
| Tvrdenie | Skutočnosť |
|---|---|
| Pokuty za chýbajúce overovanie veku | V EÚ nie je všeobecná povinnosť overovať vek; pri porušení GDPR (napr. čl. 8) hrozia pokuty podľa čl. 83 GDPR podľa okolností. Konkrétne sumy pre COPPA platia v USA (FTC), nie v SR. |
| Zodpovednosť za Google Fonts | Rozsudok LG München (2022) – náhrada nemajetkovej ujmy za prenos IP adresy do USA pri načítaní fontu z Google; nemecký súd, nie precedens v SR. RigTrack Google Fonts nepoužíva. |
| Session replay = odpočúvanie | Žaloby podľa kalifornského CIPA; v EÚ je to otázka GDPR / ePrivacy. RigTrack session replay nepoužíva. |
| Sankcie za chýbajúce odhlásenie z e-mailov | V SR dozoruje nevyžiadanú komunikáciu podľa zákona č. 452/2021 Z. z.; RigTrack marketingové e-maily neposiela. |
| Automatické obnovovanie predplatného | Kalifornský ARL a pravidlá FTC sú americké; v SR spotrebiteľské právo. RigTrack predplatné nemá. |
| DMCA agent a poplatky | Registrácia agenta pri U.S. Copyright Office (s poplatkom) je dobrovoľná podmienka amerického safe harbor; pre projekt mimo USA irelevantné. |

Uvedené zhrnutia nie sú právne poradenstvo; pri ostrom komerčnom nasadení odporúčané overenie u právnika.
