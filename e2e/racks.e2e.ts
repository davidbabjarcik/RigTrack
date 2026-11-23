import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Racky 19": zoznam, detail s predkom a zadkom po U a nový rack.
const RACK = '00000000-0000-4000-8000-0000000000d7'
const rack = {
  id: RACK, company_id: COMPANY_ID, name: 'Ukážkový FOH rack', rack_type: 'shock', units: 6, depth_mm: 450, rails: 'both', max_load_kg: 60, own_weight_kg: 18,
  note: '', case_id: null, event_id: null, is_template: true, version: 3, updated_at: '2026-11-20T10:00:00Z',
}
const slot = (id: string, side: string, bottom: number, height: number, extra: object) => ({ id, side, bottom_u: bottom, height_u: height, width: 'full', col: 0, equipment_id: null, unit: null, catalog_id: null, accessory: null, label: '', depth_mm: null, weight_kg: null, power_w: null, rear_support: null, ...extra })

test('racky: zoznam a detail s predkom a zadkom', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, {
    rack_designs: [rack],
    rack_slots: [slot('s1', 'front', 1, 2, { label: 'Ukážkový pult' }), slot('s2', 'front', 3, 1, { accessory: 'blank' }), slot('s3', 'rear', 1, 1, { accessory: 'pdu' })],
  })
  await page.goto('/racks')
  await expect(page.getByRole('link', { name: /Ukážkový FOH rack/ })).toContainText('6 U · Shock-mount flightcase')
  await expect(page.getByText('šablóna')).toBeVisible()
  await page.getByRole('link', { name: /Ukážkový FOH rack/ }).click()
  await expect(page.getByRole('heading', { name: 'Ukážkový FOH rack' })).toBeVisible()
  await expect(page.getByText(/6 U \(267 mm\) · hĺbka 450 mm/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ukážkový pult, U 1–2' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Záslepka, U 3' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'PDU (napájanie), U 1' })).toBeVisible()
  await expect(page.getByText('Obsadené 3 U · Voľné 3 U · Spolu 18 kg · Príkon 0 W')).toBeVisible()
})

test('nový rack: kontrola výšky', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { rack_designs: [] })
  await page.goto('/racks/new')
  await page.getByLabel('Názov *').fill('Ukážkový amp rack')
  await page.getByLabel('Výška (U) *').fill('60')
  await page.getByRole('button', { name: 'Uložiť' }).click()
  await expect(page.getByText('Výška racku je 2 až 48 U.')).toBeVisible()
})

test('výzva doplniť údaje k pridanej technike', async ({ page }) => {
  await signIn(page, { incompleteNotice: true })
  await fakeBackend(page, {
    equipment: [{ id: '00000000-0000-4000-8000-0000000000e9', company_id: COMPANY_ID, name: 'Ukážkový mikrofón', kind: 'audio', manufacturer: '', model: '', photo_path: '', category_id: null, status: 'available', created_at: new Date().toISOString() }],
  })
  await page.goto('/')
  await expect(page.getByText('Doplňte údaje k technike, ktorú ste pridali:')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ukážkový mikrofón' })).toHaveAttribute('href', '/equipment/00000000-0000-4000-8000-0000000000e9/edit')
  await page.getByRole('button', { name: 'Neskôr' }).click()
  await expect(page.getByText('Doplňte údaje k technike, ktorú ste pridali:')).toHaveCount(0)
})

test('editor racku: pridanie z panela, úprava, späť a uloženie', async ({ page }) => {
  await signIn(page)
  const AMP = '00000000-0000-4000-8000-0000000000e3'
  await fakeBackend(page, {
    rack_designs: [rack],
    rack_slots: [],
    equipment: [{ id: AMP, company_id: COMPANY_ID, name: 'Ukážkový zosilňovač', kind: 'audio', manufacturer: 'Ukážka', model: 'A2', quantity: 1, track_units: false, unit_ids: [], status: 'available', photo_path: 'x.jpg', category_id: 'c', attributes: { rackU: 2, weightKg: 22, powerW: 1200, depthMm: 400 }, updated_at: '2026-11-01T00:00:00Z' }],
    'rpc:save_rack': [4],
  })
  await page.goto(`/racks/${RACK}/fit`)
  await page.getByRole('button', { name: /Ukážkový zosilňovač/ }).first().click()
  await expect(page.getByRole('button', { name: 'Ukážkový zosilňovač, U 1–2' })).toBeVisible()
  await expect(page.getByText('Príkon 1200 W a v racku nie je PDU')).toBeVisible()
  await expect(page.getByText('Obsadené 2 U')).toBeVisible()
  // Doplnok a späť.
  await page.getByRole('tab', { name: 'Doplnky' }).click()
  await page.getByRole('button', { name: /Záslepka/ }).click()
  await expect(page.getByRole('button', { name: 'Záslepka, U 3' })).toBeVisible()
  await page.getByRole('button', { name: 'Späť' }).click()
  await expect(page.getByRole('button', { name: 'Záslepka, U 3' })).toHaveCount(0)
  // Uloženie: celé osadenie s verziou racku.
  const saved = page.waitForRequest((request) => request.url().includes('/rpc/save_rack'))
  await page.getByRole('button', { name: 'Uložiť' }).click()
  const body = (await saved).postDataJSON() as { _expected_version: number; _slots: { equipmentId: string; bottomU: number; heightU: number }[] }
  expect(body._expected_version).toBe(3)
  expect(body._slots).toEqual([expect.objectContaining({ equipmentId: AMP, bottomU: 1, heightU: 2, side: 'front' })])
  await expect(page.getByRole('button', { name: 'Uložené (verzia 4)' })).toBeVisible()
})
