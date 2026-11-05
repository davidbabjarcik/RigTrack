import { describe, expect, it } from 'vitest'
import { createZip } from '@/lib/zip'
import { parseGdtfXml, readGdtf } from './gdtf'

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<GDTF DataVersion="1.2">
  <FixtureType Name="Spot 1" LongName="Ukážkový Spot 1" Manufacturer="Výrobca" FixtureTypeID="X">
    <PhysicalDescriptions><Properties><Weight Value="17.5"/><PowerConsumption Value="450"/></Properties></PhysicalDescriptions>
    <Geometries><Geometry Name="Base"><Beam Name="Beam" LampType="LED" PowerConsumption="400"/></Geometry></Geometries>
    <DMXModes>
      <DMXMode Name="Standard" Geometry="Base">
        <DMXChannels>
          <DMXChannel DMXBreak="1" Offset="1,2"><LogicalChannel Attribute="Pan"/></DMXChannel>
          <DMXChannel DMXBreak="1" Offset="3"><LogicalChannel Attribute="Dimmer"/></DMXChannel>
          <DMXChannel DMXBreak="1" Offset="5"><LogicalChannel Attribute="ColorAdd_R"/></DMXChannel>
          <DMXChannel DMXBreak="1" Offset="None"><LogicalChannel Attribute="Virtual"/></DMXChannel>
        </DMXChannels>
      </DMXMode>
      <DMXMode Name="Basic"><DMXChannels><DMXChannel Offset="1"><LogicalChannel Attribute="Dimmer"/></DMXChannel></DMXChannels></DMXMode>
    </DMXModes>
  </FixtureType>
</GDTF>`

describe('gdtf', () => {
  it('reads manufacturer, model, modes with channel layout, power, weight and source', () => {
    const fixture = parseGdtfXml(XML)
    expect(fixture).toMatchObject({ manufacturer: 'Výrobca', model: 'Ukážkový Spot 1', powerW: 450, weightKg: 17.5, lightSource: 'led' })
    expect(fixture.modes).toEqual([
      { name: 'Standard', channels: 5, map: 'Pan\nPan fine\nDimmer\n–\nColor Add R' },
      { name: 'Basic', channels: 1, map: 'Dimmer' },
    ])
  })

  it('reads a .gdtf file (zip) and rejects other files', async () => {
    const zip = createZip([{ name: 'description.xml', data: new TextEncoder().encode(XML) }, { name: 'models/3ds/big.3ds', data: new Uint8Array(10) }])
    const fixture = await readGdtf(new Blob([zip.slice()]))
    expect(fixture.model).toBe('Ukážkový Spot 1')
    await expect(readGdtf(new Blob(['nie zip']))).rejects.toThrow()
    expect(() => parseGdtfXml('<a/>')).toThrow('V súbore nie je popis svetla (GDTF).')
  })
})
