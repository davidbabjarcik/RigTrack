import { expect, test } from '@playwright/test'
import { COMPANY_ID, USER_ID, fakeBackend, signIn } from './fakeBackend'

// Výpis odmien za mesiac na tlač: akcie, zálohy a doplatok.
test('výpis odmien za mesiac', async ({ page }) => {
  await signIn(page)
  const pay = (id: string, amount: number, kind: string, on: string, paidAt: string | null = null) =>
    ({ id, company_id: COMPANY_ID, member_id: USER_ID, amount, kind, happened_on: on, event_id: null, note: `Ukážka ${id}`, paid_at: paidAt })
  await fakeBackend(page, { member_payments: [pay('p1', 200, 'reward', '2026-10-10'), pay('p2', 50, 'advance', '2026-10-12'), pay('p3', 80, 'reward', '2026-09-01', '2026-09-02T10:00:00Z')] })
  await page.goto('/payouts')
  await page.getByRole('link', { name: 'Výpis za mesiac' }).click()
  await expect(page.getByRole('heading', { name: /Výpis odmien – október 2026/ })).toBeVisible()
  await expect(page.getByText('Ukážka p1')).toBeVisible()
  await expect(page.getByText('Ukážka p3')).toHaveCount(0)
  await expect(page.getByText('Zostáva doplatiť').locator('xpath=following-sibling::dd[1]')).toHaveText(/150,00\s€/)
  await page.getByLabel('Mesiac').fill('2026-09')
  await expect(page.getByText('Ukážka p3')).toBeVisible()
})
