import { expect, test, type Page } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Site plán: mapa (dlaždice nahradené v teste, nič sa nesťahuje z OSM), trasy s dĺžkou, káble do pack listu, PDF, editor.
const EVENT_ID = '00000000-0000-4000-8000-0000000000e1'
const CABLE = '00000000-0000-4000-8000-0000000000c5'
const event = {
  id: EVENT_ID, company_id: COMPANY_ID, name: 'Ukážkový festival', client: '', venue: 'Námestie', starts_on: '2026-12-01', ends_on: '2026-12-01', status: 'planned', note: '',
  organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: null, show_end_time: null,
  setting: 'outdoor', power: '', power_count: 1, power_note: '', weather_place: '',
}
const cable = { id: CABLE, company_id: COMPANY_ID, name: 'Ukážkový kábel 400 V 50 m', kind: 'cable', manufacturer: '', model: '', quantity: 6, track_units: false, unit_ids: [], status: 'available', photo_path: 'x.jpg', category_id: 'c', attributes: { lengthM: 50, connector: 'cee32' }, updated_at: '2026-11-01T00:00:00Z' }
const plan = {
  event_id: EVENT_ID, company_id: COMPANY_ID, note: 'Vjazd zozadu', version: 2, updated_at: '2026-11-20T10:00:00Z',
  view: { lat: 48.1486, lon: 17.1077, zoom: 18 },
  markers: [{ id: 'm1', kind: 'stage', lat: 48.1490, lon: 17.1077, label: 'Pódium' }, { id: 'm2', kind: 'power', lat: 48.1482, lon: 17.1070, label: 'Rozvádzač' }],
  routes: [{ id: 'r1', kind: 'power', label: 'Rozvádzač → pódium', equipment_id: CABLE, slack_pct: 10, points: [[48.1482, 17.1070], [48.1490, 17.1070], [48.1490, 17.1077]] }],
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
async function fakeTiles(page: Page) {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG, headers: { 'access-control-allow-origin': '*' } }))
}

test('site plán: mapa, dĺžka trasy, káble do pack listu a PDF', async ({ page }, info) => {
  await signIn(page)
  await fakeTiles(page)
  await fakeBackend(page, { events: [event], equipment: [cable], event_site_plans: [plan] })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  await expect(page.getByRole('button', { name: 'Site plán (1 trás)' })).toBeVisible()
  // 0,0008° šírky ≈ 89 m + 0,0007° dĺžky pri 48° ≈ 52 m ≈ 141 m, s rezervou 10 % = 155 m → 4 kusy po 50 m.
  await expect(page.getByText('Rozvádzač → pódium · 155 m · 4× Ukážkový kábel 400 V 50 m')).toBeVisible()
  await expect(page.getByText('© OpenStreetMap contributors').first()).toBeVisible()
  const added = page.waitForRequest((req) => req.url().includes('/event_equipment') && req.method() === 'POST')
  await page.getByRole('button', { name: 'Káble do techniky akcie' }).click()
  // Falošný backend na PATCH nevracia riadky – stačí, že sa kábel pridal do techniky akcie.
  expect((await added).postDataJSON()).toMatchObject({ equipment_id: CABLE })
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF', exact: true }).first().click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^site-plan-.*\.pdf$/)
  await page.screenshot({ path: info.outputPath(`site-plan-${info.project.name}.png`), fullPage: true })
})

test('site plán: editor – značka a trasa kábla, uloženie', async ({ page }) => {
  await signIn(page)
  await fakeTiles(page)
  await fakeBackend(page, { events: [event], equipment: [cable], event_site_plans: [], 'rpc:save_site_plan': [1] })
  await page.goto(`/events/${EVENT_ID}/site`)
  const map = page.getByRole('application', { name: 'Mapa' })
  await expect(map).toBeVisible()
  const box = (await map.boundingBox())!
  await page.getByLabel('Pridať značku').selectOption('foh')
  await map.click({ position: { x: box.width / 2, y: box.height / 2 } })
  await page.getByLabel('Popis').fill('FOH')
  await page.getByLabel('Nakresliť trasu kábla').selectOption('signal')
  await map.click({ position: { x: box.width / 2, y: box.height / 2 + 40 } })
  await map.click({ position: { x: box.width / 2 + 120, y: box.height / 2 + 40 } })
  await page.getByRole('button', { name: 'Hotovo' }).click()
  await page.getByLabel('Kábel z techniky').selectOption(CABLE)
  await expect(page.getByText(/Trasy káblov – spolu \d+ m/)).toBeVisible()
  const request = page.waitForRequest((req) => req.url().includes('/rpc/save_site_plan'))
  await page.getByRole('button', { name: 'Uložiť' }).click()
  const body = (await request).postDataJSON()
  expect(body._markers).toHaveLength(1)
  expect(body._markers[0]).toMatchObject({ kind: 'foh', label: 'FOH' })
  expect(body._routes[0]).toMatchObject({ kind: 'signal', equipment_id: CABLE, slack_pct: 10 })
  expect(body._routes[0].points).toHaveLength(2)
})
