import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Cenová ponuka zo šablóny eventu: technika zo šablóny sa doplní do časti ponuky, miesto sa predvyplní.
const PA = '00000000-0000-4000-8000-0000000000e1'
const gear = {
  id: PA, company_id: COMPANY_ID, name: 'Ukážkový reprák', kind: 'audio', category_id: null, location_id: null, case_id: null, label_role: null, quantity: 4, track_units: false, unit_ids: [],
  rental_price: 30, min_quantity: null, manufacturer: '', model: '', serial_number: '', inventory_number: '', mac_address: '', ip_address: '',
  service_interval_months: null, last_service_on: null, hours_interval_months: null, operating_hours: null, hours_read_on: null, photo_path: '', status: 'available', note: '',
  updated_at: '2026-11-01T00:00:00Z', owner_staff_id: null, purchased_on: null, unit_purchases: {}, links: [], clone_of: '', capture_match: '', capture_note: '', unit_info: {}, attributes: {},
}

test('ponuka zo šablóny eventu', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, {
    equipment: [gear],
    event_templates: [{ id: 't1', company_id: COMPANY_ID, name: 'Ukážková svadba', updated_at: '2026-11-01T00:00:00Z', data: { venue: 'Ukážková sála', equipment: [{ equipmentId: PA, quantity: 2, caseId: null }], crew: [] } }],
  })
  await page.goto('/offers/new')
  await page.getByLabel('Technika zo šablóny eventu (nepovinné)').selectOption({ label: 'Ukážková svadba' })
  await expect(page.getByLabel('Miesto dodania')).toHaveValue('Ukážková sála')
  await page.getByRole('button', { name: 'Pridať techniku z eventu' }).first().click()
  await expect(page.getByText('2 × Ukážkový reprák').first()).toBeVisible()
})
