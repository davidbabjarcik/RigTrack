// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>

const fail = (email: string, ip: string) => t.rows('select public.login_guard_fail($1, $2) as until', [email, ip]).then((rows) => rows[0].until as Date | null)
const status = (email: string, ip: string) => t.rows('select public.login_guard_status($1, $2) as until', [email, ip]).then((rows) => rows[0].until as Date | null)

beforeAll(async () => {
  t = await createTestDb()
  await t.signUp('user', 'user@example.com')
})

describe('login guard', () => {
  it('locks an account from one IP after 5 failures for 5 minutes', async () => {
    for (let i = 0; i < 4; i++) expect(await fail('acc', 'ip1')).toBeNull()
    const until = await fail('acc', 'ip1')
    expect(until).not.toBeNull()
    const minutes = (new Date(until!).getTime() - Date.now()) / 60000
    expect(minutes).toBeGreaterThan(4.9)
    expect(minutes).toBeLessThanOrEqual(5.01)
    expect(await status('acc', 'ip1')).not.toBeNull()
    // Iná sieť ten istý účet po 5 pokusoch nezablokuje.
    expect(await status('acc', 'ip2')).toBeNull()
    // Blok jedného účtu nezablokuje celú IP pre ostatných.
    expect((await t.rows(`select public.login_guard_ip_status('ip1') as until`))[0].until).toBeNull()
  })

  it('resets the counter after a successful sign-in', async () => {
    for (let i = 0; i < 4; i++) await fail('ok', 'ip3')
    await t.rows(`select public.login_guard_success('ok', 'ip3')`)
    expect(await fail('ok', 'ip3')).toBeNull()
  })

  it('locks an IP that tries many accounts and keeps the log without secrets', async () => {
    for (let i = 0; i < 29; i++) expect(await fail(`a${i}`, 'ip9')).toBeNull()
    expect(await fail('a29', 'ip9')).not.toBeNull()
    expect(await status('someone-else', 'ip9')).not.toBeNull()
    expect((await t.rows(`select public.login_guard_ip_status('ip9') as until`))[0].until).not.toBeNull()
    const events = await t.rows(`select outcome, count(*)::int as n from public.login_events where ip_hash = 'ip9' group by outcome order by outcome`)
    expect(events).toEqual([
      { outcome: 'failure', n: 29 },
      { outcome: 'locked', n: 1 },
    ])
  })

  it('is not reachable for app users', async () => {
    await expect(t.as('user', `select public.login_guard_fail('x', 'y')`)).rejects.toThrow(/permission/)
    await expect(t.as('user', 'select * from public.login_guard')).rejects.toThrow(/permission/)
    await expect(t.as('user', 'select * from public.login_events')).rejects.toThrow(/permission/)
  })
})
