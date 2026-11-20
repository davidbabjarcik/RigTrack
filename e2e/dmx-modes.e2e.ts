import { expect, test } from '@playwright/test'
import { fakeBackend, signIn } from './fakeBackend'

// DMX módy svetla: rozpis kanálov s ikonkami, farby (miešanie a koliesko) a náhľad pri zadávaní.
const LIGHT_ID = '00000000-0000-4000-8000-0000000000d1'
const light = {
  id: LIGHT_ID, name: 'Ukážková hlava', kind: 'light', category_id: null, location_id: null, case_id: null, label_role: 'main', quantity: 1, track_units: false, unit_ids: [],
  rental_price: null, min_quantity: null, manufacturer: 'Ukážkový výrobca', model: 'Spot 1', serial_number: '', inventory_number: '', mac_address: '', ip_address: '',
  service_interval_months: null, last_service_on: null, hours_interval_months: null, operating_hours: null, hours_read_on: null, photo_path: '', status: 'available', note: '',
  updated_at: '2026-11-01T00:00:00Z', owner_staff_id: null, purchased_on: null, unit_purchases: {}, links: [], clone_of: '', capture_match: '', capture_note: '', unit_info: {},
  attributes: {
    lightType: 'moving_spot',
    dmxModes: [
      { name: 'Basic', channels: 6, map: 'Pan | 50 %\nTilt | 50 %\nDimmer\nShutter | Open\nColor Wheel\nRed' },
      { name: 'Extended', channels: 8, map: 'Pan\nPan fine\nTilt\nTilt fine\nDimmer\nShutter\nColor Wheel\nGobo' },
    ],
    colorWheel: { slots: 8, colors: [{ name: 'Tmavomodrá', hex: '#1e3a8a', dmx: '10–19' }, { name: 'CTO', hex: '#fdba74' }] },
    gobos: [{ name: 'Hviezda', dmx: '20–29' }],
    colorParts: ['UV'],
  },
}

test('DMX módy svetla: rozpis kanálov a farby', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, { equipment: [light] })
  await page.goto(`/equipment/${LIGHT_ID}`)
  await expect(page.getByText('DMX módy a farby')).toBeVisible()
  await expect(page.getByText('Farebné koliesko · 8 farieb')).toBeVisible()
  await expect(page.getByText('Tmavomodrá')).toBeVisible()
  await expect(page.getByText('DMX 10–19')).toBeVisible()
  await expect(page.getByText('Gobá · 1')).toBeVisible()
  await expect(page.getByText('Hviezda')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Open' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Pozícia' }).first()).toBeVisible()
  await page.getByRole('tab', { name: /Extended/ }).click()
  await expect(page.getByRole('cell', { name: 'Gobo', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath(`dmx-detail-${info.project.name}.png`), fullPage: true })

  await page.goto(`/equipment/${LIGHT_ID}/edit`)
  // Samostatná časť Farby s krúžkami už nie je – farby sú pri kanáli Color Wheel.
  await expect(page.getByRole('checkbox', { name: 'Má farebné koliesko' })).toHaveCount(0)
  // Kanály módu ako tabuľka: riadok na kanál, názov a predvolená hodnota.
  await expect(page.getByLabel('Kanál 4 – čo robí').first()).toHaveValue('Shutter')
  await expect(page.getByLabel('Kanál 4 – predvolená hodnota').first()).toHaveValue('Open')
  await page.screenshot({ path: info.outputPath(`dmx-form-${info.project.name}.png`), fullPage: true })
})

test('nový mód: po zadaní počtu kanálov sa ukáže tabuľka na vyplnenie', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { equipment: [{ ...light, attributes: { lightType: 'moving_wash' } }] })
  await page.goto(`/equipment/${LIGHT_ID}/edit`)
  await page.getByRole('button', { name: 'Pridať mód' }).click()
  await page.getByLabel('Názov módu').fill('Ukážkový')
  await page.getByLabel('Kanály', { exact: true }).fill('10')
  await expect(page.getByLabel(/^Kanál \d+ – čo robí$/)).toHaveCount(10)
  // Názov sa vyberá z rozbaľovacieho zoznamu; „Iné – napísať…“ dovolí vlastný text.
  await page.getByLabel('Kanál 1 – čo robí').selectOption('Pan fine')
  await expect(page.getByLabel('Kanál 1 – čo robí')).toHaveValue('Pan fine')
  await page.getByLabel('Kanál 5 – čo robí', { exact: true }).selectOption({ label: 'Iné – napísať…' })
  await page.getByLabel('Kanál 5 – čo robí', { exact: true }).fill('Ukážkový efekt')
  await expect(page.getByLabel('Kanál 5 – čo robí', { exact: true })).toHaveValue('Ukážkový efekt')
  // Vložený zoznam z návodu vyplní tabuľku naraz.
  await page.getByRole('button', { name: 'Vložiť zoznam' }).click()
  await page.getByPlaceholder(/^Pan \| 50 %/).fill('Dimmer\nShutter | Open\nRed')
  await page.getByRole('button', { name: 'Použiť' }).click()
  await expect(page.getByLabel('Kanál 2 – predvolená hodnota')).toHaveValue('Open')
  await expect(page.getByLabel(/^Kanál \d+ – čo robí$/)).toHaveCount(10)
  // Na mobile nič netečie do strany.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  await page.getByRole('group', { name: 'DMX módy' }).screenshot({ path: test.info().outputPath(`dmx-tabulka-${test.info().project.name}.png`) })
})

test('svetlo bez DMX módov ponúkne ich doplnenie', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { equipment: [{ ...light, attributes: { lightType: 'moving_wash' } }] })
  await page.goto(`/equipment/${LIGHT_ID}`)
  await expect(page.getByText('DMX módy tohto svetla zatiaľ nie sú zapísané.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Doplniť v úprave' })).toHaveAttribute('href', /\/equipment\/.+\/edit$/)
})

test('farby kolieska sa vo formulári ukážu v uloženej farbe', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { equipment: [light] })
  await page.goto(`/equipment/${LIGHT_ID}/edit`)
  // Riadok Color Wheel sa rozklikne na farby kolieska.
  await page.getByRole('button', { name: 'Farby na koliesku (2)' }).first().click()
  await expect(page.getByLabel('DMX hodnota farby 1')).toHaveValue('10–19')
  await expect(page.getByLabel('Farba 2', { exact: true })).toHaveValue('#fdba74')
  await page.getByLabel('Názov farby 2').fill('Červená')
  await page.getByRole('button', { name: 'Pridať farbu' }).click()
  await page.getByLabel('Názov farby 3').fill('Zelená')
  await expect(page.getByLabel('Farba 3', { exact: true })).toHaveValue('#16a34a')
  await expect(page.getByRole('button', { name: 'Farby na koliesku (3)' }).first()).toBeVisible()
})

test('gobo kanál sa rozklikne na gobá s DMX hodnotou', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { equipment: [light] })
  await page.goto(`/equipment/${LIGHT_ID}/edit`)
  // Mód Extended má kanál Gobo.
  await page.getByRole('button', { name: 'Gobá (1)' }).click()
  await expect(page.getByLabel('Názov gobo 1')).toHaveValue('Hviezda')
  await page.getByRole('button', { name: 'Pridať gobo' }).click()
  await page.getByLabel('Názov gobo 2').fill('Bodky')
  await page.getByLabel('DMX hodnota gobo 2').fill('30–39')
  await expect(page.getByRole('button', { name: 'Gobá (2)' })).toBeVisible()
  // Obrázok gobo (fotka alebo z návodu) sa nahrá k danému gobo.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  await page.getByRole('button', { name: 'Gobo 2 – nahrať obrázok' }).locator('xpath=following-sibling::input[@type="file"]').setInputFiles({ name: 'gobo.png', mimeType: 'image/png', buffer: png })
  await expect(page.getByRole('button', { name: 'Gobo 2 – odobrať obrázok' })).toBeVisible()
})
