import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Zisk z eventu: príjem bez DPH mínus odmeny, doprava, výdavky a ďalšie náklady.
const EVENT_ID = '00000000-0000-4000-8000-0000000000e2'
const event = {
  id: EVENT_ID, company_id: COMPANY_ID, name: 'Ukážkový koncert', client: 'Ukážkový klient', venue: 'Hala', starts_on: '2026-11-15', ends_on: '2026-11-15', status: 'planned', note: '',
  organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: null, show_end_time: null,
  setting: 'indoor', power: '', power_count: null, power_note: '', weather_place: '', address: 'Hala 1', distance_km: 50,
}
const fixtures = {
  events: [event],
  event_payments: [{ id: 'pay1', event_id: EVENT_ID, amount: 2000, method: 'account', invoiced_by: '', vat: 'without', vat_rate: null, received_on: '2026-11-16', note: '', created_by_name: 'Tester' }],
  member_payments: [{ id: 'm1', member_id: '00000000-0000-4000-8000-000000000001', amount: 500, kind: 'reward', happened_on: '2026-11-15', event_id: EVENT_ID, note: '', paid_at: null }],
  event_travel: [{ id: 't1', event_id: EVENT_ID, travel_date: '2026-11-15', vehicles: 1, round_trips: 1, stay: 'home', stay_place: '', extra_km: 0, note: '', label: '' }],
  event_costs: [{ id: 'c1', event_id: EVENT_ID, kind: 'rental', partner_id: null, amount: 300, note: 'subwoofery' }],
  profit_settings: [{ km_rate: 0.5, gear_use_days: 60 }],
}

test('zisk z eventov: prehľad a detail eventu', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, fixtures)
  await page.goto('/profit')
  await page.getByLabel('Rok', { exact: true }).selectOption('2026')
  // 2000 − 500 odmeny − 50 € doprava (100 km × 0,5) − 300 prenájom = 1150
  await expect(page.getByText('Ukážkový koncert')).toBeVisible()
  await expect(page.getByText(/\+1\s?150,00\s?€/).first()).toBeVisible()
  await page.screenshot({ path: info.outputPath(`zisk-${info.project.name}.png`), fullPage: true })

  await page.goto(`/events/${EVENT_ID}?tab=money`)
  await expect(page.getByText(/Zisk z eventu/)).toBeVisible()
  await expect(page.getByText('subwoofery')).toBeVisible()
  await page.screenshot({ path: info.outputPath(`zisk-eventu-${info.project.name}.png`), fullPage: true })
})
