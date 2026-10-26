import { describe, expect, it } from 'vitest'
import type { Case } from '@/features/cases/model'
import type { Equipment } from '@/features/equipment/model'
import { ampsAt230, caseTapeLabel, tapeLabels } from './tape'

const beam = {
  id: 'b',
  name: 'Beam',
  categoryId: 'k',
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

  it('shows only the fields the user turned on', () => {
    const fields = { 'qr.category': true, 'qr.company': true, 'power.amps': false, 'address.line': false }
    const labels = tapeLabels(beam, ['qr', 'power', 'address'], { fields, company: 'Firma', category: () => 'Svetlá' })
    expect(labels[0].lines).toEqual(['Svetlá · Firma'])
    expect(labels.find((label) => label.kind === 'power')?.lines).toEqual(['330 W · 18 kg'])
    expect(labels.find((label) => label.kind === 'address')?.title).toBe('A017')
    expect(tapeLabels(beam, ['address'], { fields: { 'address.power': true } })[0].lines).toEqual(['Beam #1 · Basic · 16 ch', '330 W · 1,4 A'])
    const box = { id: 'c', name: 'Beam Case', labelNumber: '4', labelCategory: 'Light', kind: 'case' } as Case
    expect(caseTapeLabel(box)).toMatchObject({ title: 'Beam Case #4', lines: [] })
    expect(caseTapeLabel(box, { fields: { 'case.category': true } })).toMatchObject({ lines: ['Light'] })
  })
})
