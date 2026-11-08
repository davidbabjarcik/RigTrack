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
