// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let b: string
let box: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'stranger']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  b = (await t.as('stranger', `select public.create_company('B') as id`))[0].id
  box = (await t.as('boss', `insert into public.cases (company_id, name) values ($1, 'Ukážkový case') returning id`, [a]))[0].id
})

describe('printed content (0178)', () => {
  it('remembers when and with which content a sheet was printed and refreshes it on reprint', async () => {
    const items = (hash: string) => JSON.stringify([{ kind: 'case', target_id: box, label: 'content', content_hash: hash }])
    await t.as('boss', `select public.mark_printed($1, $2::jsonb)`, [a, items('aaa')])
    const first = (await t.as('boss', `select content_hash, printed_at from public.printed_labels`))[0]
    expect(first.content_hash).toBe('aaa')
    await t.as('boss', `select public.mark_printed($1, $2::jsonb)`, [a, items('bbb')])
    expect(await t.as('boss', `select content_hash from public.printed_labels`)).toEqual([{ content_hash: 'bbb' }])
  })

  it('is only for members of the company', async () => {
    await expect(t.as('stranger', `select public.mark_printed($1, '[]'::jsonb)`, [a])).rejects.toThrow()
    expect(await t.as('stranger', 'select 1 from public.printed_labels')).toEqual([])
    void b
  })
})
