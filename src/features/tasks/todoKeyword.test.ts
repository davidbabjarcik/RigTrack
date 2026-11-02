import { describe, expect, it } from 'vitest'
import { hasKeyword, printTargetFromPath, printTitle, pushKey, stripKeyword, todoTitle } from './todoKeyword'

const type = (text: string) => {
  let buffer = ''
  const hits: number[] = []
  ;[...text].forEach((key, index) => {
    const result = pushKey(buffer, key)
    buffer = result.buffer
    if (result.hit) hits.push(index)
  })
  return hits.length
}

describe('@todo keyword', () => {
  it('fires on @todo and @addtodo, each time it is typed', () => {
    expect(type('@todo')).toBe(1)
    expect(type('@addtodo')).toBe(1)
    expect(type('12@todo3@TODO')).toBe(2)
    expect(type('todo')).toBe(0)
    expect(type('31121800')).toBe(1)
    expect(type('3112180')).toBe(0)
  })

  it('ignores the keyword after it was erased with backspace', () => {
    let buffer = ''
    for (const key of ['@', 't', 'o', 'd', 'x', 'Backspace', 'o']) buffer = pushKey(buffer, key).buffer
    expect(buffer).toBe('')
  })

  it('cleans the field and builds the task title', () => {
    expect(stripKeyword('LED Par @todo')).toBe('LED Par')
    expect(stripKeyword('@addtodo')).toBe('')
    expect(stripKeyword('31121800')).toBe('')
    expect(hasKeyword('1800-12-31')).toBe(true)
    expect(hasKeyword('12,5')).toBe(false)
    expect(todoTitle('Hmotnosť (kg) *', 'LED Par')).toBe('Doplniť: Hmotnosť (kg) – LED Par')
    expect(todoTitle('', '')).toBe('Doplniť: údaj')
  })
})

describe('@toprint keyword', () => {
  it('fires as a print keyword and knows what to print from the page', () => {
    let buffer = ''
    const hits: (string | null)[] = []
    for (const key of '12 @toprint') {
      const result = pushKey(buffer, key)
      buffer = result.buffer
      if (result.hit) hits.push(result.hit)
    }
    expect(hits).toEqual(['print'])
    expect(pushKey('0100180', '0').hit).toBe('print')
    expect(pushKey('3112180', '0').hit).toBe('todo')
    expect(stripKeyword('4 @toprint')).toBe('4')
    expect(hasKeyword('01001800')).toBe(true)
    expect(hasKeyword('1800-01-01')).toBe(true)
    // Číselné políčko zahodí úvodnú nulu: 01001800 → 1001800.
    expect(stripKeyword('1001800')).toBe('')
    expect(printTitle('Číslo case na štítku', 'Beam case')).toBe('Vytlačiť: Číslo case na štítku – Beam case')
    expect(printTargetFromPath('/cases/3f1c2a4e-0000-4000-8000-123456789abc/edit')).toEqual({ kind: 'case', id: '3f1c2a4e-0000-4000-8000-123456789abc' })
    expect(printTargetFromPath('/equipment/new')).toBeNull()
  })
})
