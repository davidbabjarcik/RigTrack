# What's new in RigTrack

English translation of `CHANGELOG.md`, shown in the app when the language is English. Versions without a translation
are shown in Slovak.

## What's new

### 9.6

- **DMX modes on the light detail**: a new “DMX modes and colours” section with mode switching and a clear channel
  table. Each channel has an icon for what it does (intensity, shutter, colour, position, gobo, prism, zoom, effects,
  speed, control), and colour channels (Red, Green, Blue…) show a dot in their colour.
- A channel can also have a default value – after a vertical bar, e.g. “Pan | 50 %” or “Shutter | Open”. While
  entering channels there is a table preview and a warning when the number of lines does not match the mode.
- **Light colours**: which colours the light mixes (R, G, B, W, A, UV, lime, CMY, CTO) and whether it has a colour
  wheel – how many colours and their names with the colour. The colour is filled in from the name (e.g. Dark blue,
  CTO, Congo blue), can be picked from a palette or added with one tap from a list of common colours. For lights
  without colours entered, the app guesses them from the channel names.
- A GDTF file also fills in the colour wheel with its colours, colour mixing and channel default values.
- In the event DMX patch, each light can expand its channel layout with the actual DMX addresses.

### 9.5

- **Software licences**: Equipment has a new “Software licences” button. Record which programs you have bought, the
  edition, number of installs, the account, purchase date, validity (or perpetual), price and which computer from your
  equipment they run on. Licences that are about to end or have ended are highlighted at the top.
- Only people who can edit equipment can see and change licence keys. Everyone else sees just the list of programs.
- **Certificates for people**: the person detail in Staff has a new Certificates section (e.g. work at height,
  electrical qualification) with the issuer, card number and validity. The team manager or the person can add them.
- Technical: migration 0172 (software licences and certificates).

### 9.4

- **Event profit**: a new page in the menu shows income without VAT, costs and profit of every event for a year or
  month, with the margin and clients ranked by profit. Only people who manage company money can see it.
- On the event (Travel and money tab) there is a **profit breakdown**: income (from recorded payments, otherwise from
  the accepted or sent quote) minus crew rewards, travel (km × rate), expenses, rentals from partners, subcontracts and
  equipment wear. Extra costs can be added, including the company they come from.
- Calculation settings: cost per 1 km of a vehicle and how many days a year equipment is at events (for wear from the
  purchase price).
- Technical: migration 0171 (event costs and profit settings).

### 9.3

- **Event detail in tabs**: Overview, Equipment, Crew, Travel and money, and Documents – you always see one part
  instead of a long page with every section.
- **Travel: more cars on one day** – the "Another car on this day" button. Each car has a label (e.g. van or the
  driver's name), the number of trips and its own "where we slept" – for example one car went home and the other stayed.
- A clearer calendar: the main way is "Calendar on your phone" (a subscription that updates itself). The one-time .ics
  download is a small link in the same section, and the Google Calendar button on the event detail is gone so the event
  does not show up twice.
- Technical: migration 0170 (more travel records on one day).

### 9.2

- **Day-by-day programme right when adding an event**: after entering the dates from–to you choose for each day what
  happens (build, event, teardown, travel, day off), times from–to and a note. The app suggests build on the first day,
  then the event and teardown on the last day. Who goes on which day is set with the crew.
- The event detail no longer shows “Times (first day)” at the top – the times are in the day-by-day programme (events
  without a programme keep them).
- On a computer **Place and power sit next to Organiser and companies** (a narrower and a wider column), on mobile
  they are below each other.
- A person's date of birth is no longer saved with a nonsense year (e.g. 19999 from a typo).

### 9.1.2

- The demo company no longer counts as another company: a person from the demo sample events is no longer “in the crew
  of another company” and equipment is not “on another company's event”.
- Companies and contacts are aligned: cards stack without gaps, company details are under the name and each person has
  the name and number on the left and the buttons on the right in one row (on mobile “Add to contacts” is just an icon).

### 9.1.1

- Calendar on your phone: the “Add to Google Calendar” button opens the subscription prompt in a form Google accepts.
- The link shows which company it is for (with several companies it is made for the one currently selected).
- A note that Google Calendar picks up changes more slowly (up to once a day); iPhone and TickTick within about an hour.

### 9.1

- **Calendar on your phone** (Calendar → Calendar on your phone): create a link and add it to Google or Apple
  Calendar, Outlook or TickTick (Notion Calendar via Google). Events where you are in the crew – or all company
  events – appear there on their own and a changed date shows up on your phone too. You can cancel the link or
  create a new one at any time.

### 9.0

- **Power by places**: in the event detail you split the equipment by places (roof, front and rear truss, stage
  lights, front light, main PA, monitors, band…). For each place the app balances the load over the phases and
  recommends a feed – minimum and optimal (with 20 % reserve), single and three phase – and Socapex circuits for lights.
- **External dimmer**: for a light without DMX (halogen fresnel, PAR, blinder) tick “Dimmed by an external dimmer”.
  The event power section then recommends a 230 V or 400 V dimmer, the number of channels and its feed.
- **Generators**: add generators to an event – your own or rented from a company in Contacts. The app works out how
  many kVA you need (minimum and with reserve) and whether the added generators are enough.
- **Availability check when planning**: when you add more pieces to an event than are free in that term, the app
  shows how many are missing, where the equipment is (another event, a loan, service) and which linked companies have it.
- **Bulk move by scanning** (Cases → Bulk move): scan several cases and pieces in a row and with one tap store them
  in a warehouse spot, add them to an event or send them to service. Scanning a spot label sets the destination.
- The app loads faster on mobile the first time.

### 8.19

- **What's new in English**: with the app in English, all versions of the changes are in English (with English dates).
- **Legal pages in English**: Privacy, Cookies and storage and Terms of use have an English version (if they differ,
  the Slovak version applies).

### 8.18.1

- In Developer → Catalogue suggestions and in the Equipment database, a model's technical data is separated by dots
  ("Amplifier · 2 Ω 3500 W · …") – before, it ran together into one word.

### 8.18

- **"The data from the equipment database is correct in my opinion"**: for equipment with a database model that is not
  verified yet, you can tick that the data is right. The developer sees it at the top of the Equipment database and
  verifies it with one click.
- **Changed data goes for review**: when you change or add technical data of a database model, the change is sent to
  the developer after saving – they see the original and the new value and accept the change into the database for
  everyone or reject it.
- **What to verify first**: the developer sees for each model how many companies and pieces use it and can sort by
  "Most used in companies".
- **The equipment list remembers its sorting**, even after closing the app and on other devices.

### 8.17.2

- **Lighting consoles in the equipment database**: MA Lighting (grandMA2 / grandMA3), Avolites, ChamSys, ETC, High End
  Systems (Hog), Obsidian (ONYX), Martin, Zero 88, LightShark, LSC, Strand, Jands, ADJ and ENTTEC, plus lighting software.

### 8.17.1

- **More models in the equipment database**: amplifiers (Powersoft, Lab.gruppen, Crown, Yamaha, QSC, d&b, L-Acoustics,
  MC² Audio, Linea Research, Electro-Voice, Behringer) with channel count and often power, DI and reamp boxes (Radial,
  BSS, Klark Teknik, Palmer, Behringer, Whirlwind, Countryman, ART), K&M and Gravity stands, NovaStar (LED processors,
  cards, fibre converters) and Blackmagic Design (ATEM switchers, converters, Videohub, HyperDeck).
- **IT**: all iPads and MacBooks, best-selling phones, tablets and laptops.

### 8.17

- **Linking a company in contacts without a company ID**: with "They already have a company in RigTrack" you can enter
  their link code (they find it in Settings → Linked companies). Search by name now ignores diacritics, dots and legal
  forms like "s.r.o." or "a.s." – but the whole name still has to match.
- **DJ equipment in the equipment database**: Pioneer DJ (CDJ, XDJ, DJM, DDJ, PLX, RMX, HDJ headphones, monitors and
  XPRS PA speakers), AlphaTheta, Denon DJ (SC, Prime, MC, X and older DN) and Technics (SL-1200 / SL-1210 including
  limited editions, SH mixers).
- **Digital consoles with data**: DiGiCo, Allen & Heath, Midas, Yamaha and Soundcraft – channel count, weight, faders,
  slots and expansion cards (DMI, MY, CM-1, DN32).
- **Microphones with frequency range** (Shure, Sennheiser, AKG, Audix, Neumann, DPA, Audio-Technica, Electro-Voice,
  Beyerdynamic, Røde), **wireless and in-ear** with receiver + transmitters (Shure, Sennheiser, Wisycom,
  Audio-Technica), **stageboxes** with inputs / outputs and protocol, and **processors** from dbx, Lake, XTA and Klark
  Teknik.
- **Technics Hi-Fi** (amplifiers, receivers, CD, decks, tuners, speakers, headphones) and **cartridges** (Ortofon,
  Shure, Audio-Technica, JICO, Stanton and others).

### 8.16.1

- **"Unknown" brand in the equipment database** for unbranded equipment: common beams (7R, 9R…), LED spots, washes, pars,
  bars, blinders, strobes, fog machines, spark machines and other effects, speakers, subs, monitors, amplifiers,
  microphones, wireless, stageboxes, stands, truss, DI boxes, DJ and video equipment. Pick it as the manufacturer and at
  least the type is filled in.

### 8.16

- **Brand and model from the database for every kind of equipment**: besides sound, lights, truss and stage also for DJ
  equipment, video, IT, appliances, cables (DI boxes), consumables and "Other".
- **Over 550 new models in the equipment database**: digital and analogue consoles (with channel count), microphones
  (dynamic / condenser), wireless and in-ear, stageboxes, amplifiers, processors, stands, DI boxes, DJ equipment
  (players, mixers, turntables, controllers), cameras, gimbals, tripods, lenses, video switchers, LED processors,
  projectors, phones, tablets, laptops, network devices, coffee machines, heaters and batteries, gaffer tape or fog
  fluids.
- These models have basic data for now (mainly the type) – the rest is added gradually.

### 8.15

- **L-Acoustics in the shared equipment database**: X, S (Syva, Soka), A, K (Kiva II, Kara II, K3, K2, K1), L2 / L2D
  and subs (SB, KS) with frequencies, max SPL, coverage, drivers, weight and dimensions, and the LA12X, LA7.16 (i), LA4X,
  LA2Xi and LA1.16i amplifiers.
- **Which amplifiers drive a speaker**: for an L-Acoustics speaker you can see (when picking the model and in the
  equipment detail) that it runs only on their amplifiers, which ones, and how many speakers one output and the whole
  amplifier can handle (e.g. K2: LA12X 3 / 3, LA7.16 1 / 4, LA4X 1 / 1).
- **Reminder on events and loans**: when they include L-Acoustics speakers and their amplifier is missing – or there
  are too few for the number of speakers – a warning appears. It works on its own, no rule needed.
- With L-Acoustics, "Active" means bi-amp (2 amplifier channels), not a built-in amplifier – so they are stored as
  passive with bi-amp.

### 8.14

- **The equipment database loads all models** – before, at most 1,000 were loaded, so some brands and models were
  missing when picking equipment.
- **Editing a model (Developer)**: all data belonging to the kind, even empty, in a grid side by side; types, sources
  and similar are picked from a list; DMX modes row by row (name, channel count, channel layout) instead of raw text.
  The Edit button is the same size as Verify, "Verify shown" is gone.
- In the Developer window, the Equipment database section only has suggestions from companies and a link to the whole
  database.
- **After a new version the page reloads itself** when the old open version cannot find another page's file (until
  now the error "Something went wrong" appeared).

### 8.13

- **Developer → Whole equipment database** (a separate page): filters by kind, brand, verification and whether the
  model has technical data, search and pages of 100 models. For each model you can edit the kind, brand, model and
  individual technical data (add, change, remove), the "Data is verified" flag, and delete it. "Verify shown" verifies
  everything the filters show at once.
- Each model shows **what is missing** (by kind – e.g. for a speaker the power, frequencies, weight, dimensions), with
  an "Incomplete / Complete" filter.
- **Thomann code** (article number) for a model – it links straight to the product at Thomann.
- The page is for the developer only: anyone the app does not allow is redirected away, even with a typed address.

### 8.12

- **RCF in the shared equipment database** from the Touring 2026 and Portable catalogues: HDL line arrays (50-A 4K,
  30-A, 28-A) and their subs, KX, NXL / NXW, NX (also NX-SMA monitors), ART 9 and ART MK5, EVOX, SUB 9000 / 8000 / AX /
  MK3 subs and DX processors – type, power, frequencies, max SPL, coverage, drivers, crossover, weight and dimensions.

### 8.11

- **Verified / unverified data in the shared equipment database**: when picking a model you can see whether the
  developer verified the data ("data is verified") or it needs checking. Everything taken from manufacturers'
  catalogues and the Open Fixture Library is unverified for now.
- **Developer → Equipment database**: filter Unverified / Verified / All, each model with its data and a Verify
  button; "Verify shown" verifies everything the search shows (e.g. a whole brand). An approved suggestion from a
  company is verified straight away.
- **Global Truss from the 2023 catalogue** (Germany): straight sections F14 to F54 including black and P versions with
  code (e.g. F34200), length and weight. Sections from the US catalogue (other codes) were removed.
- **Global Truss couplers**: half couplers, swivel couplers and selflock hooks with tube diameter and load – under
  lights, type Clamps.
- **JBL EON700, EON ONE and PRX900**: type, power, drivers, max SPL, frequencies and coverage from the 2026 catalogue.

### 8.10.1

- Fog machines (hazers) are under lights in the shared equipment database, not under appliances – under light → type
  Hazer you find them among the brands.

### 8.10

- **Global Truss and Duratruss in the equipment database**: straight sections F14, F23, F24, F31, F32, F33, F34, DT34P
  and DT44P with code, length and weight (e.g. Global Truss → "F34 – 2 m (SQ-4112)").
- **JBL 2026**: VRX900 (also the active VRX932LAP and VRX918SP), VTX A, V, F and M, VTX subs (B15, B18, B28, S25,
  S28), SRX900 and PRX400 – type, active / passive, power, drivers, frequencies, sensitivity, impedance and coverage
  from the catalogue.
- **Shure wireless systems**: BLX, GLX-D+, SLX-D, QLX-D and ULX-D – receiver and frequency band.

### 8.9

- **TAF truss in the shared equipment database**: over 300 straight sections (FT, HT, PT, TT, TC, FTR, GS…) with type
  (1–4-point, ground support), length and weight from the manufacturer's catalogue – pick e.g. TAF → FT34-200 and it
  fills in by itself.
- **Nivtec stage in the equipment database**: decks, top steps, legs 20–200 cm (fixed, adjustable, steel), stairs and
  railings with size and weight. For stage you now also pick a brand and model.
- For truss, the section length is also filled in from the database.

### 8.8

- **Over 650 lights in the shared equipment database** (Open Fixture Library, 138 manufacturers – Robe, Chauvet, ADJ,
  Cameo, Martin, Clay Paky and more): pick the brand and model of a light and the type, light source, power, weight
  and DMX modes with channel layout are filled in. Data already in the database stayed.
- About the app shows the source of the lighting data.

### 8.7

- **Upload a GDTF file for a light**: the light's file from gdtf-share.com (the same as for grandMA or Vectorworks)
  fills in the manufacturer, model, all DMX modes with channel layout, power, weight and light source. The file is read
  only in your browser and sent nowhere; a model not in the database goes for verification to the shared equipment
  database after saving.

### 8.6.2

- **Shared equipment database – data from manufacturer spec sheets**: JBL VRX932LA-1, VRX928LA, VRX915M, SRX712M and
  VT4880 (power, SPL, sensitivity, impedance, frequencies, coverage, crossover, drivers, connectors, weight and
  dimensions) and Crown I-Tech 4000 / 6000 / 8000 amplifiers. When you pick the model, the data fills in by itself.
- For amplifiers, the power at 2, 4 and 8 Ω and in bridge is also filled in from the database.

### 8.6.1

- **A new version is offered on every page** – also at sign-in, company selection, the Guide or printing (until now
  only inside a company). The window is above everything else, nothing covers it, and it does not get into prints.

### 8.6

- **English where it was missing**: Overview (statistics), module descriptions, Office, save messages, weather, stage
  and more – over 400 extra texts. Whatever the dictionary knows is translated into English everywhere it appears.
- **The Update button** for a new version worked badly when two versions came out right after each other – now it
  always switches (and if not, it reloads the page by itself).
- **Database equipment without data**: when a model from the shared database has no technical data yet (or only a
  few), the top shows that its data is not known yet and has to be filled in by hand.

### 8.5

- **The whole app in English**: after switching to EN all screens are in English – equipment, cases, events,
  warehouse, loans, orders, vehicles, service, networks, calculators, statistics, settings, Guide and tips, and
  messages. The English dictionary is downloaded only for English, it does not slow Slovak down. Print sheets, labels,
  posters and price offers for clients stay in Slovak.
- **Equipment: manufacturer and model right at the top** below the kind and name – a model from the shared database
  fills in the data below before you get to it.

### 8.4

- **Language SK / EN** (part 1): a switch in Settings → Account, on the home page and at sign-in; the language is saved
  to the account (the same on every device). In English so far: the menu, Overview, Search everywhere, scanning,
  sign-in, home page and footer; other parts of the app follow gradually and stay in Slovak until then. Print sheets
  and labels are always in Slovak.
- A new browser without a chosen language: Slovak for a Slovak and Czech browser, otherwise English.

### 8.3

- **Shared equipment database**: when adding equipment (sound, lights, video, DJ, truss, IT, appliances) first the
  brand (e.g. JBL), then its model – a model from the database fills in the technical data. At the end of the list
  "Other brand / Other model": type your own, the equipment is saved to the company and the model goes as a suggestion
  to the database. About 100 well-known brands and models to start with.
- **Developer → Equipment database – suggestions for verification**: the same model from several companies is one row
  with the number of companies; approve (also with corrected brand, model and kind) or reject with a reason; search and
  delete in the catalogue.
- Only the model's technical data goes to the database – never serial numbers, prices, notes or anything about the
  company.

### 8.2

- **RigTrack home page** for everyone: what the app can do, examples from the demo company and how to start, with Sign
  in and I have an invitation buttons (opens account creation directly). Without sign-in it shows on the main address,
  otherwise on /home; the "Home" link is in the footer.

### 8.1

- **Inventory poster – a small detail with equipment**: in small grey text next to the count, speaker active /
  passive, wireless system and in-ear frequency (e.g. 470–790 MHz), and light LED, discharge, halogen or laser.
- **Inventory poster – whose equipment**: tick whether the poster should also include employees' equipment and
  equipment of shared (linked) companies; a shared company's equipment has its own tile with the company name.

### 8.0

- **Search everywhere** at the top of the Overview: one field across equipment, cases, events, companies, contacts,
  tasks, notes and warehouse places. Ignores diacritics, more words narrow the results, "#7" finds piece number 7 and
  which case it is in. Enter opens the first result.
- **Scan QR** at the top of the Overview: the camera straight away; the label of equipment, a case or a place opens its
  detail.
- **Guide and tips**: a new page with short how-tos (warehouse, case sets, accessories, return after an event,
  printing) with search – link in the footer and in Settings → About.

### 7.19.1

- Accessories in a set's contents: changes are saved only with the **Save** button (or Cancel). The order is right in
  the list – accessories at the top numbered 1., 2., 3. with arrows, the rest of the contents below.

### 7.19

- **Accessories for a whole set of cases at once**: on the set page (e.g. K10 Case #1–#5) the "Accessories in
  contents" button – tick what is an accessory on the contents sheet (safety cable, hook, omega…) and it applies to all
  cases of the set at once.
- **Order of accessories** on the contents sheet can be changed with arrows (on the set page and on the case sheet);
  it applies to the sheets of all cases.
- **Piece numbers on the contents sheet**: for equipment tracked by piece (e.g. lights), below the name it shows which
  pieces belong in the case – e.g. "#3, #4".

### 7.18.1

- Equipment split into cases: the parts are sorted by case (#1, #2, #3…), the ones outside a case at the end.

### 7.18

- **Put into several cases at once**: for equipment counted in pieces (e.g. hooks, clamps), on the page with all parts
  the "Put into several cases" button – tick the cases, enter the count for each, and the pieces outside cases are
  split with one click. It suggests cases from the set where the equipment is not yet, with the same count as in the
  others; where it already is, the pieces are added to it.

### 7.17

- **Return after an event** in the event detail: what was loaded on departure and not ticked off on return. For each
  item **Lost** or **Damaged** – recorded straight into Damage and injuries (with the event and a note). The **Close
  return** button saves who closed it and when, and what was missing; the event then disappears from "Still out" on
  the Overview. The event crew or anyone who edits events can close it; only someone who edits events can reopen it.
- Overview: clicking an event in "Still out and returned" opens the return in the event detail directly.
- Damage and injuries: a new kind **Lost**.

### 7.16

- **Truss lies in a Place together with cases**: the separate "Truss" kind is gone, there is only Place. A place has a
  "Truss is in this place" button and then "Open truss" with the truss stacks; cases are stored on it as before.
  Existing places with truss became a Place by themselves.
- **Place dimensions in metres**: in Edit plan for a place, room, wall and pillar you enter length and width in m.
- **Store a case on a rack without choosing a shelf**: the "Store here" button is no longer grey – without a chosen
  shelf the case goes to the first shelf with room (a case without dimensions counts as 60 cm). Also when scanning.
- **Inventory poster on A4 and A5**, portrait and landscape (also in the print queue).

### 7.15

- **Faster database**: access rules check the signed-in user once per query instead of for every row, reading checks
  one rule instead of two, and new indexes for table links – lists of equipment, cases and events load faster,
  especially as data grows. Permissions do not change.
- Security tidy-up: internal database functions cannot be called from outside, the extension for sending push
  notifications is in its own schema.
- Development: tests run about 3.5× faster, the site build uses a fixed system version.

### 7.14

- **Check that you are not a robot** (Cloudflare Turnstile) at sign-in, registration and password reset – protects
  accounts also against password guessing outside the app. Usually it asks for nothing, just briefly checks the
  browser.
- The privacy and cookies policies now include Cloudflare Turnstile.

### 7.13

- **Demo company extended**: warehouse plan (racks with shelves and pallets, pallets on the floor, truss, office, gate,
  window, pillar), cases stored on a rack and a pallet, truss in stacks, activities before / at / after an event and a
  wireless system with transmitters. Existing demo companies were extended by themselves.
- README: new screenshots (warehouse plan, rack from the front, truss, inventory poster, IP table), old ones removed.

### 7.12

- **Registration**: confirmation "I am at least 16 years old and agree to the terms of use" (with links to the terms and
  privacy policy).
- **Terms of use**: an Age section and the procedure for reporting illegal content or copyright infringement.
- Additional legal audit (age, tracking, e-mails, subscription, copyright) – `docs/AUDIT-2026-11-doplnok.md`.

### 7.11

- **Custom warehouse colours** (Settings → Warehouse → Colours in plan): rack, place, truss, room, door, window, pillar
  and wall; "Default" restores the original colour.
- **Pallet type colour**: each pallet type has its own colour in the plan (otherwise wooden brown, plastic black).

### 7.10.1

- **Case set**: QR labels, Contents and Labels of all; the "to print" buttons are only on the print page. "Add another to
  the set" is a grey row below the last case. Back from printing returns to the set.
- **Print everything at once**: for contents, choose A4 / A5 and portrait / landscape; contents and labels can be added
  to the print queue (contents with the chosen format).
- From Print → "Open and print" (contents, case label, poster, IP table), the Back button returns you to Print.

### 7.10

- **Networks – nice print of the IP table and MAC addresses**: header with company, network and count, a clear table
  (duplicate IPs in red), generation date; A4 or A5, portrait or landscape; Print, PDF, PNG and to the print queue
  (with format).

### 7.9

- **The print queue remembers the format**: case contents and the poster are added with the paper and orientation you
  currently have set (e.g. A5 landscape); the queue shows it and printing from the queue uses it (also bulk, if they
  have the same format).
- The app no longer shows the label printer manufacturer's name – just "Labels" everywhere.

### 7.8.1

- Case set (e.g. 8× Beam 7R Case): **Contents of all** and **Labels of all** at once (one print / PDF), and both to the
  print queue with one click.

### 7.8

- **Generation date** on every case contents sheet, case label and inventory poster (in PDF, PNG and when printing).
- Bulk printing of labels and contents without the browser's header and footer (date, page address, page number).

### 7.7.3

- **"Network (IP / MAC)" tape label**: IP address with prefix (e.g. 2.1.0.1/8), MAC and name. From Networks → IP table
  this label opens directly (before, a DMX address was offered by mistake).

### 7.7.2

- **Without a QR label** clearer and without mistakes: a checkbox for each item, "select all" per column, search; "To
  print" and "Already labelled" work only with the selected (labelled is confirmed once more). Equipment shows which
  case it is in; sorted naturally (#1, #2 … #10).

### 7.7.1

- Note → tasks: tasks get a number by the order of lines (1., 2., 3. …) and are sorted that way in Tasks (2 before 10
  too).

### 7.7

- **Wireless system – suggested name and model**: from the receiver, transmitters and capsules the app suggests a name
  (e.g. "Maker RX – 2× transmitter + capsule, bodypack") and a model; clicking the suggestion uses it, otherwise nothing
  changes.
- The equipment detail has separate **Receiver** and **Transmitters** rows (next to Capsules).

### 7.6

- **Networks – printing**: the IP table and MAC addresses can be printed (with a title, company, network and date; what
  is filtered gets printed).
- **Label in the IP table**: a label icon for equipment – tape with IP / MAC; "Tape labels" for all filtered equipment
  at once.
- **Wi-Fi QR codes for printing** (Networks → Network QR codes for printing): A4, choice of networks, optional password
  below the code.

### 7.5.3

- Fix: in Print → Without a QR label, the lists of cases and equipment showed as dots.

### 7.5.2

- Privacy and Terms of use now include the operator and a contact for personal data requests.

### 7.5.1

- Activities: an **Edit** button (pencil) – rename with a Save button and who / which roles the activity belongs to;
  Close.

### 7.5

- **Printing patch lists**: patch list templates (sound and DMX) can be printed or saved to PDF (printer icon by the
  template). An event's patch list and DMX patch can be added to the print queue (Print → Event patch lists).

### 7.4

- **Task kanban**: you can scroll sideways by dragging with the mouse also on an empty column or gap (cards move as
  before).

### 7.3

- **Note → tasks** (like in TickTick): turn the lines of a long note into tasks with one click – pick the lines, the
  category is prefilled from the heading, the people from the note. Converted lines disappear from the note (an empty
  one can be deleted).
- A note has an **Edit** button (no need to click the text).

### 7.2

- **Who an activity belongs to**: in Settings → Reminders and limits, choose people or roles for each activity (e.g.
  "Photos for social media" → a specific person, "Cabling check" → warehouse staff). On an event they are offered with
  one click.

### 7.1.1

- Privacy, Cookies and Terms of use are shown wide on a PC (not narrow like on mobile).

### 7.1

- **Wireless system – transmitters as a list**: "Add transmitter" – handheld and bodypack, each with a model and count;
  a system can also be just a receiver without a transmitter. The previous single transmitter was moved into the list.

### 7.0

- **Sign-in protection**: after 5 failed attempts, signing in is locked for 5 minutes (handled by the server, the
  countdown continues after reloading the page or in a new tab). It also protects against trying many accounts from
  one network.
- **Privacy, Cookies, Terms of use**: new public pages (links in the footer).
- **Consent to browser storage**: RigTrack uses no cookies, analytics or advertising; your display settings (theme,
  filters, layout) are stored only with consent. Change it in the footer under "Storage settings".
- **My data** (Settings → Account): download all your personal data and delete the account.
- Security: checks of links entered by users, a stricter Content-Security-Policy, security headers on the server. The
  audit report is in `docs/AUDIT-2026-11.md`.

### 6.12.2

- **My responsibilities** on the Overview: clicking a single kind of equipment (e.g. only Beam 7R) opens the equipment
  searched by name, otherwise Checks; without the responsibility name and without repeating the same names.
- Operating hours you have in "My responsibilities" are no longer repeated in the notifications at the top.
- Permissions: the Helper column is before "Read only".

### 6.12.1

- **QR labels** in the app's colours; labels are on white "paper" the width of A4, so the size on screen matches the
  print.
- QR labels of warehouse places without walls, windows, doors, pillars and rooms.
- From Print → "Print on A4", the Back button returns you to Print, not to the equipment.
- **Without a QR label**: without cables and consumables; cases and equipment side by side.
- The "QR to print" / "In print" buttons are as tall as the others.

### 6.12

- **Edit plan → Add**: at the top Rack, Place, Pallet and separately Building (room, door, window, pillar, wall). For a
  place you choose what it is for – cases and other things, or truss.
- Whatever is selected can be **drawn by dragging** in the plan (a rack of the chosen type, a pallet, a place, a
  window…), or added to the middle with a button.
- **Doors and windows** have a fixed thickness – they can only be stretched along the wall.
- A selected place no longer has Kind or Levels (added at the top; the rack's shelves are in the bays).

### 6.11

- **Activities before, during and after an event**: each activity has when it is done – before the event (loading),
  at the event, or after the event (unloading, checking and storing truss, cabling check). In Settings and on the event
  they are grouped that way; existing ones were set by name and can be changed.

### 6.10

- **Wireless system** (e.g. Wisycom MRK960 + MTH410): besides frequency and capsules also the **receiver model**,
  **transmitter** (handheld / bodypack / both) and **transmitter model**. Shown in the detail and in the equipment list.
- The equipment detail shows the **capsules** that fit the microphone.

### 6.9.1

- Inventory poster: all buttons (print queue, Print, PDF, PNG) in the same colour.
- QR labels: "QR to print" is readable on the white page also in the dark theme.
- Tape labels opened from the QR labels page return to the QR labels with the Back button, not to the equipment.

### 6.9

- **Settings → Reminders and limits**: event reminders, activities, check levels and hour limits and inspections are on
  one tab.
- **Responsible persons** no longer have their own "read hours / check case every … days" – when to remind is set by
  Check levels (hour level for equipment, check level for cases).

### 6.8

- **Edit plan → Add**: one place to choose what to add – a rack (by type), a pallet (by type), a place / zone, truss,
  a room, door, window, pillar or wall. It is added to the middle and you move it by dragging.
- **Doors and windows on the warehouse perimeter**: added to a wall and when moved to another warehouse wall they snap
  to it.
- **Room** (office, workshop…): an outline with a name in the plan, not clickable – like a pillar, wall, door and
  window.
- **Truss as a place in the plan**: clicking it opens the truss stacks (the Truss button at the top is gone).
- **Pallet types** in Settings → Warehouse (default EUR 120 × 80 wooden and plastic): a pallet is added by type; wooden
  is brown in the plan, plastic black.
- "Warehouse settings" are only in Edit plan (with the permission to manage the warehouse).
- Reminders to responsible persons (read hours, check a case) follow the Check levels.

### 6.7

- **Inventory poster** reworked: A4 **portrait** or landscape, black and grey on white paper (no blue). It is drawn as
  an image, so the preview always fits the screen and print, **PDF** and **PNG** look the same. A lot of equipment
  continues on the next page.
- The poster can be added to the **print queue** (Print → Inventory posters).
- Lights on the poster are split into moving, static, effects, machines and accessories; sound, video, DJ, IT and
  appliances by type, the rest by category.

### 6.6.2

- Fix: picking from the browser's autocomplete (e.g. a saved text in a field) made the app report an error – it was
  caught by the error reporting in Developer.

### 6.6.1

- The inventory poster always has a white background (for printing on white paper); a light logo is recoloured black
  on it.

### 6.6

- **Truss in the warehouse** (Warehouse → Truss): a place for trusses as a grid seen from above – on each cell a stack
  of sections standing upright. From above you see the stacks in the section's colour with the count, from the front
  the sections on top of each other (colour by length, back rows paler) with the height in metres. Clicking a cell
  shows the stack: add sections on top (several at once too), order up / down, take out, move the whole stack. The
  truss list shows how many pieces are stored out of how many. The number of columns, rows and the cell size can be
  set (manage warehouse).

### 6.5

- **Inventory poster** (Equipment → Inventory poster): one kind of equipment on A4 landscape – a large piece count,
  size, name and photo. Stage is split into decks and legs / railings / stairs, truss into straight sections (separately
  by series), corners / T / crosses and bases. The same equipment split into several cases is counted together, retired
  is not counted. Title, subtitle, notes at the bottom, dark or light look and which parts to show; print or PDF.

### 6.4

- **Pallets on the floor** in Warehouse → Edit plan: "Add pallet" with a size (EUR 120 × 80, industrial 120 × 100, half
  80 × 60, quarter 60 × 40 or custom) and material (wooden / plastic). It is added to the middle, then you move it by
  dragging and rotate it by 90°. For a selected pallet you can change the size and material.

### 6.3

- **Cases on pallets**: in the front view cases stand on pallets, not next to them. Without a choice they stack by
  themselves – onto the first pallet with room, and when a row is full, on top of each other (if the shelf height
  allows). What does not fit goes next to the pallets or lights up red.
- **Clicking a pallet** selects it: you see what is on it and store a case straight onto it. For each case on a shelf
  you can choose the pallet by hand or leave it on "auto".
- **Case dimensions right in the warehouse** (ruler icon): width, depth and height – without them the app does not know
  how much space the case takes.

### 6.2.1

- Updated libraries (React, React Router, Supabase, Vite, icons, PDF and Excel reading) – bug fixes, no changes in
  features.

### 6.2

- **App errors** for the developer: when a page crashes for someone or an unhandled error occurs, the app saves it by
  itself – who, on which page, in which version and how many times. The developer sees them at company selection in
  Developer → App errors, grouped, and can mark them as resolved.

### 6.1

- **Rack types** in Settings → Warehouse: the racks you use – name, depth, bays with width, shelves with height and
  pallets. The "Place racks in the warehouse" button opens plan editing directly.
- **Plan editing**: "Add rack of type…" adds it to the middle of the warehouse, then you move it by dragging. A selected
  place can be **rotated by 90°** and a rack already drawn can be set by type.
- **Pallets on a shelf**: spread out, tight to the left or tight to the right – the free space stays at one end. A shelf
  without pallets = 0 pallets.
- **Front view next to the panel**: on a wide screen the rack is on the left and the shelf (what is on it, store a
  case) or bay editing on the right.
- Pillars, walls, doors and windows cannot be clicked in the floor plan (they are edited in Edit plan).
- QR labels of warehouse places can be added to the print queue.

### 6.0.1

- The rack from the front as a technical drawing: thin uprights and beams, dimensions of shelf heights and bay widths,
  small text the same size for every rack, colours by light / dark theme.
- Pillars, walls, doors and windows no longer have "Store a case here".

### 6.0

- **Settings → Warehouse**: warehouse dimensions and all racks in one place – for each rack the bays (width), shelves
  (height of each separately), pallets and depth. The rack length in the plan is set from the bays by itself. The
  Warehouse page has a "Warehouse settings" button.
- **New permission "Manage warehouse"** (dimensions, racks, shelves, pallets) – can be given to a role, a group or a
  single person. Until now it was under "Manage categories"; whoever had an exception there has it for the warehouse
  too.

### 5.19

- **Rack from the front**: clicking a rack in the floor plan switches to the front view – uprights, beams, shelves,
  pallets and cases as boxes by their dimensions. Each shelf shows its height and how many cm are left free; what does
  not fit in height is red.
- **Rack bays**: a rack consists of bays (e.g. 267 cm) and each bay has its own shelves – each a different height, 3 in
  some places, 4 in others. For a shelf you can enter the number of pallets; the app shows how many euro pallets fit
  (267 cm = 3 pallets + 27 cm). Set with the "Edit bays and shelves" button (copy a bay with one click).
- A case is stored on a specific shelf of a specific bay (by clicking the shelf, choosing or scanning); in the floor
  plan the rack's bays are shown as dividing uprights.

### 5.18

- **Print everything at once**: one button in the print queue for all labels and case contents – labels two per A4,
  contents sheets by your sheet choices (A4/A5, portrait/landscape). Print or download as one PDF.
- **Without a QR label**: the print queue shows equipment and cases that do not have a printed QR yet – add them to
  printing with one click, or mark them as already labelled. Printed ones are remembered on "Printed – clear".

### 5.17

- **A returned case needs counting**: when a case comes back from an event (scanned or ticked off in the pack list –
  Return), the app reminds you to count and check the contents (e.g. a cable case). The case page shows a warning and
  **Checks** has a "Returned from an event – count the contents" section until someone clicks Checked.
- **Still out**: in Checks and on the Overview (new block "Still out and returned") is what was loaded for events that
  have already ended but not returned – with a link straight to the pack list.

### 5.16

- **Hour limits**: e.g. Lamp 1,500 h or service every 500 operating hours. Warns at the set % (default 90 %). After a
  replacement or service, the counter reading is recorded and the limit counts again (also works with a reset counter).
- **Inspections**: electrical inspection of cables, appliances or any regular check – interval in months and how many
  days ahead to warn. An inspection is recorded per piece or for all at once, with the result passed / failed.
- Everything is set in **Settings → Limits and inspections** (one-click presets) – for kinds of equipment, categories or
  selected equipment. Optionally a task is created too.
- The status is with the equipment (Limits and inspections section, also in the group overview) and in **Checks**. Once
  a day, a notification goes to those allowed to set limits and to those responsible for that kind of equipment.
- New permissions: **Set hour limits and inspections** and **Record replacements, service and inspections**.

### 5.15.1

- **Text below the QR code on A4 as you choose**: checkboxes Name, Which case, Number / inventory, Company – without all
  of them only the QR remains. The choice is saved to the account.

### 5.15

- **To print right where you print**: QR labels (equipment and cases) – "QR to print" on the QR labels page, tape –
  "Tape to print" on the tape labels page, **case label** – "Label to print" and **case contents** – "Contents to
  print". The button disappeared from equipment and case details.
- The print queue has new groups Case labels and Case contents (each opens and prints separately).
- Settings show numeric codes for @todo and @toprint too (31121800, 01001800).

### 5.14.1

- **Custom QR size on A4**: "Custom (mm)" – enter the QR side in millimetres (15–180 mm), the text adapts and as many
  labels fit on the page as will go. Can be set in Settings and right when printing.
- **@toprint in a number and date**: in a number field 01001800, in a date 1. 1. 1800.

### 5.14

- **Print** (new menu item): a print queue for labels. Equipment, split equipment, a case and a case set have a **To
  print** button, lights also **Tape to print**. In the queue the labels are grouped (equipment QR, case QR, tapes)
  and printed with one click; "Printed – clear" empties the queue.
- **QR labels on A4 or tape** (Settings → Lists → Printing and keywords) and **QR size on A4**: 20, 12, 6 or 2 per
  page – large labels with large text scan well even with an iPhone. The size can also be changed right when printing.
  Addresses, modes and pickup always go on tape.
- **@toprint**: type @toprint into a field (e.g. the case number) – a task "Print: …" is created and the QR label of
  that equipment or case is added to the print queue. In a number field 01001800, in a date 1. 1. 1800.
- **Who sees @todo and @toprint**: in settings choose the people the tasks are assigned to (otherwise whoever typed the
  keyword).

### 5.13

- **New top view of the warehouse**: concrete floor with a 1 m grid, thick perimeter walls, warehouse dimensions and a
  scale; a rack as shelves with posts, number of levels and an occupancy bar, a pallet with boards, a zone with a dashed
  line, a hatched pillar, doors with an inward opening arc and a window as a double line. The selected place is
  highlighted.

### 5.12.1

- **Company logo with Ctrl+V** (Settings → Company → Logo and case labels): just paste a copied logo, it uploads the
  same as with the button (including removal of a single-colour background).

### 5.12

- **Amplifier presets – print and Excel**: for a digital amplifier (e.g. Crown) "Print / download" in the detail – a
  table of all presets (free ones too), speaker and note; print on A4 or download to Excel (CSV).
- **Notes** (new menu item): shared company notes – title, text, pin to the top, search and tagging people from the
  company; a tagged person gets a notification and finds them via "Where I'm tagged". Any member can edit, the author or
  an admin can delete.
- **Warehouse**: pillars, walls / partitions, doors / gates and windows can be drawn on the plan; a rack has a level
  height and each place a note. For a level, the app shows from case dimensions the floor occupancy, how many m² are
  still free and which cases do not fit in height.
- **Developer → Users** as a clear table (account · last in the app · companies and roles).

### 5.11

- **Developer → Users**: all accounts – name, e-mail, since when they have an account, when they were last in the app
  (today, yesterday, X days ago), whether they confirmed their e-mail and in which companies they are with which role
  (demo companies marked). Search by e-mail, name and company. Only the developer sees it.

### 5.10

- **Faster app loading**: the main file is 4× smaller (Settings and company selection download only when opened,
  libraries separately – with a new version the browser does not download them again).
- **Ctrl+V with an image works the same everywhere** (photo of equipment, case, set, label).
- README: new screenshots of the case contents sheet.

### 5.9

- **Case contents sheet: Print, PDF and PNG** – print straight from the app (page by A4 / A5 and orientation, without
  margins), PDF with all sheets and PNG as before.
- **Sheet choices are saved to the account** (size, orientation, cable type layout, order, what to show, DMX) – the same
  on PC and mobile.
- **Read hours for all, also for other counters** (e.g. Lamp): choose the counter and "Add counter".
- **Pack list as a contents sheet**: a case with its number (Beam 7R Case #3) and below it what should be in it,
  accessories separately.

### 5.8

- **More hour counters** (e.g. operation and lamp): one counter by default; when recording a reading, the **Add
  counter** button adds another with a name (e.g. Lamp) and you choose which one you are reading. The last reading of
  each counter is in the Operating hours section, the counter name in the history of readings. Operating hours (and
  reading reminders) follow only the main counter.

### 5.7.2

- The **DMX addresses** button at the top of the detail is on every light – also without "Track each piece
  separately" (pieces 1…count). The event's DMX patch list also takes such addresses.

### 5.7.1

- **Piece DMX addresses are no longer in the equipment form** (not even when editing). They are entered in the light's
  detail with the **DMX addresses** button, or for split equipment via "DMX for all".

### 5.7

- **Channel layout for DMX modes** (optional): for a light, "+ Channel layout" under each mode – one row = one channel
  (Dimmer, Red, Green…). In the equipment detail the layout expands with the mode.
- **DMX on the case contents sheet**: when a case holds a light (not an accessory), a DMX part can be switched on – just
  the modes (e.g. A – 6 ch, D – 8 ch), or modes with channel layout. The choice is remembered.
- A **Contents** button on a case (instead of "Contents A4" – the sheet is also A5 and landscape).

### 5.6

- **Landscape case contents sheet**: Portrait / Landscape choice above the preview (also for A5). The choice is
  remembered.
- **Edit all cases of a set at once – the name too**: all cases of the set get the new name and each keeps its number
  (e.g. "Blinder 2×100 W #3" → "Blinder 2×100 W Case #3").
- **Patch lists – DMX addresses from equipment**: an overview of all light pieces with a recorded address (by line and
  address, overlaps in red) and "Save as template".

### 5.5

- **DMX patch list – Take addresses from equipment**: lines, addresses and modes recorded with light pieces (also
  later, after the patch list was created) are transferred to the patch list with one button. "Fill in missing
  addresses" first takes the addresses from equipment and only then numbers consecutively.
- **Statistics** (instead of "Numbers"): "Equipment pieces" excludes cables; new tiles **Cables (pcs)** and **Cable
  metres**.

### 5.4

- **A photo for a whole set of cases**: on the set page (e.g. 8× Wash 19×15W Case) click the photo at the top or paste
  an image with Ctrl+V – every case of the set gets the same photo.
- **Easier putting pieces into a case** on the equipment page: each piece outside a case has a "put into…" choice (moves
  at once) and the **Spread over the set** button splits the free pieces into other cases of the same set evenly (e.g.
  Wash Case #4 – #8, 2 pcs each). Pieces in the same case are merged into one row.

### 5.3

- **Sorting equipment "By category / kind"**: equipment in groups (Light, Sound, Truss…) with a heading, alphabetical
  within a group. Everyone sets the group order in Settings → Account → **Equipment order (my focus)**.
- **Into a case straight from the equipment page**: for pieces outside a case tick the pieces (or "Select all outside a
  case"), choose a case and "Put into case". The "Outside a case" part is at the bottom of the parts list.

### 5.2.1

- **New equipment without piece DMX addresses**: line, address and mode for individual pieces are only in the edit of
  added equipment (or in bulk via "DMX for all"), not when adding.

### 5.2

- **Software version** for a lighting console (e.g. Titan v17.1, grandMA3 2.0) and firmware version for a converter –
  also shown in the list and the equipment detail.
- **The category of equipment** is shown in the form only when the company uses categories (or the equipment already
  has one). Categories are created in Settings → Lists.
- **Labels on black tape**: the labels explain why the downloaded PNG is black on white (the printer prints it white on
  black tape).

### 5.1

- **Colours of equipment kinds** (Settings → Lists → Equipment kind colours): you set the colour bar in the list for
  Light, Sound, Stage, Truss… yourself (or "No colour"). Applies to equipment without a category; the category colour
  takes priority.
- **Photos on the case contents sheet without a white background**: product photos on white are "cut out" and the
  product sits right on the card. Can be switched off with "Photos without white background".
- Fix: the sheet shows photos for accessories too.

### 5.0

- **Accessories with any equipment in a case**: all items in a case's contents have an **Accessory** button (plug), not
  just cables – e.g. safety cables with lights. The contents sheet then has a **Contents** part (e.g. Beam 7R) and below
  it **Accessories**. It is set only in the case (the equipment form no longer has the field).
- **A photo for all parts at once**: on the page of split equipment (e.g. B-EYE K10 in 5 cases, XLR in all lengths)
  just click the photo or paste an image with Ctrl+V.
- **Category colours** are in Settings → Lists → **Equipment categories and their colours** (section renamed, with a
  description).
- **Cards on the sheet**: with few items they are larger and centred (2 side by side, 1 across the full width with the
  photo on the left and the count on the right); without a cable table the cards have large photos.
- **The sheet on A5 too**: A4 / A5 choice above the preview, PNG downloads in the chosen size (A5 at 300 dpi).
- **What will be on the sheet**: checkboxes above the preview – Case number, QR code, Total pieces, Weight, Checked by,
  Date. E.g. only the QR without the number, or without the summary at the bottom. The choice is remembered.
- **The equipment list** no longer shows "made by …" – it is with the individual cable lengths (expanded row and cable
  page) and in the detail. Expanded parts always show the count, even "1 pc".

### 4.20

- **Cable variant** (e.g. stereo, silent jack): a new **Variant** field when editing a cable (empty = regular). On the
  case contents sheet the cable stays in the column of its type (Jack) and below the count there is a breakdown, e.g.
  "7 PCS – of which 2× STEREO, 1× SILENT". The variant is also in the cable detail.

### 4.19

- **Cable as an accessory on the sheet**: in a case's contents every cable has an **Accessory** button (plug). A marked
  cable (e.g. a jack in an XLR case) is not in the length table but at the bottom among accessories as a card with a
  photo and count. The same can be ticked when editing a cable.

### 4.18.1

- **Case contents sheet**: light colours (yellow, beige, light green) no longer have an outline – the name and length
  are in a darker shade of the same colour, the colour bar stays in the exact colour.
- **Order of cable types** with "Each type separately below each other" and "Each type on its own sheet": use arrows
  to set what is at the top and what at the bottom (or which sheet is first). The order is remembered.

### 4.18

- **New look of the case contents sheet (Flightcase content)**: a header with the logo, case name and a box with the
  case number and QR code; the heading "Cables by length", a colour bar and colour name for each length, alternating
  rows and counts "20 PCS"; accessories as cards; at the bottom a summary – total pieces, weight and empty Checked by
  and Date fields.
- **Several cable types in one case** (e.g. XLR and Jack): on the sheet choose **In one table**, **Each type separately
  below each other** (each type its own table with its own colours) or **Each type on its own sheet** (several PNGs are
  downloaded). The choice is remembered.
- A custom cable type the database does not know yet shows a clear message (`supabase/update-all.sql` needs to be run).

### 4.17.1

- **Custom case label content – photo with Ctrl+V**: just paste a copied image (from the web, a screenshot) on the
  label page, it uploads as the label photo.

### 4.17

- **Custom cable types with colours** (Settings → Lists → Cable length colours): besides XLR / DMX, powerCON and 230 V
  you add your own type, e.g. "Multicore" – it applies to cables whose "Connector / type" contains this text.
- **When entering a cable**, below the length colour it says which cables the colour applies to (all of that length, or
  only that type).

### 4.16

- **Cable length colours – shared as the default**: they apply to all cables. If you want different ones for some type,
  add its own with the "Other colours for: XLR / DMX, powerCON, 230 V" button – just set the lengths that should differ
  ("Copy shared colours" prepares them for editing). "Cancel" returns the type to the shared colours.
- **Colour template**: "Fill in template" sets 1 m green, 2 m yellow, 3 m red, 5 m purple, 8 m beige, 10 m blue, 15 m
  orange. The same colour is offered when entering a cable of that length.
- **Case contents sheet – accessories as cards**: adapters and other contents are below the cable table as cards with a
  name, photo and piece count (a list with more than 18 items).

### 4.15

- **Cable length colours** (Settings → Lists → Cable length colours): a switch **Same for all cables** or **Different for
  XLR / DMX, powerCON and 230 V**. With different ones, each type has its own lengths with a colour and colour name; the
  type is set by the connector, and lengths the type does not have get the shared colour. The colour by type is used
  when entering a cable and on the case contents sheet.
- **Cables – edit all lengths at once** (e.g. add a photo to all XLR): photo, manufacturer, connector, category and note
  are carried over; the name with length, length, price and who made the cable stay with each length.
- **A new case** no longer offers "Put equipment in them right away" – you add equipment in the case detail.

### 4.14

- **Developer is at company selection** (a "Developer" tile below the companies) – no longer in company Settings, so it
  is available without an open company.
- **Demo invitations with status**: for each e-mail you can see whether they have registered, when they last signed in
  and whether they created a demo company.

### 4.13.1

- **Flash when scanning QR codes**: a "Flash" button at the top next to "Close" turns on the phone's torch – labels are
  easier to read in the dark. Shown where the phone and browser allow it (Android Chrome; mostly not on iPhone yet).

### 4.13

- **Invite to the demo only** (Settings → Developer): the invited e-mail may register but sees no company – after
  signing in they open their own demo company.
- **Push notifications – setup** is checked automatically; when everything is set, the key steps are hidden.
- **Equipment labels in a case**: the label also shows the case the piece is in (e.g. #3 and #4 → "Beam case #2") – on
  tape and on QR labels. On tape it can be switched off in "Edit label contents".
- **The "Outside cases" filter** also shows the remaining pieces of equipment that is partly in a case (e.g. 4 of 8
  outside a case).
- **Hooks, clamps and other lighting accessories** no longer have "Matches Capture" or "Copy of".

### 4.12.2

- **Tape labels – new look** in the app's style (dark mode too): options in one card, "How to print" collapsed, tape
  previews with the name of who the label belongs to, length and PNG.
- **Case labels** without equipment options (DMX address, modes, power draw, weight) and sorted #1, #2 … #8.
- **QR code only** without empty space after it – the label is exactly as long as the QR.

### 4.12.1

- **Art-Net / sACN node**: each port has a universe for Art-Net and for sACN separately (e.g. port 1 = Art-Net 0, sACN
  9); "Same for all" and "Consecutive from" for the chosen protocol. In the detail "Art-Net 1–4 → U0 · sACN 1 → U9 …".

### 4.12

- **Art-Net / sACN node** (lights → type "Converters (DMX / network)"): currently enabled protocols (Art-Net, sACN or
  both), number of outputs and which port sends which universe – also per port with both protocols. Quick buttons "Same
  for all" (splitter, e.g. ports 1–4 = universe 0) and "Consecutive from" (9, 10, 11 …). In the detail "1–4 → U0"; the
  printed DMX patch list shows for each line which node and port it comes from.

### 4.11

- **Taking out of a case = merging back**: when you take pieces out of a case (cross), they merge with the same
  equipment outside a case (e.g. 2 pcs into a case by mistake and back → again 10 pcs in one row).
- **Merge parts outside a case**: in the equipment group overview a button merges split parts outside a case into one
  – pieces, piece numbers and history (events, loans, service, hours) are carried over.
- **Case set**: in a case's contents the label's main item is bold, the secondary one normal, and equipment without a
  mark smaller and grey.

### 4.10

- **DIP switches on lights**: in the light form "The DMX address is set" – by display / in the menu, or by DIP switches
  (8, 9, 10 or 12) with a note (e.g. "switch 10 = mode"). For such a light the app shows **which switches to turn on**:
  for each piece in "DMX for all", on the printed DMX patch list (DIP ON column) and on the "My DMX address" label (DIP
  ON: 1, 5).

### 4.9.1

- **Database update with one file**: `supabase/update-all.sql` – all migrations from 0086 to the latest plus the
  repair ones 0071 and 0072; paste it whole into Supabase → SQL Editor and run (repeatedly too, without errors).
- **Repair 0070** no longer exposes Wi-Fi passwords or addresses when run again.
- **Pack list**: scanned individual pieces (piece QR) are saved **without signal** too and sent once there is a network.
- **README**: new screenshots – equipment by piece, task kanban, DMX patch list, tape labels.

### 4.9

- **Equipment in its own cover** (e.g. a speaker in a cover): "Has its own cover (not a case)" and which cover in the
  form. Such a piece is not in cases but is not reported as "outside a case" either; "in a cover" in the list, a Cover
  row in the detail.
- **Bag** with cases (next to case and rack) – e.g. a bag for stands; filters "Bags only", "Bag is empty".

### 4.8

- **IP and MAC addresses are guarded by the database** (permission "See IP and MAC addresses"): equipment IP and MAC are
  in a protected table, Wi-Fi network addresses (IP range, gateway, DHCP) are read only with the permission, guest
  devices too. Whoever lacks the permission does not see the addresses and does not delete them when editing equipment
  or a network.
- **Tape labels**: when printing from a PC each label has **its own length** (no empty tape at the end).
- **Companies and contacts**: the list shows the legal form (civic association, s.r.o. …) and the statutory body /
  director.
- **Pack list – QR of individual pieces**: a scanned piece (Beam 7R #7) is recorded ("scanned 7/16 pcs"); when all
  pieces are there, the item ticks itself off. A piece in a case that is whole in the pack list says "scan the case QR".
- Code tidy-up (lint without warnings).

### 4.7.2

- Tape labels are available via **QR labels → On tape** (buttons in equipment and case details removed).

### 4.7.1

- **Tape labels**: each label shows its **length in mm** (for setting up the printer / app); the "My DMX address" label
  can also show the **power draw (W / A)** – off by default.

### 4.7

- **You set the content of tape labels**: "Edit label contents" – for each kind switch individual details on / off (QR
  code, name, piece number, category, company name; line, address, mode, channels; W, A, kg; for a case category, rack
  in U, company). Category and company are off by default. Saved to the account (PC and mobile).
- **Tape colour**: white (black text) or black (white text) – the preview shows how the label will look.

### 4.6.1

- **The demo company** shows what's new since 4.0: DMX addresses for each light piece, power and weight (tape labels),
  sound and DMX patch lists at the festival, patch list templates, a civic association among companies and "Found…"
  switched on for QR. Existing demo companies are extended by themselves.
- **Notifications** (the full list): for merged equipment the piece count ("Beam 7R (16 pcs)").

### 4.6

- **QR without an account – "You found…"**: whoever scans a QR label with the camera and has no account sees the name of
  the item (also the piece number), the company name and contact (phone to tap, e-mail, web) – if the admin enables it
  in Settings → Company → Company details ("QR label without sign-in shows You found…"). Off by default; other data
  stays hidden. People from the company have "I'm from the company – sign in" on the same page and after signing in the
  item opens.

### 4.5

- **Tape labels** (e.g. 9 / 12 / 18 mm tape), for each piece separately – **QR + name** (Beam 7R #3), **my DMX
  address** (L1 · A017 · mode), the light's **DMX modes** and **power draw and weight** (W, A at 230 V, kg). Print from a
  PC through the driver (each label on its own "page" the size of the tape), or **PNG** for the printer's mobile app.
  Also for **cases and racks** (QR + name with number + category). The "Tape labels" button is in the equipment detail,
  the group overview, on a case, a case set and the QR labels.
- **Light power**: when you enter watts, the current at 230 V is shown (just write the watts from the light's plate).

### 4.4

- **DMX patch list on an event** (a new section in the event detail): line, address from–to, channel count, mode and the
  light from equipment. **From the event's lights** – filled from the lights on the event with their default line,
  address and mode (missing addresses filled consecutively); a check for overlapping addresses and exceeding 512;
  **print / PDF** by line with the number of used channels.
- **Patch list templates** for sound and DMX: on an event **Save as template** and **From template** with one click.
- **Patch lists** (a new tab): all templates in one place – create, edit rows (channels / lights), rename, delete.
- The backup also includes DMX patch lists and templates.

### 4.3.1

- **View of a single piece** (QR or clicking #1): instead of the piece count "Piece #1 · 2 pcs in this part in total",
  operating hours of just this piece and recording a reading straight for it.

### 4.3

- **Cases as equipment**: a set of identical cases has its own overview – click the row (the arrow on the right expands
  it in the list). For each case what is inside (also piece numbers) and the check; **Edit all at once**, **QR labels of
  all**, **All checked** and **Add another to the set**.
- **A piece of equipment**: the QR or clicking a piece (#1) shows just that piece, with a link to the whole part.
- **DMX for all at once** (light group overview): line, address and mode for each piece; **Calculate addresses** by the
  mode's channels (1, 17, 33…), a warning when exceeding 512.
- **Network permissions** (Settings → Permissions → Networks): see networks, see IP and MAC addresses, see Wi-Fi
  passwords (guarded by the database), network management (sign-in to routers).
- **Checks – permission** "See also things others are responsible for"; without it only mine.
- **Company Wi-Fi**: a network can belong to equipment or be a company network (headquarters, office, warehouse).
- **Legal form** for companies and contacts and in "Offer for": s.r.o., a.s., sole trader, civic association,
  foundation, municipality; based on it director / statutory body / chair… (the statutory body is also in the offer
  PDF).
- **Notifications**: equipment is counted in pieces ("Beam 7R (16 pcs)"); after **To tasks** the notification disappears
  while the task is open.
- **Price offers**: the hint about issuers is not shown once they are set.

### 4.2.1

- **Lights – DMX for each piece** (optional): with per-piece tracking, each piece gets a default line (universe), DMX
  address and mode (chosen from the light's DMX modes). In the detail for a piece "line A · addr. 017 · mode 16ch".

### 4.2

- **Checks** (a new tab): in one place cases and racks to check, equipment for reading operating hours and service. By
  default only what you are responsible for (Settings → responsibilities); after switching off "Only what I'm
  responsible for" also other people's things. Split equipment (e.g. 8× Beam in cases) is one row – a link to the
  overview where you read hours for all at once.
- **Bulk equipment editing**: Cancel and Save return to the group overview (not to a single part).
- **The full case name with its number** (Beam 7R Case #4) in the equipment detail, in the case choice in the form and
  in the warehouse.

### 4.1.2

- **Devices from your profile in another company**: when you have them recorded in another company, the red "Your
  devices are missing" is no longer shown, but "Your profile devices are not in this company yet" with an **Add here
  too** button.
- **"Fill in your details"** is no longer shown when your profile is filled in (the details are written to the card from
  the profile).

### 4.1.1

- **Read hours for all**: in the equipment group overview (e.g. Beam 7R in 8 cases) one date and the counter reading for
  each piece – saved at once, empty ones are skipped.
- The equipment list no longer has "Edit all at once" under the arrow (it is in the group overview).

### 4.1

- **QR code fix**: the QR led to an address without the app folder (…github.io/equipment/…), so the phone camera opened
  someone else's 404. New labels lead correctly – **QR labels need to be printed again**.
- **Notifications**: identical ones are merged ("Beam 7R (8×) – operating hours…", clicking opens the overview of all
  parts); each has **To tasks** – it creates my task with high (red) priority and a link.
- **My panel on mobile**: the Overview on mobile no longer has blocks below each other – there is a **My panel** button
  (a separate tab). PC and mobile have **their own layout** of blocks.
- **You set the Numbers block**: equipment pieces, in service, pieces outside a case, empty cases, events within 30
  days, loans, my tasks, overdue, to fill in.

### 4.0

A major version: equipment and cases by piece, tasks as a board, your own Overview. Together with 3.19–3.20:

- **Equipment group overview**: clicking a grouped row (e.g. Beam 7R or XLR) opens a page with all pieces #1…#16 – for
  each, which case it is in (link to the case), status, parts and lengths; from there **Edit all at once** and **QR
  labels of all**. The arrow on the right expands the parts right in the list.
- **A QR for each piece**: equipment tracked by piece has its own QR for each piece on the labels (Beam 7R #7). The QR
  finds the piece even if you move it to another case. Case labels also have a number (Beam 7R Case #4).
- **Printing without the browser's header and footer** (date, address, page number) – QR labels, offers, sheets, event.
- **Digital amplifier**: **amplifier ID** (e.g. HiQnet / network ID; for several pieces "#1: 101, #2: 102").
- **Outside a case** is counted in pieces ("37 pieces of equipment are not in any case") with what they are; equipment
  marked "Does not belong in a case" is not shown even in the "Outside cases" filter.
- **The demo company** shows what's new: a numbered case set, a 12U rack, lights by piece in cases, a digital amplifier
  with ID and presets, XLR in lengths, an empty case, tasks with priorities and a "Fill in" task (existing demo companies
  too).
- **Mobile**: a case's contents show the full equipment name (status and buttons below it).

### 3.20

- **Task kanban by anything**: columns by status, priority, category, person or due date. Moving a card changes the
  status, priority, category or assignee (the due date is changed in the task).
- **Task filter and sorting**: status (also done), priority, category, who, due date (overdue, today, within 7 days…),
  search; sort by importance, due date, priority, title or newest. It is remembered.
- **Fill in**: a button with the number of tasks from @todo / 31121800 – one click shows only what needs filling in.
- **Edit all at once** (equipment) shows a summary "16 pcs in 8 parts (#1–#16)" instead of one part's count and numbers.

### 3.19.7

- **Duplicate equipment**: a button in the equipment detail opens the new equipment form prefilled with the data (with a
  copy of the photo too) – change what you need and save. Serial and inventory numbers, MAC, IP, case and piece numbers
  are not copied.
- **Cables in one row**: all lengths of one type (e.g. XLR 1 m … 25 m) are under one row in the equipment list "XLR · 1,
  2, 3 … 25 m · 151 pcs"; expanded, the individual lengths from the shortest.

### 3.19.6

- **Edit all at once** – equipment: after expanding split equipment (e.g. Beam 7R in 8 cases) one form for all parts.
  Name, manufacturer, model, category, parameters, note, photo and other shared data are carried over to all; count,
  piece numbers, case, serial and inventory numbers and status stay with each part.
- **Edit all at once** – cases: for a set of identical cases the dimensions, weight, label category, case / rack (U),
  check priority, owner and note for all at once.

### 3.19.5

- **Add to case** by kind of equipment: equipment counted only by number has "10 / 10 pcs" and Add; equipment by piece
  offers the piece numbers directly (#13 #14 …, also "All") – without a count.
- **Equipment in one row** is sorted when expanded: first the pieces outside a case, then cases by piece numbers (Case
  #1, #2 … #8).

### 3.19.4

- **Add equipment to case** offers only equipment that is not in any case yet. Moving from another case is behind the
  checkbox "Also equipment already in another case"; equipment also shows piece numbers and the full case name (#).

### 3.19.3

- **Equipment in one row**: equipment split into cases (e.g. 12 pcs in the warehouse and 2 pcs in each case) is under
  one row in the equipment list – "16 pcs · 12 outside a case · 4 in 2 cases"; clicking expands which pieces are in
  which case.
- **Case contents** also show piece numbers ("Beam 7R · 2 pcs · #1, #2").

### 3.19.2

- **Duplicate case**: a button in the case detail creates another piece of the set with the next number (Case 3 → Case
  4) – the same dimensions, weight, category, case / rack (also U), location, owner, check priority, note and photo (also
  the label photo). **Equipment is not copied** – the new case is empty.
- **Empty case**: a warning in the detail (with an Add equipment button), an "empty" label in the list and an "Empty
  cases and racks" bar that filters them with one click.

### 3.19.1

- **Exact pieces into a case**: when adding equipment to a case, "Choose numbers" – pick e.g. #7 and #8 and exactly
  those go into the case; the rest keeps its numbers. Until now a split-off part got #1, #2 again.
- **Equipment**: split equipment shows the piece numbers and which case they are in ("#7, #8 · in Beam 7R Case #4").
- **A task from a number and date**: you cannot type "@" into a number field (kg, pcs…) – type **31121800**; in a date
  enter **31. 12. 1800**. A task "Fill in: …" is created as with @todo and the value is cleared.

### 3.19

- **@todo in any field**: type `@todo` (or `@addtodo`) e.g. into Weight and a task "Fill in: Weight – equipment name" is
  created with a link back to the form. Can be used several times, also for one item.
- **Tasks**: coloured priority (grey none, blue low, yellow medium, red high – change the colours in Settings →
  Account), filter by priority, person and text, and a **Kanban view** (moving between columns).
- **Overview**: the side column is always there – My tasks (even when you have none), a **month calendar**, **numbers**;
  "Edit this column" – switch blocks on, off and reorder them (saved to the account).
- **Case or rack**: a rack has its height in **U** (e.g. 12U), filter "racks only". Identical cases are under one row in
  the list ("4× case"); clicked, Case #1, #2… with which pieces are inside. In the detail "… #4".
- **Label**: a "From case name" button for custom label content.
- **Equipment that does not belong in a case** (ticked in the form) is no longer reported as "outside a case".
- **Statistics and the case list** count **pieces** (20 cables under one item = 20 pieces).
- **Operating hours and service notifications** are seen only by whoever is responsible for that equipment (if set).
- **VAT payer**: the VAT ID appears only after ticking "VAT payer" (company, partners, s.r.o. / sole trader, offer). The
  issuer's contact is in three fields – phone, e-mail, web (the web is in the PDF too).

### 3.18.1

- **Price offer PDF** in the layout of a usual company offer: "PRICE OFFER" with a number, the supplier on the right
  (company ID, tax ID, phone, e-mail), "Offer for:", issue date, event, venue and service date, parts "A. …" with a row
  "Price for part A", total price, SUMMARY and "Prepared by".

### 3.18

- **Price offer by link**: "Link for the client" creates an address where the client views the offer without signing
  in, prints it and **accepts or rejects** it (with a note too). The offer status changes by itself and you get a
  notification.
- **Event from an offer**: one click creates an event with the name, venue and client from the offer; equipment chosen
  from the warehouse in the prices is added to the event.
- **S.r.o. / sole trader for a company** (Settings → Company → Issuing offers): tick how the company issues and fill in
  the details; the offer has buttons only for what is enabled.
- **Offer**: "Prepared by" with one click me or the CEO; save the client to Companies and contacts; the list in a part
  can be clicked from your own equipment; **new PDF design** like a classic document (supplier / customer, table,
  signature).
- **Amplifier analogue / digital**; for digital the number of presets (suggested for known models) and a list of presets
  linked to a speaker – the speaker detail shows which amplifier has its preset.
- **Networks → MAC addresses**: members' devices are marked as Wi-Fi or LAN (ethernet) card.
- **Pinned companies** are remembered with the account – the same on every device.
- **Check for updates** in Settings → Account and in About.

### 3.17.1

- Technical maintenance: the equipment form is split into smaller parts (Light, Sound, Video separately), so further
  changes are faster and safer; the push notification function has automated tests.

### 3.17

- **Price offers** (a new module in the menu; also from the event detail with the "Price offer" button): header with
  number and date, event, venue and delivery date, **Offer for** (can be chosen from Companies and contacts) and **parts
  A, B, C…** with subparts **A1, A2** – description, list (bullets), "Price includes" and price.
- **Part price in three ways**: type an amount (or text, e.g. "on request"), build it **from warehouse equipment**
  (pieces × days × rental price) or from **custom items** (transport, technician…) – also combined.
- **Max budget**: the sum, how much is left and a bar are always visible at the top; when choosing equipment you see
  what is over budget.
- **Issuers**: one company can issue offers for several entities (e.g. s.r.o. and sole trader) – chosen in the offer; a
  non-VAT payer has prices without VAT. Prices with VAT, + VAT or without VAT.
- **Summary** and **total (discounted) price**, notes and "Prepared by"; **part templates** for repeated use; **Preview
  and print / PDF** on A4 with the company logo; offer status (draft, sent, accepted, rejected).
- **Permissions** in Settings → Permissions → Price offers: who sees them, who creates and edits them and who deletes
  (by default the warehouse worker sees and edits, only the admin deletes).
- The original offer from an event by price list stays as "Quick offer".

### 3.16

- **Pack list without signal**: ticking shows at once; without a network it is saved in the phone and sent by itself
  when there is signal ("Waiting to send: 3" at the top, "waiting to send" with the item). The last loaded pack list is
  remembered, so it can be opened offline too.
- **Settings → Developer** (only the app developer sees it): database status, the push notification setup guide and
  requests for a new company in one place.

### 3.15

- **Nivtec stage plan for an event**: in the stage calculator choose an event and "Save plan to event" – the whole input
  is saved (dimensions, height, stairs, skirt, railing, catwalk, risers). It is also saved with "Add parts to event".
- The **event detail** has a "Stage 8 × 5 m" card with a summary; "Open plan and print" opens the calculator with the
  plan loaded (drawing, deck order, legs, print). For another event the saved plan can be loaded with a button.
- Saving a plan works even when the parts are not assigned to equipment yet.

### 3.14

- **Creating new companies with approval**: a new company is created only by the app administrator (developer) or
  someone they allow. Others send a **request** (name and note) instead of "Create a new company" and see that it is
  waiting for approval. The administrator gets a notification and approves or rejects the request in Settings; the
  requester gets a notification and after approval creates the company themselves. The demo company and creating a
  company for a partner stay unchanged.
- You record the administrator (developer) in the SQL Editor in the `app_developers` table – while nobody is there,
  anyone can create companies.

### 3.13

- **Price offer history**: on the offer page "Save offer" saves an exact copy (rows, amounts, VAT) with a number within
  the year (e.g. 2026/012). The "Saved offers" list has the date, amount and status (draft, sent, accepted, rejected);
  "View" opens the saved version exactly as it was, and it can be printed.
- **Own equipment in several companies**: a change of the original item (name, count, parameters) is carried over to
  the copies in other companies by itself – the "Sync copies" button stayed just in case.

### 3.12

- **Monthly attendance report** (Attendance, for the admin): for the chosen month per person the hours at the company,
  at home and at events (from event time sheets), hourly rates and the proposed reward.
- **Hourly rates** at the company, at home and at events are entered right in the table; only the admin and that person
  see them.
- **Write to Rewards**: the reward is added with one click with a breakdown ("Attendance 10/2026 – company 8 h, …");
  an already written one shows "in Rewards".
- **Export to Excel** for the accountant: a Summary sheet (hours and rewards per person) and Records (each day
  separately).

### 3.11

- **My calendar** ("Choose a company" → My calendar): all events from all companies where you are in the crew, by month,
  in the company colour; overlapping events are red ("Overlaps with …"). Tapping opens the event.
- **Event crew**: whoever is in another company's crew at that time is in the "In another company" group (with the date)
  and in the choice "– in another company"; the company does not learn where.
- **Event equipment**: for your own equipment shared with another company, the pieces that are on that company's event
  at that time are subtracted, with a warning.

### 3.10

- **Notification bell** in the header: number of unread, a list of notifications from all companies (also without push
  enabled), tapping opens the event / task (for another company the company switches by itself), "Mark all read" and
  "Delete read".
- **New notifications**:
  - to the crew when an event's date or venue changes, or when it is cancelled,
  - to whoever created the event when someone from the crew declines (with the reason),
  - to the crew an hour before the meeting,
  - to whoever created a loan when it is overdue (once a week).
  Meetings and loans are checked by the `pg_cron` scheduler in Supabase (every 15 minutes).

### 3.9.1

- Companies and contacts: new hints in the Name and Legal name fields.

### 3.9

- **Responsible persons** (Settings → Permissions → Responsible persons, for the admin): e.g. "Lights" – all equipment
  of the kind light, "Sound" or "Case LED" – a specific case; who is responsible (several people too) and what to do:
  read operating hours every N days, check the case every N days.
- The responsible person sees "My responsibilities" on the **Overview** – what is overdue (e.g. read hours of 16
  lights), with a link to Equipment or Cases.
- **A mobile notification** arrives in the morning when something is overdue (at most once a week per task) – if the
  `pg_cron` scheduler is enabled in Supabase and push is set up.
- The **case** and **equipment** detail shows "Responsible: Jano (Lights)".

### 3.8

- **Push notifications – guide** (Settings → Account, for the admin): keys are generated in the browser, links lead
  straight to the right places in Supabase, the function code is copied with one button and one SQL command is enough
  instead of a Database Webhook. The "Check setup" button shows what is still missing.
- **Companies and contacts**:
  - for a company the **legal name** (official name if different from what you call the company), **VAT ID** and **CEO
    / director**,
  - the choice **RigTrack: They don't use it / They already have a company in RigTrack / Create a company for them**; it
    finds an existing company by company ID, name or legal name and offers linking by itself – creating a company that
    exists is no longer offered,
  - people at a company can be **edited** and also have a **date of birth**.
- **Company logo**: on upload, background removal can be switched off, and in settings you choose the display –
  automatic, original colours without a backing, with a white backing, always white or always black (with a preview on
  light and dark).
- **Choose a company**: pin a company with a pin – pinned ones are at the top.
- New cable: the first length also has the length in the name ("XLR 5 m", "XLR 10 m"), so "XLR" next to "XLR 1 m" is
  not created.

### 3.7.6

- Nivtec stage: the separate "I want edge trims" is removed – "I want a skirt" adds the skirt and the trims it hangs on
  to the chosen sides.

### 3.7.5

- **Who made the cables**: "All one person" (just the name, applies to all lengths and pieces) or "Different people" –
  for each length who made how many pieces (e.g. 5 m: Jano 2, Fero 8), with the number of pieces without a maker. More
  pieces than the length has cannot be saved. Before, with several lengths the same makers were copied to each.
- The Delay and LED calculators have the "In development" warning like Stage.

### 3.7.4

- New cable: lengths and piece counts are in one list (Length – Pieces); "Add length" adds another row and each length
  is saved as a separate item. The length is no longer twice in the form.

### 3.7.3

- **Skills in My profile** (e.g. Avolites, GrandMA, Crown, working at heights): entered as tags with suggestions while
  typing, and carried over to the employee cards in all companies. Shown as tags on the card and in the People list;
  search in People also finds by skill.

### 3.7.2

- Employee card: with "Take details from my personal profile" switched on, phone, e-mail, birthday, name day, driving
  licence and social networks are locked right away – they are changed in My profile. When switched off, they can be
  edited in that company.

### 3.7.1

- Fixed: details from My profile (phone, e-mail, birthday, name day, driving licence, social networks) are carried over
  to employee cards in all companies again; all cards are synced once when `0086` runs.

### 3.7

- **Wider and clearer on PC**: "Choose a company" with companies in a grid and tiles My profile, My equipment, My
  devices and My statistics; About and What's new are wider too (with a side list of versions). On the Overview on PC,
  My tasks are in the side column. The demo company is just a small link next to your own companies.
- **My profile – photo**: uploaded to your employee card in all companies at once (also for helpers).
- **My equipment**: add your own equipment and your own case / rack right from "Choose a company" – to one or all of
  your companies; "Edit" opens the item in the company.
- **My devices → "Also to equipment"**: a powerful laptop or tablet can be put on an event as your equipment.
- **My statistics**: filter by company, year and month; events and days at events, hours worked (events, company, home),
  rewards and average per event, drives and kilometres, a chart by month, what you did most often, most frequent
  clients and venues.
- **Networks**: a switch at the top Wi-Fi networks / IP table / MAC addresses (IP sorted by number). **Guest devices**
  (e.g. a visiting sound engineer): name and surname, contact, device, MAC, fixed IP (with a free one suggested) and
  until when it is valid – only those who edit equipment see them.
- **Cases**: several cases at once always work (also without a template) and equipment is split into them right away –
  e.g. 8 cases with 2 lights each out of 16. In the case detail, for equipment with more pieces you choose how many to
  put in (the rest stays). The case list shows the case photo, otherwise the photo of the label's main item or the
  equipment inside. The label got Truss and Stage categories.
- **Equipment by piece**: columns Serial number, Purchase date and the new **Bought from**; the inventory number of a
  piece is gone (a piece is identified by its number #1, #2…). The purchase date at the bottom is not shown with
  per-piece tracking.
- Filters in Equipment and Cases: sorting on the left, next to "More filters".
- Fixed: social networks from the profile are carried over to employee cards again.

### 3.6

- **My equipment in several companies** ("Choose a company" → My equipment): equipment you own can be added with one
  click to another of your companies too – it will be there as your own equipment (it can be put on an event). Each
  piece shows which companies it is in; "Update copies" carries over changes (name, count, parameters) and it can be
  removed from a company.

### 3.5

- **Push notifications on mobile** (Settings → Account → Mobile notifications): a notification arrives when someone adds
  you to an event crew or assigns you a task – even when the app is not open. It is switched on for each device
  separately; the "Send a test" button checks that they arrive. On iPhone only from the app added to the home screen.
- **My profile – social networks**: Instagram, Facebook, TikTok, LinkedIn, YouTube and web are entered once and carried
  over to the employee cards in all companies.
- **"Choose a company"**: companies are the main thing again; My profile, My devices and My statistics are small buttons
  next to the heading (with a link back to the companies).
- **Nivtec**: the build order goes by rows – first the whole back row, then the next ones towards the front.

### 3.4

- **Nivtec – stage plan**: in the drawing each deck has a number (build order from deck 1) and size, and blue dots show
  in which corners of which deck there is a leg – a corner without a dot rests on the neighbouring deck's leg. Can be
  switched off.
- **Print / PDF** for the stage: prints the drawing with the parts list (without menu and controls).
- **Cables – who made them**: a cable records who made it, also split (of 10 XLR, Jano made 8 and Fero 2). Statistics →
  People has a ranking of who made the most cables.
- **Statistics → Equipment**: how many metres of cable you have by connector (XLR, extension cords…).
- **Equipment owner**: the team manager can add a person without an account (e.g. a temp worker) right in the owner
  choice.

### 3.3

- **Invoice for equipment pieces**: in an order, for an item "I already have it in equipment – just link" choose the
  equipment and pieces (e.g. `1-4`). The piece count in equipment does not change, the purchase is only assigned.
- Linking also works **afterwards** for an older order ("Link with equipment I already have") and the link can be
  removed.
- **Equipment detail**: each piece shows "invoice (supplier, date)" or "no invoice"; purchases show which pieces they
  cover and whether there is an invoice.

### 3.2.1

- **"Choose a company" clearer**: buttons Companies, My profile, My devices and My statistics at the top – only the
  selected part is shown. With an unfilled profile a dot shines on the button.

### 3.2

- **Who drove** (event detail, below Transport): for each day the driver (member or external), car, direction (there,
  back, both) and kilometres are recorded – empty km are calculated from the distance from the warehouse. A driver from
  the crew can record themselves.
- **Employee card**: a new "Drove" section – where, when, which car and how many km in total.
- **Statistics → People**: a ranking of drivers by kilometres driven (with the number of drives) for the chosen year.

### 3.1

- **My statistics (all companies)** on the "Choose a company" screen: for each company how many events you had in the
  chosen year, how much you earned, how many hours you worked (events and company / home) and totals for all time and
  all companies.
- **About page**: what RigTrack can do, how to start and how it handles your data. The link is in the footer – at
  sign-in, company selection and in the app.

### 3.0

- **My profile for all companies** ("Choose a company" screen): name, phone, e-mail, birthday, name day, driving licence
  and home address are entered once. They are written to the employee card in every company by themselves – also in a
  new company right after joining. Until the profile is filled in (name and phone), the app reminds you.
- **Employee card – "Take details from my personal profile"**: on by default; when switched off, the card in that
  company is edited separately, when switched on again it syncs with the profile.
- **My devices for all companies**: a phone, laptop or tablet with a MAC address is recorded in all companies at once;
  a device shows in which company it is missing and you add it there with one click. Networks and IP addresses stay
  separate for each company.
- The home address from the profile is also carried over to attendance (working from home).

### 2.19

- **Clients and their history**: a company in "Companies and contacts" has its own page – number of events, first, last
  and next event, revenue from events (for those who see income), a list of all events (as organiser and partner) with a
  link to the offer, and loans (by company ID or name).
- Older events where the company is only written as the organiser are counted too.
- The company list shows the number of events for each and can be sorted by name, number of events or last event. In
  the event detail the company has a "History" link.
- Orders: Statistics is no longer there twice – the button next to "Add" stayed.

### 2.18

- **Attendance outside events too**: on the Overview "Start at the company" and "Start at home" – you can start on site
  (within 300 m of the warehouse or home address), then Break, Waiting and Finish as at an event.
- **Home address** (Settings → Account → Attendance): seen only by the person and whoever manages the team.
- **Attendance page** (in the menu): my times for 7 days, a month or 3 months with a total; whoever manages the team
  sees everyone, filters by person and can correct or delete times.
- **Statistics → Hours worked** counts events as well as work at the company and at home.

### 2.17

- **Groups of people in permissions** (Settings → Permissions): create groups (e.g. Drivers, Sound engineers), add
  members and each group has its own column in the table. A group member may do what their role allows plus everything
  the group has ticked. An exception for one member still takes priority.
- **A clearer equipment form**: with "Track each piece separately" the pieces (inventory and serial number, purchase
  date) are shown right below and the piece count is entered only once – custom piece numbers are hidden in "Pieces have
  other numbers?".
- Field groups (Sound, Light, Network…) can be collapsed by clicking the heading and the app remembers it. **Network**
  appears only after ticking "The device is on a network" and **Service** after ticking "Regular service".

### 2.16

- **Amplifiers**: power at 2 Ω, 4 Ω and 8 Ω per channel, bridge 4 Ω and 8 Ω, and country of manufacture.
- **Data by piece**: for equipment tracked by piece each piece has its own inventory and serial number and purchase date
  ("Data by piece" in the form, with Pieces in the detail). Search in Equipment finds these numbers too.
- **Operating hours by piece**: when reading, you choose the piece (e.g. each amplifier has its own counter), an overview
  of each piece's last reading and a chart for the chosen piece.
- **Warehouse – scanning**: "Scan" shows where the scanned case or equipment lies (marks the place on the plan). With a
  place selected, "Store here by scanning" stores cases one after another. Places (racks) have their own QR labels –
  scanning shows what lies on them.
- **Warehouse – search by number**: you find a case also by its label, the number on the label and **old numbers** (a
  new field on the case).
- **QR code as PNG**: on the QR labels you can download just the QR code without text (one or all).
- The in-app "What's new" no longer shows technical notes about the database.

### 2.15

- **Activities at events** (Settings → Reminders, admin only): your own list, e.g. loading, unloading, checking and
  storing truss, cabling check – defaults with one click, they can be added, reordered and switched off.
- **Who did what** (event detail): people are recorded for each activity – members and externals. A person from the
  crew can record themselves ("I did it").
- **Statistics → People**: hours worked per person (from time sheets and attendance) and for each activity a ranking of
  who did it most often – for the chosen year.

### 2.14

- **Meeting for an event** (event detail → Meeting and attendance): date, time and place – at the company (warehouse),
  at the venue, a hotel or another address (prefilled) and the radius within which arrival counts (300 m by default).
- **Attendance by location** (voluntary – everyone switches it on in Settings → Account → Attendance): around the
  meeting time the Overview shows a card with an **I'm here** button, which unlocks when you are on site. The arrival
  time is set by the server, the location is not stored anywhere.
- **Break and Waiting** (e.g. when waiting for someone): the time is not counted until you click Continue. **Finish**
  writes the attendance into the event's time sheet by itself (breaks and waiting are subtracted).
- **Overview for the leader**: who arrived when, whether arrival was verified by location, breaks, waiting and time
  worked. The leader can correct times and minutes – the time sheet is corrected with them.

### 2.13.2

- **Fix: My devices could not be added or edited** (error "Could not save") – the app sent the ethernet / LAN MAC under
  a wrong column name.
- **Equipment value without depreciation**: equipment has only the purchase price (per piece and total), Statistics the
  sum of purchase prices in total and by category.

### 2.13.1

- **Stage without duplicate fields**: the deck brand is now in "Manufacturer / brand" (with Nivtec, Bütec, Litec
  offered) and the general Category is not shown for stage – the type (decks, legs…) replaces it. A brand entered before
  moves to Manufacturer by itself when editing.

### 2.13

- **When I can't** (Calendar): everyone records when they cannot work (holiday, school…). The calendar has a new kind
  "Who can't", so you see who is missing when.
- **Crew availability on an event**: above the crew choice there is an overview of who can work at that time, who
  cannot (and why) and who is on another event. In the "Who" choice it is next to the name and a warning pops up when
  chosen.
- **Signing on mobile for a loan**: the loan detail has Signatures – on handover and return both the borrower and the
  company sign with a finger on the phone. The signatures are printed on the loan sheet (PDF).

### 2.12

- **QR labels**: the equipment and case details have a "QR label" button and Cases has "QR labels" (all at once, 3 in a
  row on A4). On the flight case label the QR code is at the top right and can be switched off. The QR is a plain link:
  the phone camera opens the detail even without the app.
- **Scanning**: the "Scan" button in Equipment and Cases opens the camera and the scanned label opens the detail. In the
  **pack list** a scanned case or equipment is ticked off straight away – just walk past the cases with your phone.
- **Equipment value**: you can enter the purchase price per piece and over how many years it depreciates (4 by
  default). The detail shows today's value (with per-piece tracking by each piece's purchase date), Statistics the total
  value and value by category. Prices are seen only by those who can edit equipment.
- **Piece history**: the equipment detail has "Change history and damage" – who changed what (move, status, count…) and
  recorded damage, together with events, loans, service and purchases that were already there.

### 2.11

- **Pack list** (event detail → Pack list): when loading and on return the crew ticks off cases and loose equipment; you
  see who ticked what and when, and what has not come back yet. Anyone in the event crew can tick.
- **Price offer** (event detail → Offer): equipment with rental prices × days, transport by km, staff, discount and VAT,
  with the company header – for print or PDF. The browser remembers the offer settings.
- **Schedule for the crew** (event detail → For the crew): a mobile overview – where to go (navigation), which days you
  are going, the programme by day, who is going with phone numbers, the organiser and links (rider, lightplot…).
- **What you may not do, you do not see**: the menu and overview show only modules you have permission for. A Helper
  additionally does not see calculators, networks, office or statistics.

### 2.10.1

- **Settings can be collapsed** – clicking a section heading collapses / expands it and the browser remembers it.
- **Permissions table on mobile**: the permission name stays visible when scrolling sideways and there is a hint that the
  table scrolls with a finger.

### 2.10

- **Check levels** (Settings → Reminders): none / small / medium / large and after how many days each is checked. Applies
  to **cases and racks** (level "none" = no check) and to operating hours.
- **Operating hours** (amplifiers, lights and other): tick "Track operating hours" and choose the check level; the
  equipment detail has a **chart** of how the hours grow and the average hours per month.
- **Lamp / halogen**: when it was last replaced and the counter reading at replacement – the detail shows how many hours
  it has run since.
- **Tasks after an event** can have assignees – e.g. the social media maker gets "Photos for social media" after every
  event.

### 2.9.3

- **Repair of value checks and functions**: `0072_repair_checks_functions.sql` sets all value checks (check
  constraints) and database functions to the current version – e.g. "violates check constraint
  event_payments_method_check" with the demo company. Generated from the resulting schema, does not change data, can be
  run several times (after 0071).

### 2.9.2

- **Repair of the whole database with one file**: `0071_repair_all_columns.sql` adds every missing column in all tables
  with permissions (e.g. "column vat of relation event_payments does not exist" with the demo company). It is generated
  from the resulting schema, does not change existing data and can be run several times.

### 2.9.1

- **Wi-Fi networks fix** ("Networks could not be loaded"): `0070` creates or completes the network tables if 0055 was not
  run or ran in an older version. Can be run several times. The message in Networks also shows the technical reason.
- The database check also detects older versions of 0055 and 0052.

### 2.9

- **Cameras**: full frame / APS-C sensor or action camera, and whether it has an HDMI output.
- **Stands** for speakers and microphones (Sound → Stands group).
- **Demo company fix** ("column networks of relation member_devices does not exist"): `0069` adds missing device and
  owner columns if 0052 / 0059 ran only partly. Can be run several times.

### 2.8

- **New kinds of equipment**: **IT** (phone, tablet / iPad, laptop, computer, router / network) and **Appliances**
  (coffee machine, fridge, kettle, heater – with power).
- **Video**: cameras, tripods, lenses and gimbals too.

### 2.7

- **DJ equipment**: year and country of manufacture, colour and condition (new / excellent / good / worn / damaged).
- **Cable without a "set"**: a new cable has an "Add another length" button – each length is saved as a separate item.
- **Events**: client and organiser are one (the organiser is entered); document upload removed (riders via links, old
  documents stay); the Stage button removed from the event; calendar only "Add to Google Calendar".
- **Notifications** are at the top of the app as a collapsible bar (not a separate page in the menu).
- **Missing migrations** are seen only by the developer (Overview, Settings → Database status); others see "contact the
  app developer" with the feature.
- **DMX dip switch**: also flipped switches (ON at the bottom).

### 2.6

- **Lights – type in groups**: moving (beam, wash, spot, hybrid), static (LED PAR, LED bar), effects (blinder, strobe,
  pixel line, laser, special effects), profile / theatre (profile, fresnel), machines (smoke, hazer, fazer) and
  **accessories** (hooks, clamps, barn doors, converters, lighting console, licence keys, fluids) – accessories without
  power, source and DMX.
- **Truss**: 1- / 2- / 3- / 4-point, ground support, accessories, stands / lifts; for 1–4-point the shape (straight,
  corner, T, cross, box, circle) and section length.
- **Stage**: decks (brand – e.g. Nivtec original – and size) or accessories.
- **Video**: the type is chosen from a list (LED panel, LED processor, TV, monitor, projector) instead of checkboxes.
- **Power (W)** is asked only where it makes sense (lights, active PA, amplifiers, processors) and is no longer shown in
  the equipment list – it is in the detail.

### 2.5

More detailed equipment:

- **Sound – PA group**: Line array (LA system), Live / portable PA (top), Monitor, Sub, Mixer, Amplifier, Processor /
  DSP and Stagebox. For PA (top, monitor, sub, LA) data from the spec sheet: active / passive, power continuous /
  program / peak, impedance, LF and HF driver, max SPL continuous and peak, sensitivity, frequency range and response,
  coverage, crossover, **bi-amp**, connectors and pole mount; for a sub the design (direct / horn / snail) and its own
  delay.
- **Mixer**: analogue / digital, channel count, for digital the card (Dante, MADI…). **Stagebox**: card / protocol.
- **Microphone**: wired / wireless, dynamic / condenser (a condenser switches on 48 V in the patch list by itself); for a
  wireless one the capsules that fit (also "New capsule"). **Wireless system and in-ear**: frequency range.
- **Cables**: type Cable / Adapter / **DI box** (active / passive) – the DI box is also offered in the patch list.
- **Weight (kg)** for every piece of equipment.
- **DMX dip switch**: 9 / 10 switches, ON at the top / OFF at the bottom, order (switch 1 on the left or right).

### 2.4

- **DMX dip switch** in Calculators: address → which switches to turn on (also with values 1 + 4 + 32…), clicking the
  switches back to an address, 9 or 10 switches; addresses for a row of lights (start, channels per light, count) also
  rolling over to the next universe, with the dip setting for each light.
- **New equipment**: "Kind" also has **Cable set** and **Microphone capsule** (they open their own form); "Add" in
  Equipment is one button again.

### 2.3

Tidying up the app:

- **Calculators** are one menu item – Nivtec stage, Sub delay and LED wall, with tabs between them.
- **Orders**: tabs Orders | Statistics | **Wantlist** (Wantlist is no longer separate in the menu; whoever has no orders
  opens the Wantlist directly from the menu).
- **Service**: tabs Records | **Service requests** | **Service technicians** (no longer separate in the menu; whoever has
  no service opens their requests from the menu).
- **Service requests for cars too** – a car has a "Report a fault" button, the form has a car choice.
- In an event, "Electricity – phases" lets you try another connection (e.g. 32 A instead of 16 A) without editing the
  event.

### 2.2

- **Phase balancing in an event** ("Electricity – phases" section): the event's equipment is split over L1–L3 (also 2
  phases or 1) as evenly as possible, taking other phase loads into account; shows kW and A per phase against the
  event's connection (CEE 16 / 32 / 63 / 125 A, socket) – an overloaded phase is red – and what goes on which phase.
  Equipment without power entered is listed so it can be filled in.
- **The annual report** is no longer in the menu: it shows at the top only on 31 Dec and 1 Jan (can be closed),
  otherwise it is in Statistics.
- **Office without prices**: only who bought what and how much is recorded; statistics in pieces and packs.

### 2.1

- **Sound patch list** for an event: channel, what goes on it, stagebox and input, source – a microphone from equipment,
  a wireless microphone with a capsule, a DI box or a port (XLR / socket or jack) – stand, phantom 48 V and note. The
  next channel is prefilled (channel +1, the same stagebox, the next input), the app marks duplicate channels, a patch
  can be loaded from another event. **Print / PDF** on A4 with a summary of what to prepare (microphones, capsules, DI,
  cables, stands).

### 2.0

A major version: RigTrack is no longer for just one company – companies can be linked and work together.

- **Linked companies** (Settings → Linked companies): linking with a company code, the other side confirms. Each company
  chooses what it shares:
  - **equipment** – shown at the partner in Equipment (More filters → Company: ours / ours and linked / partner only),
    without prices, serial numbers and notes;
  - **contacts** – in Companies and contacts tick "Share with linked companies" for a company; the partner sees them in
    the "From linked companies" section and can copy them;
  - **shared events** – in the event detail "Shared event with companies": you write what you supply, they what they
    supply (also equipment rental); the partner sees the event, date, venue and programme in Events.
- **New kinds of equipment**: **Video** (LED panel with pixel pitch – pixels are calculated, TV / monitor / projector
  screen with resolution and diagonal, LED processor with CH count, chip, USB / Ethernet control and HDMI / DVI / SDI /
  DisplayPort / VGA inputs) and **DJ equipment** (mixer, player, turntable, all-in-one console, PC controller).
- **LED calculator**: **phase balancing** (16 A circuits by column split over L1–L3, also 2 phases or 1, taking other
  phase loads into account), **pixel map (PNG)**, **Novastar settings** (outputs, start X / Y) and **slices for Resolume
  Arena** to download; panel P3.9 500×1000 per your data (12.5 kg, 275 W).
- **Equipment**: "Add" is a menu (equipment, cable set, capsules); Networks / IP only in the menu; on mobile "More
  filters" and sorting are the same size side by side.

### 1.19

- **Annual report** (menu → Annual report): events and days by month, who was at how many events, most frequent clients,
  bought equipment, services, damage and injuries, completed tasks; with permission also money (income, purchases,
  office, rewards, income − expenses). The admin sets in Permissions who sees it and who sees the money in it. It can
  be printed.
- **Import and export in Settings**: export everything (ZIP) or one module (Excel), **restore from backup** (adds missing
  records, does not change existing ones) and equipment import / export from Excel (moved from Equipment). The backup
  also includes capsules, service requests, office, damage and injuries, and post-event tasks.
- **Partner companies**: in Companies and contacts a "Create a company for them in RigTrack" button (company ID, tax ID
  and address are carried over, you are the admin and invite their people); when someone creates their own company, the
  app suggests the data that companies where they are recorded as a contact have about them.
- The LED calculator preselects the processor from your equipment.

### 1.18

- **Helper role** (a temp worker to help): sees only events where they are in the crew, only views equipment and cases,
  tasks, team and suggestions; sends service requests and sees only their own. The admin can allow case checks with the
  new permission "Check case contents" (applies to all roles).
- **LED calculator**:
  - **several walls at once** (Wall 1, 2, 3…, each a different size and panel) and a total for all;
  - **LED panels from the warehouse** – tick "LED panel" in equipment (size, pixels, weight, power); the calculator
    shows have / need and for missing ones you choose a **subcontractor** from Companies and contacts;
  - **truss by the sections in equipment** (truss with length) – how many sections of which length are needed and
    available;
  - **processor** (e.g. Novastar 4 / 6 / 8 / 16 outputs or yours from equipment – "LED processor"): port wiring by
    column, how many processors are needed and **the layout of walls into Full HD inputs** (several walls in one image,
    what does not fit goes to HDMI 2 as a second image);
  - **wall drawing** (panels, truss, towers, motors, dimensions) with download as an image.

### 1.17

- **LED calculator** (menu → LED calculator): from the wall size the number of panels (round to nearest / never larger /
  never smaller), the real size and m², resolution and aspect ratio, processor ports, weight, power, current and the
  number of 16 A circuits. By construction – hung on truss with motors, a ground-supported truss gate or stacked on the
  ground – it calculates the truss from the sections you have (3 / 2 / 1 / 0.5 m), joints with conical couplers, pins
  and R-clips, corner blocks and bases, hanging bars, slings, tops (2 endless loops), shackles, hanging points and the
  load per point with a warning when the motor's capacity is exceeded. Panels and material per bar / point / joint can
  be adjusted, the app remembers the settings.

### 1.16

- **Tasks** – several people per task, categories (web, social media…), filter by category; **post-event tasks**
  (templates that are created by themselves when an event ends) and a warning about tasks hanging for more than a month.
- **Office** – water, coffee, cups, sugar, milk, tea…: stock, who bought what (also the pack size, e.g. 1 kg of coffee)
  and statistics (who used how much, how much of what was bought).
- **Damage and injuries** – a record with the person, event, equipment, costs and who pays; statistics per person.
  Injuries are seen only by the admin, the person concerned and whoever recorded them.
- **Social networks** on the employee card; the name in the profile and on the card is synced.
- **A new company** takes over your personal details (phone, birth date, driving licence…) from the previous company.
- **Database status** in Settings (and a warning for the admin on the Overview) – which migrations are missing.
- A new version notice with a link to What's new; the company name on the Overview; the logo in What's new leads to the
  Overview; all equipment filters are under "More filters"; a demo company error shows the exact reason.

### 1.15

- **Big equipment filter** – kind, sound type, owner, manufacturer, warnings (service, restock, hours), Capture match,
  purchase year, with IP / MAC, with links; sorting (name, last edited, purchase date, piece count). The filter stays
  after returning from the detail.
- **Equipment** – purchase date of the whole item and per piece, links (manual, fixture, firmware…), for lights "copy
  of" and whether it matches Capture (yes / partly / no + why).
- **Microphone capsules** – their own list (Equipment → Capsules), on an event you choose which and how many go.
- **Cases and racks** – check priority (high 14 days / normal 60 / low 180), "To check", filter (check, priority,
  location, owner, category, contents) and sorting.
- **Orders** – who ordered, "not for us" (for whom), "add nothing to equipment", "without invoice"; filter, sorting
  (date, added, price) and **statistics** (by month, suppliers, who ordered).
- **Service requests** – anyone reports a fault (also from the equipment detail), service changes the status and
  replies; others see their own.
- **Contact from the phone** – for companies and the organiser "From phone" (Android) or from a .vcf file (iPhone: Share
  contact).

### 1.14.1

- **Database check** – `supabase/check-migrations.sql` lists which migrations the database has and which are missing
  (changes nothing). Missing older ones (`0020`–`0048`) are in `supabase/upgrade/`, newer in `supabase/migrations/`.
- Adding and editing equipment and cases also works on a database without migration `0052` (the owner is not saved
  then); an error shows the exact reason.

### 1.14

- **Multi-day events** – a programme by day (build, event, packing, travel, day off) with times and a note; for each day
  who from the crew goes (click the name).
- **Companies and contacts** – a new directory of organisers and partners: a group with company ID, tax ID and address,
  and people with phone numbers (each can be saved to contacts); on an event the organiser (several companies too) and
  cooperating companies, and whether they use RigTrack.
- **Rider, lightplot and links** – links with a tag on an event (rider, lightplot, stage plot, contract, photos…); we
  recommend a shared folder in Google Drive.
- **Transport and kilometres** – the event address, km from the warehouse **calculated from the map** (or by hand), the
  route in Google Maps; by day how many cars, how many trips, where people slept and extra km; total km for the event.
- **Personal time sheet** – on an event everyone records time from–to, breaks and expenses (fuel, food,
  accommodation…); only they and the admin / CEO see them.
- **Company details** in Settings – legal name, company ID, tax ID, VAT ID, registered office, CEO, contact and the
  **warehouse address**.
- **Devices** – a laptop etc. can also have a second MAC (ethernet / LAN); for a network you choose Wi-Fi or cable.
- **The organiser in the event form** is chosen from Companies and contacts or a new one is created (saved to the
  directory); an old text organiser can be saved to the directory with one click.
- Renamed: **Purchases → Wantlist**, **Cases → Cases and racks**.

### 1.13

- **Welcome questionnaire** – after signing in a new member fills in phone, e-mail, photo, position and birthday;
  everything is written to their card in Employees.
- **Employee card** – date of birth, name day and driving licence categories (clickable).
- **Birthdays and name days** – a notice at the top for colleagues (congratulations for the person celebrating) and in
  the Calendar.
- **Missing devices** – until a member records a phone, tablet / iPad and laptop with MAC, a red warning shines at the
  top; only the admin can grant an exception (e.g. no tablet) in their card.
- **Company news** – a new event and crew assignment are shown at the top to everyone, with a **Read** button.
- **Attendance confirmation** – a crew member clicks **I can / I can't** (and writes why); others see it.
- **E-mail for a new event** – the admin / CEO switches it on in Settings → Account (Edge Function `notify-new-event`).
- **App on the home screen** – a guide for iPhone, Android and computer, where an Install button is available too (in
  Settings → Account and on mobile on the Overview).
- **The demo company** has more: employees, devices, Wi-Fi networks, service technicians, service, rewards, income and an
  employee's own equipment.
- **Database in one file** – `supabase/baseline.sql` (state after `0058`) for a new installation.

### 1.12

- **Networks** – a new module: company Wi-Fi networks (e.g. a router for each mixer) with password, IP range, gateway,
  management IP, router model and **DHCP** range; a **QR code to connect** and reading a network from a QR code; the
  router management sign-in is seen only by those who may edit equipment.
- **All IP and MAC addresses** of equipment and members' devices in one table, by network, with prefix (/24), DHCP, a
  warning about duplicate IPs and a suggested free IP (outside the DHCP range).
- **Members' devices** (phone, laptop, iPad) are not equipment: each has Wi-Fi networks with IP and MAC, can be edited;
  the warehouse worker and admin record them for others too and see them in the employee card.
- **Who has an account** – the admin sees for members and invitations whether the person has an account, a confirmed
  e-mail and when they last signed in.
- **Invitation only** – only an invited e-mail can create an account (a hook in Supabase needs to be enabled).
- **CEO role** – the same rights as admin.
- **Employees' own equipment and cases / racks** – an owner for equipment and cases, "Belongs to: …" in the list and
  detail.
- **Employee card** – every member has one automatically; devices, own equipment, past events and for the admin /
  leader a yearly overview: how many events they were and were not at, days at events, roles and earnings.
- **Equipment by kind** – sound, light, stage, truss, cables…: DMX modes only for lights, cables and consumables without
  network and service, empty data is not shown in the detail; IP with prefix and an "IP from DHCP" option.
- **Delay calculator** – a sub's own delay (horn / snail) in equipment and in the calculator, for each sub separately
  and what to set in the processor; it is also counted when aligning with the tops.
- Clicking **RigTrack** leads to the Overview; in the bottom bar on mobile the **Overview is always first**.
- Fixed "your version" in What's new (1.1 vs 1.11); editing equipment shows the exact reason if it does not load.

### 1.11

- **Service technicians** – a directory of people and services for equipment and cars (company, phone, e-mail, address,
  what they do). Chosen for equipment service, a car record and as a car's **regular service**.
- **To contacts** – the event organiser, loan customer, service technician and employee can be saved to the phone with
  one click (.vcf).
- **To calendar** – an event and a loan are added to the phone / Outlook (.ics) or straight to Google Calendar; the
  Calendar exports all events and loans at once.
- **Collapsing sections** – equipment, crew, weather, photos, documents… on an event, loan, car, equipment and employee
  can be collapsed by clicking the heading; the browser remembers it.
- **Weather** – clicking a day shows the hourly forecast (rain, wind), links to Windy and Meteoblue.
- **Delay calculator** – aligning tops and subs, delay tower, **cardioid** (behind each other, side by side in a row,
  stack), **end-fire**, a straight row and **arc delay**; air temperature, choosing a sub from equipment with box
  dimensions, front / back estimate by frequency, a drawing from above.
- **Box dimensions** for speakers, subs and monitors.
- **My devices** – everyone records their phone, laptop or iPad with MAC address in Settings → Account; the admin and
  warehouse worker see them in the IP / MAC table.
- **Deleting a company** – the admin permanently deletes a company with all data and files in Settings (confirmed by the
  name).
- **What's new** – clicking "RigTrack v…" in the footer opens an overview of changes by version.

### 1.10.3

- The footer only has "Report a bug"; the "Bug reports" list is a button on the report page (and the admin also has it in
  Notifications).
- Deployment to GitHub Pages sees the Supabase variables also from the github-pages environment and stops with a clear
  error without them.

### 1.10.2

- The installed app looks for a new version by itself (when returning to the app and every hour) and offers "Update".

### 1.10.1

- "Bug reports" are no longer in the menu but in the footer next to "Report a bug".

### 1.10

- **Reporting a bug** – a "Something not working? Report a bug" link below every page: a description, an optional
  screenshot (also Ctrl+V); the page, version, company and browser are attached by themselves.
- **Bug reports** (link in the footer) – the author sees their own, the company admin their company's reports, the app
  developer all. The admin and developer change the status (new / in progress / resolved / won't fix) and write a reply
  to the author.
- New reports are in **Notifications** and arrive by **e-mail** to the developer and the company admin (Supabase Edge
  Function `notify-bug-report` + Resend).

### 1.9

- **Deployment to GitHub Pages** – with every push to `main` the app is tested, built and deployed to
  `https://<user>.github.io/RigTrack/`.
- The app can run in a subfolder (addresses, icons, PWA, links from e-mails); a directly opened subpage works.

### 1.8

- **Venue and electricity for an event:** indoor / outdoor / both, the power connection (230 V socket, CEE 16 / **32** /
  63 / 125 A five-pin, generator, no connection), the number of connections and a note. Until the connection is known,
  the event detail highlights it. It is also in the event print.
- **Weather for outdoor events:** a forecast from Open-Meteo for the event days (up to 16 days ahead) – temperatures,
  rain, wind gusts – and warnings for storms, rain, strong wind (truss, skirts) and frost. The place is searched by
  "Place for weather", otherwise by the venue.

### 1.7.1

- The stage calculator no longer shows a tips box; the deck to start building with is marked in the floor plan (1).
- The development server restarts by itself after the version in `package.json` changes, so the footer shows the
  current version.

### 1.7

- **Employees** – a new module: the team with photo, position, phone, e-mail, skills and a note, today's status (free /
  at an event / unavailable), **when they can't** (holiday, school…) and upcoming events. Members show up by themselves,
  temp workers without an account can be added by name. Everyone edits their own card and their own "when I can't";
  others are managed by whoever has the new permission Employees – manage.
- The event crew shows when someone is unavailable at that time.
- **Nivtec stage:** the floor plan marks the deck to start building with (1), and the tongue is drawn by the deck
  orientation (long side to the back: tongue back and right, start at the back left; long side to the front: tongue
  back and left, start at the back right). In the calculator you choose which smaller decks fill the rest (e.g. only 2
  × 0.5 m or only 1 × 0.5 m); the 2 × 0.5 m deck was added to the defaults.

### 1.6

- **Equipment packages** – in Settings → Packages, sets of whole cases and equipment with counts are put together (e.g.
  "Small sound package", "Large lighting package"), sorted by category.
- On an event and a loan a package is added with one click; counts are added to what is already selected, and equipment
  already in an added case is not added twice.
- Packages are also in the company backup.

### 1.5

- **Reminders for loans too** – the same rules are shown when creating and editing a loan.
- **How many are needed:** a rule can require at least one piece, or **a given number per piece** (e.g. 4 speakers = 4
  NL4 cables). The reminder says how many are missing and the **Add 3 pcs** button adds exactly that many (for equipment
  already selected it increases the count).

### 1.4

- **Event reminders** – in Settings → Reminders you set rules "when X is on the event, remind Y" (by equipment,
  category, case, kind, sound type or text in the name). E.g. amplifier → NL4 cabling, lights → case with hooks. When it
  is missing on the event, a reminder appears with the equipment with an **Add** button (or equipment choice) and **Not
  needed**.
- The rules are also in the company backup.

### 1.3

- **Statistics:** besides choosing what to see, you can **reorder** them – sections and individual statistics with up /
  down arrows; "Original order" restores them.
- **Nivtec stage** (in development):
  - **catwalk** – an extension from the stage (side, position, width, length) at the same height, with legs shared with
    the stage, an optional skirt and an opening in the stage's skirt, trims and railing;
  - **risers** – one or more (e.g. for drums), size, height, position on the stage, **fixed on legs or on wheels**, an
    optional skirt at the riser height;
  - the Nivtec settings have a leg with a wheel for mobile risers.

### 1.2

- **Statistics → Money** with a year choice:
  - for the company (whoever has the permission): income from events with and without VAT, rewards to members, what is
    left after rewards, income by month, a pie by payment method, by member and by role at the event;
  - for everyone: **my earnings**, a pie by role (lighting tech, sound engineer…), best months and earnings by year.
- Widgets a member has no permission for are not even offered in statistics.

### 1.1

- **Export to Excel** in the Bin (deleted records, also with a kind filter) and in Change history (who changed what and
  when – the whole history, not just the last 200 records, by the chosen filter).

### 1.0

The first complete version. Compared to the previous interim versions it adds:

- **Equipment:** DMX modes of lights, sound types (mixer, microphone, speaker…), kinds Truss and Stage, a colour bar
  by category, an **IP / MAC address** table with search and duplicate check.
- **Excel:** export and import of equipment and cases in one file – a sheet for each category, an empty template with
  explanations, a preview and error check before writing.
- **Events:** organiser, description and times, photos, **A4 / PDF print** with an equipment checklist, **event income**
  (cash / account / invoice through a company, with and without VAT), **equipment import from Capture** (Equipment
  Report in HTML or PDF), a warning about a case without a contents check.
- **Nivtec stage** (in development): a calculator of decks, legs, stairs, trims, skirts, railing, braces and
  accessories with a floor plan and adding to an event.
- **Orders:** purchases from second-hand sites (Bazoš, Kleinanzeigen, Willhaben, eBay…) and a purchase photo.
- **Photos** for cases and for "buy / want someday" items.
- **Demo company** for every user with a reset to the original state.
- **Backup of the whole company** as a ZIP with Excel files.
- Version number in the footer and in settings.
