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
