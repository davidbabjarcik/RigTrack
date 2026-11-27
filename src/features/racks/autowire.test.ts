import { describe, expect, it } from 'vitest'
import type { FitSlot } from './fit'
import type { RackCategory } from './library'
import { autoWire, portsOf, type SlotPorts } from './links'
import type { Accessory } from './model'

const slot = (key: string, bottomU: number, heightU = 1, accessory: Accessory | null = null): FitSlot => ({ key, side: 'front', bottomU, heightU, width: 'full', col: 0, equipmentId: null, unit: null, catalogId: null, accessory, label: '', depthMm: null, weightKg: null, powerW: null, rearSupport: null })

const categories: Record<string, RackCategory | null> = { pdu: null, amp: 'amp', dsp: 'processor', mix: 'mixer', rx: 'wireless', ant: 'antenna', sw: 'network' }
const names: Record<string, string> = { rx: 'Ukážka ULXD4D', ant: 'Ukážka rozbočovač' }
const resolve: SlotPorts = (item) => ({ name: item.key, ports: portsOf({ category: categories[item.key], accessory: item.accessory, name: names[item.key] ?? item.key, width: 'full' }) })
let n = 0
const key = () => `k${n++}`

describe('automatické zapojenie', () => {
  const slots = [slot('pdu', 1, 1, 'pdu'), slot('amp', 2, 2), slot('dsp', 4), slot('mix', 5, 3), slot('rx', 8), slot('ant', 9), slot('sw', 10)]
  const links = autoWire(slots, [], resolve, key, (item) => categories[item.key])
  const between = (from: string, to: string) => links.filter((link) => link.from === from && link.to === to)

  it('napájanie z PDU do každého zariadenia (najbližšie zásuvky)', () => {
    expect(links.filter((link) => link.cable === 'power').map((link) => link.to).sort()).toEqual(['amp', 'ant', 'dsp', 'mix', 'rx', 'sw'])
    expect(new Set(links.filter((link) => link.cable === 'power').map((link) => link.fromPort)).size).toBe(6)
  })

  it('antény A do A a B do B, prijímač do mixu', () => {
    expect(between('ant', 'rx').map((link) => `${link.fromPort}>${link.toPort}`)).toEqual(['a-1>ant-a', 'b-1>ant-b'])
    expect(between('rx', 'mix').map((link) => `${link.fromPort}>${link.toPort}`)).toEqual(['out-1>in-1', 'out-2>in-2'])
  })

  it('mix do procesora (toľko, koľko má vstupov) a procesor do zosilňovača', () => {
    expect(between('mix', 'dsp')).toHaveLength(3)
    expect(between('dsp', 'amp').map((link) => link.toPort)).toEqual(['in-1', 'in-2', 'in-3', 'in-4'])
    expect(between('mix', 'amp')).toHaveLength(0)
  })

  it('sieť do switchu, jeden kábel na zariadenie', () => {
    expect(links.filter((link) => link.cable === 'CAT').map((link) => link.from).sort()).toEqual(['amp', 'dsp', 'mix', 'rx'])
  })

  it('druhé spustenie už nič nepridá', () => {
    expect(autoWire(slots, links, resolve, key, (item) => categories[item.key])).toEqual([])
  })

  it('bez procesora ide mix rovno do zosilňovača', () => {
    const plain = [slot('pdu', 1, 1, 'pdu'), slot('amp', 2, 2), slot('mix', 5, 3)]
    const wired = autoWire(plain, [], resolve, key, (item) => categories[item.key])
    expect(wired.filter((link) => link.from === 'mix' && link.to === 'amp')).toHaveLength(4)
  })
})
