import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Harmonogram (festival s dvoma pódiami, upozornenia, tlač) a turné (zastávky, kopírovanie podkladov).
const event = (id: string, name: string, day: string) => ({
  id, company_id: COMPANY_ID, name, client: '', venue: 'Námestie', starts_on: day, ends_on: day, status: 'planned', note: '',
  organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: null, show_end_time: null,
  setting: 'indoor', power: '', power_count: 1, power_note: '', weather_place: '', tour_id: null,
})
const E1 = '00000000-0000-4000-8000-0000000000e1'
const E2 = '00000000-0000-4000-8000-0000000000e2'
const slot = (id: string, stage: string, from: string, to: string, kind: string, title: string) => ({ id, company_id: COMPANY_ID, event_id: E1, day: '2026-12-01', starts_at: `${from}:00`, ends_at: to ? `${to}:00` : null, stage, kind, title, note: '' })

test('harmonogram: festival s pódiami vedľa seba, upozornenie a tlač', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, {
    events: [event(E1, 'Ukážkový festival', '2026-12-01')],
    event_schedule_items: [slot('s1', 'Hlavné', '18:00', '', 'doors', 'Otvorenie'), slot('s2', 'Hlavné', '20:00', '21:00', 'act', 'Ukážková kapela 1'), slot('s3', 'Hlavné', '21:05', '22:00', 'act', 'Ukážková kapela 2'), slot('s4', 'Malé', '20:30', '21:30', 'act', 'Ukážkový DJ')],
  })
  await page.goto(`/events/${E1}`)
  await expect(page.getByRole('button', { name: 'Harmonogram (4)' })).toBeVisible()
  await expect(page.getByText('HLAVNÉ', { exact: true }).or(page.getByText('Hlavné', { exact: true })).first()).toBeVisible()
  await expect(page.getByText('je len 5 min na prestavbu', { exact: false })).toBeVisible()
  await page.screenshot({ path: info.outputPath(`harmonogram-${info.project.name}.png`), fullPage: true })
  await page.getByRole('link', { name: 'Tlačiť' }).first().click()
  await expect(page.getByRole('heading', { name: 'Harmonogram – Ukážkový festival' })).toBeVisible()
  await expect(page.getByText('Ukážkový DJ')).toBeVisible()
})

test('turné: zastávky a kopírovanie podkladov', async ({ page }, info) => {
  await signIn(page)
  const tour = { id: 't1', company_id: COMPANY_ID, name: 'Ukážkové turné', note: '', created_at: '2026-11-01T00:00:00Z' }
  await fakeBackend(page, {
    events: [{ ...event(E1, 'Zastávka 1', '2026-12-01'), tour_id: 't1' }, { ...event(E2, 'Zastávka 2', '2026-12-05'), tour_id: 't1' }],
    tours: [tour],
    'rpc:copy_show_docs': [3],
  })
  await page.goto('/tours')
  await expect(page.getByText('2 zastávok · 1. 12. 2026 – 5. 12. 2026')).toBeVisible()
  await page.getByRole('link', { name: /Ukážkové turné/ }).click()
  await expect(page.getByRole('heading', { name: 'Zastávky (2)' })).toBeVisible()
  await page.getByLabel('Z akcie').selectOption(E1)
  await page.getByLabel('1. 12. 2026 – Zastávka 1').or(page.getByLabel('5. 12. 2026 – Zastávka 2')).last().check()
  page.once('dialog', (dialog) => void dialog.accept())
  const request = page.waitForRequest((req) => req.url().includes('/rpc/copy_show_docs'))
  await page.getByRole('button', { name: 'Kopírovať do 1 akcií' }).click()
  const body = (await request).postDataJSON()
  expect(body).toMatchObject({ _from_event: E1, _to_event: E2, _what: ['iolist', 'stageplot', 'synoptic'] })
  await expect(page.getByText('Podklady skopírované do 1 akcií.')).toBeVisible()
  await page.screenshot({ path: info.outputPath(`turne-${info.project.name}.png`), fullPage: true })
})
