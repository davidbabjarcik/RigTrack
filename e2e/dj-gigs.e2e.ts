import { expect, test } from '@playwright/test'
import { COMPANY_ID, USER_ID, fakeBackend, signIn } from './fakeBackend'

// DJ hranie: druh akcie pri evente, vlastná farba v kalendári a „Kto hrá“ namiesto posádky.
const GIG_ID = '00000000-0000-4000-8000-0000000000f1'
const gig = {
  id: GIG_ID, company_id: COMPANY_ID, kind: 'dj', name: 'Ukážkový klub', client: '', venue: 'Ukážková ulica', starts_on: '2026-11-20', ends_on: '2026-11-20', status: 'confirmed', note: '',
  organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: '22:00:00', show_end_time: '02:00:00',
  setting: '', power: '', power_count: null, power_note: '', weather_place: '',
}
const crew = { id: 'c1', company_id: COMPANY_ID, event_id: GIG_ID, member_id: null, name: 'Ukážkový DJ', role: 'DJ', response: 'pending', response_note: '', created_at: '2026-11-01T00:00:00Z' }

test('DJ hranie v zozname, detaile a kalendári', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, { events: [gig], event_crew: [crew] })
  await page.goto('/events')
  await expect(page.getByRole('link', { name: /Ukážkový klub/ })).toContainText('DJ')
  await expect(page.getByRole('link', { name: /Ukážkový klub/ })).toContainText('Ukážkový DJ')

  await page.goto(`/events/${GIG_ID}`)
  await expect(page.getByText('DJ hranie').first()).toBeVisible()
  await page.getByRole('tab', { name: 'Kto hrá' }).click()
  await expect(page.getByText('Kto hrá (1)')).toBeVisible()
  await expect(page.getByText('Ukážkový DJ')).toBeVisible()

  await page.goto('/calendar')
  await expect(page.getByRole('button', { name: 'DJ hrania' })).toBeVisible()
  await expect(page.getByText('hrá Ukážkový DJ').first()).toBeVisible()
  await page.screenshot({ path: info.outputPath(`dj-kalendar-${info.project.name}.png`), fullPage: true })
})

test('nové DJ hranie má predvolený druh', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page)
  await page.goto('/events')
  await page.getByRole('link', { name: 'DJ hranie' }).click()
  await expect(page.getByRole('heading', { name: 'Nové DJ hranie' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'DJ hranie' })).toBeChecked()
  await page.getByRole('radio', { name: 'Event' }).check({ force: true })
  await expect(page.getByLabel('Názov eventu *')).toBeVisible()
})

test('odmena DJ-a pri DJ hraní', async ({ page }) => {
  await signIn(page)
  const me = { ...crew, id: 'c2', member_id: USER_ID, name: '' }
  await fakeBackend(page, {
    events: [gig],
    event_crew: [me],
    member_payments: [{ id: 'p1', company_id: COMPANY_ID, member_id: USER_ID, amount: 150, kind: 'reward', happened_on: '2026-11-20', event_id: GIG_ID, note: 'DJ hranie', paid_at: null }],
  })
  await page.goto(`/events/${GIG_ID}?tab=crew`)
  await expect(page.getByText(/Odmena 150,00\s€/)).toBeVisible()
  await expect(page.getByText(/nevyplatené 150,00\s€/)).toBeVisible()
  await page.getByLabel('Odmena za hranie (€)').fill('50')
  await expect(page.getByLabel('Odmena za hranie (€)').locator('xpath=following-sibling::button')).toBeEnabled()
})

test('DJ profil na karte a jeho technika na hranie jedným ťuknutím', async ({ page }) => {
  await signIn(page)
  const STAFF_ID = '00000000-0000-4000-8000-0000000000d1'
  const pult = {
    id: '00000000-0000-4000-8000-0000000000d2', name: 'Ukážkový DJ pult', kind: 'general', category_id: null, location_id: null, case_id: null, label_role: 'main', quantity: 1,
    track_units: false, unit_ids: [], rental_price: null, min_quantity: null, manufacturer: '', model: '', serial_number: '', inventory_number: '', mac_address: '', ip_address: '',
    service_interval_months: null, last_service_on: null, hours_interval_months: null, operating_hours: null, hours_read_on: null, photo_path: '', status: 'available', note: '',
    updated_at: '2026-11-01T00:00:00Z', owner_staff_id: STAFF_ID, purchased_on: null, unit_purchases: {}, links: [], clone_of: '', capture_match: '', capture_note: '', unit_info: {}, attributes: {},
  }
  await fakeBackend(page, {
    events: [gig],
    event_crew: [crew],
    staff: [{ id: STAFF_ID, company_id: COMPANY_ID, member_id: null, name: 'Ukážkový DJ', position: '', phone: '', email: '', photo_path: '', skills: '', note: '', active: true }],
    equipment: [pult],
  })
  await page.goto(`/staff/${STAFF_ID}`)
  await expect(page.getByText('Hraní 2026')).toBeVisible()
  await expect(page.getByText('pri DJ hraní sa pridá jedným ťuknutím')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ukážkový klub 20. 11. 2026 · Ukážková ulica' })).toBeVisible()

  await page.goto(`/events/${GIG_ID}?tab=crew`)
  await expect(page.getByRole('button', { name: 'Pridať jeho techniku (1)' })).toBeVisible()
})
