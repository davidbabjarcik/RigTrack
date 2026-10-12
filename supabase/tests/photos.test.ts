// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

// Storage tu zastupuje zjednodušená tabuľka storage.objects; overuje sa logika policies.
let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string
let companyB: string

const upload = (user: string, path: string) =>
  t.as(user, `insert into storage.objects (bucket_id, name) values ('equipment-photos', $1) returning name`, [path])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  companyB = (await t.as('outsider', `select public.create_company('B') as id`))[0].id
  for (const role of ['technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [
      companyA,
      t.users[role],
      role,
    ])
  }
})

describe('equipment photos', () => {
  it('creates a private bucket limited to images', async () => {
    const [bucket] = await t.rows(`select public, file_size_limit from storage.buckets where id = 'equipment-photos'`)
    expect(bucket.public).toBe(false)
    expect(Number(bucket.file_size_limit)).toBe(2 * 1024 * 1024)
  })

  it('lets a technik upload into the own company folder only', async () => {
    expect(await upload('technik', `${companyA}/photo-1.jpg`)).toHaveLength(1)
    await expect(upload('technik', `${companyB}/photo-2.jpg`)).rejects.toThrow(/row-level security/)
    await expect(upload('viewer', `${companyA}/photo-3.jpg`)).rejects.toThrow(/row-level security/)
    await expect(upload('outsider', `${companyA}/photo-4.jpg`)).rejects.toThrow(/row-level security/)
  })

  it('shows photos to members of the company and nobody else', async () => {
    expect(await t.as('viewer', 'select name from storage.objects')).toHaveLength(1)
    expect(await t.as('outsider', 'select name from storage.objects')).toEqual([])
  })

  it('lets only editors of the company delete', async () => {
    expect(await t.as('viewer', 'delete from storage.objects returning name')).toEqual([])
    expect(await t.as('outsider', 'delete from storage.objects returning name')).toEqual([])
    expect(await t.as('admin', 'delete from storage.objects returning name')).toHaveLength(1)
  })
})
