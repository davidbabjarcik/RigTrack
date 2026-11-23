import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Input / output list akcie: varovania, import CSV s náhľadom a výstupy (monitory, PA).
const EVENT_ID = '00000000-0000-4000-8000-0000000000e1'
const MIC = '00000000-0000-4000-8000-0000000000a1'
const event = {
  id: EVENT_ID, company_id: COMPANY_ID, name: 'Ukážkový koncert', client: '', venue: 'Sála', starts_on: '2026-11-15', ends_on: '2026-11-15', status: 'planned', note: '',
  organizer: '', organizer_person: '', organizer_phone: '', organizer_email: '', description: '', get_in_time: null, show_time: null, show_end_time: null,
  setting: 'indoor', power: '', power_count: 1, power_note: '', weather_place: '',
}
const mic = { id: MIC, company_id: COMPANY_ID, name: 'Ukážkový kondenzátor', kind: 'audio', manufacturer: 'Ukážka', model: 'K1', quantity: 1, track_units: false, unit_ids: [], status: 'available', photo_path: 'x.jpg', category_id: 'c', attributes: { micType: 'condenser' }, updated_at: '2026-11-01T00:00:00Z' }
const patch = (id: string, channel: number, name: string) => ({ id, channel, name, stagebox: 'SB1', stagebox_input: 1, source: 'mic', equipment_id: MIC, capsule_id: null, connector: '', stand: 'tall', phantom: false, note: '', insert_note: '', color: '', company_id: COMPANY_ID, event_id: EVENT_ID })
const output = { id: 'o1', number: 1, name: 'Wedge spev', kind: 'wedge', mix: 'Mix 1', destination: 'SB1 OUT 1', equipment_id: null, stereo: false, note: '', company_id: COMPANY_ID, event_id: EVENT_ID }

test('input list: varovania, výstupy a návrh z CSV', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, { events: [event], equipment: [mic], event_patch: [patch('p1', 1, 'Spev'), patch('p2', 2, 'Gitara')], event_outputs: [output] })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  const warnings = page.getByRole('list', { name: 'Varovania' })
  await expect(warnings.getByText('Vstup SB1-1 je použitý viackrát (kanály 1, 2)')).toBeVisible()
  await expect(warnings.getByText('Kondenzátorový mikrofón bez phantomu 48 V (kanály 1, 2)')).toBeVisible()
  await expect(warnings.getByText('Ukážkový kondenzátor: v liste 2×, vo firme len 1 ks')).toBeVisible()
  await expect(page.getByText('Stojany: 2× Vysoký stojan')).toBeVisible()
  await expect(page.getByText('Wedge spev')).toBeVisible()
  await expect(page.getByRole('button', { name: 'CSV výstupy' })).toBeVisible()

  await page.locator('input[type=file][accept*=csv]').setInputFiles({ name: 'rider.csv', mimeType: 'text/csv', buffer: Buffer.from('Kanál;Názov;Mikrofón\n1;Kick;Beta 91A\n2;Spev;Ukážka K1\n3;Bass;DI') })
  const preview = page.getByRole('dialog', { name: 'Návrh input listu' })
  await expect(preview.getByText('Návrh z „rider.csv“ – 3 kanálov.', { exact: false })).toBeVisible()
  await expect(preview.getByRole('cell', { name: 'Ukážkový kondenzátor' })).toBeVisible()
  await expect(preview.getByRole('button', { name: 'Pridať za koniec' })).toBeVisible()
  await page.screenshot({ path: info.outputPath(`io-list-${info.project.name}.png`), fullPage: true })
  await preview.getByRole('button', { name: 'Zrušiť' }).click()
  await expect(preview).toHaveCount(0)
})

test('scéna X32 / M32: mená, farby a phantom do scény z pultu', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, { events: [event], equipment: [mic], event_patch: [{ ...patch('p1', 1, 'Spev'), color: 'red', phantom: true }], event_outputs: [output] })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  const scene = ['#4.0# "Ukazka" "" %000000000 1', '/config/routing/IN AN1-8 AN9-16 AN17-24 AN25-32 AUX1-4', '/ch/01/config "" 1 OFF 1', '/bus/01/config "" 1 CY', '/headamp/000 +30.0 OFF', ''].join('\n')
  await page.locator('input[type=file][accept=".scn"]').setInputFiles({ name: 'zaklad.scn', mimeType: 'application/octet-stream', buffer: Buffer.from(scene) })
  const panel = page.getByRole('dialog', { name: 'Scéna X32 / M32' })
  await expect(panel.getByText('Scéna „zaklad.scn“ – zmenených riadkov: 3.')).toBeVisible()
  await expect(panel.getByText('/ch/01/config "Spev" 1 RD 1')).toBeVisible()
  await expect(panel.getByText('/headamp/000 +30.0 ON')).toBeVisible()
  await expect(panel.getByText('/bus/01/config "Wedge spev" 1 CY')).toBeVisible()
  const download = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Stiahnuť upravenú scénu' }).click()
  expect((await download).suggestedFilename()).toBe('Ukazkovy_koncert.scn')
  await page.screenshot({ path: info.outputPath(`x32-scena-${info.project.name}.png`), fullPage: true })
})

test('zdieľanie input listu: zoznam odkazov a stránka pre príjemcu so zmenami', async ({ page }, info) => {
  await signIn(page)
  const share = { id: 's1', company_id: COMPANY_ID, doc_type: 'iolist', doc_id: EVENT_ID, recipient: 'FOH technik klubu', token: 'a'.repeat(64), expires_on: null, revoked_at: null, created_at: '2026-11-20T10:00:00Z', view_count: 2, last_viewed_at: '2026-11-21T18:30:00Z', last_viewed_version: 1, doc_share_views: [{ version: 1, viewed_at: '2026-11-21T18:30:00Z' }] }
  const input = (channel: number, name: string, phantom = false) => ({ channel, name, source: 'mic', equipment_id: channel === 1 ? MIC : null, stagebox: 'SB1', stagebox_input: channel, phantom, stand: 'tall', insert_note: '', color: channel === 1 ? 'red' : '', note: '' })
  const doc = {
    docType: 'iolist', recipient: 'FOH technik klubu', title: '', version: 2, savedAt: '2026-11-22T09:00:00Z', previousVersion: 1,
    data: { inputs: [input(1, 'Spev'), input(2, 'Gitara', true)], outputs: [{ number: 1, name: 'Wedge spev', kind: 'wedge', mix: 'Mix 1', destination: 'SB1 OUT 1', equipment_id: null, stereo: false, note: '' }] },
    previous: { inputs: [input(1, 'Spev'), input(2, 'Gitara'), input(3, 'Basa')], outputs: [] },
    names: { [MIC]: 'Ukážkový kondenzátor' }, companyName: 'Ukážková firma', logoPath: '', logoStyle: 'auto', contact: 'info@example.com',
    event: 'Ukážkový koncert', startsOn: '2026-11-15', endsOn: '2026-11-15', venue: 'Sála',
  }
  await fakeBackend(page, { events: [event], equipment: [mic], event_patch: [patch('p1', 1, 'Spev')], doc_shares: [share], 'rpc:get_shared_doc': [doc] })
  await page.goto(`/events/${EVENT_ID}?tab=gear`)
  await expect(page.getByText('FOH technik klubu')).toBeVisible()
  await expect(page.getByText(/zobrazený 2× · naposledy .* \(verzia 1\)/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Kopírovať odkaz' })).toBeVisible()

  await page.goto(`/d/${'a'.repeat(64)}`)
  await expect(page.getByRole('heading', { name: 'Input / output list' })).toBeVisible()
  await expect(page.getByText('Ukážkový koncert · 15. 11. 2026 · Sála')).toBeVisible()
  await expect(page.getByText(/Od vašej poslednej návštevy \(verzia 1\)/)).toBeVisible()
  await expect(page.getByRole('row', { name: /Gitara/ })).toHaveClass(/bg-amber-100/)
  await expect(page.getByRole('row', { name: /Spev Ukážkový kondenzátor/ })).not.toHaveClass(/bg-amber-100/)
  await expect(page.getByText('3 Basa')).toBeVisible()
  await expect(page.getByRole('row', { name: /Wedge spev/ })).toHaveClass(/bg-amber-100/)
  await page.screenshot({ path: info.outputPath(`zdielany-input-list-${info.project.name}.png`), fullPage: true })
})
