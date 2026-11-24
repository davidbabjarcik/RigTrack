import { describe, expect, it } from 'vitest'
import { missingDetails } from './incomplete'

describe('missingDetails', () => {
  it('fotka, výrobca a model, kategória; kábel výrobcu nepotrebuje', () => {
    expect(missingDetails({ kind: 'audio', manufacturer: '', model: '', photo_path: '', category_id: null })).toEqual(['fotka', 'výrobca a model', 'kategória'])
    expect(missingDetails({ kind: 'audio', manufacturer: 'Ukážka', model: '', photo_path: 'a.jpg', category_id: 'c' })).toEqual([])
    expect(missingDetails({ kind: 'cable', manufacturer: '', model: '', photo_path: 'a.jpg', category_id: 'c' })).toEqual([])
    // Firma bez kategórií: kategóriu nehlási (pole sa vo formulári ani neukáže).
    expect(missingDetails({ kind: 'truss', manufacturer: 'Ukážka', model: '', photo_path: '', category_id: null }, false)).toEqual(['fotka'])
  })
})
