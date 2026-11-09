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
    colorWheel: { slots: 8, colors: [{ name: 'Tmavomodrá', hex: '#1e3a8a' }, { name: 'CTO', hex: '#fdba74' }] },
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
  await expect(page.getByRole('cell', { name: 'Open' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Pozícia' }).first()).toBeVisible()
  await page.getByRole('tab', { name: /Extended/ }).click()
  await expect(page.getByRole('cell', { name: 'Gobo', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath(`dmx-detail-${info.project.name}.png`), fullPage: true })

  await page.goto(`/equipment/${LIGHT_ID}/edit`)
  await expect(page.getByRole('checkbox', { name: 'Má farebné koliesko' })).toBeChecked()
  await expect(page.getByRole('button', { name: 'UV' }).first()).toHaveAttribute('aria-pressed', 'true')
  await page.getByText('Náhľad rozpisu').first().click()
  await expect(page.getByRole('cell', { name: 'Shutter', exact: true }).first()).toBeVisible()
  await page.screenshot({ path: info.outputPath(`dmx-form-${info.project.name}.png`), fullPage: true })
})

test('farby kolieska sa vo formulári ukážu v uloženej farbe', async ({ page }) => {
  await signIn(page)
  await fakeBackend(page, { equipment: [light] })
  await page.goto(`/equipment/${LIGHT_ID}/edit`)
  await expect(page.getByLabel('Farba 2', { exact: true })).toHaveValue('#fdba74')
  await page.getByLabel('Názov farby 2').fill('Červená')
  await page.getByRole('button', { name: 'Pridať farbu' }).click()
  await page.getByLabel('Názov farby 3').fill('Zelená')
  await expect(page.getByLabel('Farba 3', { exact: true })).toHaveValue('#16a34a')
})
