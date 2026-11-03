import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import type { Case } from './model'
import { SetAccessories } from './SetAccessories'

const setAccessory = vi.fn(async (companyId: string, id: string, attributes: object, on: boolean) => void [companyId, id, attributes, on])
vi.mock('@/features/equipment/api', () => ({
  equipmentKeys: { list: (companyId: string) => ['company', companyId, 'equipment'] },
  setSheetAccessory: (companyId: string, id: string, attributes: object, on: boolean) => setAccessory(companyId, id, attributes, on),
}))
const update = vi.fn()
vi.mock('@/features/settings/userPrefs', () => ({ useUserPrefs: () => ({ prefs: { sheet: { accessoryOrder: ['Hák'] } }, update }) }))

const box = (id: string) => ({ id, name: `K10 Case #${id}` }) as unknown as Case
const item = (id: string, name: string, caseId: string, accessory = false) => ({ id, name, caseId, attributes: accessory ? { sheetAccessory: true } : {} }) as unknown as Equipment

describe('SetAccessories', () => {
  it('changes accessories and their order only after Save', async () => {
    const equipment = [item('h1', 'Hák', 'c1', true), item('h2', 'Hák', 'c2', true), item('o1', 'Omega', 'c1'), item('o2', 'Omega', 'c2'), item('l1', 'Lanko', 'c1', true), item('l2', 'Lanko', 'c2', true)]
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SetAccessories companyId="co" members={[box('c1'), box('c2')]} equipment={equipment} canEdit />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Príslušenstvo v obsahu/ }))
    const order = () => within(screen.getAllByRole('list')[0]).getAllByRole('listitem').map((li) => li.textContent)
    // Uložené poradie: Hák prvý, Lanko za ním.
    expect(order()[0]).toContain('1.Hák')
    expect(order()[1]).toContain('2.Lanko')
    fireEvent.click(screen.getByRole('checkbox', { name: /Omega/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Omega vyššie' }))
    expect(setAccessory).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Uložiť' }))
    await waitFor(() => expect(update).toHaveBeenCalled())
    expect(setAccessory.mock.calls.map((call) => [call[1], call[3]])).toEqual([
      ['o1', true],
      ['o2', true],
    ])
    expect(update.mock.calls[0][0].sheet.accessoryOrder).toEqual(['Hák', 'Omega', 'Lanko'])
  })
})
