import { describe, expect, it } from 'vitest'
import { channelColor, channelGroup, colorMixName, colorsFromChannels, dmxChannels, guessColor, parseChannelLine } from './dmxChannels'

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
