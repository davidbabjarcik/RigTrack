import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Case } from '@/features/cases/model'
import type { Equipment } from './model'
import { GroupToCases } from './GroupToCases'

const split = vi.fn(async (id: string, caseId: string, count: number) => `${id}-in-${caseId}-${count}`)
const merge = vi.fn(async (from: string, into: string) => void [from, into])
vi.mock('./api', () => ({
  equipmentKeys: { list: (companyId: string) => ['company', companyId, 'equipment'] },
  splitEquipmentIntoCase: (id: string, caseId: string, count: number) => split(id, caseId, count),
  mergeEquipment: (from: string, into: string) => merge(from, into),
}))

const box = (id: string, name: string) => ({ id, name, labelNumber: '', inventoryNumber: '' }) as unknown as Case
const part = (id: string, caseId: string | null, quantity: number) => ({ id, name: 'Hák', caseId, quantity }) as unknown as Equipment

describe('GroupToCases', () => {
  it('puts the same count into every picked case of the set and merges into an existing row', async () => {
    const cases = [box('c1', 'K10 Case #1'), box('c2', 'K10 Case #2'), box('c3', 'K10 Case #3')]
    const parts = [part('in1', 'c1', 2), part('free', null, 18)]
    const client = new QueryClient()
    client.setQueryData(['company', 'co', 'equipment'], parts)
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <GroupToCases companyId="co" parts={parts} cases={cases} ids={['in1', 'free']} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Dať do viacerých cases/ }))
    // Navrhne cases zo sady, kde háky ešte nie sú, po 2 ks (ako v K10 Case #1).
    const go = screen.getByRole('button', { name: 'Dať do 2 cases (spolu 4 ks)' })
    fireEvent.click(go)
    await waitFor(() => expect(split).toHaveBeenCalledTimes(2))
    expect(split.mock.calls.map((call) => [call[1], call[2]])).toEqual([
      ['c2', 2],
      ['c3', 2],
    ])
    expect(merge).not.toHaveBeenCalled()
  })
})
