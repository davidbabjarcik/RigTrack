import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { catalogMissing, thomannUrl } from './catalog'

const isDeveloper = vi.fn()
vi.mock('@/features/bugs/api', () => ({ bugKeys: { developer: ['is-developer'] }, fetchIsDeveloper: () => isDeveloper() }))
vi.mock('./catalog', async (original) => ({ ...(await original<typeof import('./catalog')>()), useCatalog: () => ({ data: [], isPending: false, isError: false }) }))

const { CatalogAdminPage } = await import('./CatalogAdminPage')

function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/developer/catalog" element={<CatalogAdminPage />} />
          <Route path="/company/select" element={<p>výber firmy</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(cleanup)

describe('CatalogAdminPage', () => {
  it('sends anyone who is not a developer away, even with a typed address', async () => {
    isDeveloper.mockResolvedValue(false)
    renderAt('/developer/catalog')
    expect(await screen.findByText('výber firmy')).toBeInTheDocument()
  })

  it('shows the database to the developer', async () => {
    isDeveloper.mockResolvedValue(true)
    renderAt('/developer/catalog')
    expect(await screen.findByRole('heading', { name: 'Databáza techniky' })).toBeInTheDocument()
  })
})

describe('catalog helpers', () => {
  it('lists what a model is missing by its kind', () => {
    expect(catalogMissing({ kind: 'audio', attributes: { audioType: 'subwoofer', powered: 'active', peakW: 2000, freqRange: '30 Hz – 120 Hz', maxSplPeakDb: 135, woofer: '18″', weightKg: 40 } })).toEqual(['rozmery', 'kód Thomann'])
    expect(catalogMissing({ kind: 'truss', attributes: { trussType: 'point4', lengthM: 2, weightKg: 12, thomannCode: '123456' } })).toEqual([])
    expect(catalogMissing({ kind: 'dj', attributes: {} })).toEqual(['všetko', 'kód Thomann'])
  })

  it('links a Thomann article number to the product, other text to search', () => {
    expect(thomannUrl('123456')).toBe('https://www.thomann.de/intl/prod_AR123456.html')
    expect(thomannUrl('VRX932')).toBe('https://www.thomann.de/intl/search_dir.html?sw=VRX932')
    expect(thomannUrl(' ')).toBe('')
  })
})
