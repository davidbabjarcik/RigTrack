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

const COLOR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<GDTF DataVersion="1.2">
  <FixtureType Name="Spot 2" LongName="Ukážkový Spot 2" Manufacturer="Výrobca" FixtureTypeID="Y">
    <Wheels>
      <Wheel Name="Gobo1"><Slot Name="Open"/><Slot Name="Gobo"/></Wheel>
      <Wheel Name="Wheel2"><Slot Name="Open" Color="0.3127,0.3290,100"/><Slot Name="Red" Color="0.64,0.33,21.2"/><Slot Name="Blue" Color="0.15,0.06,7.2"/></Wheel>
    </Wheels>
    <DMXModes>
      <DMXMode Name="Standard">
        <DMXChannels>
          <DMXChannel Offset="1"><LogicalChannel Attribute="Shutter1"><ChannelFunction Name="Closed" DMXFrom="0/1" Default="32/1"><ChannelSet Name="Closed" DMXFrom="0/1"/><ChannelSet Name="Open" DMXFrom="20/1"/></ChannelFunction></LogicalChannel></DMXChannel>
          <DMXChannel Offset="2,3"><LogicalChannel Attribute="Pan"><ChannelFunction DMXFrom="0/2" Default="32768/2"/></LogicalChannel></DMXChannel>
          <DMXChannel Offset="4"><LogicalChannel Attribute="Color1"><ChannelFunction Attribute="Color1" Wheel="Wheel2" DMXFrom="0/1" Default="0/1"/></LogicalChannel></DMXChannel>
          <DMXChannel Offset="5"><LogicalChannel Attribute="ColorAdd_UV"/></DMXChannel>
          <DMXChannel Offset="6"><LogicalChannel Attribute="CTO"/></DMXChannel>
        </DMXChannels>
      </DMXMode>
    </DMXModes>
  </FixtureType>
</GDTF>`

describe('gdtf colours', () => {
  it('reads the colour wheel, colour mixing and channel defaults', () => {
    const fixture = parseGdtfXml(COLOR_XML)
    expect(fixture.modes[0].map).toBe('Shutter 1 | Open\nPan | 50 %\nPan fine\nColor 1 | 0 %\nColor Add UV\nCTO')
    expect(fixture.colorParts).toEqual(['UV', 'CTO'])
    expect(fixture.wheel?.slots).toBe(3)
    expect(fixture.wheel?.colors.map((color) => color.name)).toEqual(['Open', 'Red', 'Blue'])
    expect(fixture.wheel?.colors[0].hex).toBe('#ffffff')
    expect(fixture.wheel?.colors[1].hex.slice(0, 3)).toBe('#ff')
  })
})
