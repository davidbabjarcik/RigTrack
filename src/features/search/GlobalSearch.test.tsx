import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Membership } from '@/features/companies/company-context'
import { GlobalSearch } from './GlobalSearch'

vi.mock('@/lib/permissions', () => ({ can: () => true }))

describe('GlobalSearch', () => {
  it('shows grouped results from cached data and the QR scan button', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
    const equipment = [{ id: 'b1', name: 'Beam 7R', manufacturer: '', model: '', serialNumber: '', inventoryNumber: '', caseId: null, quantity: 1, trackUnits: false, unitIds: [] }]
    client.setQueryData(['company', 'co', 'equipment'], equipment)
    for (const key of [
      ['company', 'co', 'cases'],
      ['company', 'co', 'events'],
      ['company', 'co', 'partners'],
      ['company', 'co', 'tasks'],
      ['company', 'co', 'notes'],
    ])
      client.setQueryData(key, [])
    client.setQueryData(['company', 'co', 'warehouse'], { warehouse: null, spots: [] })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <GlobalSearch company={{ companyId: 'co', companyName: 'Firma', role: 'admin' } as unknown as Membership} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByRole('button', { name: /Skenovať QR/ })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Hľadať všade'), { target: { value: 'beam' } })
    expect(await screen.findByRole('link', { name: /Beam 7R/ })).toHaveAttribute('href', '/equipment/b1')
  })
})
