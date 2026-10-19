import { describe, expect, it } from 'vitest'
import { describeSource, duplicateChannels, nextLine, patchSummary, type PatchLine } from './model'

const line = (patch: Partial<PatchLine>): PatchLine => ({
  id: String(patch.channel ?? 1),
  channel: 1,
  name: '',
  stagebox: 'SB1',
  stageboxInput: 1,
  source: 'mic',
  equipmentId: null,
  capsuleId: null,
  connector: '',
  stand: '',
  phantom: false,
  note: '',
  ...patch,
})
const names: Record<string, string> = { sm58: 'Shure SM58', ulxd: 'Shure ULX-D', b58: 'Beta 58A' }
const equipmentName = (id: string) => names[id]
const capsuleName = (id: string) => names[id]

describe('patch list', () => {
  it('suggests the next channel and stagebox input', () => {
    expect(nextLine([])).toMatchObject({ channel: 1, stagebox: 'SB1', stageboxInput: 1 })
    expect(nextLine([line({ channel: 4, stageboxInput: 6, stand: 'tall' })])).toMatchObject({ channel: 5, stagebox: 'SB1', stageboxInput: 7, stand: 'tall' })
  })

  it('describes sources and sums what to prepare', () => {
    const lines = [
      line({ channel: 1, equipmentId: 'sm58', stand: 'tall' }),
      line({ channel: 2, equipmentId: 'sm58', stand: 'tall' }),
      line({ channel: 3, source: 'wireless', equipmentId: 'ulxd', capsuleId: 'b58' }),
      line({ channel: 4, source: 'port', connector: 'jack' }),
      line({ channel: 4, source: 'di', phantom: true }),
    ]
    expect(describeSource(lines[2], equipmentName, capsuleName)).toBe('Shure ULX-D + Beta 58A')
    expect(describeSource(lines[3], equipmentName, capsuleName)).toBe('Jack')
    const summary = patchSummary(lines, equipmentName, capsuleName)
    expect(summary.items).toEqual([
      ['Shure SM58', 2],
      ['Vysoký stojan', 2],
      ['DI box', 1],
      ['kábel Jack', 1],
      ['kapsula Beta 58A', 1],
      ['Shure ULX-D', 1],
    ])
    expect(summary.phantom).toBe(1)
    expect([...duplicateChannels(lines)]).toEqual([4])
  })
})
