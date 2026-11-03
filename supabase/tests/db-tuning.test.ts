// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

// Migrácia 0143: pravidlá a indexy podľa Supabase Advisors. Nové migrácie musia písať (select auth.uid()).
let t: Awaited<ReturnType<typeof createTestDb>>

beforeAll(async () => {
  t = await createTestDb()
})

describe('db tuning (0143)', () => {
  it('evaluates auth.uid() once per query in every policy', async () => {
    const rows = await t.rows(`
      select tablename, policyname from pg_policies
      where schemaname = 'public'
        and (replace(coalesce(qual, ''), '( SELECT auth.uid() AS uid)', '') like '%auth.uid()%'
          or replace(coalesce(with_check, ''), '( SELECT auth.uid() AS uid)', '') like '%auth.uid()%')`)
    expect(rows).toEqual([])
  })

  it('has no table with both a SELECT policy and a FOR ALL policy', async () => {
    const rows = await t.rows(`
      select tablename from pg_policies where schemaname = 'public' and permissive = 'PERMISSIVE'
      group by tablename having count(*) filter (where cmd = 'ALL') > 0 and count(*) filter (where cmd = 'SELECT') > 0`)
    expect(rows).toEqual([])
  })

  it('covers every foreign key with an index', async () => {
    const rows = await t.rows(`
      select c.conname from pg_constraint c join pg_namespace n on n.oid = c.connamespace
      where c.contype = 'f' and n.nspname = 'public'
        and not exists (
          select 1 from pg_index i where i.indrelid = c.conrelid
            and (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] @> c.conkey
            and (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] <@ c.conkey)`)
    expect(rows).toEqual([])
  })

  it('keeps trigger functions out of the API', async () => {
    const rows = await t.rows(`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
        and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))`)
    expect(rows).toEqual([])
  })

  it('keeps write access after splitting FOR ALL policies', async () => {
    await t.signUp('admin', 'admin@example.com')
    await t.signUp('viewer', 'viewer@example.com')
    const [company] = await t.as('admin', `select public.create_company('Testovacia firma') as id`)
    const id = company.id
    // Admin zapíše partnera; iný používateľ (nie člen) ho nevidí, nezmení ani nezmaže.
    await t.as('admin', `insert into public.partners (company_id, name) values ($1, 'Partner')`, [id])
    expect(await t.as('admin', `select name from public.partners where company_id = $1`, [id])).toHaveLength(1)
    expect(await t.as('viewer', `select name from public.partners where company_id = $1`, [id])).toHaveLength(0)
    expect(await t.as('viewer', `update public.partners set name = 'X' where company_id = $1 returning id`, [id])).toHaveLength(0)
    expect(await t.as('viewer', `delete from public.partners where company_id = $1 returning id`, [id])).toHaveLength(0)
    expect(await t.as('admin', `update public.partners set name = 'Partner 2' where company_id = $1 returning id`, [id])).toHaveLength(1)
    expect(await t.as('admin', `delete from public.partners where company_id = $1 returning id`, [id])).toHaveLength(1)
  })
})
