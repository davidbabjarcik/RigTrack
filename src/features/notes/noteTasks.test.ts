import { describe, expect, it } from 'vitest'
import { noteLines, remainingBody } from './noteTasks'

describe('note → tasks', () => {
  const body = 'Ples v Dolnej\n\n- Festival Horná\n• Koncert Stred\n1. Školský deň\n[ ] Jarmok\n'

  it('splits a note into clean task lines', () => {
    expect(noteLines(body)).toEqual(['Ples v Dolnej', 'Festival Horná', 'Koncert Stred', 'Školský deň', 'Jarmok'])
  })

  it('keeps only the lines that were not converted', () => {
    expect(remainingBody(body, new Set([0, 2, 4]))).toBe('- Festival Horná\n1. Školský deň')
    expect(remainingBody(body, new Set([0, 1, 2, 3, 4]))).toBe('')
  })
})
