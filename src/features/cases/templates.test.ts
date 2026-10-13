import { describe, expect, it } from 'vitest'
import { describeTemplate, numberedCaseNames } from './templates'

describe('numberedCaseNames', () => {
  it('continues after the cases that already exist', () => {
    expect(numberedCaseNames('Thon case', 2, ['Thon case 1', 'thon case 2', 'Thon case veľký 7', 'Iný 9'])).toEqual(['Thon case 3', 'Thon case 4'])
    expect(numberedCaseNames('Thon case', 1, [])).toEqual(['Thon case 1'])
  })

  it('starts at the number typed in the name', () => {
    expect(numberedCaseNames('Blinder case 5', 3, ['Blinder case 1'])).toEqual(['Blinder case 5', 'Blinder case 6', 'Blinder case 7'])
  })

  it('copes with names that contain special characters', () => {
    expect(numberedCaseNames('Rack (19") + káble', 1, ['Rack (19") + káble 4'])).toEqual(['Rack (19") + káble 5'])
  })
})

describe('describeTemplate', () => {
  it('sums up the dimensions, weight and category', () => {
    expect(describeTemplate({ name: 'x', labelCategory: 'Light', weightKg: 18.5, widthCm: 60, lengthCm: 120, depthCm: 40 })).toBe('60 × 120 × 40 cm · 18,5 kg · Light')
    expect(describeTemplate({ name: 'x', labelCategory: '', weightKg: null, widthCm: null, lengthCm: null, depthCm: null })).toBe('')
  })
})
