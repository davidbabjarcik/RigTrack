import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PaperSheet } from '@/components/print/PaperSheet'
import { PrintButton } from '@/components/print/PrintButton'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { DmxChannelTable } from '@/features/equipment/DmxChannelTable'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { useEvents } from '@/features/events/useEvents'
import { formatDate } from '@/lib/format'
import { useDmxPatch } from './dmxApi'
import { lightSheets, type LightSheet } from './lighting'

const PRINT_CSS = `
@page { size: A4; margin: 12mm; @top-left { content: ""; } @top-center { content: ""; } @top-right { content: ""; } @bottom-left { content: ""; } @bottom-center { content: ""; } @bottom-right { content: ""; } }
@media print { html, body { background: #fff !important; } }
`

/** Políčko farby alebo gobo na papieri: obrázok alebo farba, číslo, názov a DMX hodnota. */
function Slot({ index, name, dmx, hex, image }: { index: number; name: string; dmx?: string; hex?: string; image?: string }) {
  return (
    <li className="flex w-[22mm] flex-col items-center gap-0.5 text-center text-[10px] leading-tight break-inside-avoid">
      <span className="flex size-[14mm] items-center justify-center overflow-hidden rounded border border-neutral-400">
        {image ? <img src={image} alt="" className="size-full object-cover" /> : hex ? <span className="size-full" style={{ background: hex }} /> : null}
      </span>
      <span>
        <strong>{index + 1}</strong> {name}
      </span>
      {dmx && <span className="font-mono text-neutral-700">DMX {dmx}</span>}
    </li>
  )
}

function LightBlock({ sheet, thumbs }: { sheet: LightSheet; thumbs: Record<string, string> }) {
  const { item, mode, addresses } = sheet
  const colors = item.attributes.colorWheel?.colors ?? []
  const gobos = item.attributes.gobos ?? []
  const wheels = [...new Set(gobos.map((gobo) => gobo.wheel?.trim() || ''))]
  return (
    <section className="mt-5 break-inside-avoid-page border-t border-neutral-400 pt-3 first-of-type:border-t-0 first-of-type:pt-0">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="text-base font-bold">{item.name}</h2>
        <p className="text-neutral-700">
          {[[item.manufacturer, item.model].filter(Boolean).join(' '), mode && `mód ${mode.name} · ${mode.channels} ch`].filter(Boolean).join(' · ')}
        </p>
      </header>
      {addresses.length > 0 && (
        <p className="mt-1 text-neutral-800">
          <span className="font-semibold">Adresy ({addresses.length}):</span> <span className="font-mono">{addresses.join(', ')}</span>
        </p>
      )}
      {mode?.map && (
        <div className="mt-2 text-[11px]">
          <DmxChannelTable mode={mode} />
        </div>
      )}
      {colors.length > 0 && (
        <div className="mt-2">
          <p className="font-semibold">Farebné koliesko</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {colors.map((color, index) => (
              <Slot key={index} index={index} name={color.name} dmx={color.dmx} hex={color.hex} image={color.image ? thumbs[color.image] : undefined} />
            ))}
          </ul>
        </div>
      )}
      {wheels.map((wheel) => {
        const list = gobos.filter((gobo) => (gobo.wheel?.trim() || '') === wheel)
        return (
          <div key={wheel || 'gobo'} className="mt-2">
            <p className="font-semibold">{wheel || 'Gobá'}</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {list.map((gobo, index) => (
                <Slot key={index} index={index} name={gobo.name} dmx={gobo.dmx} image={gobo.image ? thumbs[gobo.image] : undefined} />
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

/** Ťahák pre osvetľovača na A4: svetlá eventu s módom, adresami, rozpisom kanálov, farbami a gobami. */
export function LightingSheetPage() {
  const sheet = useRef<HTMLDivElement>(null)
  const { id = '' } = useParams()
  const companyId = useCompany().active!.companyId
  const events = useEvents(companyId)
  const patch = useDmxPatch(companyId, id)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const event = events.data?.find((item) => item.id === id)
  const sheets = event && equipment.data ? lightSheets(patch.data ?? [], event.equipment, equipment.data) : []
  const thumbs = usePhotoThumbs(
    companyId,
    sheets.flatMap((item) => [...(item.item.attributes.colorWheel?.colors ?? []).map((color) => color.image ?? ''), ...(item.item.attributes.gobos ?? []).map((gobo) => gobo.image ?? '')]),
  )

  if (events.isPending || equipment.isPending || patch.isPending) return <LoadingBlock />
  if (!event || events.isError || equipment.isError) return <ErrorBlock message="Ťahák sa nepodarilo pripraviť." />

  return (
    <div className="min-h-dvh bg-muted p-2 text-black sm:p-6 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link to={`/events/${id}?tab=gear`} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Späť na event
        </Link>
        <PrintButton sheet={sheet} fileName={`tahak-svetla-${event.name}`} marginMm={12} disabled={sheets.length === 0} />
      </div>
      <PaperSheet sheetRef={sheet} marginMm={12} className="text-xs">
        <header className="border-b-2 border-black pb-2">
          <h1 className="text-xl font-bold">Ťahák pre osvetľovača – {event.name}</h1>
          <p className="text-neutral-700">
            {[event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`, event.venue].filter(Boolean).join(' · ')}
          </p>
        </header>
        {sheets.length === 0 ? (
          <p className="mt-6">Na evente nie je svetlo s DMX módmi, farbami ani gobami. Doplňte ich pri svetle v Technike.</p>
        ) : (
          sheets.map((item) => <LightBlock key={`${item.item.id}|${item.mode?.name ?? ''}`} sheet={item} thumbs={thumbs} />)
        )}
      </PaperSheet>
    </div>
  )
}
