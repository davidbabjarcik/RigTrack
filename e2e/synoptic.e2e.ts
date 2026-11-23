import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Synoptika akcie: náhľad so súhrnom káblov, PDF a editor (uzly, prepojenie, kábel, uloženie).
const EVENT_ID = '00000000-0000-4000-8000-0000000000e1'
const event = {
  id: EVENT_ID, company_id: COMPANY_ID, name: 'Ukážkový festival', client: '', venue: 'Námestie', starts_on: '2026-11-15', ends_on: '2026-11-15', status: 'planned', note: '',
  organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: null, show_end_time: null,
  setting: 'indoor', power: '', power_count: 1, power_note: '', weather_place: '',
}
const node = (id: string, kind: string, label: string, x: number, y: number) => ({ id, kind, label, detail: '', x, y, equipment_id: null, rack_id: null })
const link = (id: string, from: string, to: string, signal: string, cable: string, length: number | null, count = 1) => ({ id, from, to, signal, cable, length_m: length, count, label: '' })
const synoptic = {
  event_id: EVENT_ID, company_id: COMPANY_ID, note: 'FOH 50 m od pódia', version: 2, updated_at: '2026-11-20T10:00:00Z',
  nodes: [node('a', 'console', 'FOH pult', 40, 40), node('b', 'stagebox', 'Stagebox pódium', 400, 40), node('c', 'rack', 'Amp rack', 400, 200), node('d', 'speaker', 'PA vľavo', 760, 140), node('e', 'speaker', 'PA vpravo', 760, 280)],
  links: [link('l1', 'a', 'b', 'aes50', 'CAT6', 50, 2), link('l2', 'b', 'c', 'analog', 'Multipár 8', 5), link('l3', 'c', 'd', 'analog', 'NL4', 15), link('l4', 'c', 'e', 'analog', 'NL4', 15)],
}

test('synoptika: náhľad, súhrn káblov a PDF', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, { events: [event], event_synoptics: [synoptic] })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  await expect(page.getByRole('button', { name: 'Synoptika (4 prepojení)' })).toBeVisible()
  await expect(page.getByText('Káble:')).toBeVisible()
  await expect(page.getByText('2× CAT6 100 m · 1× Multipár 8 5 m · 2× NL4 30 m')).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF A4' }).nth(0).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^synoptika-.*-A4\.pdf$/)
  if (process.env.SAVE_PDF) await file.saveAs(process.env.SAVE_PDF)
  await page.screenshot({ path: info.outputPath(`synoptika-${info.project.name}.png`), fullPage: true })
})

test('synoptika: editor – uzly, prepojenie, kábel a uloženie', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { events: [event], event_synoptics: [], 'rpc:save_synoptic': [1] })
  await page.goto(`/events/${EVENT_ID}/synoptic`)
  await page.getByRole('button', { name: '+ Pult' }).click()
  await page.getByRole('button', { name: '+ Stagebox' }).click()
  const drawing = page.getByRole('img', { name: 'Synoptika' })
  // Posledný pridaný uzol (stagebox) je vybraný.
  await page.getByRole('button', { name: 'Prepojiť s…' }).click()
  await drawing.getByText('Pult', { exact: true }).click({ force: true })
  await page.getByLabel('Signál').selectOption('aes50')
  await page.getByLabel('Kábel').fill('CAT6')
  await page.getByLabel('Dĺžka (m)').fill('50')
  await expect(drawing.getByText('CAT6 · 50 m')).toBeVisible()
  const request = page.waitForRequest((req) => req.url().includes('/rpc/save_synoptic'))
  await page.getByRole('button', { name: 'Uložiť' }).click()
  const body = (await request).postDataJSON()
  expect(body._nodes).toHaveLength(2)
  expect(body._links[0]).toMatchObject({ signal: 'aes50', cable: 'CAT6', length_m: 50 })
})
