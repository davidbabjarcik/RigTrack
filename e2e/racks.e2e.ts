import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Racky 19": zoznam, detail s predkom a zadkom po U a nový rack.
const RACK = '00000000-0000-4000-8000-0000000000d7'
const rack = {
  id: RACK, company_id: COMPANY_ID, name: 'Ukážkový FOH rack', rack_type: 'shock', units: 6, depth_mm: 450, rails: 'both', max_load_kg: 60, own_weight_kg: 18,
  note: '', case_id: null, event_id: null, is_template: true, version: 3, updated_at: '2026-11-20T10:00:00Z',
}
const slot = (id: string, side: string, bottom: number, height: number, extra: object) => ({ id, side, bottom_u: bottom, height_u: height, width: 'full', col: 0, equipment_id: null, unit: null, catalog_id: null, accessory: null, label: '', depth_mm: null, weight_kg: null, power_w: null, rear_support: null, ...extra })

test('racky: zoznam a detail s predkom a zadkom', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, {
    rack_designs: [rack],
    rack_slots: [slot('s1', 'front', 1, 2, { label: 'Ukážkový pult' }), slot('s2', 'front', 3, 1, { accessory: 'blank' }), slot('s3', 'rear', 1, 1, { accessory: 'pdu' })],
  })
  await page.goto('/racks')
  // Racky sú na stránke Cases a racks pod zoznamom cases, bez prepínača.
  await expect(page).toHaveURL(/\/cases#racks$/)
  await expect(page.getByRole('heading', { name: 'Cases a racks' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Racky 19"' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Ukážkový FOH rack/ })).toContainText('6 U · Shock-mount flightcase')
  await expect(page.getByText('šablóna')).toBeVisible()
  await page.getByRole('link', { name: /Ukážkový FOH rack/ }).click()
  await expect(page.getByRole('heading', { name: 'Ukážkový FOH rack' })).toBeVisible()
  await expect(page.getByText(/6 U \(267 mm\) · hĺbka 450 mm/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ukážkový pult, U 1–2' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Záslepka, U 3' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'PDU (napájanie), U 1' })).toBeVisible()
  // Súhrn hore: prístroje, obsadené U, hmotnosť a prúd pri 230 V.
  await expect(page.getByText('3 / 6 U')).toBeVisible()
  await expect(page.getByText('spredu · voľné 3 U')).toBeVisible()
  await expect(page.getByText('18 kg', { exact: true })).toBeVisible()
  await expect(page.getByText('obsah 0 kg · 1 bez hmotnosti')).toBeVisible()
  await expect(page.getByText('0 A pri 230 V')).toBeVisible()
})

test('nový rack: kontrola výšky', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { rack_designs: [] })
  await page.goto('/racks/new')
  await page.getByLabel('Názov *').fill('Ukážkový amp rack')
  await page.getByLabel('Výška (U) *').fill('60')
  await page.getByRole('button', { name: 'Uložiť' }).click()
  await expect(page.getByText('Výška racku je 2 až 48 U.')).toBeVisible()
})

test('výzva doplniť údaje k pridanej technike', async ({ page }) => {
  await signIn(page, { incompleteNotice: true })
  await fakeBackend(page, {
    equipment: [{ id: '00000000-0000-4000-8000-0000000000e9', company_id: COMPANY_ID, name: 'Ukážkový mikrofón', kind: 'audio', manufacturer: '', model: '', photo_path: '', category_id: null, status: 'available', created_at: new Date().toISOString() }],
  })
  await page.goto('/')
  await expect(page.getByText('Doplňte údaje k technike, ktorú ste pridali:')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ukážkový mikrofón' })).toHaveAttribute('href', '/equipment/00000000-0000-4000-8000-0000000000e9/edit')
  await page.getByRole('button', { name: 'Neskôr' }).click()
  await expect(page.getByText('Doplňte údaje k technike, ktorú ste pridali:')).toHaveCount(0)
})

test('editor racku: pridanie z panela, úprava, späť a uloženie', async ({ page }) => {
  await signIn(page)
  const AMP = '00000000-0000-4000-8000-0000000000e3'
  await fakeBackend(page, {
    rack_designs: [rack],
    rack_slots: [],
    equipment: [{ id: AMP, company_id: COMPANY_ID, name: 'Ukážkový zosilňovač', kind: 'audio', manufacturer: 'Ukážka', model: 'A2', quantity: 1, track_units: false, unit_ids: [], status: 'available', photo_path: 'x.jpg', category_id: 'c', attributes: { rackU: 2, weightKg: 22, powerW: 1200, depthMm: 400 }, updated_at: '2026-11-01T00:00:00Z' }],
    'rpc:save_rack': [4],
  })
  await page.goto(`/racks/${RACK}/fit`)
  await page.getByRole('button', { name: /Ukážkový zosilňovač/ }).first().click()
  await expect(page.getByRole('button', { name: 'Ukážkový zosilňovač, U 1–2' })).toBeVisible()
  await expect(page.getByText('Príkon 1200 W a v racku nie je PDU')).toBeVisible()
  await expect(page.getByText('2 / 6 U')).toBeVisible()
  await expect(page.getByText('5,2 A pri 230 V')).toBeVisible()
  // Doplnok a späť.
  await page.getByRole('tab', { name: 'Doplnky' }).click()
  await page.getByRole('button', { name: /Záslepka/ }).click()
  await expect(page.getByRole('button', { name: 'Záslepka, U 3' })).toBeVisible()
  await page.getByRole('button', { name: 'Späť' }).click()
  await expect(page.getByRole('button', { name: 'Záslepka, U 3' })).toHaveCount(0)
  // Uloženie: celé osadenie s verziou racku.
  const saved = page.waitForRequest((request) => request.url().includes('/rpc/save_rack'))
  await page.getByRole('button', { name: 'Uložiť' }).click()
  const body = (await saved).postDataJSON() as { _expected_version: number; _slots: { equipmentId: string; bottomU: number; heightU: number }[] }
  expect(body._expected_version).toBe(3)
  expect(body._slots).toEqual([expect.objectContaining({ equipmentId: AMP, bottomU: 1, heightU: 2, side: 'front' })])
  await expect(page.getByRole('button', { name: 'Uložené (verzia 4)' })).toBeVisible()
})

test('šablóna racku: vloženie do akcie a PDF', async ({ page }) => {
  await signIn(page)
  const EVENT = '00000000-0000-4000-8000-0000000000ee'
  const NEW = '00000000-0000-4000-8000-0000000000ef'
  const day = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  await fakeBackend(page, {
    rack_designs: [rack],
    rack_slots: [slot('s1', 'front', 1, 1, { accessory: 'pdu' })],
    events: [{ id: EVENT, company_id: COMPANY_ID, kind: 'event', name: 'Ukážková svadba', client: '', venue: '', starts_on: day, ends_on: day, status: 'planned', note: '' }],
    'rpc:copy_rack': [NEW],
  })
  await page.goto(`/racks/${RACK}`)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF' }).click()
  expect((await download).suggestedFilename()).toBe('rack-Ukážkový_FOH_rack.pdf')
  await page.getByLabel('Vložiť šablónu do akcie').selectOption({ label: `Ukážková svadba (${Number(day.slice(8))}. ${Number(day.slice(5, 7))}. ${day.slice(0, 4)})` })
  const copied = page.waitForRequest((request) => request.url().includes('/rpc/copy_rack'))
  await page.getByRole('button', { name: 'Vložiť do akcie' }).click()
  expect((await copied).postDataJSON()).toEqual({ _rack_id: RACK, _name: 'Ukážkový FOH rack', _as_template: false, _event_id: EVENT })
  await expect(page).toHaveURL(new RegExp(`/racks/${NEW}$`))
})

test('knižnica racku: kategórie, výrobca, môj materiál a databáza', async ({ page }) => {
  await signIn(page)
  const MINE = '00000000-0000-4000-8000-0000000000e4'
  await fakeBackend(page, {
    rack_designs: [rack],
    rack_slots: [],
    // Vlastná technika bez U – výšku, hmotnosť a príkon doplní rovnaký model z databázy.
    equipment: [{ id: MINE, company_id: COMPANY_ID, name: 'Ukážkový prijímač', kind: 'audio', manufacturer: 'Ukážka', model: 'R2', quantity: 1, track_units: false, unit_ids: [], status: 'available', photo_path: '', category_id: null, attributes: { audioType: 'wireless' }, updated_at: '2026-11-01T00:00:00Z' }],
    equipment_catalog: [
      { id: 'c1', kind: 'audio', manufacturer: 'Ukážka', model: 'R2', attributes: { audioType: 'wireless', rackU: 1, rackWidth: 'half', weightKg: 1.5, powerW: 15 }, verified: false },
      { id: 'c2', kind: 'audio', manufacturer: 'Vzorka', model: 'Z4', attributes: { audioType: 'amplifier', rackU: 2, weightKg: 12, powerW: 800 }, verified: false },
      { id: 'c3', kind: 'audio', manufacturer: 'Vzorka', model: 'A8', attributes: { audioType: 'other', rackRole: 'antenna', rackU: 1 }, verified: true },
    ],
  })
  await page.goto(`/racks/${RACK}/fit`)
  await expect(page.getByRole('heading', { name: 'Môj materiál' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ukážkový prijímač.*1 U · 1\/2 šírky · 1,5 kg · 15 W/ })).toBeVisible()
  await page.getByRole('button', { name: 'Zosilňovače' }).click()
  await expect(page.getByRole('button', { name: /Vzorka Z4.*2 U · 12 kg · 800 W · neoverené/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ukážkový prijímač/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Všetko' }).click()
  await page.getByLabel('Výrobca').selectOption('Vzorka')
  await expect(page.getByRole('button', { name: /Vzorka A8/ })).toBeVisible()
  await expect(page.getByText('Z vašej techniky nič nezodpovedá.')).toBeVisible()
  await page.getByRole('button', { name: /Vzorka Z4/ }).click()
  await expect(page.getByRole('button', { name: 'Vzorka Z4, U 1–2' })).toBeVisible()
  await expect(page.getByText('3,5 A pri 230 V')).toBeVisible()
})

test('prepojenia: kábel medzi prístrojmi, súhrn a uloženie', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, {
    rack_designs: [{ ...rack, links: [{ from: 3, fromPort: 'out-1', to: 2, toPort: 'power', cable: 'power', lengthM: 0.5, label: '' }] }],
    rack_slots: [
      slot('s1', 'front', 1, 1, { catalog_id: 'p' }),
      slot('s2', 'front', 2, 2, { catalog_id: 'a' }),
      slot('s3', 'front', 4, 1, { accessory: 'pdu' }),
    ],
    equipment_catalog: [
      { id: 'p', kind: 'audio', manufacturer: 'Ukážka', model: 'P1', attributes: { audioType: 'processor', rackU: 1 }, verified: false },
      { id: 'a', kind: 'audio', manufacturer: 'Ukážka', model: 'Z2', attributes: { audioType: 'amplifier', rackU: 2 }, verified: false },
    ],
    'rpc:save_rack': [4],
  })
  await page.goto(`/racks/${RACK}/fit`)
  await expect(page.getByRole('heading', { name: 'Káble (1)' })).toBeVisible()
  await page.getByRole('button', { name: 'Ukážka Z2, U 2–3' }).click()
  const connections = page.getByLabel('Prepojenia')
  await expect(connections.getByText('Napájanie → PDU (napájanie) · Zásuvka 1')).toBeVisible()
  await connections.getByLabel('Port').selectOption({ label: 'Vstup A' })
  await connections.getByLabel('Pripojiť k').selectOption({ label: 'Ukážka P1 · Výstup 1' })
  await connections.getByRole('button', { name: 'Prepojiť' }).click()
  await expect(page.getByRole('heading', { name: 'Káble (2)' })).toBeVisible()
  await expect(page.getByText('1× XLR (signálový) 0,5 m · 1× Napájací 0,5 m')).toBeVisible()
  const saved = page.waitForRequest((request) => request.url().includes('/rpc/save_rack'))
  await page.getByRole('button', { name: 'Uložiť' }).click()
  const body = (await saved).postDataJSON() as { _links: unknown[] }
  expect(body._links).toEqual([
    { from: 3, fromPort: 'out-1', to: 2, toPort: 'power', cable: 'power', lengthM: 0.5, label: '' },
    { from: 1, fromPort: 'out-1', to: 2, toPort: 'in-1', cable: 'XLR', lengthM: 0.5, label: '' },
  ])
  // Odobratie zariadenia zruší aj jeho káble.
  await page.getByRole('button', { name: 'Odobrať', exact: true }).click()
  await expect(page.getByText('Káble: zatiaľ žiadne.', { exact: false })).toBeVisible()
})

test('automatické zapojenie a späť', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, {
    rack_designs: [rack],
    rack_slots: [slot('s1', 'front', 1, 1, { catalog_id: 'p' }), slot('s2', 'front', 2, 2, { catalog_id: 'a' }), slot('s3', 'front', 4, 1, { accessory: 'pdu' })],
    equipment_catalog: [
      { id: 'p', kind: 'audio', manufacturer: 'Ukážka', model: 'P1', attributes: { audioType: 'processor', rackU: 1 }, verified: false },
      { id: 'a', kind: 'audio', manufacturer: 'Ukážka', model: 'Z2', attributes: { audioType: 'amplifier', rackU: 2 }, verified: false },
    ],
  })
  await page.goto(`/racks/${RACK}/fit`)
  await page.getByRole('button', { name: 'Zapojiť automaticky' }).click()
  // 2 napájacie + 4 výstupy procesora do zosilňovača.
  await expect(page.getByRole('heading', { name: 'Káble (6)' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Pridané káble: 6.' })).toBeVisible()
  await page.getByRole('button', { name: 'Zapojiť automaticky' }).click()
  await expect(page.getByText('Nie je čo zapojiť – voľné porty k sebe nepasujú.')).toBeVisible()
  await page.getByRole('button', { name: 'Späť' }).click()
  await expect(page.getByText('Káble: zatiaľ žiadne.', { exact: false })).toBeVisible()
})
