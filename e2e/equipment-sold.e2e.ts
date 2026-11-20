import { expect, test } from '@playwright/test'
import { fakeBackend, signIn } from './fakeBackend'

// Predaná technika: v zozname sa neukazuje, ale je stále v Technike pod „Predaná technika“; archívna má svoj štítok.
const piece = (id: string, name: string, status: string, attributes: object = {}) => ({
  id, name, kind: 'general', category_id: null, location_id: null, case_id: null, label_role: 'main', quantity: 1, track_units: false, unit_ids: [],
  rental_price: null, min_quantity: null, manufacturer: '', model: '', serial_number: '', inventory_number: '', mac_address: '', ip_address: '',
  service_interval_months: null, last_service_on: null, hours_interval_months: null, operating_hours: null, hours_read_on: null, photo_path: '', status, note: '',
  updated_at: '2026-11-01T00:00:00Z', owner_staff_id: null, purchased_on: null, unit_purchases: {}, links: [], clone_of: '', capture_match: '', capture_note: '', unit_info: {},
  attributes,
})
const SOLD = '00000000-0000-4000-8000-0000000000b2'

test('predaná technika je stále v Technike a archívna má štítok', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, {
    equipment: [
      piece('00000000-0000-4000-8000-0000000000b1', 'Ukážkový pult', 'available'),
      piece(SOLD, 'Ukážkový starý pult', 'sold', { soldOn: '2026-10-01', soldTo: 'Ukážkový kupec', soldPrice: 300 }),
      piece('00000000-0000-4000-8000-0000000000b3', 'Ukážková stará hlava', 'archived'),
    ],
  })
  await page.goto('/equipment')
  await expect(page.getByText('Ukážkový pult', { exact: true })).toBeVisible()
  await expect(page.getByText('Ukážkový starý pult')).toHaveCount(0)
  await expect(page.getByText('Archívna').first()).toBeVisible()
  await page.getByRole('button', { name: 'Predaná technika (1)' }).click()
  await expect(page.getByText('Ukážkový starý pult')).toBeVisible()
  await expect(page.getByText('Ukážkový pult', { exact: true })).toHaveCount(0)
})

test('detail predanej techniky: kedy, komu a za koľko', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { equipment: [piece(SOLD, 'Ukážkový starý pult', 'sold', { soldOn: '2026-10-01', soldTo: 'Ukážkový kupec', soldPrice: 300 })] })
  await page.goto(`/equipment/${SOLD}`)
  await expect(page.getByText(/1. 10. 2026 · Ukážkový kupec · 300/)).toBeVisible()
  await page.goto(`/equipment/${SOLD}/edit`)
  await expect(page.getByLabel('Komu')).toHaveValue('Ukážkový kupec')
})
