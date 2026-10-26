import { describe, expect, it } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import { ampsAt230, tapeLabels } from './tape'

const beam = {
  id: 'b',
  name: 'Beam',
  trackUnits: true,
  quantity: 2,
  unitIds: [1, 2],
  attributes: { dmxModes: [{ name: 'Basic', channels: 16 }, { name: 'Ext', channels: 24 }], powerW: 330, weightKg: 18 },
  unitInfo: { '1': { dmxLine: '1', dmxAddress: 17, dmxMode: 'Basic' } },
} as unknown as Equipment

describe('tape labels', () => {
  it('makes labels for each piece and skips empty ones', () => {
    const labels = tapeLabels(beam, ['qr', 'address', 'modes', 'power'])
    expect(labels.filter((label) => label.kind === 'qr').map((label) => label.title)).toEqual(['Beam #1', 'Beam #2'])
    expect(labels.filter((label) => label.kind === 'address')).toEqual([{ key: 'b-1-address', kind: 'address', title: 'L1 · A017', lines: ['Beam #1 · Basic · 16 ch'] }])
    expect(labels.find((label) => label.kind === 'modes')?.lines).toEqual(['Basic 16 ch · Ext 24 ch'])
    expect(labels.find((label) => label.kind === 'power')?.lines).toEqual(['330 W · 1,4 A / 230 V · 18 kg'])
    expect(ampsAt230(1000)).toBe(4.3)
  })
})
