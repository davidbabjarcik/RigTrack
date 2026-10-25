import { describe, expect, it } from 'vitest'
import { hasKeyword, pushKey, stripKeyword, todoTitle } from './todoKeyword'

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
