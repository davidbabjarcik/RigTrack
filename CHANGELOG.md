# Čo je nové v RigTracku

Zmeny po verziách, najnovšie hore. Rovnaký zoznam (bez technických poznámok o databáze) je aj v appke
v **Nastavenia → O aplikácii → Čo je nové**.

## Čo je nové

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
