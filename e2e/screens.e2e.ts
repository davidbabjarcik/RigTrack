import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { fakeBackend, signIn } from './fakeBackend'

// Každá obrazovka appky (zoznam ciest priamo z routera) sa musí otvoriť bez chyby – aj v hotovom builde
// s ochranou CSP a so sťahovaním častí appky až pri otvorení.
const router = readFileSync('src/app/router.tsx', 'utf8')
const ROUTES = [...router.matchAll(/path: '([^']*)'/g)]
  .map((match) => match[1])
  .filter((path) => path && path !== '*' && !path.includes(':') && path !== '/')
  .map((path) => `/${path.replace(/^\//, '')}`)
// Cesty s parametrom: neexistujúci záznam musí ukázať „nenájdené“, nie spadnúť.
const PARAM_ROUTES = ['/equipment/x', '/cases/x', '/events/x', '/loans/x', '/vehicles/x', '/orders/x', '/partners/x', '/service/x']
const PUBLIC = ['/home', '/auth', '/changelog', '/about', '/help', '/ochrana-sukromia', '/cookies', '/podmienky-pouzivania']

/** Chyby v prehliadači počas otvorenia stránky (výnimky, zablokované skripty, CSP). */
function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`výnimka: ${error.message}`))
  page.on('console', (message) => {
    const text = message.text()
    if (message.type() === 'error' && /Content Security Policy|Refused to|Failed to fetch dynamically imported module|ChunkLoadError/.test(text)) errors.push(`konzola: ${text}`)
  })
  return errors
}

async function expectScreen(page: Page, path: string, errors: string[]) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  // Chybová stránka routera (text „Niečo sa pokazilo“ môže byť aj v novinkách, preto podľa tlačidla).
  await expect(page.getByRole('button', { name: 'Obnoviť stránku' }), `${path}: ukázala sa chybová stránka`).toHaveCount(0)
  await expect(page.locator('#root'), `${path}: prázdna stránka`).not.toBeEmpty()
  expect(errors, path).toEqual([])
}

test.describe('verejné stránky', () => {
  for (const path of PUBLIC) {
    test(path, async ({ page }) => {
      await fakeBackend(page)
      const errors = watchErrors(page)
      await expectScreen(page, path, errors)
    })
  }
})

test.describe('obrazovky prihláseného', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await fakeBackend(page)
  })

  test('prehľad sa otvorí vo firme', async ({ page }) => {
    const errors = watchErrors(page)
    await expectScreen(page, '/', errors)
    // Na mobile je názov firmy v skrytom menu – stačí, že appka firmu načítala.
    await expect(page.getByText('Ukážková firma').first()).toBeAttached()
  })

  for (const path of [...ROUTES, ...PARAM_ROUTES]) {
    test(path, async ({ page }) => {
      const errors = watchErrors(page)
      await expectScreen(page, path, errors)
    })
  }
})
