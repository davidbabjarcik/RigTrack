import { describe, expect, it } from 'vitest'
import readme from '../../../CHANGELOG.md?raw'
import { forUsers, parseChangelog, parseInline, sameVersion } from './parse'

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

  it('compares versions exactly and hides migration notes', () => {
    expect(sameVersion('1.11', '1.11.0')).toBe(true)
    expect(sameVersion('1.11', '1.1')).toBe(false)
    expect(sameVersion('1.1', '1.10')).toBe(false)
    expect(forUsers(parseChangelog(sample)[0]).blocks).toHaveLength(1)
  })

  it('hides migration notes written as bullets, also in the real README', () => {
    const release = { version: '2.15', date: '', blocks: [{ kind: 'list' as const, items: ['**Nové** – vec', 'Nové migrácie: `0077`'] }] }
    expect(forUsers(release).blocks).toEqual([{ kind: 'list', items: ['**Nové** – vec'] }])
    const shown = parseChangelog(readme).map(forUsers)
    expect(shown.flatMap((item) => item.blocks).some((block) => (block.kind === 'list' ? block.items.join(' ') : block.text).includes('migráci'))).toBe(false)
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
    expect(sameVersion(APP_VERSION, latest.version)).toBe(true)
  })
})
