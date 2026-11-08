import { expect, test } from '@playwright/test'
import { COMPANY_ID, fakeBackend, signIn } from './fakeBackend'

// Kontakty: karty rôznej výšky bez dier a riadky ľudí, ktoré sa nerozsypú (aj na mobile).
const partner = (id: string, name: string, extra: object = {}) => ({ id, company_id: COMPANY_ID, name, ico: '', dic: '', address: '', uses_app: false, note: '', linked_company_id: null, shared: false, legal_name: '', ic_dph: '', ceo: '', legal_form: '', ...extra })
const person = (id: string, partnerId: string, name: string, extra: object = {}) => ({ id, partner_id: partnerId, company_id: COMPANY_ID, name, role: '', phone: '0900 000 000', email: '', birth_date: null, ...extra })

const fixtures = {
  partners: [
    partner('p1', 'Agentúra Sever'),
    partner('p2', 'Produkcia Juh', { ico: '12345678', dic: '2020202020', address: 'Hlavná 1, 000 00 Mesto', legal_name: 'Produkcia Juh s. r. o.', linked_company_id: 'x' }),
    partner('p3', 'Obec Stred', { ico: '87654321', address: 'Námestie 5, 000 00 Obec' }),
  ],
  partner_contacts: [
    person('c1', 'p1', 'Jana Prvá', { email: 'velmi.dlhy.email.kontakt@example.com' }),
    person('c2', 'p2', 'Peter Druhý', { birth_date: '1980-01-01', email: 'peter@example.com', role: 'produkcia' }),
    person('c3', 'p3', 'Ivan Tretí', { birth_date: '1990-05-05' }),
    person('c4', 'p3', 'Eva Štvrtá', { birth_date: '1995-06-06' }),
    person('c5', 'p3', 'Oto Piaty', { birth_date: '2000-07-07' }),
  ],
}

test('kontakty sú zarovnané a nič nepreteká', async ({ page }, info) => {
  await signIn(page)
  await fakeBackend(page, fixtures)
  await page.goto('/partners')
  await expect(page.getByText('Oto Piaty')).toBeVisible()
  // Tlačidlá pri človeku sú v jednom riadku s menom (nie zalomené pod ním).
  for (const name of ['Jana Prvá', 'Peter Druhý', 'Oto Piaty']) {
    const row = page.locator('li', { hasText: name }).last()
    const nameBox = (await row.getByText(name).boundingBox())!
    const buttonBox = (await row.getByRole('button', { name: /Do kontaktov/ }).boundingBox())!
    expect(buttonBox.y, name).toBeLessThan(nameBox.y + nameBox.height + 24)
  }
  // Stránka sa nedá posúvať do strany.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath(`kontakty-${info.project.name}.png`), fullPage: true })
})
