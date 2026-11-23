import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Snímky pre README a úvodnú stránku z vymyslených údajov. Spúšťajú sa len na požiadanie:
//   SHOTS=1 npx playwright test e2e/screenshots.e2e.ts --project=pc
// a uložia sa do docs/screenshots aj public/home.
test.skip(!process.env.SHOTS, 'Snímky len na požiadanie (SHOTS=1)')
test.use({ viewport: { width: 1280, height: 820 }, colorScheme: 'light' })

const piece = (id: string, name: string, extra: object = {}) => ({
  id, company_id: COMPANY_ID, name, kind: 'general', category_id: null, location_id: null, case_id: null, label_role: null, quantity: 1, track_units: false, unit_ids: [],
  rental_price: null, min_quantity: null, manufacturer: '', model: '', serial_number: '', inventory_number: '', mac_address: '', ip_address: '',
  service_interval_months: null, last_service_on: null, hours_interval_months: null, operating_hours: null, hours_read_on: null, photo_path: '', status: 'available', note: '',
  updated_at: '2026-11-01T00:00:00Z', owner_staff_id: null, purchased_on: null, unit_purchases: {}, links: [], clone_of: '', capture_match: '', capture_note: '', unit_info: {},
  attributes: {},
  ...extra,
})

/** Bez lišty o úložisku a upozornení „doplňte profil / zariadenia“ (patria k účtu, nie k ukážke). */
async function tidy(page: import('@playwright/test').Page) {
  const decline = page.getByRole('button', { name: 'Odmietnuť nepovinné' })
  if (await decline.isVisible().catch(() => false)) await decline.click()
  for (const text of ['Doplňte svoj profil', 'Chýbajú vaše zariadenia:', 'Zapnite dvojfaktorové prihlásenie']) {
    const notice = page.getByText(text, { exact: true }).first()
    if (await notice.isVisible().catch(() => false)) await notice.evaluate((element) => element.closest('[class*="rounded-xl"]')?.remove())
  }
}

async function shot(page: import('@playwright/test').Page, name: string, clip?: { x: number; y: number; width: number; height: number }) {
  await tidy(page)
  for (const dir of ['docs/screenshots', 'public/home']) await page.screenshot({ path: `${dir}/${name}.png`, clip })
}

test('rozloženie v case', async ({ page }) => {
  await signIn(page)
  const CASE = '00000000-0000-4000-8000-0000000000c7'
  const [PAR, MIC, DI, XLR] = ['b9', 'ba', 'bb', 'bc'].map((end) => `00000000-0000-4000-8000-0000000000${end}`)
  await fakeBackend(page, {
    cases: [{
      id: CASE, company_id: COMPANY_ID, name: 'Mikrofóny a DI', inventory_number: '', location_id: null, label_number: '4', label_category: 'Zvuk', label_title: '', label_photo_path: '', photo_path: '',
      weight_kg: 18, width_cm: 60, length_cm: 40, depth_cm: 35, spot_id: null, spot_level: null, note: '', updated_at: '2026-11-01T00:00:00Z',
      layout: {
        sections: [
          { name: 'Šuplík 1 – mikrofóny', rows: 2, cols: 4, cells: Array.from({ length: 8 }, (_, index) => ({ items: [{ equipmentId: MIC, unit: index + 1, count: 1 }], note: '' })) },
          { name: 'Šuplík 2', rows: 1, cols: 2, cells: [{ items: [{ equipmentId: DI, unit: null, count: 4 }], note: 'vľavo' }, { items: [{ equipmentId: XLR, unit: null, count: 8 }], note: 'vpravo' }] },
          { name: 'Veko', rows: 1, cols: 1, cells: [{ items: [{ equipmentId: PAR, unit: null, count: 2 }], note: 'stojany' }] },
        ],
      },
    }],
    equipment: [
      piece(MIC, 'Ukážkový mikrofón', { case_id: CASE, quantity: 8, track_units: true, unit_ids: [1, 2, 3, 4, 5, 6, 7, 8], kind: 'audio' }),
      piece(DI, 'Ukážkový DI box', { case_id: CASE, quantity: 4, kind: 'audio' }),
      piece(XLR, 'XLR 10 m', { case_id: CASE, quantity: 8, kind: 'cable' }),
      piece(PAR, 'Mikrofónny stojan', { case_id: CASE, quantity: 2 }),
    ],
  })
  await page.goto(`/cases/${CASE}`)
  const heading = page.getByRole('heading', { name: 'Rozloženie v case' })
  await expect(heading).toBeVisible()
  await tidy(page)
  await page.getByRole('heading', { name: 'Mikrofóny a DI #4' }).scrollIntoViewIfNeeded()
  await shot(page, 'case-layout')
})

test('faktúra', async ({ page }) => {
  await signIn(page)
  const ID = '00000000-0000-4000-8000-0000000000f9'
  await fakeBackend(page, {
    invoices: [{
      id: ID, company_id: COMPANY_ID, number: '20260012', kind: 'final', event_id: null, offer_id: null,
      issuer: { name: 'Ukážková s.r.o.', address: 'Ukážková 1, 000 00 Ukážkovo', ico: '12345678', dic: '2020202020', icDph: 'SK2020202020', contact: 'info@example.com', vatPayer: true, iban: 'SK00 0000 0000 0000 0000 0000', registerNote: 'Zapísaná v Ukážkovom registri, vložka č. 0000/X' },
      client: { name: 'Ukážkový klient s.r.o.', address: 'Ukážková 2, 000 00 Ukážkovo', ico: '87654321', dic: '', icDph: '' },
      lines: [
        { label: 'Ozvučenie – Ukážková svadba', quantity: 1, unit: 'ks', unitPrice: 650, vatRate: 23 },
        { label: 'Svetlá na parket', quantity: 1, unit: 'ks', unitPrice: 250, vatRate: 23 },
        { label: 'Odpočet zaplatenej zálohy (faktúra č. 20260009)', quantity: 1, unit: 'ks', unitPrice: -300, vatRate: 23 },
      ],
      issued_on: '2026-11-16', delivered_on: '2026-11-15', due_on: '2026-11-30', total_net: 600, total_vat: 138, total: 738, note: '', paid_on: null, cancelled_at: null, created_at: '2026-11-16T10:00:00Z',
    }],
  })
  await page.goto(`/invoices/${ID}`)
  await expect(page.getByRole('heading', { name: 'Faktúra – daňový doklad' })).toBeVisible()
  await shot(page, 'invoice')
})

test('hodnotenie od klienta', async ({ page }) => {
  const base = { event: 'Ukážková svadba', startsOn: '2026-11-15', endsOn: '2026-11-15', companyName: 'Ukážková firma', comment: '', links: { google: 'https://example.com/google', facebook: 'https://example.com/facebook', web: '' } }
  await fakeBackend(page, { 'rpc:get_event_rating': [{ ...base, stars: null, ratedAt: null }] })
  await page.goto('/h/00000000-0000-4000-8000-0000000000ab')
  await expect(page.getByRole('heading', { name: 'Ako sme sa vám páčili?' })).toBeVisible()
  await page.getByRole('button', { name: '5 z 5' }).click()
  await page.getByLabel('Čo sa vám páčilo alebo čo zlepšiť (nepovinné)').fill('Všetko klapalo, zvuk bol výborný. Ďakujeme!')
  await shot(page, 'rating', { x: 320, y: 40, width: 640, height: 470 })
})

// Podklady akcie (12.x): stage plán, synoptika a HF plán na jednej ukážkovej akcii.
const SHOW = '00000000-0000-4000-8000-0000000000e1'
const showEvent = {
  id: SHOW, company_id: COMPANY_ID, name: 'Ukážkový festival', client: '', venue: 'Ukážkové námestie', starts_on: '2026-12-01', ends_on: '2026-12-01', status: 'confirmed', note: '',
  organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: null, show_end_time: null,
  setting: 'outdoor', power: '', power_count: 1, power_note: '', weather_place: '',
}
const showPatch = ['Kick', 'Snare', 'Hi-hat', 'Tom', 'Basa DI', 'Gitara 1', 'Gitara 2', 'Klávesy L', 'Klávesy R', 'Spev 1', 'Spev 2'].map((name, index) => ({
  id: `p${index + 1}`, company_id: COMPANY_ID, event_id: SHOW, channel: index + 1, name, stagebox: 'SB1', stagebox_input: index + 1, source: 'mic', equipment_id: null, capsule_id: null, connector: '', stand: '', phantom: false, note: '', insert_note: '', color: '',
}))

test('stage plán', async ({ page }) => {
  await signIn(page)
  const item = (id: string, kind: string, x: number, y: number, w: number, d: number, channel: number | null, label = '', rot = 0) => ({ id, kind, x, y, rot, w, d, label, channel })
  await fakeBackend(page, {
    events: [showEvent],
    event_patch: showPatch,
    stage_plots: [{
      event_id: SHOW, company_id: COMPANY_ID, width_m: 10, depth_m: 6, note: '', version: 3, updated_at: '2026-11-20T10:00:00Z',
      items: [item('a', 'riser', 5, 1.4, 3, 2, null), item('b', 'drums', 5, 1.4, 2, 1.8, 1, 'Bicie'), item('c', 'amp_bass', 2.2, 1.8, 0.8, 0.5, 5), item('d', 'amp_guitar', 7.8, 1.8, 0.7, 0.35, 6), item('e', 'keys', 8.2, 3.6, 1.4, 0.6, 8, '', 345), item('f', 'vocal', 5, 4.6, 0.45, 0.45, 10), item('g', 'vocal', 3, 4.4, 0.45, 0.45, 11), item('h', 'wedge', 5, 5.4, 0.6, 0.45, null, 'Mix 1', 180), item('i', 'wedge', 3, 5.3, 0.6, 0.45, null, 'Mix 2', 180), item('j', 'stagebox', 9.2, 0.6, 0.6, 0.4, null, 'SB1'), item('k', 'power', 0.6, 0.4, 0.35, 0.25, null)],
    }],
  })
  await page.goto(`/events/${SHOW}/stage-plot`)
  await expect(page.getByRole('heading', { name: 'Stage plán' })).toBeVisible()
  await tidy(page)
  await page.getByRole('heading', { name: 'Stage plán' }).scrollIntoViewIfNeeded()
  await shot(page, 'stage-plot')
})

test('synoptika', async ({ page }) => {
  await signIn(page)
  const node = (id: string, kind: string, label: string, detail: string, x: number, y: number) => ({ id, kind, label, detail, x, y, equipment_id: null, rack_id: null })
  const link = (id: string, from: string, to: string, signal: string, cable: string, length: number, count = 1) => ({ id, from, to, signal, cable, length_m: length, count, label: '' })
  await fakeBackend(page, {
    events: [showEvent],
    event_synoptics: [{
      event_id: SHOW, company_id: COMPANY_ID, note: '', version: 2, updated_at: '2026-11-20T10:00:00Z',
      nodes: [node('n1', 'console', 'FOH pult', 'réžia', 40, 120), node('n2', 'stagebox', 'Stagebox SB1', 'pódium vpravo', 400, 120), node('n3', 'rack', 'Amp rack', '6 U', 400, 300), node('n4', 'speaker', 'PA vľavo', '', 760, 220), node('n5', 'speaker', 'PA vpravo', '', 760, 380), node('n6', 'power', 'Rozvádzač', '32 A', 40, 300)],
      links: [link('l1', 'n1', 'n2', 'aes50', 'CAT6', 50, 2), link('l2', 'n2', 'n3', 'analog', 'Multipár 8', 5), link('l3', 'n3', 'n4', 'analog', 'NL4', 15), link('l4', 'n3', 'n5', 'analog', 'NL4', 15), link('l5', 'n6', 'n3', 'power', 'CEE 32 A', 25)],
    }],
  })
  await page.goto(`/events/${SHOW}/synoptic`)
  await expect(page.getByRole('heading', { name: 'Synoptika' })).toBeVisible()
  await shot(page, 'synoptic')
})

test('HF plán', async ({ page }) => {
  await signIn(page)
  const ch = (id: string, name: string, kind: string, freq: number, locked = false) => ({ id, name, kind, equipment_id: null, min_mhz: 606, max_mhz: 630, freq_mhz: freq, locked })
  await fakeBackend(page, {
    events: [showEvent],
    event_rf_plans: [{
      event_id: SHOW, company_id: COMPANY_ID, place: 'Ukážkové námestie', note: '', version: 1, updated_at: '2026-11-20T10:00:00Z', excluded_tv: [38],
      settings: { spacing_khz: 350, imd3_khz: 100, imd5_khz: 50, fifth: false, step_khz: 25 },
      channels: [ch('c1', 'Spev 1', 'mic', 614.125, true), ch('c2', 'Spev 2', 'mic', 614.875), ch('c3', 'IEM bicie', 'iem', 616.375), ch('c4', 'IEM gitara', 'iem', 619.625)],
    }],
  })
  await page.goto(`/events/${SHOW}/rf`)
  await expect(page.getByRole('heading', { name: 'HF frekvenčný plán' })).toBeVisible()
  await shot(page, 'rf-plan')
})
