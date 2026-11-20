import { describe, expect, it } from 'vitest'
import { channelColor, channelGroup, colorMixName, colorsFromChannels, dmxChannels, guessColor, mapRows, parseChannelLine, rowsToMap, slotKind } from './dmxChannels'

describe('DMX channels', () => {
  it('sorts channel names into groups', () => {
    expect(channelGroup('Dimmer')).toBe('intensity')
    expect(channelGroup('Shutter / Strobe')).toBe('shutter')
    expect(channelGroup('Pan fine')).toBe('position')
    expect(channelGroup('Pan/Tilt Speed')).toBe('speed')
    expect(channelGroup('Color Wheel')).toBe('color')
    expect(channelGroup('Red 4')).toBe('color')
    expect(channelGroup('Gobo rotation')).toBe('gobo')
    expect(channelGroup('Cell 1 Pattern Mode')).toBe('gobo')
    expect(channelGroup('Prism rotation')).toBe('prism')
    expect(channelGroup('Zoom')).toBe('beam')
    expect(channelGroup('Reset')).toBe('control')
    expect(channelGroup('–')).toBe('unused')
    expect(channelGroup('Stmievanie')).toBe('intensity')
    expect(channelGroup('Something')).toBe('other')
  })

  it('colours single colour channels only', () => {
    expect(channelColor('Red')).toBe('#ef4444')
    expect(channelColor('Červená')).toBe('#ef4444')
    expect(channelColor('Color Wheel')).toBeNull()
    expect(channelColor('Reduced speed')).toBeNull()
  })

  it('reads name and default value', () => {
    expect(parseChannelLine('Pan | 50 %')).toEqual({ name: 'Pan', value: '50 %' })
    expect(parseChannelLine('Tilt')).toEqual({ name: 'Tilt', value: '' })
    expect(dmxChannels({ map: 'Pan\n\nShutter | Open' })).toEqual([
      { channel: 1, name: 'Pan', value: '', group: 'position', fine: false, color: null },
      { channel: 3, name: 'Shutter', value: 'Open', group: 'shutter', fine: false, color: null },
    ])
  })

  it('guesses colours of a light from its channels', () => {
    expect(colorsFromChannels([{ map: 'Dimmer\nRed\nGreen\nBlue\nWhite' }, { map: 'Color Wheel\nUV' }])).toEqual({ parts: ['R', 'G', 'B', 'W', 'UV'], wheel: true })
    expect(colorMixName(['R', 'G', 'B', 'W', 'UV'])).toBe('RGBW+UV')
    expect(colorMixName(['C', 'M', 'Y', 'CTO'])).toBe('CMY + CTO')
    expect(guessColor('Tmavomodrá')).toBe('#1e3a8a')
    expect(guessColor('Congo blue')).toBe('#1e3a8a')
    expect(guessColor('Lavender')).toBe('#a78bfa')
  })
})

describe('channel table', () => {
  it('turns a layout into as many rows as the mode has channels and back', () => {
    const rows = mapRows('Pan | 50 %\nTilt', 4)
    expect(rows).toEqual([{ name: 'Pan', value: '50 %' }, { name: 'Tilt', value: '' }, { name: '', value: '' }, { name: '', value: '' }])
    expect(rowsToMap(rows)).toBe('Pan | 50 %\nTilt')
    // Prázdny riadok v strede drží číslo kanála.
    expect(rowsToMap([{ name: 'Dimmer', value: '' }, { name: '', value: '' }, { name: 'Strobe', value: 'Open' }])).toBe('Dimmer\n\nStrobe | Open')
  })

  it('keeps extra lines and works without a channel count', () => {
    expect(mapRows('A\nB\nC', 2)).toHaveLength(3)
    expect(mapRows('', Number.NaN)).toEqual([])
    expect(mapRows(undefined, 2)).toHaveLength(2)
  })
})

describe('slotKind', () => {
  it('opens colour wheel and gobo channels, not their rotation or speed', () => {
    expect(slotKind('Color Wheel')).toBe('color')
    expect(slotKind('Farebné koliesko')).toBe('color')
    expect(slotKind('Gobo wheel')).toBe('gobo')
    expect(slotKind('Gobo 2')).toBe('gobo')
    expect(slotKind('Gobo rotation')).toBeNull()
    expect(slotKind('Color Wheel fine')).toBeNull()
    expect(slotKind('Red')).toBeNull()
  })
})
