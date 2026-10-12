import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { routes } from './router'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, () => {}], updateServiceWorker: () => {} }),
}))

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />)
}

describe('router', () => {
  it.each([
    ['/', 'Prehľad'],
    ['/more', 'Viac'],
    ['/more/customize', 'Prispôsobiť lištu'],
  ])('renders %s', (path, heading) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('shows NotFound for unknown routes', () => {
    renderAt('/nope/nothing')
    expect(screen.getByText('Táto stránka neexistuje.')).toBeInTheDocument()
  })
})
