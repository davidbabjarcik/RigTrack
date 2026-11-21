import { expect, test } from '@playwright/test'
import { COMPANY_ID, USER_ID, fakeBackend, signIn } from './fakeBackend'

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

test('archívna technika: technik požiada CEO, CEO schváli', async ({ page }) => {
  await signIn(page)
  const EVENT_ID = '00000000-0000-4000-8000-0000000000e9'
  const ARCHIVED = '00000000-0000-4000-8000-0000000000b3'
  const event = {
    id: EVENT_ID, company_id: COMPANY_ID, kind: 'event', name: 'Ukážkový event', client: '', venue: '', starts_on: '2026-12-05', ends_on: '2026-12-05', status: 'planned', note: '',
    organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: null, show_end_time: null,
    setting: '', power: '', power_count: null, power_note: '', weather_place: '',
  }
  const me = { role: 'admin', company: { id: COMPANY_ID, name: 'Ukážková firma' }, profile: { email: 'tester@example.com', full_name: 'Tester' }, user_id: USER_ID, company_id: COMPANY_ID }
  const ceo = { ...me, role: 'ceo', profile: { email: 'ceo@example.com', full_name: 'Ukážkový CEO' }, user_id: '00000000-0000-4000-8000-0000000000f9' }
  const requests = [{ id: 'r1', company_id: COMPANY_ID, event_id: EVENT_ID, equipment_id: ARCHIVED, quantity: 2, note: 'na ples', status: 'pending', answer: '', requested_by: USER_ID, created_at: '2026-11-20T10:00:00Z' }]
  const backend = { events: [event], equipment: [piece(ARCHIVED, 'Ukážková stará hlava', 'archived')], equipment_requests: requests }

  // Admin vo firme s CEO: archívnu techniku nepridá, ale požiada o ňu a môže žiadosť zrušiť.
  await fakeBackend(page, { ...backend, company_members: [me, ceo] })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  await expect(page.getByText('Čaká na CEO')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zrušiť žiadosť' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Schváliť' })).toHaveCount(0)
  await expect(page.getByLabel('Požiadať CEO o archívnu techniku')).toBeVisible()

  // CEO vidí Schváliť / Zamietnuť.
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await fakeBackend(page, { ...backend, company_members: [{ ...me, role: 'ceo' }] })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Schváliť' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zamietnuť' })).toBeVisible()
})

test('štatistiky: predaná technika so ziskom alebo stratou', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, {
    equipment: [
      { ...piece(SOLD, 'Ukážkový starý pult', 'sold', { purchasePrice: 1000, soldOn: '2026-10-01', soldTo: 'Ukážkový kupec', soldPrice: 1300 }), quantity: 1 },
      { ...piece('00000000-0000-4000-8000-0000000000b1', 'Ukážkový pult', 'available', { purchasePrice: 500 }), quantity: 1 },
    ],
  })
  await page.goto('/stats')
  await expect(page.getByText('Predaná technika – zisk / strata', { exact: true })).toBeVisible()
  await expect(page.getByText(/\+300,00\s€/).first()).toBeVisible()
  await expect(page.getByText(/1 položka · kúpená za 1\s000,00\s€, predaná za 1\s300,00\s€/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ukážkový starý pult' })).toBeVisible()
})

test('predaná technika pre účtovníka: rok, tabuľka a Excel', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, {
    equipment: [
      piece(SOLD, 'Ukážkový starý pult', 'sold', { soldOn: '2026-10-01', soldTo: 'Ukážkový kupec', soldPrice: 300, purchasePrice: 500 }),
      piece('00000000-0000-4000-8000-0000000000b4', 'Ukážková stará hlava', 'sold', { soldOn: '2025-02-01', soldPrice: 100 }),
    ],
  })
  await page.goto('/stats')
  await page.getByRole('link', { name: 'Pre účtovníka (tlač, Excel)' }).click()
  await expect(page.getByRole('heading', { name: 'Predaná technika 2026' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Ukážkový kupec' })).toBeVisible()
  await expect(page.getByText('Ukážková stará hlava')).toHaveCount(0)
  await page.getByLabel('Rok').selectOption('')
  await expect(page.getByText('Ukážková stará hlava')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Stiahnuť (Excel)' }).click()
  expect((await download).suggestedFilename()).toBe('predana-technika-vsetko.csv')
})

test('návratnosť techniky v detaile', async ({ page }) => {
  await signIn(page)
  const ID = '00000000-0000-4000-8000-0000000000b5'
  const EVENT = '00000000-0000-4000-8000-0000000000e5'
  await fakeBackend(page, {
    equipment: [{ ...piece(ID, 'Ukážková hlava', 'available', { purchasePrice: 200 }), rental_price: 50 }],
    events: [{ id: EVENT, company_id: COMPANY_ID, kind: 'event', name: 'Ukážkový ples', client: '', venue: '', starts_on: '2026-01-10', ends_on: '2026-01-11', status: 'done', note: '', organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: null, show_end_time: null, setting: '', power: '', power_count: null, power_note: '', weather_place: '' }],
    event_equipment: [{ company_id: COMPANY_ID, event_id: EVENT, equipment_id: ID, quantity: 1, case_id: null }],
  })
  await page.goto(`/equipment/${ID}`)
  await expect(page.getByText(/zarobila odhadom 100,00\s€ \(eventy: 1, výpožičky: 0\)/)).toBeVisible()
  await expect(page.getByText(/50 % nákupnej ceny, chýba 100,00\s€/)).toBeVisible()
})

test('treba kúpiť: objednávka jedným ťuknutím', async ({ page }) => {
  await signIn(page)
  const ID = '00000000-0000-4000-8000-0000000000b6'
  await fakeBackend(page, { equipment: [{ ...piece(ID, 'Ukážková páska', 'available'), kind: 'consumable', quantity: 1, min_quantity: 4 }] })
  await page.goto('/orders')
  await page.getByRole('link', { name: 'Objednať' }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/orders/new' && url.searchParams.get('restock') === ID)
  await expect(page.getByLabel('Názov *')).toHaveValue('Ukážková páska')
  await expect(page.getByLabel('Ku ktorej technike pripočítať')).toHaveValue(ID)
})

test('inventúra: čo chýba a čo je nájdené', async ({ page }) => {
  await signIn(page)
  const A = '00000000-0000-4000-8000-0000000000b7'
  const B = '00000000-0000-4000-8000-0000000000b8'
  await page.addInitScript(([companyId, id]) => {
    localStorage.setItem(`rigtrack.inventory.${companyId}`, JSON.stringify({ spotId: '', startedOn: '2026-11-21', scanned: [{ kind: 'equipment', id, units: [], count: 1 }] }))
  }, [COMPANY_ID, A])
  await fakeBackend(page, { equipment: [piece(A, 'Ukážkový pult', 'available'), piece(B, 'Ukážková hlava', 'available')] })
  await page.goto('/cases')
  await page.getByRole('link', { name: 'Inventúra' }).click()
  await expect(page.getByRole('heading', { name: 'Chýba (1)' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ukážková hlava' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nájdené (1)' })).toBeVisible()
})
