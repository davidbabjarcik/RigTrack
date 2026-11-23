import { expect, test } from '@playwright/test'
import { fakeBackend } from './fakeBackend'

// Vytvorenie účtu: nápoveda k heslu podľa pravidiel Supabase Auth; slabé heslo sa ani neodošle.
test('vytvorenie účtu: požiadavky na heslo', async ({ page }, info) => {
  await fakeBackend(page)
  await page.goto('/auth?mode=signup')
  await page.getByRole('button', { name: 'Odmietnuť nepovinné' }).click()
  const rules = page.getByRole('list', { name: 'Požiadavky na heslo' })
  await expect(rules.getByText('aspoň 10 znakov')).toBeVisible()
  await page.getByLabel('Heslo', { exact: true }).fill('Heslo12345')
  await expect(rules.getByText('číslica – splnené')).toBeAttached()
  await expect(rules.getByText('symbol (napr. ! ? # -) – chýba')).toBeAttached()
  await page.getByLabel('Heslo', { exact: true }).fill('Ukazka-heslo-7')
  await expect(rules.getByText('– chýba')).toHaveCount(0)
  await page.screenshot({ path: info.outputPath(`heslo-${info.project.name}.png`), fullPage: true })
})
