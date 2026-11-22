import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Hárok s obsahom case: appka si pamätá tlač a pri zmene obsahu upozorní, že ho treba vytlačiť znova.
const CASE_ID = '00000000-0000-4000-8000-0000000000ca'
const box = { id: CASE_ID, company_id: COMPANY_ID, name: 'Ukážkový case', inventory_number: '', location_id: null, label_number: '1', label_category: '', label_title: '', label_photo_path: '', photo_path: '', weight_kg: null, width_cm: null, length_cm: null, depth_cm: null, spot_id: null, spot_level: null, note: '', updated_at: '2026-11-01T00:00:00Z' }
const gear = {
  id: '00000000-0000-4000-8000-0000000000cb', company_id: COMPANY_ID, name: 'Ukážkový kábel', kind: 'cable', category_id: null, location_id: null, case_id: CASE_ID, label_role: 'main', quantity: 10, track_units: false, unit_ids: [],
  rental_price: null, min_quantity: null, manufacturer: '', model: '', serial_number: '', inventory_number: '', mac_address: '', ip_address: '',
  service_interval_months: null, last_service_on: null, hours_interval_months: null, operating_hours: null, hours_read_on: null, photo_path: '', status: 'available', note: '',
  updated_at: '2026-11-01T00:00:00Z', owner_staff_id: null, purchased_on: null, unit_purchases: {}, links: [], clone_of: '', capture_match: '', capture_note: '', unit_info: {}, attributes: {},
}
// Odtlačok z času tlače nesedí s dnešným obsahom (obsah sa medzitým zmenil).
const brand = { id: COMPANY_ID, logo_path: '', label_footer: '', logo_style: 'auto' }
const printed = [{ company_id: COMPANY_ID, kind: 'case', target_id: CASE_ID, label: 'content', printed_at: '2026-11-10T10:00:00Z', content_hash: '0000000000000000' }]

test('zmenený obsah case po tlači hárku: upozornenie pri case aj v Tlači', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { cases: [box], equipment: [gear], printed_labels: printed })
  await page.goto(`/cases/${CASE_ID}`)
  await expect(page.getByText('Obsah case sa od tlače hárku (10. 11. 2026) zmenil – vytlačte hárok s obsahom znova.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Vytlačiť hárok' })).toHaveAttribute('href', `/cases/${CASE_ID}/content`)
  await page.goto('/print')
  await expect(page.getByText('Treba vytlačiť znova – zmenil sa obsah case (1)')).toBeVisible()
})

test('nevytlačený hárok a QR štítok pri technike', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { cases: [box], equipment: [gear] })
  await page.goto(`/cases/${CASE_ID}`)
  await expect(page.getByText('Hárok s obsahom ešte nebol vytlačený')).toBeVisible()
  await page.goto(`/equipment/${gear.id}`)
  await expect(page.getByText('QR štítok ešte nevytlačený')).toBeVisible()
})

test('hromadná tlač: ZIP so štítkami, obsahmi A4 a A5 (2 na A4) a mierka štítku', async ({ page }) => {
  const second = { ...box, id: '00000000-0000-4000-8000-0000000000cc', name: 'Druhý case', label_number: '2' }
  await signIn(page)
  await fakeBackend(page, { cases: [box, second], equipment: [gear], companies: [brand] })
  await page.goto(`/print/batch?labels=${CASE_ID}&contents=${CASE_ID}~A5-portrait,${second.id}~A5-portrait,${second.id}`)
  // Štítok (1 strana), obsah A4 (1 strana), dva obsahy A5 na jednej A4.
  await expect(page.getByText('3 strán A4.')).toBeVisible()
  await expect(page.getByText('= 15,6 × 12,7 cm')).toBeVisible()
  const cleared = page.waitForRequest((request) => request.method() === 'DELETE' && request.url().includes('print_queue') && request.url().includes('label=eq.case_label'))
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Stiahnuť ZIP' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('rigtrack-tlac.zip')
  const bytes = (await import('node:fs')).readFileSync(await file.path()).toString('latin1')
  for (const name of ['stitky-cases.pdf', 'obsahy-A4.pdf', 'obsahy-A5-2-na-A4.pdf']) expect(bytes).toContain(name)
  // Vytlačené zmizne z tlačovej fronty samo.
  await cleared

  await page.getByLabel('Veľkosť štítku case').fill('50')
  await page.getByLabel('Veľkosť štítku case').press('Enter')
  await expect(page.getByText('= 7,8 × 6,4 cm')).toBeVisible()
  await expect(page.getByText('3 strán A4.')).toBeVisible()
})

test('štítok case: veľkosť v % s rozmerom v cm', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { cases: [box], equipment: [gear], companies: [brand] })
  await page.goto(`/cases/${CASE_ID}/label`)
  await expect(page.getByText('Ukážkový case · 15,6 × 12,7 cm pri 100 %')).toBeVisible()
  await page.getByLabel('Veľkosť štítku case').fill('80')
  await page.getByLabel('Veľkosť štítku case').press('Enter')
  await expect(page.getByText('Ukážkový case · 12,4 × 10,2 cm pri 80 %')).toBeVisible()
  await expect(page.getByRole('button', { name: 'PDF na A4' })).toBeEnabled()
})
