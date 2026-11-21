import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Faktúry: zoznam s nezaplatenými a faktúra na tlač s údajmi dodávateľa, odberateľa a DPH.
const ID = '00000000-0000-4000-8000-0000000000f9'
const invoice = {
  id: ID, company_id: COMPANY_ID, number: '20260001', kind: 'final', event_id: null, offer_id: null,
  issuer: { name: 'Ukážková s.r.o.', address: 'Ukážková 1', ico: '12345678', dic: '2020', icDph: 'SK2020', contact: '', vatPayer: true, iban: 'SK0000000000000000000000', registerNote: '' },
  client: { name: 'Ukážkový klient', address: '', ico: '', dic: '', icDph: '' },
  lines: [{ label: 'Ozvučenie', quantity: 2, unit: 'ks', unitPrice: 100, vatRate: 23 }],
  issued_on: '2026-11-01', delivered_on: '2026-11-01', due_on: '2026-11-10', total_net: 200, total_vat: 46, total: 246, note: '', paid_on: null, cancelled_at: null, created_at: '2026-11-01T10:00:00Z',
}

test('faktúra po splatnosti v zozname a na tlač', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { invoices: [invoice] })
  await page.goto('/invoices')
  await expect(page.getByText('Po splatnosti')).toBeVisible()
  await page.getByRole('link', { name: /Ukážkový klient/ }).click()
  await expect(page.getByRole('heading', { name: 'Faktúra – daňový doklad' })).toBeVisible()
  await expect(page.getByText('IČ DPH: SK2020')).toBeVisible()
  await expect(page.getByText(/Základ 23 % \/ DPH/)).toBeVisible()
  await expect(page.getByText('Na úhradu').locator('xpath=following-sibling::span')).toHaveText(/246,00\s€/)
  await expect(page.getByRole('button', { name: 'Zaplatená' })).toBeVisible()
})

test('nová faktúra: súčet s DPH', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { invoices: [] })
  await page.goto('/invoices/new')
  await page.getByLabel('Položka 1').fill('Ukážkové osvetlenie')
  await page.getByLabel('Cena/MJ', { exact: false }).first().fill('100')
  await expect(page.getByText(/Spolu 123,00\s€/)).toBeVisible()
})
