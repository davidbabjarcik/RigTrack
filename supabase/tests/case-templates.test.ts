// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let companyA: string

const add = (user: string, name: string) =>
  t.as(user, 'insert into public.case_templates (company_id, name, width_cm, length_cm, depth_cm, weight_kg) values ($1, $2, 60, 120, 40, 18.5) returning id', [
    companyA,
    name,
  ])

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['admin', 'skladnik', 'technik', 'viewer', 'outsider']) {
    await t.signUp(name, `${name}@example.com`)
  }
  companyA = (await t.as('admin', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  for (const role of ['skladnik', 'technik', 'viewer']) {
    await t.rows('insert into public.company_members (company_id, user_id, role) values ($1, $2, $3)', [companyA, t.users[role], role])
  }
})

describe('case templates', () => {
  it('are managed by those who manage lists and offered to every member', async () => {
    const [template] = await add('skladnik', 'Thon case 120')
    await expect(add('technik', 'Iný')).rejects.toThrow(/row-level security/)
    await expect(add('viewer', 'Iný')).rejects.toThrow(/row-level security/)
    expect(await t.as('technik', 'select name, width_cm::float, weight_kg::float from public.case_templates')).toEqual([
      { name: 'Thon case 120', width_cm: 60, weight_kg: 18.5 },
    ])
    expect(await t.as('outsider', 'select 1 from public.case_templates')).toEqual([])
    await expect(t.as(null, 'select 1 from public.case_templates')).rejects.toThrow(/permission denied/)

    expect(await t.as('technik', 'delete from public.case_templates where id = $1 returning id', [template.id])).toEqual([])
    await t.as('admin', 'update public.case_templates set depth_cm = 45 where id = $1', [template.id])
  })

  it('have unique names within a company, ignoring case', async () => {
    await expect(add('admin', 'THON CASE 120')).rejects.toThrow(/duplicate key/)
    await expect(add('admin', '  ')).rejects.toThrow(/check constraint/)
  })
})
