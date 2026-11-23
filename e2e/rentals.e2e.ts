import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Dopyty na prenájom: porovnanie odpovedí pri akcii a stránka pre dodávateľa (r/:token).
const EVENT_ID = '00000000-0000-4000-8000-0000000000e1'
const event = {
  id: EVENT_ID, company_id: COMPANY_ID, name: 'Ukážkový festival', client: '', venue: 'Námestie', starts_on: '2026-12-01', ends_on: '2026-12-02', status: 'planned', note: '',
  organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: null, show_end_time: null,
  setting: 'indoor', power: '', power_count: 1, power_note: '', weather_place: '',
}
const quote = (item: string, available: number, price: number | null) => ({ item_id: item, available, unit_price: price, note: '' })
const supplier = (id: string, name: string, quotes: ReturnType<typeof quote>[], responded = true) => ({ id, partner_id: null, supplier_name: name, email: '', token: id.repeat(64), revoked_at: null, viewed_at: '2026-11-19T10:00:00Z', responded_at: responded ? '2026-11-20T10:00:00Z' : null, message: '', rental_quotes: quotes })
const request = {
  id: 'r1', company_id: COMPANY_ID, event_id: EVENT_ID, title: 'LED a suby', note: '', needed_from: '2026-12-01', needed_to: '2026-12-02', status: 'open', created_at: '2026-11-18T10:00:00Z',
  rental_request_items: [{ id: 'led', equipment_id: null, name: 'Ukážkový LED panel', quantity: 10, note: '', sort: 0 }, { id: 'sub', equipment_id: null, name: 'Ukážkový subwoofer', quantity: 4, note: '', sort: 1 }],
  rental_request_suppliers: [
    supplier('a', 'Ukážková požičovňa A', [quote('led', 10, 30), quote('sub', 4, 50)]),
    supplier('b', 'Ukážková požičovňa B', [quote('led', 10, 25), quote('sub', 2, 40)]),
    supplier('c', 'Ukážková požičovňa C', [], false),
  ],
}

test('dopyty na prenájom: porovnanie dodávateľov pri akcii', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, { events: [event], rental_requests: [request] })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  await expect(page.getByRole('button', { name: 'Dopyty na prenájom (1)' })).toBeVisible()
  await expect(page.getByText('Najlacnejší kompletný: Ukážková požičovňa A')).toBeVisible()
  await expect(page.getByRole('cell', { name: /500,00/ })).toBeVisible()
  await expect(page.getByText('zatiaľ neotvoril').or(page.getByText(/otvoril/)).first()).toBeVisible()
  await page.screenshot({ path: info.outputPath(`prenajom-${info.project.name}.png`), fullPage: true })
})

test('dopyt na prenájom: dodávateľ vyplní dostupnosť a cenu', async ({ page }, info) => {
  const data = {
    title: 'LED a suby', note: 'Dovoz zabezpečíme', from: '2026-12-01', to: '2026-12-02', open: true, supplier: 'Ukážková požičovňa A', message: '', respondedAt: null,
    companyName: 'Ukážková firma', logoPath: '', logoStyle: 'auto', contact: 'info@example.com', venue: 'Námestie',
    items: [{ id: 'led', name: 'Ukážkový LED panel', quantity: 10, note: '', available: null, price: null, answer: '' }],
  }
  await fakeBackend(page, { 'rpc:get_rental_request': [data, { ...data, respondedAt: '2026-11-23T10:00:00Z' }], 'rpc:answer_rental_request': [null] })
  await page.goto(`/r/${'a'.repeat(64)}`)
  await expect(page.getByRole('heading', { name: 'LED a suby' })).toBeVisible()
  await expect(page.getByText('Tajný')).toHaveCount(0)
  await page.getByLabel('Máte ks – Ukážkový LED panel').fill('8')
  await page.getByLabel('Cena – Ukážkový LED panel').fill('35,50')
  const request = page.waitForRequest((req) => req.url().includes('/rpc/answer_rental_request'))
  await page.getByRole('button', { name: 'Odoslať odpoveď' }).click()
  const body = (await request).postDataJSON()
  expect(body._answers).toEqual([{ item_id: 'led', available: 8, price: '35.50', note: '' }])
  await page.screenshot({ path: info.outputPath(`prenajom-dodavatel-${info.project.name}.png`), fullPage: true })
})
