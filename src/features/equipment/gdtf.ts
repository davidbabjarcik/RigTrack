import { readZip } from '@/lib/zip'
import { COLOR_PARTS, type ColorPart, type ColorWheel } from './dmxChannels'
import type { DmxMode, LightSource } from './model'

// GDTF (General Device Type Format, gdtf-share.com): ZIP s popisom svetla v description.xml. Čítame len ten popis –
// výrobcu, model, DMX módy s kanálmi a predvolenými hodnotami, farby (miešanie a koliesko), príkon, váhu a zdroj svetla. Súbor sa číta v prehliadači a nikam sa neposiela.

export type GdtfFixture = {
  manufacturer: string
  model: string
  modes: DmxMode[]
  colorParts?: ColorPart[]
  wheel?: ColorWheel
  powerW?: number
  weightKg?: number
  lightSource?: LightSource
}

/** Najväčší súbor, ktorý prijmeme (GDTF s 3D modelmi býva do pár desiatok MB). */
export const GDTF_MAX_BYTES = 60 * 1024 * 1024
const MAX_XML_BYTES = 8 * 1024 * 1024

const num = (value: string | null | undefined) => {
  const parsed = Number.parseFloat((value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/** Názov atribútu GDTF na čitateľný text (Pan, Tilt, Dimmer, ColorAdd_R → Color Add R…). */
function attributeLabel(attribute: string) {
  return attribute
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(\D)(\d+)$/, '$1 $2')
    .trim()
}

function lampSource(lamp: string | null): LightSource | undefined {
  const value = (lamp ?? '').toLowerCase()
  if (!value) return undefined
  if (value.includes('led')) return 'led'
  if (value.includes('discharge')) return 'discharge'
  if (value.includes('tungsten') || value.includes('halogen')) return 'halogen'
  if (value.includes('laser')) return 'laser'
  return 'other'
}

/** Hodnota DMX „128/1“ (hodnota/bajty) ako podiel 0–1. */
function dmxFraction(value: string | null) {
  const match = /^(\d+)\/(\d)$/.exec((value ?? '').trim())
  if (!match) return null
  const max = 256 ** Number(match[2]) - 1
  return max > 0 ? Math.min(1, Number(match[1]) / max) : null
}

/** Predvolená hodnota kanála: názov nastavenia (napr. Open), inak percentá. */
function channelDefault(channel: Element): string {
  const functions = Array.from(channel.getElementsByTagName('ChannelFunction'))
  const fraction = dmxFraction(functions[0]?.getAttribute('Default') ?? channel.getAttribute('Default'))
  if (fraction === null) return ''
  const active = functions.filter((item) => (dmxFraction(item.getAttribute('DMXFrom')) ?? 0) <= fraction).pop()
  const set = active ? Array.from(active.getElementsByTagName('ChannelSet')).filter((item) => (item.getAttribute('Name') ?? '').trim() && (dmxFraction(item.getAttribute('DMXFrom')) ?? 0) <= fraction).pop() : undefined
  const name = (set?.getAttribute('Name') ?? '').trim()
  return name ? name.slice(0, 40) : `${Math.round(fraction * 100)} %`
}

/** Farba z GDTF (CIE x, y, Y) ako #rrggbb; jas sa vyrovná na najsvetlejšiu zložku. */
export function xyToHex(color: string | null): string {
  const [x, y] = (color ?? '').split(',').map((part) => Number.parseFloat(part))
  if (!Number.isFinite(x) || !Number.isFinite(y) || y <= 0) return '#ffffff'
  const X = x / y
  const Z = (1 - x - y) / y
  const linear = [3.2406 * X - 1.5372 - 0.4986 * Z, -0.9689 * X + 1.8758 + 0.0415 * Z, 0.0557 * X - 0.204 + 1.057 * Z].map((value) => Math.max(0, value))
  const peak = Math.max(...linear)
  if (peak <= 0) return '#ffffff'
  return `#${linear
    .map((value) => {
      const c = value / peak
      const srgb = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
      return Math.round(Math.min(1, srgb) * 255).toString(16).padStart(2, '0')
    })
    .join('')}`
}

const PART_OF: Record<string, ColorPart> = { R: 'R', G: 'G', B: 'B', W: 'W', WW: 'W', CW: 'W', A: 'A', UV: 'UV', L: 'L', C: 'C', M: 'M', Y: 'Y' }

/** Zložky miešania farieb podľa atribútov kanálov (ColorAdd_R, ColorSub_C, CTO…). */
function colorPartsOf(doc: Document): ColorPart[] {
  const parts = new Set<ColorPart>()
  for (const logical of Array.from(doc.getElementsByTagName('LogicalChannel'))) {
    const attribute = logical.getAttribute('Attribute') ?? ''
    const match = /^Color(?:Add|Sub|RGB)_([A-Z]+)$/.exec(attribute)
    if (match && PART_OF[match[1]]) parts.add(PART_OF[match[1]])
    if (/^CTO$/i.test(attribute)) parts.add('CTO')
  }
  return COLOR_PARTS.filter((part) => parts.has(part))
}

/** Farebné koliesko: koleso, na ktoré ukazuje kanál farby (Color1), inak koleso s „color“ v názve. */
function colorWheelOf(doc: Document): ColorWheel | undefined {
  const used = new Set(
    Array.from(doc.getElementsByTagName('ChannelFunction'))
      .filter((item) => /^Color\d/.test(item.getAttribute('Attribute') ?? '') && item.getAttribute('Wheel'))
      .map((item) => item.getAttribute('Wheel')!),
  )
  const wheels = Array.from(doc.getElementsByTagName('Wheel'))
  const wheel = wheels.find((item) => used.has(item.getAttribute('Name') ?? '')) ?? wheels.find((item) => /colou?r/i.test(item.getAttribute('Name') ?? ''))
  if (!wheel) return undefined
  const slots = Array.from(wheel.getElementsByTagName('Slot')).slice(0, 60)
  if (slots.length === 0) return undefined
  return {
    slots: slots.length,
    colors: slots.map((slot, index) => ({ name: (slot.getAttribute('Name') ?? '').trim().slice(0, 40) || `Farba ${index + 1}`, hex: xyToHex(slot.getAttribute('Color')) })),
  }
}

/** Prečíta description.xml (text). Vyhodí chybu so slovenskou hláškou, keď to nie je GDTF. */
export function parseGdtfXml(xml: string): GdtfFixture {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const fixture = doc.getElementsByTagName('FixtureType')[0]
  if (!fixture || doc.getElementsByTagName('parsererror').length > 0) throw new Error('V súbore nie je popis svetla (GDTF).')

  const manufacturer = (fixture.getAttribute('Manufacturer') ?? '').trim().slice(0, 80)
  const model = (fixture.getAttribute('LongName') || fixture.getAttribute('Name') || '').trim().slice(0, 80)

  const modes: DmxMode[] = []
  for (const mode of Array.from(doc.getElementsByTagName('DMXMode')).slice(0, 20)) {
    // Kanál → číslo adresy (od 1). Offset „1,2“ = 16-bit (hrubý a jemný kanál), „None“ = virtuálny bez adresy.
    const slots = new Map<number, string>()
    let breakBase = 0
    let lastBreak = '1'
    let breakMax = 0
    for (const channel of Array.from(mode.getElementsByTagName('DMXChannel'))) {
      const dmxBreak = channel.getAttribute('DMXBreak') ?? '1'
      if (dmxBreak !== lastBreak && dmxBreak !== 'Overwrite') {
        breakBase += breakMax
        breakMax = 0
        lastBreak = dmxBreak
      }
      const offsets = (channel.getAttribute('Offset') ?? '')
        .split(',')
        .map((part) => Number.parseInt(part, 10))
        .filter((value) => Number.isInteger(value) && value > 0 && value <= 512)
      if (offsets.length === 0) continue
      const logical = channel.getElementsByTagName('LogicalChannel')[0]
      const attribute = attributeLabel(logical?.getAttribute('Attribute') ?? channel.getAttribute('Name') ?? '')
      const value = channelDefault(channel)
      offsets.forEach((offset, index) => {
        slots.set(breakBase + offset, index === 0 ? (value ? `${attribute} | ${value}` : attribute) : `${attribute} ${'fine '.repeat(index).trim()}`)
        breakMax = Math.max(breakMax, offset)
      })
    }
    const channels = Math.max(0, ...slots.keys())
    if (channels < 1 || channels > 512) continue
    const lines = Array.from({ length: channels }, (_, index) => slots.get(index + 1) ?? '–')
    const name = (mode.getAttribute('Name') ?? '').trim().slice(0, 40) || `Mode ${modes.length + 1}`
    modes.push({ name, channels, map: lines.join('\n').slice(0, 6000) })
  }

  // Príkon: vlastnosti svetla (GDTF 1.1+), inak súčet príkonu lúčov.
  const properties = doc.getElementsByTagName('Properties')[0]
  const power = properties?.getElementsByTagName('PowerConsumption')[0]
  const weight = properties?.getElementsByTagName('Weight')[0]
  const beams = Array.from(doc.getElementsByTagName('Beam'))
  const beamPower = beams.reduce((sum, beam) => sum + (num(beam.getAttribute('PowerConsumption')) ?? 0), 0)
  const powerW = num(power?.getAttribute('Value')) ?? (beamPower > 0 ? beamPower : undefined)

  const colorParts = colorPartsOf(doc)
  const wheel = colorWheelOf(doc)
  return {
    manufacturer,
    model,
    modes,
    ...(colorParts.length > 0 ? { colorParts } : {}),
    ...(wheel ? { wheel } : {}),
    ...(powerW ? { powerW: Math.round(powerW) } : {}),
    ...(num(weight?.getAttribute('Value')) ? { weightKg: Math.round(num(weight?.getAttribute('Value'))! * 10) / 10 } : {}),
    ...(beams.length > 0 && lampSource(beams[0].getAttribute('LampType')) ? { lightSource: lampSource(beams[0].getAttribute('LampType')) } : {}),
  }
}

/** Prečíta .gdtf súbor (ZIP); rozbalí sa len description.xml. */
export async function readGdtf(file: Blob): Promise<GdtfFixture> {
  if (file.size > GDTF_MAX_BYTES) throw new Error('Súbor je príliš veľký.')
  const entries = await readZip(new Uint8Array(await file.arrayBuffer()), (name) => name.toLowerCase() === 'description.xml')
  const description = entries[0]
  if (!description || description.data.byteLength > MAX_XML_BYTES) throw new Error('V súbore nie je popis svetla (GDTF).')
  return parseGdtfXml(new TextDecoder().decode(description.data))
}
