import { describe, expect, it } from 'vitest'
import readme from '../../../README.md?raw'
import { parseChangelog, parseInline } from './parse'

const sample = `# App

## Čo je nové

### 1.2 – 18. 10. 2026

- **Nové** – prvá vec,
  pokračuje tu.
- Druhá s \`kódom\`.

Nové migrácie: \`0049\`.

### 1.1.1 – 17. 10. 2026

- Oprava.

## Moduly

- toto už nie
`

describe('changelog', () => {
  it('reads releases from the README section', () => {
    const releases = parseChangelog(sample)
    expect(releases.map((release) => [release.version, release.date])).toEqual([
      ['1.2', '18. 10. 2026'],
      ['1.1.1', '17. 10. 2026'],
    ])
    expect(releases[0].blocks).toEqual([
      { kind: 'list', items: ['**Nové** – prvá vec, pokračuje tu.', 'Druhá s `kódom`.'] },
      { kind: 'text', text: 'Nové migrácie: `0049`.' },
    ])
    expect(releases[1].blocks).toEqual([{ kind: 'list', items: ['Oprava.'] }])
  })

  it('formats bold and code', () => {
    expect(parseInline('a **b** c `d`')).toEqual([
      { kind: 'text', text: 'a ' },
      { kind: 'bold', text: 'b' },
      { kind: 'text', text: ' c ' },
      { kind: 'code', text: 'd' },
    ])
  })

  it('finds the current version in the real README', async () => {
    const { APP_VERSION } = await import('@/lib/version')
    const latest = parseChangelog(readme)[0]
    expect(APP_VERSION.startsWith(latest.version)).toBe(true)
  })
})
