// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let mixer: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [a, t.users.viewer, 'viewer'])
  mixer = (await t.as('boss', `insert into public.equipment (company_id, name, ip_address, mac_address) values ($1, 'Mix', '192.168.1.10', '00:1A:2B:3C:4D:5E') returning id`, [a]))[0].id
  await t.as('boss', `insert into public.wifi_networks (company_id, ssid, subnet, router_ip) values ($1, 'FOH', '192.168.1.0/24', '192.168.1.1')`, [a])
})

describe('IP and MAC addresses', () => {
  it('moves equipment addresses to a protected table', async () => {
    expect(await t.as('boss', 'select ip_address, mac_address from public.equipment where id = $1', [mixer])).toEqual([{ ip_address: '', mac_address: '' }])
    expect(await t.as('boss', 'select ip, mac from public.equipment_addresses')).toEqual([{ ip: '192.168.1.10', mac: '00:1A:2B:3C:4D:5E' }])
    expect(await t.as('viewer', 'select ip from public.equipment_addresses')).toEqual([])
  })

  it('hides Wi-Fi addresses without the permission', async () => {
    await expect(t.as('viewer', 'select subnet from public.wifi_networks')).rejects.toThrow()
    expect(await t.as('viewer', 'select ssid from public.wifi_networks')).toEqual([{ ssid: 'FOH' }])
    expect((await t.as('viewer', 'select public.network_addresses($1) as a', [a]))[0].a).toEqual({ allowed: false, wifi: [] })
    expect((await t.as('boss', 'select public.network_addresses($1) as a', [a]))[0].a.wifi[0]).toMatchObject({ subnet: '192.168.1.0/24', routerIp: '192.168.1.1' })
  })
})
