import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { routes } from './router'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], updateServiceWorker: () => {} }),
}))

function renderAt(path: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </QueryClientProvider>,
  )
}

describe('router', () => {
  it.each([
    ['/', 'Prehľad'],
    ['/more', 'Viac'],
    ['/more/customize', 'Prispôsobiť lištu'],
  ])('renders %s', async (path, heading) => {
    renderAt(path)
    // Niektoré stránky sa načítajú lenivo (až pri otvorení).
    expect(await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 5000 })).toBeInTheDocument()
  })

  it('shows NotFound for unknown routes', () => {
    renderAt('/nope/nothing')
    expect(screen.getByText('Táto stránka neexistuje.')).toBeInTheDocument()
  })
})
