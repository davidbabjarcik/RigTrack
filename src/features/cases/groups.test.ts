import { describe, expect, it } from 'vitest'
import { caseBaseName, caseNumber, caseTitle, groupCases, kindLabel, type Case } from './model'

const box = (name: string, labelNumber = '', id = name): Case => ({ id, name, labelNumber }) as Case

describe('case groups', () => {
  it('reads the number in a set from the label or the end of the name', () => {
    expect(caseNumber(box('Svetlá case', '4'))).toBe('4')
    expect(caseNumber(box('Svetlá case 3'))).toBe('3')
    expect(caseNumber(box('Svetlá case #7'))).toBe('7')
    expect(caseBaseName(box('Svetlá case 3'))).toBe('Svetlá case')
    expect(caseTitle(box('Svetlá case', '4'))).toBe('Svetlá case #4')
    expect(caseTitle(box('Káble'))).toBe('Káble')
  })

  it('groups identical cases and sorts them by number', () => {
    const groups = groupCases([box('Svetlá case', '10', 'a'), box('Káble', '', 'k'), box('Svetlá case', '2', 'b'), box('Svetlá case 1', '', 'c')])
    expect(groups.map((group) => [group.name, group.items.map((item) => item.id)])).toEqual([
      ['Svetlá case', ['c', 'b', 'a']],
      ['Káble', ['k']],
    ])
  })

  it('labels racks with their height', () => {
    expect(kindLabel({ kind: 'rack', rackUnits: 12 })).toBe('Rack 12U')
    expect(kindLabel({ kind: 'case' })).toBe('Case')
  })
})
