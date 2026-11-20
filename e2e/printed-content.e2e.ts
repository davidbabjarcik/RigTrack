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
