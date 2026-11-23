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
import { changedKeys, fetchSharedDoc, removedRows, type SharedInput, type SharedIoList, type SharedOutput, type SharedRack, type SharedSlot } from './api'

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
  const heading = data.docType === 'rack' ? `Rack – ${data.title}` : 'Input / output list'

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
        {data.docType === 'rack' ? <Rack data={data.data} previous={data.previous} names={data.names} /> : <IoList data={data.data} previous={data.previous} names={data.names} />}
        <p className="text-xs text-muted-foreground print:hidden">Dokument je len na čítanie. Pri otázkach kontaktujte {data.companyName}.</p>
      </main>
    </div>
  )
}
