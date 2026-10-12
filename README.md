# RigTrack

PWA na evidenciu techniky, kufrov, výpožičiek, servisu a eventov.

React + TypeScript + Vite, Tailwind CSS, React Router, TanStack Query, Supabase, `vite-plugin-pwa`.

## Spustenie

```bash
npm install
npm run dev
```

Pre pripojenie databázy skopíruj `.env.example` do `.env.local` a doplň údaje zo Supabase.

## Nasadenie na vlastný server (Docker + Cloudflare Tunnel)

Na serveri stačí Docker. Netreba otvárať porty na routeri ani riešiť certifikát — HTTPS zabezpečuje Cloudflare.

1. V Cloudflare Zero Trust → Networks → Tunnels vytvor tunel (typ Cloudflared) a skopíruj jeho token.
2. V tuneli pridaj Public Hostname `rigtrack.jef-sp.sk` so službou `http://web:80`.
3. Na serveri naklonuj repozitár, skopíruj `.env.example` do `.env` a doplň hodnoty.
4. Spusti `docker compose up -d --build`.

Aktualizácia: `git pull` a znova `docker compose up -d --build`.

## Skripty

- `npm run dev` — vývojový server
- `npm run build` — typecheck a produkčný build (vrátane service workera)
- `npm run preview` — náhľad produkčného buildu, tu sa dá vyskúšať inštalácia PWA
- `npm run lint` — ESLint
- `npm run test` — Vitest
