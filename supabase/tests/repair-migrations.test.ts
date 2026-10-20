// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createTestDb } from './helpers'

const sql = (file: string) => readFileSync(`supabase/migrations/${file}`, 'utf8')

describe('repair migrations', () => {
  it('0070 rebuilds Wi-Fi networks on a database without 0055 and can run twice', async () => {
    const t = await createTestDb()
    await t.exec('drop table public.wifi_router_logins; drop table public.wifi_networks cascade;')
    // Stará verzia 0055: len základné stĺpce.
    await t.exec(`create table public.wifi_networks (id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies (id) on delete cascade, ssid text not null, password text not null default '', created_at timestamptz not null default now())`)
    await t.exec(sql('0070_repair_wifi.sql'))
    await t.exec(sql('0070_repair_wifi.sql'))
    await t.signUp('admin', 'admin@example.com')
    const company = (await t.as('admin', `select public.create_company('A') as id`))[0].id
    await t.as('admin', `insert into public.wifi_networks (company_id, ssid, dhcp, management_ip, router_model) values ($1, 'JEF-FOH', true, '192.168.1.1', 'TP-Link')`, [company])
    expect(await t.as('admin', 'select ssid, router_model, dhcp from public.wifi_networks')).toEqual([{ ssid: 'JEF-FOH', router_model: 'TP-Link', dhcp: true }])
  })

  it('0069 adds device networks to an older member_devices and can run twice', async () => {
    const t = await createTestDb()
    await t.exec('alter table public.member_devices drop column networks; alter table public.member_devices drop column ethernet_mac;')
    await t.exec(sql('0069_repair_devices_owners.sql'))
    await t.exec(sql('0069_repair_devices_owners.sql'))
    expect(await t.rows(`select count(*)::int as n from information_schema.columns where table_name = 'member_devices' and column_name in ('networks', 'ethernet_mac')`)).toEqual([{ n: 2 }])
  })
  it('0071 adds every missing column so the demo company can be created again', async () => {
    const t = await createTestDb()
    await t.exec(`
      alter table public.event_payments drop column vat, drop column vat_rate;
      alter table public.member_devices drop column networks;
      alter table public.wifi_networks drop column dhcp, drop column dhcp_start, drop column dhcp_end;
      alter table public.equipment drop column links;
    `)
    await t.exec(sql('0071_repair_all_columns.sql'))
    await t.exec(sql('0071_repair_all_columns.sql'))
    await t.signUp('owner', 'owner@example.com')
    const demo = await t.as('owner', 'select public.create_demo_company() as id')
    expect(demo[0].id).toBeTruthy()
    expect(await t.as('owner', 'select count(*)::int > 0 as ok from public.wifi_networks')).toEqual([{ ok: true }])
  })
  it('0072 restores current checks and functions so the demo company can be created again', async () => {
    const t = await createTestDb()
    await t.exec(`
      alter table public.event_payments drop constraint event_payments_method_check;
      alter table public.event_payments add constraint event_payments_method_check check (method in ('cash'));
      create or replace function public.create_demo_company() returns uuid language sql as $$ select null::uuid $$;
    `)
    await t.exec(sql('0072_repair_checks_functions.sql'))
    await t.exec(sql('0072_repair_checks_functions.sql'))
    await t.signUp('owner', 'owner@example.com')
    const demo = await t.as('owner', 'select public.create_demo_company() as id')
    expect(demo[0].id).toBeTruthy()
    expect(await t.rows(`select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'event_payments_method_check'`)).toEqual([{ def: expect.stringContaining('invoice') }])
  })

  it('0072 replaces a stale device check so a notebook can be saved', async () => {
    const t = await createTestDb()
    await t.exec(`
      alter table public.member_devices drop constraint member_devices_kind_check;
      alter table public.member_devices add constraint member_devices_kind_check check (kind in ('phone'));
    `)
    await t.exec(sql('0072_repair_checks_functions.sql'))
    await t.signUp('owner', 'owner@example.com')
    const company = (await t.as('owner', `select public.create_company('A') as id`))[0].id
    await t.as('owner', `insert into public.member_devices (company_id, kind, name, mac, ethernet_mac) values ($1, 'laptop', 'DB-PC', '74:4C:A1:D8:DC:65', '38:F3:AB:CD:3E:20')`, [company])
    expect(await t.as('owner', 'select kind from public.member_devices')).toEqual([{ kind: 'laptop' }])
  })
})
