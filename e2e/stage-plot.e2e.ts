import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Stage plán akcie: editor (pridanie položky, kanál z input listu, uloženie), náhľad v detaile a PDF.
const EVENT_ID = '00000000-0000-4000-8000-0000000000e1'
const event = {
  id: EVENT_ID, company_id: COMPANY_ID, name: 'Ukážkový koncert', client: '', venue: 'Sála', starts_on: '2026-11-15', ends_on: '2026-11-15', status: 'planned', note: '',
  organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: null, show_end_time: null,
  setting: 'indoor', power: '', power_count: 1, power_note: '', weather_place: '',
}
const patch = (id: string, channel: number, name: string) => ({ id, channel, name, stagebox: '', stagebox_input: null, source: 'mic', equipment_id: null, capsule_id: null, connector: '', stand: '', phantom: false, note: '', insert_note: '', color: '', company_id: COMPANY_ID, event_id: EVENT_ID })
const item = (id: string, kind: string, x: number, y: number, w: number, d: number, channel: number | null, label = '') => ({ id, kind, x, y, rot: 0, w, d, label, channel })
const plot = {
  event_id: EVENT_ID, company_id: COMPANY_ID, width_m: 10, depth_m: 6, note: 'Elektrina vľavo vzadu', version: 3, updated_at: '2026-11-20T10:00:00Z',
  items: [item('a', 'riser', 5, 1.5, 3, 2, null), item('b', 'drums', 5, 1.5, 2, 1.8, null), item('c', 'vocal', 5, 4.6, 0.45, 0.45, 1), item('d', 'wedge', 5, 5.4, 0.6, 0.45, null, 'Mix 1'), item('e', 'amp_guitar', 2, 2.5, 0.7, 0.35, 2), item('f', 'power', 0.5, 0.4, 0.35, 0.25, null)],
}

test('stage plán: náhľad pri akcii a PDF A3', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, { events: [event], event_patch: [patch('p1', 1, 'Spev'), patch('p2', 2, 'Gitara')], stage_plots: [plot] })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  await expect(page.getByRole('button', { name: 'Stage plán (6 položiek)' })).toBeVisible()
  const preview = page.getByRole('img', { name: 'Stage plán' })
  await expect(preview.getByText('CH 1')).toBeVisible()
  await expect(preview.getByText('Spev')).toBeVisible()
  await expect(page.getByText(/10 × 6 m · verzia 3/)).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF A3' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^stage-plan-.*koncert-A3.pdf$/)
  if (process.env.SAVE_PDF) await file.saveAs(process.env.SAVE_PDF)
  await page.screenshot({ path: info.outputPath(`stage-plan-${info.project.name}.png`), fullPage: true })
})

test('stage plán: editor pridá položku s kanálom a uloží verziu', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, { events: [event], event_patch: [patch('p1', 1, 'Spev'), patch('p2', 2, 'Gitara')], stage_plots: [], 'rpc:save_stage_plot': [1] })
  await page.goto(`/events/${EVENT_ID}/stage-plot`)
  await expect(page.getByRole('heading', { name: 'Stage plán' })).toBeVisible()
  await page.getByRole('button', { name: '+ Gitarový aparát' }).click()
  await page.getByLabel('Kanál z input listu').selectOption('2')
  const canvas = page.getByRole('img', { name: /Stage plán/ })
  await expect(canvas.getByText('Gitara')).toBeVisible()
  await expect(canvas.getByText('CH 2')).toBeVisible()
  await page.getByLabel('Šírka pódia (m)').fill('12')
  const request = page.waitForRequest((req) => req.url().includes('/rpc/save_stage_plot'))
  await page.getByRole('button', { name: 'Uložiť' }).click()
  const body = (await request).postDataJSON()
  expect(body._width).toBe(12)
  expect(body._items).toHaveLength(1)
  expect(body._items[0]).toMatchObject({ kind: 'amp_guitar', channel: 2, w: 0.7 })
  await page.screenshot({ path: info.outputPath(`stage-plan-editor-${info.project.name}.png`), fullPage: true })
})
