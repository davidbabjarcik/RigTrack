import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Licencie programov pri technike a certifikácie pri človeku.
const STAFF_ID = '00000000-0000-4000-8000-0000000000f1'
const fixtures = {
  software_licenses: [
    { id: 'l1', name: 'Ukážkový program na mix', edition: 'Pro', seats: 2, account: 'firma@example.com', purchased_on: '2025-01-10', expires_on: null, price: 199, equipment_id: null, note: '' },
    { id: 'l2', name: 'Ukážková vizualizácia', edition: '', seats: 1, account: '', purchased_on: null, expires_on: '2020-01-01', price: null, equipment_id: null, note: '' },
  ],
  software_license_keys: [{ license_id: 'l1', license_key: 'AAAA-BBBB-CCCC' }],
  staff: [{ id: STAFF_ID, company_id: COMPANY_ID, member_id: null, name: 'Ukážkový brigádnik', position: '', phone: '', email: '', photo_path: '', skills: '', note: '', active: true, birth_date: null, name_day: '', licences: [], onboarded: false, sync_profile: false }],
  staff_certificates: [{ id: 'c1', staff_id: STAFF_ID, name: 'Práca vo výškach', issuer: '', number: '123', issued_on: null, valid_until: '2099-01-01', note: '' }],
}

test('licencie programov a certifikácie', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, fixtures)
  await page.goto('/equipment')
  await page.getByRole('link', { name: 'Licencie programov' }).click()
  await expect(page.getByText('Ukážkový program na mix · Pro')).toBeVisible()
  await expect(page.getByText('trvalá')).toBeVisible()
  await expect(page.getByText(/Treba predĺžiť: Ukážková vizualizácia/)).toBeVisible()
  await expect(page.getByText('AAAA-BBBB-CCCC')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ukázať kľúč' }).click()
  await expect(page.getByText('AAAA-BBBB-CCCC')).toBeVisible()
  await page.screenshot({ path: info.outputPath(`licencie-${info.project.name}.png`), fullPage: true })

  await page.goto(`/staff/${STAFF_ID}`)
  await expect(page.getByText('Certifikácie (1)')).toBeVisible()
  await expect(page.getByText('Práca vo výškach')).toBeVisible()
  await page.screenshot({ path: info.outputPath(`certifikacie-${info.project.name}.png`), fullPage: true })
})
