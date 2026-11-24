import { expect, test } from '@playwright/test'
import { fakeBackend, signIn } from './fakeBackend'

// Polia pre 19" rack len pri technike, ktorá do racku môže ísť (nie hliník, pódium, kábel, spotrebný materiál).
test('nová technika: rack U len pri technike do racku', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page)
  await page.goto('/equipment/new')
  const kind = page.getByLabel('Druh', { exact: true }).first()
  await kind.selectOption('audio')
  await expect(page.getByLabel('Do racku – výška (U)')).toBeVisible()
  await kind.selectOption('truss')
  await expect(page.getByLabel('Do racku – výška (U)')).toHaveCount(0)
  await expect(page.getByLabel('Hĺbka (mm)')).toHaveCount(0)
})
