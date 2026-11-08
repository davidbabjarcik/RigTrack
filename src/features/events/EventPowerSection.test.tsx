import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Equipment } from '@/features/equipment/model'
import { EMPTY_EVENT_DETAILS, type CompanyEvent } from './model'
import type { PowerPlan } from './powerPlan'

const equipment = [
  { id: 'fresnel', name: 'Fresnel 1 kW', kind: 'light', attributes: { powerW: 1000, externalDimmer: true } },
  { id: 'beam', name: 'Beam', kind: 'light', attributes: { powerW: 450 } },
  { id: 'amp', name: 'Zosilňovač', kind: 'audio', attributes: { powerW: 2000 } },
] as Equipment[]
let stored: PowerPlan = { zones: [], generators: [] }
const save = vi.fn()

vi.mock('@/features/equipment/api', () => ({ equipmentKeys: { list: (id: string) => ['eq', id] }, fetchEquipmentList: async () => equipment }))
vi.mock('@/features/partners/api', () => ({ usePartners: () => ({ data: [{ id: 'p1', name: 'Požičovňa centrál' }] }) }))
vi.mock('./powerPlanApi', () => ({
  powerPlanKeys: { ofEvent: () => ['plan'] },
  usePowerPlan: () => ({ data: { ...stored, saved: true }, isError: false }),
  savePowerPlan: (...args: unknown[]) => save(...args),
}))

const { EventPowerSection } = await import('./EventPowerSection')

const event: CompanyEvent = {
  id: 'e1', name: 'Festival', client: '', venue: '', startsOn: '2026-11-20', endsOn: '2026-11-20', status: 'planned', note: '', crew: [],
  equipment: [
    { equipmentId: 'fresnel', quantity: 4, caseId: null },
    { equipmentId: 'beam', quantity: 8, caseId: null },
    { equipmentId: 'amp', quantity: 3, caseId: null },
  ],
  ...EMPTY_EVENT_DETAILS,
}

function show(canEdit = true) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EventPowerSection companyId="c1" event={event} canEdit={canEdit} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('EventPowerSection', () => {
  it('starts with all equipment on the phases and offers places', async () => {
    stored = { zones: [], generators: [] }
    show()
    expect(await screen.findByText(/Spolu 13,6 kW/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Predné svietenie' }))
    expect(await screen.findByDisplayValue('Predné svietenie')).toBeInTheDocument()
  })

  it('advises feeds and a dimmer for a place with fresnels and a generator size for the event', async () => {
    stored = {
      zones: [
        { id: 'z1', name: 'Predné svietenie', kind: 'light', items: [{ equipmentId: 'fresnel', quantity: 4 }], extraKw: 0 },
        { id: 'z2', name: 'Strecha', kind: 'light', items: [{ equipmentId: 'beam', quantity: 8 }], extraKw: 0 },
      ],
      generators: [{ id: 'g1', name: 'Centrála', kva: 20, supplier: 'Požičovňa centrál', partnerId: 'p1', note: '' }],
    }
    show(false)
    const front = (await screen.findByText('Predné svietenie')).closest('div.rounded-xl') as HTMLElement
    expect(within(front).getByText(/Externý dimmer 230 V/)).toBeInTheDocument()
    expect(within(front).getByText(/4 kanálov/)).toBeInTheDocument()
    const roof = screen.getByText('Strecha').closest('div.rounded-xl') as HTMLElement
    expect(within(roof).getByText(/Socapex: 2 okruhov/)).toBeInTheDocument()
    // Zosilňovače nie sú v žiadnom mieste, ale rátajú sa do celku.
    expect(screen.getByText(/3× Zosilňovač/)).toBeInTheDocument()
    expect(screen.getByText(/Celý event: 13,6 kW/)).toBeInTheDocument()
    expect(screen.getByText(/požičaná: Požičovňa centrál/)).toBeInTheDocument()
    expect(screen.getByText(/Spolu 20 kVA – stačí bez rezervy/)).toBeInTheDocument()
  })
})
