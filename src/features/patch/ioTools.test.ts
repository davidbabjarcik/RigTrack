import { describe, expect, it } from 'vitest'
import { inputsCsv, ioWarnings, parseInputsCsv, parseRider, standCounts, usedEquipment } from './ioTools'
import { EMPTY_LINE, type PatchLine } from './model'

const equipment = [
  { id: 'sm58', name: 'Shure SM58', manufacturer: 'Shure', model: 'SM58', quantity: 2, trackUnits: false, unitIds: [], attributes: { micType: 'dynamic' as const } },
  { id: 'km184', name: 'Neumann KM184', manufacturer: 'Neumann', model: 'KM184', quantity: 2, trackUnits: false, unitIds: [], attributes: { micType: 'condenser' as const } },
]
const line = (channel: number, patch: Partial<PatchLine> = {}): PatchLine => ({ ...EMPTY_LINE, id: String(channel), channel, ...patch })

describe('input / output list', () => {
  it('varovania: duplicitný vstup, kondenzátor bez phantomu, viac kanálov ako pult, málo kusov', () => {
    const lines = [
      line(1, { stagebox: 'SB1', stageboxInput: 1, equipmentId: 'sm58' }),
      line(2, { stagebox: 'sb1', stageboxInput: 1, equipmentId: 'sm58' }),
      line(3, { equipmentId: 'sm58' }),
      line(33, { equipmentId: 'km184' }),
    ]
    const texts = ioWarnings(lines, [], equipment, 32).map((warning) => warning.text)
    expect(texts).toContain('Vstup SB1-1 je použitý viackrát (kanály 1, 2)')
    expect(texts).toContain('Kondenzátorový mikrofón bez phantomu 48 V (kanály 33)')
    expect(texts).toContain('Pult na akcii má 32 vstupných kanálov, input list ide po kanál 33')
    expect(texts).toContain('Shure SM58: v liste 3×, vo firme len 2 ks')
  })

  it('technika do pack listu a stojany', () => {
    expect([...usedEquipment([line(1, { equipmentId: 'sm58' }), line(2, { equipmentId: 'sm58' })], [{ equipmentId: 'km184' }])]).toEqual([['sm58', 2], ['km184', 1]])
    expect(standCounts([line(1, { stand: 'tall' }), line(2, { stand: 'tall' }), line(3, { stand: 'clamp' })])).toEqual(['2× Vysoký stojan', '1× Klipsa'])
  })

  it('CSV tam a späť (hlavička, úvodzovky, phantom, technika podľa názvu)', () => {
    const csv = inputsCsv([line(1, { name: 'Spev "lead"', equipmentId: 'sm58', stagebox: 'SB1', stageboxInput: 4, stand: 'tall' }), line(2, { name: 'Gitara', equipmentId: 'km184', phantom: true })], (id) => equipment.find((item) => item.id === id)?.name)
    expect(csv.startsWith('\uFEFF"Kanál";"Názov"')).toBe(true)
    const back = parseInputsCsv(csv, equipment)
    expect(back.map((item) => [item.channel, item.name, item.equipmentId, item.stagebox, item.stageboxInput, item.phantom, item.stand])).toEqual([
      [1, 'Spev "lead"', 'sm58', 'SB1', 4, false, 'tall'],
      [2, 'Gitara', 'km184', '', null, true, ''],
    ])
  })

  it('CSV bez hlavičky z Excelu: kanál, názov, mikrofón', () => {
    const back = parseInputsCsv('1;Kick In;Beta 91A\n2;Snare;SM58\n3;Bass;DI', equipment)
    expect(back.map((item) => [item.channel, item.name, item.equipmentId, item.source, item.note])).toEqual([
      [1, 'Kick In', null, 'mic', 'Beta 91A'],
      [2, 'Snare', 'sm58', 'mic', ''],
      [3, 'Bass', null, 'di', 'DI'],
    ])
  })

  it('návrh z PDF ridera', () => {
    const lines = ['INPUT LIST', '1  Kick In   Beta 91A', '2. Snare top – SM58', '03 | OH L | KM184', 'Stage plot on page 2', '4  Bass DI']
    const result = parseRider(lines, equipment)
    expect(result.map((item) => [item.channel, item.name, item.equipmentId, item.phantom])).toEqual([
      [1, 'Kick In', null, false],
      [2, 'Snare top', 'sm58', false],
      [3, 'OH L', 'km184', true],
      [4, 'Bass DI', null, false],
    ])
    expect(result[3].source).toBe('di')
  })
})
