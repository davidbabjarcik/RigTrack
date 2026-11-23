import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// HF plán akcie: editor (kanály, TV kanály, návrh frekvencií, uloženie), náhľad s kolíziami a PDF.
const EVENT_ID = '00000000-0000-4000-8000-0000000000e1'
const event = {
  id: EVENT_ID, company_id: COMPANY_ID, name: 'Ukážkový koncert', client: '', venue: 'Sála', starts_on: '2026-11-15', ends_on: '2026-11-15', status: 'planned', note: '',
  organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: null, show_end_time: null,
  setting: 'indoor', power: '', power_count: 1, power_note: '', weather_place: '',
}
const ch = (id: string, name: string, kind: string, freq: number | null) => ({ id, name, kind, equipment_id: null, min_mhz: 606, max_mhz: 630, freq_mhz: freq, locked: false })
const plan = {
  event_id: EVENT_ID, company_id: COMPANY_ID, place: 'Sála', note: '', version: 1, updated_at: '2026-11-20T10:00:00Z', excluded_tv: [38],
  settings: { spacing_khz: 350, imd3_khz: 100, imd5_khz: 50, fifth: false, step_khz: 25 },
  channels: [ch('a', 'Spev 1', 'mic', 614.5), ch('b', 'Spev 2', 'mic', 615.5), ch('c', 'Gitara', 'mic', 616.5), ch('d', 'IEM 1', 'iem', 620)],
}

test('HF plán: náhľad hlási intermoduláciu, PDF', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, { events: [event], event_rf_plans: [plan] })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  await expect(page.getByRole('button', { name: 'HF plán (4 kanálov)' })).toBeVisible()
  await expect(page.getByText('Kanály s problémom: 2')).toBeVisible()
  await expect(page.getByText('614.500')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF', exact: true }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^hf-plan-.*\.pdf$/)
  if (process.env.SAVE_PDF) await file.saveAs(process.env.SAVE_PDF)
  await page.screenshot({ path: info.outputPath(`hf-plan-${info.project.name}.png`), fullPage: true })
})

test('HF plán: editor navrhne frekvencie mimo vylúčeného TV kanála a uloží', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, { events: [event], event_rf_plans: [], 'rpc:save_rf_plan': [1] })
  await page.goto(`/events/${EVENT_ID}/rf`)
  for (let index = 0; index < 4; index++) await page.getByRole('button', { name: 'Pridať kanál' }).click()
  await page.getByRole('button', { name: '21', exact: true }).click()
  await page.getByRole('button', { name: 'Navrhnúť chýbajúce frekvencie' }).click()
  await expect(page.getByText('Bez kolízií v zadaných frekvenciách.')).toBeVisible()
  const request = page.waitForRequest((req) => req.url().includes('/rpc/save_rf_plan'))
  await page.getByRole('button', { name: 'Uložiť' }).click()
  const body = (await request).postDataJSON()
  expect(body._excluded_tv).toEqual([21])
  expect(body._channels).toHaveLength(4)
  for (const channel of body._channels) expect(channel.freq_mhz).toBeGreaterThanOrEqual(478)
  await page.screenshot({ path: info.outputPath(`hf-plan-editor-${info.project.name}.png`), fullPage: true })
})
