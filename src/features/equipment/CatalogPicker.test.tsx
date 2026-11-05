import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { CatalogEntry } from './catalog'
import { CatalogPicker, knownFacts } from './CatalogPicker'

const entry = (attributes: Record<string, unknown>, verified = false) =>
  ({ id: '1', kind: 'audio', manufacturer: 'Značka', model: 'Box 1', attributes, verified }) as unknown as CatalogEntry

function renderPicker(item: CatalogEntry) {
  render(<CatalogPicker kind="audio" catalog={[item]} manufacturer="Značka" model="Box 1" onManufacturer={() => {}} onModel={() => {}} onPick={() => {}} />)
}

afterEach(cleanup)

describe('CatalogPicker', () => {
  it('counts only filled specifications', () => {
    expect(knownFacts({})).toBe(0)
    expect(knownFacts({ audioType: 'top', impedance: '', drivers: [] , powerRms: 500 })).toBe(2)
  })

  it('says when the model has no specifications yet', () => {
    renderPicker(entry({}))
    expect(screen.getByText(/Technické údaje o tomto modeli zatiaľ nie sú známe/)).toBeInTheDocument()
  })

  it('says when only basic details are known', () => {
    renderPicker(entry({ audioType: 'top', impedance: 8 }))
    expect(screen.getByText(/len základné údaje \(2\)/)).toBeInTheDocument()
  })

  it('says whether a well-known model is verified', () => {
    renderPicker(entry({ audioType: 'top', impedance: 8, powerRms: 500, splMax: 130 }))
    expect(screen.queryByText(/zatiaľ nie sú známe|len základné údaje/)).toBeNull()
    expect(screen.getByText(/údaje zatiaľ nie sú overené/)).toBeInTheDocument()
    cleanup()
    renderPicker(entry({ audioType: 'top', impedance: 8, powerRms: 500, splMax: 130 }, true))
    expect(screen.getByText(/údaje sú overené/)).toBeInTheDocument()
  })
})
