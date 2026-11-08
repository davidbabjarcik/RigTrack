import { defineConfig, devices } from '@playwright/test'

// Test celej appky v prehliadači: hotový build (rovnaký ako na webe, s CSP), databázu nahrádza
// náhradný server v teste (e2e/fakeBackend.ts) – žiadne skutočné dáta ani prihlásenie.
const PORT = 4174
const FAKE_SUPABASE = 'http://127.0.0.1:54321'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Service worker by obišiel náhradný server; v teste netreba offline režim.
    serviceWorkers: 'block',
    locale: 'sk-SK',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobil', use: { ...devices['Pixel 7'] } },
    { name: 'pc', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { VITE_SUPABASE_URL: FAKE_SUPABASE, VITE_SUPABASE_PUBLISHABLE_KEY: 'e2e-publishable-key', BASE_PATH: '/' },
  },
})
