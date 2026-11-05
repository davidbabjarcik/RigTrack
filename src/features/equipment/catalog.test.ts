import { describe, expect, it } from 'vitest'
import { catalogAttributes, catalogBrands, catalogModels, findCatalogEntry, type CatalogEntry } from './catalog'

const entry = (manufacturer: string, model: string, kind: CatalogEntry['kind'] = 'audio'): CatalogEntry => ({ id: `${manufacturer}-${model}`, kind, manufacturer, model, attributes: {}, verified: false })
const catalog = [entry('JBL', 'SRX835P'), entry('JBL', 'EON715'), entry('Shure', 'SM58'), entry('Robe', 'Spiider', 'light')]

describe('catalog', () => {
  it('lists brands per kind and models per brand', () => {
    expect(catalogBrands(catalog, 'audio')).toEqual(['JBL', 'Shure'])
    expect(catalogModels(catalog, 'audio', 'jbl').map((item) => item.model)).toEqual(['EON715', 'SRX835P'])
    expect(findCatalogEntry(catalog, 'audio', 'jbl', 'srx835p')?.id).toBe('JBL-SRX835P')
    expect(findCatalogEntry(catalog, 'light', 'JBL', 'SRX835P')).toBeUndefined()
  })

  it('keeps only technical model data, never prices, serials or notes', () => {
    const picked = catalogAttributes({ powered: 'active', rmsW: 1000, purchasePrice: 999, noCase: true, makers: [], lightSource: undefined } as never)
    expect(picked).toEqual({ powered: 'active', rmsW: 1000 })
  })
})
