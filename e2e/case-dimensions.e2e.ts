import { expect, test } from '@playwright/test'
import { fakeBackend, signIn } from './fakeBackend'

// Rozmery case: obrázok, ako merať (šírka, hĺbka, výška), guľové rohy a kolieska.
test('nový case: rozmery s obrázkom, rohmi a kolieskami', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page)
  await page.goto('/cases/new')
  await expect(page.getByRole('img', { name: /Ako merať/ })).toBeVisible()
  await expect(page.getByRole('spinbutton', { name: 'Šírka' })).toHaveAttribute('placeholder', 'zľava doprava')
  await expect(page.getByRole('spinbutton', { name: 'Hĺbka' })).toHaveAttribute('placeholder', 'spredu dozadu')
  await expect(page.getByRole('spinbutton', { name: 'Výška' })).toHaveAttribute('placeholder', 'od zeme hore')
  await page.getByLabel('Guľové rohy').selectOption('yes')
  await page.getByLabel('Kolieska').selectOption('bottom')
  // Na mobile nič netečie do strany.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  await page.getByRole('group', { name: 'Vonkajšie rozmery (cm)' }).screenshot({ path: info.outputPath(`case-rozmery-${info.project.name}.png`) })
})
