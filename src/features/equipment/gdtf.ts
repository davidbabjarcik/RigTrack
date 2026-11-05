import { readZip } from '@/lib/zip'
import type { DmxMode, LightSource } from './model'

// GDTF (General Device Type Format, gdtf-share.com): ZIP s popisom svetla v description.xml. Čítame len ten popis –
// výrobcu, model, DMX módy s kanálmi, príkon, váhu a zdroj svetla. Súbor sa číta v prehliadači a nikam sa neposiela.

export type GdtfFixture = {
  manufacturer: string
  model: string
  modes: DmxMode[]
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
      offsets.forEach((offset, index) => {
        slots.set(breakBase + offset, index === 0 ? attribute : `${attribute} ${'fine '.repeat(index).trim()}`)
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

  return {
    manufacturer,
    model,
    modes,
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
