# RigTrack

PWA na evidenciu techniky a jej prevádzky pre firmu z event/AV prostredia.

React + TypeScript + Vite, Tailwind CSS, React Router, TanStack Query, Supabase, `vite-plugin-pwa`.

## Moduly

- **Technika** — druhy s vlastnými poľami (kábel, svetlo, zvuk, spotrebný materiál), fotky, sieťové údaje,
  servisný interval, zásoby s upozornením „treba kúpiť“, hromadné pridanie káblov podľa dĺžok.
- **Sklad** — pôdorys s regálmi, paletami a zónami; kde ktorý case leží.
- **Cases** — obsah, hmotnosť a rozmery, kontroly, flight case štítok (PNG) a hárok FLIGHTCASE CONTENT (A4).
- **Objednávky** — nákupy s cenami, import faktúr z Thomannu (PDF sa číta v prehliadači), história nákupov pri technike.
- **Nákupy** — zoznamy „kúpiť“ a „chceme časom“.
- **Výpožičky** — rezervácia, vydanie, vrátenie; kolízie termínov stráži databáza vrátane techniky na eventoch.
- **Eventy** — technika, posádka a dokumenty k akcii.
- **Servis** — opravy, kontroly a údržba s prílohami; prepína stav techniky.
- **Vozidlá** — STK, EK, známky, poistky, záznamy o prevádzke, dokumenty.
- **Úlohy, Návrhy** — interná agenda firmy.
- **Odmeny** — odmeny a zálohy členov; člen vidí len svoje, admin všetky.
- **Kalendár, Upozornenia, Štatistiky** — odvodené pohľady, nič sa do nich nezapisuje.
- **Kôš** — zmazaná technika, cases, fotky a dokumenty sa dajú 30 dní obnoviť (`/admin/recycle-bin`, iba admin).
- **Nastavenia** — členovia a roly (admin, skladník, technik, viewer), pozvánky, logo, kategórie, história zmien.

Izolácia firiem a oprávnenia rolí stoja na RLS v databáze; kontroly vo frontende sú iba UX.

## Odložené na neskôr

- Notifikácie e-mailom a na telefón (upozornenia sú zatiaľ iba v aplikácii).

## Spustenie

```bash
npm install
npm run dev
```

Bez databázy beží iba kostra aplikácie bez prihlásenia.

## Pripojenie Supabase

1. Vytvor projekt na supabase.com.
2. V SQL Editore spusti postupne súbory zo `supabase/migrations/` (podľa čísla).
3. V Authentication → URL Configuration nastav Site URL (`http://localhost:5173`, neskôr produkčnú doménu)
   a medzi Redirect URLs pridaj `<adresa>/auth/update-password`.
4. Potvrdzovanie e-mailu (Authentication → Sign In / Providers → Email → Confirm email) nechaj **zapnuté** —
   pozvánky do firmy sa viažu na potvrdenú adresu.
5. Skopíruj `.env.example` do `.env.local` a doplň Project URL a publishable kľúč.

Migrácie a RLS pravidlá overujú testy v `supabase/tests/` (bežia v pamäti cez PGlite, bez Supabase).

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
- `npm run build` — typecheck a produkčný build (vrátane service workera)
- `npm run preview` — náhľad produkčného buildu, tu sa dá vyskúšať inštalácia PWA
- `npm run lint` — ESLint
- `npm run test` — Vitest
