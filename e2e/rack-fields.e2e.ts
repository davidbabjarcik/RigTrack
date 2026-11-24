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

test('nová technika: „upozorniť, keď ostane“ len pri spotrebnom materiáli', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page)
  await page.goto('/equipment/new')
  const kind = page.getByLabel('Druh', { exact: true }).first()
  await kind.selectOption('audio')
  await expect(page.getByLabel('Upozorniť, keď ostane (ks)')).toHaveCount(0)
  await kind.selectOption('consumable')
  await expect(page.getByLabel('Upozorniť, keď ostane (ks)')).toBeVisible()
})

test('nový kábel: kúpené hotové', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page)
  await page.goto('/equipment/new')
  await page.getByLabel('Druh', { exact: true }).first().selectOption('cable')
  await page.getByRole('radio', { name: 'Kúpené hotové' }).click()
  await expect(page.getByText('Káble sú kúpené hotové', { exact: false })).toBeVisible()
})

