import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Tlač z mobilu: hárok vyzerá ako celá A4 (zmenšená) a Tlačiť vyrobí PDF namiesto dialógu prehliadača.
const EVENT_ID = '00000000-0000-4000-8000-0000000000e7'
const event = {
  id: EVENT_ID, company_id: COMPANY_ID, kind: 'event', name: 'Ukážkový ples', client: '', venue: 'Ukážková sála', starts_on: '2026-12-05', ends_on: '2026-12-05', status: 'confirmed', note: '',
  organizer: 'Ukážková agentúra', organizer_person: '', organizer_phone: '', organizer_email: '', description: 'Ples s kapelou a DJ.', get_in_time: '14:00:00', show_time: '20:00:00', show_end_time: '03:00:00',
  setting: 'indoor', power: 'cee32', power_count: 1, power_note: '', weather_place: '',
}

test('tlač eventu: A4 hárok a PDF na mobile', async ({ page, isMobile }, info) => {
  await signIn(page)
  await fakeBackend(page, { events: [event] })
  await page.goto(`/events/${EVENT_ID}/print`)
  await expect(page.getByRole('heading', { name: 'Ukážkový ples' })).toBeVisible()
  // Hárok má vždy šírku A4; na mobile je celý zmenšený, nič netečie mimo obrazovky.
  const box = await page.locator('[style*="--sheet-zoom"]').boundingBox()
  const viewport = page.viewportSize()!
  expect(box!.width).toBeLessThanOrEqual(viewport.width)
  await page.screenshot({ path: info.outputPath(`tlac-eventu-${info.project.name}.png`), fullPage: true })
  if (!isMobile) return

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tlačiť / PDF' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('event-Ukážkový-ples.pdf')
  await file.saveAs(info.outputPath('tlac.pdf'))
  const bytes = await (await file.createReadStream()).toArray()
  const pdf = Buffer.concat(bytes).toString('latin1')
  expect(pdf.slice(0, 5)).toBe('%PDF-')
  // Krátky event = jedna strana (prázdne miesto hárku na obrazovke sa do PDF nepridáva).
  expect(pdf.split('/Type /Page ').length - 1).toBe(1)
})
