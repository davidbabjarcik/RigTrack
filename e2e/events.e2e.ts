import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Event: program po dňoch už pri zakladaní a v detaile miesto a elektrina vedľa organizátora.
const EVENT_ID = '00000000-0000-4000-8000-0000000000e1'
const event = {
  id: EVENT_ID, company_id: COMPANY_ID, name: 'Ukážkový festival', client: '', venue: 'Námestie', starts_on: '2026-11-15', ends_on: '2026-11-17', status: 'planned', note: '',
  organizer: 'Agentúra', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: '14:00:00', show_time: '21:00:00', show_end_time: '03:00:00',
  setting: 'indoor', power: 'cee32', power_count: 1, power_note: '', weather_place: '',
}
const day = (id: string, date: string, kind: string, from: string, to: string) => ({ id, day: date, kind, starts_at: from, ends_at: to, note: '', company_id: COMPANY_ID, event_id: EVENT_ID })
const fixtures = {
  events: [event],
  event_days: [day('d1', '2026-11-15', 'build', '14:00:00', '22:00:00'), day('d2', '2026-11-16', 'show', '21:00:00', '03:00:00'), day('d3', '2026-11-17', 'teardown', '03:00:00', '07:00:00')],
  partners: [{ id: 'p1', company_id: COMPANY_ID, name: 'Agentúra', ico: '', dic: '', address: '', uses_app: false, note: '', linked_company_id: null, shared: false, legal_name: '', ic_dph: '', ceo: '', legal_form: '' }],
  event_partners: [{ event_id: EVENT_ID, partner_id: 'p1', kind: 'organizer', company_id: COMPANY_ID }],
}

test('nový event: program po dňoch podľa dátumov', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page)
  await page.goto('/events/new')
  await page.getByLabel('Od *').fill('2026-11-15')
  await page.getByLabel('Do *').fill('2026-11-17')
  const kinds = page.getByLabel(/^Druh dňa/)
  await expect(kinds).toHaveCount(3)
  await expect(kinds.nth(0)).toHaveValue('build')
  await expect(kinds.nth(1)).toHaveValue('show')
  await expect(kinds.nth(2)).toHaveValue('teardown')
  await page.getByLabel(/^Od 15/).fill('14:00')
  await page.screenshot({ path: info.outputPath(`novy-event-${info.project.name}.png`), fullPage: true })
})

test('detail eventu: časy len v programe, organizátor vedľa miesta', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, fixtures)
  await page.goto(`/events/${EVENT_ID}`)
  await expect(page.getByText('Program po dňoch')).toBeVisible()
  await expect(page.getByText('Časy (prvý deň)')).toHaveCount(0)
  await page.screenshot({ path: info.outputPath(`detail-eventu-${info.project.name}.png`), fullPage: true })
})

test('detail eventu: karty a viac áut v jeden deň', async ({ page }, info) => {
  await signIn(page)
  const travel = (id: string, stay: string, label: string) => ({ id, travel_date: '2026-11-15', vehicles: 1, round_trips: 1, stay, stay_place: '', extra_km: 0, note: '', label, company_id: COMPANY_ID, event_id: EVENT_ID })
  await fakeBackend(page, { ...fixtures, events: [{ ...event, address: 'Námestie 1', distance_km: 50 }], event_travel: [travel('t1', 'home', 'Dodávka'), travel('t2', 'venue', 'Osobné')] })
  await page.goto(`/events/${EVENT_ID}`)
  await expect(page.getByRole('tab', { name: 'Prehľad' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Program po dňoch')).toBeVisible()
  await page.getByRole('tab', { name: 'Doprava a peniaze' }).click()
  await expect(page).toHaveURL(/tab=money/)
  await expect(page.getByText('Program po dňoch')).toHaveCount(0)
  await expect(page.getByLabel('Auto alebo šofér')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Ďalšie auto v tento deň' })).toHaveCount(1)
  await page.screenshot({ path: info.outputPath(`doprava-${info.project.name}.png`), fullPage: true })
})

test('technika eventu: celková váha', async ({ page }) => {
  await signIn(page)
  const item = (id: string, name: string, weightKg?: number) => ({
    id, company_id: COMPANY_ID, name, kind: 'light', category_id: null, location_id: null, case_id: null, label_role: 'main', quantity: 4, track_units: false, unit_ids: [],
    rental_price: null, min_quantity: null, manufacturer: '', model: '', serial_number: '', inventory_number: '', mac_address: '', ip_address: '',
    service_interval_months: null, last_service_on: null, hours_interval_months: null, operating_hours: null, hours_read_on: null, photo_path: '', status: 'available', note: '',
    updated_at: '2026-11-01T00:00:00Z', owner_staff_id: null, purchased_on: null, unit_purchases: {}, links: [], clone_of: '', capture_match: '', capture_note: '', unit_info: {},
    attributes: weightKg ? { weightKg } : {},
  })
  await fakeBackend(page, {
    ...fixtures,
    equipment: [item('00000000-0000-4000-8000-0000000000a1', 'Ukážková hlava', 20.5), item('00000000-0000-4000-8000-0000000000a2', 'Ukážkový kábel')],
    event_equipment: [
      { company_id: COMPANY_ID, event_id: EVENT_ID, equipment_id: '00000000-0000-4000-8000-0000000000a1', quantity: 2, case_id: null },
      { company_id: COMPANY_ID, event_id: EVENT_ID, equipment_id: '00000000-0000-4000-8000-0000000000a2', quantity: 3, case_id: null },
    ],
  })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  await expect(page.getByText('Celková váha')).toContainText('≈ 41 kg')
  await expect(page.getByText('(1 položka bez zadanej váhy)')).toBeVisible()
})

test('nakladanie: case s technikou a repro mimo case', async ({ page }) => {
  await signIn(page)
  const gear = (id: string, name: string, attributes: object) => ({
    id, company_id: COMPANY_ID, name, kind: 'audio', category_id: null, location_id: null, case_id: null, label_role: 'main', quantity: 2, track_units: false, unit_ids: [],
    rental_price: null, min_quantity: null, manufacturer: '', model: '', serial_number: '', inventory_number: '', mac_address: '', ip_address: '',
    service_interval_months: null, last_service_on: null, hours_interval_months: null, operating_hours: null, hours_read_on: null, photo_path: '', status: 'available', note: '',
    updated_at: '2026-11-01T00:00:00Z', owner_staff_id: null, purchased_on: null, unit_purchases: {}, links: [], clone_of: '', capture_match: '', capture_note: '', unit_info: {},
    attributes,
  })
  const CASE = '00000000-0000-4000-8000-0000000000d9'
  await fakeBackend(page, {
    ...fixtures,
    equipment: [
      gear('00000000-0000-4000-8000-0000000000a3', 'Ukážkový top', { audioType: 'pa_top', boxWidthCm: 50, boxDepthCm: 40, boxHeightCm: 70, weightKg: 25 }),
      gear('00000000-0000-4000-8000-0000000000a4', 'Ukážkový mikrofón', { weightKg: 0.5 }),
    ],
    cases: [{ id: CASE, company_id: COMPANY_ID, name: 'Ukážkový case', inventory_number: '', location_id: null, label_number: '', label_category: '', label_title: '', label_photo_path: '', photo_path: '', weight_kg: 10, width_cm: 40, length_cm: 60, depth_cm: 40, spot_id: null, spot_level: null, note: '', updated_at: '2026-11-01T00:00:00Z' }],
    event_equipment: [
      { company_id: COMPANY_ID, event_id: EVENT_ID, equipment_id: '00000000-0000-4000-8000-0000000000a3', quantity: 2, case_id: null },
      { company_id: COMPANY_ID, event_id: EVENT_ID, equipment_id: '00000000-0000-4000-8000-0000000000a4', quantity: 4, case_id: CASE },
    ],
    vehicles: [{ id: 'v1', company_id: COMPANY_ID, plate: 'UK-123AA', model: 'Ukážková dodávka', vin: '', status: 'active', driver: '', odometer_km: null, stk_until: null, ek_until: null, vignette_until: null, pzp_until: null, casco_until: null, leasing_until: null, photo_path: '', payload_kg: 1000, cargo_length_cm: 300, cargo_width_cm: 170, cargo_height_cm: 170, cargo_obstacles: [], technician_id: null, note: '' }],
  })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  await expect(page.getByText('Treba 1 vozidlo')).toBeVisible()
  // Case 10 kg + 4 mikrofóny po 0,5 kg; dva topy po 25 kg.
  await expect(page.getByText(/1 z 1 cases a 2 ks techniky mimo cases · spolu 62 kg/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ukážkový top (1/2)' })).toHaveAttribute('href', /\/equipment\//)
  // Vykladá sa najskôr: označené ide do auta posledné (v zozname nakladania na konci).
  await page.getByRole('group', { name: 'Na mieste sa vykladá najskôr' }).getByRole('button', { name: 'Ukážkový case' }).click()
  await expect(page.getByRole('group', { name: 'Na mieste sa vykladá najskôr' }).getByRole('button', { name: 'Ukážkový case' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('ol li').last()).toContainText('Ukážkový case')
})

test('po skončení eventu sa cenová ponuka neponúka', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { ...fixtures, events: [{ ...event, starts_on: '2026-01-10', ends_on: '2026-01-11' }] })
  await page.goto(`/events/${EVENT_ID}`)
  await expect(page.getByText('Odohraný').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Rýchla ponuka' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Cenová ponuka' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Zmluva' })).toBeVisible()
})

test('chýbajúca technika: náhrada zo skladu jedným ťuknutím', async ({ page }) => {
  await signIn(page)
  const light = (id: string, name: string, quantity: number) => ({
    id, company_id: COMPANY_ID, name, kind: 'light', category_id: null, location_id: null, case_id: null, label_role: 'main', quantity, track_units: false, unit_ids: [],
    rental_price: null, min_quantity: null, manufacturer: '', model: '', serial_number: '', inventory_number: '', mac_address: '', ip_address: '',
    service_interval_months: null, last_service_on: null, hours_interval_months: null, operating_hours: null, hours_read_on: null, photo_path: '', status: 'available', note: '',
    updated_at: '2026-11-01T00:00:00Z', owner_staff_id: null, purchased_on: null, unit_purchases: {}, links: [], clone_of: '', capture_match: '', capture_note: '', unit_info: {}, attributes: {},
  })
  const OTHER = '00000000-0000-4000-8000-0000000000e2'
  const HEAD = '00000000-0000-4000-8000-0000000000a1'
  await fakeBackend(page, {
    ...fixtures,
    events: [event, { ...event, id: OTHER, name: 'Ukážkový iný event' }],
    equipment: [light(HEAD, 'Ukážková hlava', 4), light('00000000-0000-4000-8000-0000000000a5', 'Ukážková iná hlava', 2)],
    event_equipment: [
      { company_id: COMPANY_ID, event_id: EVENT_ID, equipment_id: HEAD, quantity: 2, case_id: null },
      { company_id: COMPANY_ID, event_id: OTHER, equipment_id: HEAD, quantity: 4, case_id: null },
    ],
  })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  await expect(page.getByText('Chýba 2 ks v tomto termíne.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ukážková iná hlava (2 voľné)' })).toBeEnabled()
})

test('šablóna eventu: uloženie z detailu a nový event zo šablóny', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, {
    ...fixtures,
    event_templates: [{ id: 't1', company_id: COMPANY_ID, name: 'Ukážková svadba', updated_at: '2026-11-01T00:00:00Z', data: { venue: 'Ukážková sála', power: 'cee32', getInTime: '12:00', equipment: [], crew: [{ memberId: null, name: 'Ukážkový technik', role: 'Zvuk' }] } }],
  })
  await page.goto(`/events/${EVENT_ID}`)
  await expect(page.getByRole('button', { name: 'Uložiť ako šablónu' })).toBeVisible()

  await page.goto('/events/new')
  await page.getByLabel('Zo šablóny').selectOption({ label: 'Ukážková svadba' })
  await expect(page.getByLabel('Miesto')).toHaveValue('Ukážková sála')
  await expect(page.getByText('Po uložení sa pridá technika (0 položiek) a posádka (1).')).toBeVisible()
})
