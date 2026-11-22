import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { MakerNameField } from './MakerNameField'

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <MakerNameField label="Kto vyrobil" names={['Ukážkový Zamestnanec', 'Druhý Člen']} value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  )
}

afterEach(cleanup)

describe('MakerNameField', () => {
  it('vyberie zamestnanca zo zoznamu', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('Kto vyrobil'), { target: { value: 'Druhý Člen' } })
    expect(screen.getByTestId('value').textContent).toBe('Druhý Člen')
    expect(screen.queryByLabelText('Meno inej osoby')).toBeNull()
  })

  it('Iná osoba – meno sa dopíše', () => {
    render(<Harness initial="Ukážkový Zamestnanec" />)
    fireEvent.change(screen.getByLabelText('Kto vyrobil'), { target: { value: '__other__' } })
    expect(screen.getByTestId('value').textContent).toBe('')
    fireEvent.change(screen.getByLabelText('Meno inej osoby'), { target: { value: 'Ukážkový Brigádnik' } })
    expect(screen.getByTestId('value').textContent).toBe('Ukážkový Brigádnik')
    expect((screen.getByLabelText('Kto vyrobil') as HTMLSelectElement).value).toBe('__other__')
  })

  it('staré meno mimo tímu sa ukáže ako Iná osoba', () => {
    render(<Harness initial="Niekto Mimo" />)
    expect((screen.getByLabelText('Kto vyrobil') as HTMLSelectElement).value).toBe('__other__')
    expect((screen.getByLabelText('Meno inej osoby') as HTMLInputElement).value).toBe('Niekto Mimo')
  })
})
