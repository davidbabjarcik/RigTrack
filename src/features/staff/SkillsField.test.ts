import { describe, expect, it } from 'vitest'
import { joinSkills, parseSkills } from './skills'

describe('skills', () => {
  it('parses comma, semicolon and newline separated skills without duplicates', () => {
    expect(parseSkills('Avolites, Crown;\nAvolites ,  ')).toEqual(['Avolites', 'Crown'])
    expect(joinSkills(['Avolites', 'Crown'])).toBe('Avolites, Crown')
  })
})
