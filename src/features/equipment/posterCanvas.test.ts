import { describe, expect, it } from 'vitest'
import type { PosterSection } from './poster'
import { layoutPoster } from './posterCanvas'

const section = (key: string, tiles: number): PosterSection => ({
  key,
  title: key,
  total: tiles,
  tiles: Array.from({ length: tiles }, (_, index) => ({ key: `${key}${index}`, name: `${key} ${index}`, detail: '', count: 1, photoPath: '', ids: [], sort: 0 })),
})

describe('layoutPoster', () => {
  it('pairs small sections side by side in landscape and stacks them in portrait', () => {
    const sections = [section('a', 2), section('b', 3), section('c', 8), section('d', 1)]
    const landscape = layoutPoster(sections, false, false)
    expect(landscape.pages.flat().map((row) => row.blocks.map((block) => [block.section.key, block.wide]))).toEqual([
      [['a', false], ['b', false]],
      [['c', true]],
      [['d', true]],
    ])
    const portrait = layoutPoster(sections, true, true)
    expect(portrait.pages.flat().map((row) => row.blocks.map((block) => block.section.key))).toEqual([['a'], ['b'], ['c'], ['d']])
  })

  it('splits a section that does not fit on one page', () => {
    const { pages } = layoutPoster([section('big', 60)], false, false)
    expect(pages.length).toBeGreaterThan(1)
    const blocks = pages.flat().flatMap((row) => row.blocks)
    expect(blocks.reduce((sum, block) => sum + block.tiles.length, 0)).toBe(60)
    expect(blocks.slice(1).every((block) => block.continued)).toBe(true)
  })
})
