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
  // Prijatá cenová ponuka k eventu – cena sa z nej predvyplní.
  quotes: [{
    id: 'q1', company_id: COMPANY_ID, event_id: EVENT_ID, number: '20261201', status: 'accepted', client: {}, issuer_id: null, issuer: {}, budget: null, title: '', place: '', service_dates: '',
    issued_on: '2026-11-01', sections: [], vat_mode: 'none', vat_pct: 20, total_override: 1800, notes: '', author_name: '', updated_at: '2026-11-01T00:00:00Z',
  }],
}

const saved = {
  id: 'z1', company_id: COMPANY_ID, event_id: EVENT_ID, number: 'Z2026-001', kind: 'service',
  data: {
    supplier: { name: 'Ukážková firma s.r.o.', address: 'Ukážková 1, Mesto', ico: '12345678', dic: '', icDph: '', representative: '' },
    client: { name: 'Ukážková agentúra s.r.o.', address: 'Druhá 2, Mesto', ico: '87654321', dic: '', icDph: '', representative: 'Ukážkový konateľ' },
    terms: { kind: 'service', price: 1500, vat: 'none', deposit: null, dueDays: 14, cancellation: '', extra: '', place: 'Mesto', withEquipment: false },
    subject: { eventName: 'Ukážkový ples', when: '5. 12. 2026', venue: 'Ukážková sála', times: '', getIn: '', power: '', gear: [], dj: false },
    createdOn: '2026-11-20',
  },
  client_signer: 'Ukážkový konateľ', client_signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  supplier_signer: '', supplier_signature: null, created_at: '2026-11-20T10:00:00Z',
}

test('zmluva: cena z prijatej ponuky, uložené zmluvy a podpis', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { ...fixtures, event_contracts: [saved] })
  await page.goto(`/events/${EVENT_ID}/contract`)
  await expect(page.getByLabel('Cena (€)')).toHaveValue('1800')
  await expect(page.getByText('z prijatej ponuky 20261201')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Uložiť zmluvu' })).toBeVisible()
  await expect(page.getByText('Uložené zmluvy (1)')).toBeVisible()
  await expect(page.getByText('podpísaná jednou stranou')).toBeVisible()
  await page.getByRole('button', { name: 'Z2026-001', exact: true }).click()
  await expect(page.getByText('Číslo zmluvy: Z2026-001')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Podpis: Ukážkový konateľ' })).toBeVisible()
  await expect(page.getByText('Objednávateľ podpísal: Ukážkový konateľ')).toBeVisible()
  await page.getByRole('button', { name: 'Podpis: Dodávateľ' }).click()
  await expect(page.getByText(/Podpisom potvrdzujem zmluvu Z2026-001/)).toBeVisible()
})

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

test('klient podpíše zmluvu cez odkaz bez prihlásenia', async ({ page }) => {
  // Len súhlas s cookies (rovnako ako pri teste ponuky cez odkaz); stránka prihlásenie nepotrebuje.
  await signIn(page)
  await fakeBackend(page, {
    'rpc:get_shared_contract': [{ number: 'Z2026-002', kind: 'service', data: saved.data, createdAt: '2026-11-20T10:00:00Z', clientSigner: '', clientSignature: null, supplierSigner: '', supplierSignature: null, companyName: 'Ukážková firma' }],
  })
  await page.goto('/z/00000000-0000-4000-8000-00000000abcd')
  await expect(page.getByText('Zmluva Z2026-002 od Ukážková firma s.r.o.')).toBeVisible()
  await expect(page.getByText('Číslo zmluvy: Z2026-002')).toBeVisible()
  await page.getByRole('button', { name: 'Podpísať zmluvu' }).click()
  await expect(page.getByText(/Podpisom potvrdzujem zmluvu Z2026-002/)).toBeVisible()
})

test('uložená zmluva: odkaz na podpis pre klienta', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { ...fixtures, event_contracts: [{ ...saved, client_signature: null, client_signer: '', share_token: '00000000-0000-4000-8000-00000000abcd' }] })
  await page.goto(`/events/${EVENT_ID}/contract?contract=z1`)
  await expect(page.getByLabel('Odkaz na podpis pre klienta')).toHaveValue(/\/z\/00000000-0000-4000-8000-00000000abcd$/)
})
