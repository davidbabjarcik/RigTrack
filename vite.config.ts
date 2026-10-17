/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

export default defineConfig({
  // Verzia z package.json, aby sa v aplikácii ukazovala tá istá ako pri vydaní.
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    // Verzia sa číta pri štarte; po zmene package.json sa vývojový server reštartuje, aby pätička nebola zastaraná.
    {
      name: 'restart-on-version-change',
      configureServer(server) {
        const file = fileURLToPath(new URL('./package.json', import.meta.url))
        // Na Windows môžu cesty prísť s opačnými lomkami.
        const same = (path: string) => path.replace(/\\/g, '/').toLowerCase() === file.replace(/\\/g, '/').toLowerCase()
        server.watcher.add(file)
        server.watcher.on('change', (changed) => {
          if (same(changed)) void server.restart()
        })
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      // Novú verziu ponúkneme používateľovi, nikdy nereloadujeme uprostred formulára.
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'RigTrack',
        short_name: 'RigTrack',
        description: 'Evidencia techniky, kufrov, výpožičiek, servisu a eventov.',
        lang: 'sk',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache iba statický shell. Žiadna runtime cache: odpovede Supabase
        // (firemné dáta, signed URL, dokumenty) sa do Cache Storage neukladajú.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Čítanie PDF sa sťahuje až pri importe faktúry; do offline shellu nepatrí.
        globIgnores: ['**/pdf-*.js'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Databázové testy si v beforeAll stavajú celú schému zo všetkých migrácií;
    // pri paralelnom behu to pri predvolených 10 s občas nestihnú.
    hookTimeout: 60_000,
    testTimeout: 30_000,
    // Testy bežia vždy bez backendu, aj keď existuje .env.local.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
  },
})
