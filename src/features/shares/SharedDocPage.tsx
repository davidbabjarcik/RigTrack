import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { fetchLogoForDisplay, type LogoStyle } from '@/features/companies/branding'
import { logoClasses } from '@/features/companies/logoStyle'
import { CHANNEL_COLOR_CSS, PATCH_SOURCE_LABELS, STAND_LABELS, type ChannelColor, type PatchSource, type Stand } from '@/features/patch/model'
import { OUTPUT_KIND_LABELS, type OutputKind } from '@/features/patch/outputs'
import { ACCESSORY_LABELS, RACK_TYPE_LABELS, type Accessory, type RackType } from '@/features/racks/model'
import { formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { channelLegend, KIND_INFO } from '@/features/stageplot/model'
import { StagePlotSvg } from '@/features/stageplot/StagePlotSvg'
import { analyze, formatMhz, RF_KIND_LABELS, toKhz, tvChannelOf } from '@/features/rfplan/rf'
import { Spectrum } from '@/features/rfplan/Spectrum'
import { routeLength } from '@/features/siteplan/geo'
import { MapCanvas } from '@/features/siteplan/MapCanvas'
import { MARKER_LABELS, ROUTE_LABELS } from '@/features/siteplan/model'
import { cableSummary } from '@/features/synoptic/model'
import { SynopticSvg } from '@/features/synoptic/SynopticSvg'
import { changedKeys, fetchSharedDoc, removedRows, type SharedInput, type SharedIoList, type SharedOutput, type SharedRack, type SharedSlot, type SharedRfPlan, type SharedSitePlan, type SharedStagePlot, type SharedSynoptic } from './api'

const LOGO_STYLES: LogoStyle[] = ['auto', 'original', 'plate', 'white', 'black']
const changedRow = 'bg-amber-100 dark:bg-amber-950'

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted text-xs text-muted-foreground">
          <tr>
            {head.map((title) => (
              <th key={title} className="px-2 py-1.5 font-medium whitespace-nowrap">{title}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function Removed({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return <p className="mt-1 text-sm text-muted-foreground">Odstránené od vašej poslednej návštevy: <span className="line-through">{items.join(', ')}</span></p>
}

function IoList({ data, previous, names }: { data: SharedIoList; previous: SharedIoList | null; names: Record<string, string> }) {
  const inputKey = (row: SharedInput) => String(row.channel)
  const outputKey = (row: SharedOutput) => String(row.number)
  const changedIn = changedKeys(data.inputs, previous?.inputs, inputKey)
  const changedOut = changedKeys(data.outputs, previous?.outputs, outputKey)
  const inputs = [...data.inputs].sort((a, b) => a.channel - b.channel)
  const outputs = [...data.outputs].sort((a, b) => a.number - b.number)
  return (
    <>
      <section>
        <h2 className="mb-2 font-semibold">Input list ({inputs.length})</h2>
        <Table head={['Kanál', 'Názov', 'Mikrofón / DI', 'Stagebox', '48 V', 'Insert', 'Stojan', 'Poznámka']}>
          {inputs.map((row) => (
            <tr key={row.channel} className={cn('border-t', changedIn.has(inputKey(row)) && changedRow)}>
              <td className="px-2 py-1 font-mono font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  {row.color && <span className="size-2.5 rounded-full" style={{ background: CHANNEL_COLOR_CSS[row.color as ChannelColor] }} aria-hidden />}
                  {row.channel}
                </span>
              </td>
              <td className="px-2 py-1">{row.name}</td>
              <td className="px-2 py-1">{(row.equipment_id && names[row.equipment_id]) || PATCH_SOURCE_LABELS[row.source as PatchSource] || ''}</td>
              <td className="px-2 py-1 font-mono">{[row.stagebox, row.stagebox_input].filter((value) => value !== null && value !== '').join('-')}</td>
              <td className="px-2 py-1 whitespace-nowrap">{row.phantom ? '48 V' : ''}</td>
              <td className="px-2 py-1">{row.insert_note}</td>
              <td className="px-2 py-1">{row.stand ? STAND_LABELS[row.stand as Stand] : ''}</td>
              <td className="px-2 py-1 text-muted-foreground">{row.note}</td>
            </tr>
          ))}
        </Table>
        <Removed items={removedRows(data.inputs, previous?.inputs, inputKey).map((row) => `${row.channel} ${row.name}`)} />
      </section>
      {(outputs.length > 0 || (previous?.outputs.length ?? 0) > 0) && (
        <section>
          <h2 className="mb-2 font-semibold">Výstupy ({outputs.length})</h2>
          <Table head={['Výstup', 'Názov', 'Druh', 'Mix', 'Cieľ', 'Technika', 'Poznámka']}>
            {outputs.map((row) => (
              <tr key={row.number} className={cn('border-t', changedOut.has(outputKey(row)) && changedRow)}>
                <td className="px-2 py-1 font-mono font-semibold">{row.number}</td>
                <td className="px-2 py-1">{row.name}</td>
                <td className="px-2 py-1">{[OUTPUT_KIND_LABELS[row.kind as OutputKind] ?? row.kind, row.stereo && 'stereo'].filter(Boolean).join(' · ')}</td>
                <td className="px-2 py-1">{row.mix}</td>
                <td className="px-2 py-1 font-mono whitespace-nowrap">{row.destination}</td>
                <td className="px-2 py-1">{row.equipment_id ? names[row.equipment_id] : ''}</td>
                <td className="px-2 py-1 text-muted-foreground">{row.note}</td>
              </tr>
            ))}
          </Table>
          <Removed items={removedRows(data.outputs, previous?.outputs, outputKey).map((row) => `${row.number} ${row.name}`)} />
        </section>
      )}
    </>
  )
}

function Rack({ data, previous, names }: { data: SharedRack; previous: SharedRack | null; names: Record<string, string> }) {
  const key = (slot: SharedSlot) => `${slot.side}|${slot.bottom_u}|${slot.col}`
  const changed = changedKeys(data.slots, previous?.slots, key)
  const label = (slot: SharedSlot) =>
    [(slot.equipment_id && names[slot.equipment_id]) || (slot.catalog_id && names[slot.catalog_id]) || (slot.accessory && ACCESSORY_LABELS[slot.accessory as Accessory]) || '', slot.label].filter(Boolean).join(' – ') || '—'
  const units = (slot: SharedSlot) => (slot.height_u > 1 ? `U${slot.bottom_u}–${slot.bottom_u + slot.height_u - 1}` : `U${slot.bottom_u}`)
  const slots = [...data.slots].sort((a, b) => (a.side === b.side ? b.bottom_u - a.bottom_u || a.col - b.col : a.side === 'front' ? -1 : 1))
  const kg = data.slots.reduce((sum, slot) => sum + (Number(slot.weight_kg) || 0), 0)
  const watts = data.slots.reduce((sum, slot) => sum + (slot.power_w ?? 0), 0)
  return (
    <section>
      <p className="mb-2 text-sm text-muted-foreground">
        {[`${data.rack.units} U`, RACK_TYPE_LABELS[data.rack.rack_type as RackType], data.rack.depth_mm && `hĺbka ${data.rack.depth_mm} mm`, kg > 0 && `zariadenia ${kg.toLocaleString('sk-SK')} kg`, watts > 0 && `${watts} W`].filter(Boolean).join(' · ')}
      </p>
      <Table head={['Pozícia', 'Strana', 'Zariadenie', 'kg', 'W']}>
        {slots.map((slot) => (
          <tr key={key(slot)} className={cn('border-t', changed.has(key(slot)) && changedRow)}>
            <td className="px-2 py-1 font-mono">{units(slot)}</td>
            <td className="px-2 py-1">{slot.side === 'front' ? 'predok' : 'zadok'}</td>
            <td className="px-2 py-1">{label(slot)}</td>
            <td className="px-2 py-1">{slot.weight_kg ?? ''}</td>
            <td className="px-2 py-1">{slot.power_w ?? ''}</td>
          </tr>
        ))}
      </Table>
      <Removed items={removedRows(data.slots, previous?.slots, key).map((slot) => `${units(slot)} ${label(slot)}`)} />
      {data.rack.note && <p className="mt-2 text-sm whitespace-pre-line">{data.rack.note}</p>}
    </section>
  )
}

function StagePlot({ data, previous }: { data: SharedStagePlot; previous: SharedStagePlot | null }) {
  const channelName = (channel: number) => data.inputs.find((row) => row.channel === channel)?.name
  const changed = changedKeys(data.items, previous?.items, (item) => item.id)
  const removed = removedRows(data.items, previous?.items, (item) => item.id)
  const legend = channelLegend(data.items, channelName)
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{`Pódium ${Number(data.plot.width_m).toLocaleString('sk-SK')} × ${Number(data.plot.depth_m).toLocaleString('sk-SK')} m · pohľad zhora, publikum dole · mriežka 1 m`}</p>
      <div className="rounded-xl border bg-white p-2 text-black">
        <StagePlotSvg widthM={Number(data.plot.width_m)} depthM={Number(data.plot.depth_m)} items={data.items} channelName={channelName} className="h-auto w-full" />
      </div>
      {previous && (changed.size > 0 || removed.length > 0) && (
        <p className="text-sm text-amber-900 dark:text-amber-200">
          {[changed.size > 0 && `Zmenené alebo nové položky: ${data.items.filter((item) => changed.has(item.id)).map((item) => item.label || KIND_INFO[item.kind]?.label).join(', ')}`, removed.length > 0 && `Odstránené: ${removed.map((item) => item.label || KIND_INFO[item.kind]?.label).join(', ')}`].filter(Boolean).join(' · ')}
        </p>
      )}
      {legend.length > 0 && (
        <Table head={['Kanál', 'Názov', 'Na pódiu']}>
          {legend.map((row, index) => (
            <tr key={index} className="border-t">
              <td className="px-2 py-1 font-mono font-semibold">{row.channel}</td>
              <td className="px-2 py-1">{row.name}</td>
              <td className="px-2 py-1">{[row.kind, row.label].filter(Boolean).join(' – ')}</td>
            </tr>
          ))}
        </Table>
      )}
      {data.plot.note && <p className="text-sm whitespace-pre-line">{data.plot.note}</p>}
    </section>
  )
}

function Synoptic({ data, previous, names }: { data: SharedSynoptic; previous: SharedSynoptic | null; names: Record<string, string> }) {
  const summary = cableSummary(data.links)
  const changed = previous ? changedKeys(data.links, previous.links, (link) => link.id).size + changedKeys(data.nodes, previous.nodes, (node) => node.id).size : 0
  return (
    <section className="flex flex-col gap-3">
      <div className="overflow-auto rounded-xl border bg-white p-2 text-black">
        <SynopticSvg nodes={data.nodes} links={data.links} names={names} className="h-auto w-full min-w-[40rem]" />
      </div>
      {previous && changed > 0 && <p className="text-sm text-amber-900 dark:text-amber-200">{`Zmenené alebo nové uzly a prepojenia: ${changed}`}</p>}
      {summary.length > 0 && (
        <Table head={['Kábel', 'Kusov', 'Spolu metrov']}>
          {summary.map((row) => (
            <tr key={row.cable} className="border-t">
              <td className="px-2 py-1">{row.cable}</td>
              <td className="px-2 py-1">{row.pieces}</td>
              <td className="px-2 py-1">{[row.meters ? row.meters.toLocaleString('sk-SK') : '', row.missing ? `(${row.missing}× bez dĺžky)` : ''].filter(Boolean).join(' ')}</td>
            </tr>
          ))}
        </Table>
      )}
      {data.note && <p className="text-sm whitespace-pre-line">{data.note}</p>}
    </section>
  )
}

function RfPlan({ data, previous, names }: { data: SharedRfPlan; previous: SharedRfPlan | null; names: Record<string, string> }) {
  const channels = data.channels.map((channel) => ({ ...channel, min_mhz: Number(channel.min_mhz), max_mhz: Number(channel.max_mhz), freq_mhz: channel.freq_mhz === null ? null : Number(channel.freq_mhz) }))
  const issues = analyze(channels, data.settings, data.excluded_tv)
  const changed = changedKeys(data.channels, previous?.channels, (channel) => channel.id)
  const sorted = [...channels].sort((a, b) => (a.freq_mhz ?? 1e9) - (b.freq_mhz ?? 1e9))
  return (
    <section className="flex flex-col gap-3">
      {data.place && <p className="text-sm text-muted-foreground">{`Miesto: ${data.place}`}</p>}
      <div className="rounded-xl border bg-white p-2 text-black">
        <Spectrum channels={channels} settings={data.settings} excludedTv={data.excluded_tv} className="h-auto w-full" />
      </div>
      <p className="text-sm text-muted-foreground">{`Odstup ${data.settings.spacing_khz} kHz · IM 3. rádu ±${data.settings.imd3_khz} kHz${data.settings.fifth ? ` · IM 5. rádu ±${data.settings.imd5_khz} kHz` : ''} · vylúčené TV kanály: ${data.excluded_tv.join(', ') || 'žiadne'}`}</p>
      <Table head={['Frekvencia (MHz)', 'Kanál', 'Druh', 'TV', 'Pásmo', 'Stav']}>
        {sorted.map((channel) => {
          const khz = channel.freq_mhz === null ? null : toKhz(channel.freq_mhz)
          const list = (issues.get(channel.id) ?? []).filter((issue) => issue.kind !== 'missing')
          return (
            <tr key={channel.id} className={cn('border-t', changed.has(channel.id) && changedRow)}>
              <td className="px-2 py-1 font-mono font-semibold">{khz === null ? '—' : formatMhz(khz)}</td>
              <td className="px-2 py-1">{channel.name}</td>
              <td className="px-2 py-1">{[RF_KIND_LABELS[channel.kind], channel.equipment_id ? names[channel.equipment_id] : ''].filter(Boolean).join(' · ')}</td>
              <td className="px-2 py-1">{khz === null ? '' : (tvChannelOf(khz) ?? '')}</td>
              <td className="px-2 py-1 whitespace-nowrap">{`${channel.min_mhz}–${channel.max_mhz}`}</td>
              <td className={cn('px-2 py-1 text-xs', list.length > 0 && 'text-destructive')}>{list.length > 0 ? list.map((issue) => issue.text).join('; ') : 'OK'}</td>
            </tr>
          )
        })}
      </Table>
      {data.note && <p className="text-sm whitespace-pre-line">{data.note}</p>}
    </section>
  )
}

function SitePlan({ data, names }: { data: SharedSitePlan; names: Record<string, string> }) {
  const view = { lat: Number(data.view.lat), lon: Number(data.view.lon), zoom: Number(data.view.zoom) }
  const markers = data.markers.map((marker) => ({ ...marker, lat: Number(marker.lat), lon: Number(marker.lon) }))
  const routes = data.routes.map((route) => ({ ...route, points: route.points.map(([lat, lon]) => [Number(lat), Number(lon)] as [number, number]) }))
  return (
    <section className="flex flex-col gap-3">
      <MapCanvas view={view} markers={markers} routes={routes} height={460} />
      {routes.length > 0 && (
        <Table head={['Trasa', 'Druh', 'Dĺžka s rezervou', 'Kábel']}>
          {routes.map((route) => (
            <tr key={route.id} className="border-t">
              <td className="px-2 py-1">{route.label || '—'}</td>
              <td className="px-2 py-1">{ROUTE_LABELS[route.kind]}</td>
              <td className="px-2 py-1">{`${routeLength(route.points, route.slack_pct).withSlack} m`}</td>
              <td className="px-2 py-1">{route.equipment_id ? (names[route.equipment_id] ?? '') : ''}</td>
            </tr>
          ))}
        </Table>
      )}
      {markers.length > 0 && <p className="text-sm text-muted-foreground">{markers.map((marker) => marker.label || MARKER_LABELS[marker.kind]).join(' · ')}</p>}
      {data.note && <p className="text-sm whitespace-pre-line">{data.note}</p>}
    </section>
  )
}

/**
 * Zdieľaný dokument akcie pre externého príjemcu (d/:token) – len na čítanie, bez prihlásenia: hlavička s logom
 * a kontaktom firmy, posledná uložená verzia a zvýraznené zmeny od posledného zobrazenia. Stránka je len po slovensky.
 */
export function SharedDocPage() {
  const { token = '' } = useParams()
  const doc = useQuery({ queryKey: ['shared-doc', token], queryFn: () => fetchSharedDoc(token), retry: false, refetchOnWindowFocus: false, staleTime: Infinity })
  const logoPath = doc.data?.logoPath ?? ''
  const logo = useQuery({ queryKey: ['shared-doc-logo', logoPath], queryFn: () => fetchLogoForDisplay(logoPath), enabled: Boolean(logoPath), retry: false, staleTime: Infinity })

  if (doc.isPending) return <p className="min-h-dvh bg-background p-8 text-center text-sm text-muted-foreground">Načítavam…</p>
  if (doc.isError || !doc.data) {
    return <p className="min-h-dvh bg-background p-8 text-center text-sm text-muted-foreground">Odkaz sa nenašiel, bol zrušený alebo už neplatí. Kontaktujte toho, kto vám ho poslal.</p>
  }
  const data = doc.data
  const style = LOGO_STYLES.includes(data.logoStyle as LogoStyle) ? (data.logoStyle as LogoStyle) : 'auto'
  const when = data.startsOn && data.endsOn ? (data.startsOn === data.endsOn ? formatDate(data.startsOn) : `${formatDate(data.startsOn)} – ${formatDate(data.endsOn)}`) : ''
  const heading = data.docType === 'rack' ? `Rack – ${data.title}` : data.docType === 'stageplot' ? 'Stage plán' : data.docType === 'synoptic' ? 'Synoptika' : data.docType === 'rfplan' ? 'HF frekvenčný plán' : data.docType === 'siteplan' ? 'Site plán' : 'Input / output list'

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 print:max-w-none print:p-0">
        <header className="flex flex-wrap items-start gap-4 border-b pb-4">
          <div className="min-w-0 flex-1">
            {logo.data?.url ? (
              <img src={logo.data.url} alt={data.companyName} className={cn('mb-2 h-12 max-w-56 object-contain object-left', logoClasses(style, logo.data.tone))} />
            ) : (
              <p className="font-medium">{data.companyName}</p>
            )}
            {data.contact && <p className="text-xs whitespace-pre-line text-muted-foreground">{data.contact}</p>}
          </div>
          <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-medium hover:bg-muted print:hidden">
            <Printer className="size-4" aria-hidden />Tlačiť / PDF
          </button>
        </header>
        <div>
          <h1 className="text-2xl font-semibold break-words">{heading}</h1>
          {data.event && <p className="mt-1 text-muted-foreground">{[data.event, when, data.venue].filter(Boolean).join(' · ')}</p>}
          <p className="mt-1 text-sm text-muted-foreground">
            Verzia {data.version} · uložená {formatDateTime(data.savedAt)} · pre: {data.recipient}
          </p>
          {data.previousVersion !== null && (
            <p className="mt-2 rounded-lg border border-amber-400 bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Od vašej poslednej návštevy (verzia {data.previousVersion}) sa dokument zmenil – zmenené a nové riadky sú zvýraznené.
            </p>
          )}
        </div>
        {data.docType === 'rack' ? (
          <Rack data={data.data} previous={data.previous} names={data.names} />
        ) : data.docType === 'stageplot' ? (
          <StagePlot data={data.data} previous={data.previous} />
        ) : data.docType === 'synoptic' ? (
          <Synoptic data={data.data} previous={data.previous} names={data.names} />
        ) : data.docType === 'rfplan' ? (
          <RfPlan data={data.data} previous={data.previous} names={data.names} />
        ) : data.docType === 'siteplan' ? (
          <SitePlan data={data.data} names={data.names} />
        ) : (
          <IoList data={data.data} previous={data.previous} names={data.names} />
        )}
        <p className="text-xs text-muted-foreground print:hidden">Dokument je len na čítanie. Pri otázkach kontaktujte {data.companyName}.</p>
      </main>
    </div>
  )
}
