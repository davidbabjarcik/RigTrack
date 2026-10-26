// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('boss', 'boss@example.com')
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('boss', `insert into public.wifi_networks (company_id, ssid, password, scope) values ($1, 'Kancelária', 'tajne-heslo', 'company')`, [a])
})

describe('network permissions', () => {
  it('reads Wi-Fi passwords only through wifi_passwords()', async () => {
    await expect(t.as('boss', 'select password from public.wifi_networks')).rejects.toThrow()
    expect(await t.as('boss', 'select ssid, scope from public.wifi_networks')).toEqual([{ ssid: 'Kancelária', scope: 'company' }])
    expect(await t.as('boss', 'select password from public.wifi_passwords($1)', [a])).toEqual([{ password: 'tajne-heslo' }])
  })

  it('knows the new permissions', async () => {
    const rows = await t.rows(`select permission from public.permission_defaults() where permission like 'networks.%' or permission = 'checks.all' order by 1`)
    expect(rows.map((row: { permission: string }) => row.permission)).toEqual(['checks.all', 'networks.addresses', 'networks.admin', 'networks.passwords', 'networks.view'])
  })
})
