import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Zmluva k eventu: vzor z údajov eventu, dodávateľa (vystavovateľ ponúk) a organizátora; cena a záloha sa doplnia.
const EVENT_ID = '00000000-0000-4000-8000-0000000000c7'
const event = {
  id: EVENT_ID, company_id: COMPANY_ID, kind: 'event', name: 'Ukážkový ples', client: '', venue: 'Ukážková sála', starts_on: '2026-12-05', ends_on: '2026-12-05', status: 'confirmed', note: '',
  organizer: 'Ukážková agentúra', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: '14:00:00', show_time: '20:00:00', show_end_time: '03:00:00',
  setting: 'indoor', power: 'cee32', power_count: 1, power_note: '', weather_place: '',
}
const fixtures = {
  events: [event],
  quote_issuers: [{ id: 'i1', company_id: COMPANY_ID, name: 'Ukážková firma s.r.o.', address: 'Ukážková 1, Mesto', ico: '12345678', dic: '2020000000', ic_dph: '', contact: '', vat_payer: false, kind: 'sro', sort: 0 }],
  partners: [{ id: 'p1', company_id: COMPANY_ID, name: 'Ukážková agentúra', legal_name: 'Ukážková agentúra s.r.o.', ico: '87654321', dic: '', ic_dph: '', address: 'Druhá 2, Mesto', ceo: 'Ukážkový konateľ', uses_app: false, note: '', linked_company_id: null, shared: false, legal_form: 'sro' }],
  event_partners: [{ event_id: EVENT_ID, partner_id: 'p1', kind: 'organizer', company_id: COMPANY_ID }],
}

test('zmluva k eventu: strany, cena a záloha', async ({ page, isMobile }, info) => {
  await signIn(page)
  await fakeBackend(page, fixtures)
  await page.goto(`/events/${EVENT_ID}`)
  await page.getByRole('link', { name: 'Zmluva' }).click()
  await expect(page.getByRole('heading', { name: 'Zmluva o technickom zabezpečení podujatia' })).toBeVisible()
  await expect(page.getByText('Ukážková firma s.r.o.').first()).toBeVisible()
  await expect(page.getByText('Ukážková agentúra s.r.o.').first()).toBeVisible()
  await expect(page.getByText('zastúpený: Ukážkový konateľ')).toBeVisible()
  await page.getByLabel('Cena (€)').fill('1500')
  await page.getByLabel('Záloha (€)').fill('500')
  await expect(page.getByText(/dohodou zmluvných strán 1\s500,00 €/)).toBeVisible()
  await expect(page.getByText(/zálohu 500,00 €/)).toBeVisible()
  await expect(page.getByText(/CEE 32 A/)).toBeVisible()
  await page.getByLabel('Druh zmluvy').selectOption('rental')
  await expect(page.getByRole('heading', { name: 'Zmluva o prenájme techniky' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  await page.screenshot({ path: info.outputPath(`zmluva-${info.project.name}.png`), fullPage: true })
  if (!isMobile) return
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tlačiť / PDF' }).click()
  expect((await download).suggestedFilename()).toBe('zmluva-Ukážkový-ples.pdf')
})
