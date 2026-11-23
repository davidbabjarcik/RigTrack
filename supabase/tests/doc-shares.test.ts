import { beforeAll, describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

let t: Awaited<ReturnType<typeof createTestDb>>
let a: string
let event: string
let mic: string

beforeAll(async () => {
  t = await createTestDb()
  for (const name of ['boss', 'viewer', 'outsider']) await t.signUp(name, `${name}@example.com`)
  a = (await t.as('boss', `select public.create_company('A') as id`))[0].id
  await t.as('outsider', `select public.create_company('B')`)
  await t.rows(`insert into public.company_members (company_id, user_id, role) values ($1, $2, 'viewer')`, [a, t.users.viewer])
  event = (await t.as('boss', `insert into public.events (company_id, name, starts_on, ends_on, venue) values ($1, 'Ukážkový koncert', current_date, current_date, 'Sála') returning id`, [a]))[0].id
  mic = (await t.as('boss', `insert into public.equipment (company_id, name, kind) values ($1, 'Ukážkový mikrofón', 'audio') returning id`, [a]))[0].id
  await t.as('boss', `insert into public.event_patch (company_id, event_id, channel, name, equipment_id) values ($1, $2, 1, 'Spev', $3)`, [a, event, mic])
})

describe('zdieľanie dokumentov', () => {
  let token: string

  it('odkaz vytvorí len ten, kto upravuje; input list bez verzie sa uloží ako verzia 1', async () => {
    await expect(t.as('viewer', `select public.create_doc_share('iolist', $1, 'FOH technik')`, [event])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('outsider', `select public.create_doc_share('iolist', $1, 'FOH technik')`, [event])).rejects.toThrow(/oprávnenie/)
    await expect(t.as('boss', `select public.create_doc_share('iolist', $1, '  ')`, [event])).rejects.toThrow(/príjemcu/)
    token = (await t.as('boss', `select public.create_doc_share('iolist', $1, 'FOH technik', current_date + 7) as token`, [event]))[0].token
    expect(token).toHaveLength(64)
    expect(await t.as('viewer', `select recipient, view_count from public.doc_shares`)).toEqual([{ recipient: 'FOH technik', view_count: 0 }])
    expect(await t.as('outsider', `select id from public.doc_shares`)).toEqual([])
    await expect(t.as('viewer', `update public.doc_shares set revoked_at = null`)).rejects.toThrow(/permission/)
    await expect(t.as(null, `select id from public.doc_shares`)).rejects.toThrow(/permission/)
  })

  it('príjemca bez prihlásenia: posledná verzia, názvy techniky, bez interných polí; zobrazenie sa zapíše', async () => {
    const [{ data }] = await t.as(null, 'select public.get_shared_doc($1) as data', [token])
    expect(data.version).toBe(1)
    expect(data.event).toBe('Ukážkový koncert')
    expect(data.recipient).toBe('FOH technik')
    expect(data.previous).toBeNull()
    expect(data.data.inputs[0]).toMatchObject({ channel: 1, name: 'Spev', equipment_id: mic })
    expect(data.data.inputs[0].id).toBeUndefined()
    expect(data.names[mic]).toBe('Ukážkový mikrofón')
    expect(await t.as('boss', `select view_count, last_viewed_version from public.doc_shares`)).toEqual([{ view_count: 1, last_viewed_version: 1 }])
    expect(await t.as('viewer', `select version from public.doc_share_views`)).toEqual([{ version: 1 }])
    expect((await t.as(null, 'select public.get_shared_doc($1) as data', ['x'.repeat(64)]))[0].data).toBeNull()
  })

  it('nová verzia: príjemca vidí aj verziu, ktorú videl naposledy (zvýraznenie zmien)', async () => {
    await t.as('boss', `update public.event_patch set name = 'Spev 1' where event_id = $1`, [event])
    await t.as('boss', 'select public.save_iolist_version($1)', [event])
    const [{ data }] = await t.as(null, 'select public.get_shared_doc($1) as data', [token])
    expect([data.version, data.previousVersion, data.previous.inputs[0].name, data.data.inputs[0].name]).toEqual([2, 1, 'Spev', 'Spev 1'])
  })

  it('zrušený alebo prepadnutý odkaz nič neukáže; zrušiť môže len ten, kto upravuje', async () => {
    const [{ id }] = await t.as('boss', `select id from public.doc_shares where token = $1`, [token])
    await expect(t.as('viewer', 'select public.revoke_doc_share($1)', [id])).rejects.toThrow(/oprávnenie/)
    await t.as('boss', 'select public.revoke_doc_share($1)', [id])
    expect((await t.as(null, 'select public.get_shared_doc($1) as data', [token]))[0].data).toBeNull()
    const old = (await t.as('boss', `select public.create_doc_share('iolist', $1, 'Klub') as token`, [event]))[0].token
    await t.rows(`update public.doc_shares set expires_on = current_date - 1 where token = $1`, [old])
    expect((await t.as(null, 'select public.get_shared_doc($1) as data', [old]))[0].data).toBeNull()
    await expect(t.as('boss', `select public.create_doc_share('iolist', $1, 'Klub', current_date - 1)`, [event])).rejects.toThrow(/Platnosť/)
  })

  it('rack bez uloženého osadenia sa zdieľať nedá', async () => {
    const [{ id }] = await t.as('boss', `insert into public.rack_designs (company_id, name, units) values ($1, 'Ukážkový rack', 6) returning id`, [a])
    await expect(t.as('boss', `select public.create_doc_share('rack', $1, 'Klub')`, [id])).rejects.toThrow(/osadenie/)
    await t.as('boss', `select public.save_rack($1, 1, '[]'::jsonb)`, [id])
    const [{ token: rackToken }] = await t.as('boss', `select public.create_doc_share('rack', $1, 'Klub') as token`, [id])
    const [{ data }] = await t.as(null, 'select public.get_shared_doc($1) as data', [rackToken])
    expect([data.docType, data.title, data.data.rack.units, data.data.rack.updated_by]).toEqual(['rack', 'Ukážkový rack', 6, undefined])
  })
})
