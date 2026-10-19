import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { useCompanyProfile } from '@/features/companies/profile'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { eventDates } from '@/features/events/plan'
import { fetchPlace, planKeys } from '@/features/events/planApi'
import { useEvents } from '@/features/events/useEvents'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { buildQuote, DEFAULT_QUOTE, type QuoteSettings } from './model'

const PRINT_CSS = `
@page { size: A4; margin: 14mm; }
@media print { html, body { background: #fff !important; } }
`

function loadSettings(companyId: string): QuoteSettings {
  try {
    const saved = localStorage.getItem(`rigtrack.quote.${companyId}`)
    return saved ? { ...DEFAULT_QUOTE, ...(JSON.parse(saved) as Partial<QuoteSettings>), rentalDays: null } : DEFAULT_QUOTE
  } catch {
    return DEFAULT_QUOTE
  }
}

function NumberInput({ label, value, onChange, step = 'any' }: { label: string; value: number | null; onChange: (value: number | null) => void; step?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium">
      {label}
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        className="h-10 rounded-lg border bg-background px-2 text-sm"
        value={value ?? ''}
        onChange={(e) => onChange(Number.isFinite(e.target.valueAsNumber) ? Math.max(0, e.target.valueAsNumber) : null)}
      />
    </label>
  )
}

/** Cenová ponuka z eventu: technika s cenami prenájmu, doprava, obsluha, zľava a DPH – na tlač / PDF. */
export function QuotePage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const events = useEvents(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const place = useQuery({ queryKey: planKeys.place(companyId, id), queryFn: () => fetchPlace(companyId, id), retry: false })
  const profile = useCompanyProfile(companyId)
  const [settings, setSettings] = useState<QuoteSettings>(() => loadSettings(companyId))
  const set = (patch: Partial<QuoteSettings>) => setSettings((current) => ({ ...current, ...patch }))
  useEffect(() => {
    try {
      // Dni prenájmu sú pre každý event iné – nepamätajú sa.
      localStorage.setItem(`rigtrack.quote.${companyId}`, JSON.stringify({ ...settings, rentalDays: null }))
    } catch {
      // Bez úložiska sa nastavenie len nezapamätá.
    }
  }, [companyId, settings])

  if (events.isPending || equipment.isPending) return <LoadingBlock />
  const event = events.data?.find((item) => item.id === id)
  if (!event) return <ErrorBlock message="Event sa nenašiel." />
  const days = eventDates(event.startsOn, event.endsOn).length
  const quote = buildQuote(event.equipment, equipment.data ?? [], days, place.data?.distanceKm ?? null, settings)
  const money = (value: number) => formatMoney(value, 'EUR')
  const firm = profile.data
  const today = todayIso()
  const validUntil = new Date(Date.parse(today) + settings.validDays * 86_400_000).toISOString().slice(0, 10)

  return (
    <div className="min-h-dvh bg-white p-6 text-black">
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-col gap-4 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
            <ArrowLeft className="size-4" aria-hidden />
            Späť na event
          </Link>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden />
            Tlačiť / PDF
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl border p-3 sm:grid-cols-4">
          <NumberInput label="Dni prenájmu" value={settings.rentalDays ?? days} step="1" onChange={(value) => set({ rentalDays: value })} />
          <NumberInput label="Doprava €/km" value={settings.kmRate} onChange={(value) => set({ kmRate: value ?? 0 })} />
          <NumberInput label="Ciest tam a späť" value={settings.trips} step="1" onChange={(value) => set({ trips: value ?? 0 })} />
          <NumberInput label="Obsluha – ľudí" value={settings.crewCount} step="1" onChange={(value) => set({ crewCount: value ?? 0 })} />
          <NumberInput label="Obsluha €/deň/osoba" value={settings.crewDayRate} onChange={(value) => set({ crewDayRate: value ?? 0 })} />
          <NumberInput label="Zľava na techniku %" value={settings.discountPct} onChange={(value) => set({ discountPct: Math.min(100, value ?? 0) })} />
          <NumberInput label="DPH %" value={settings.vatPct} onChange={(value) => set({ vatPct: value ?? 0 })} />
          <NumberInput label="Platnosť (dní)" value={settings.validDays} step="1" onChange={(value) => set({ validDays: value ?? 14 })} />
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={settings.withVat} onChange={(e) => set({ withVat: e.target.checked })} />
            S DPH
          </label>
        </div>
        {!place.data?.distanceKm && <p className="text-sm text-neutral-600">Doprava sa nepočíta – v evente chýbajú km zo skladu (sekcia Doprava).</p>}
        {quote.unpriced.length > 0 && <p className="text-sm text-amber-700">Bez ceny prenájmu (nie sú v ponuke): {quote.unpriced.join(', ')}. Cenu doplníte v Technike.</p>}
      </div>

      <header className="mb-6 flex flex-wrap justify-between gap-4 border-b border-neutral-400 pb-3">
        <div>
          <h1 className="text-2xl font-bold">Cenová ponuka</h1>
          <p className="text-sm">
            {event.name} · {event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`}
            {event.venue && ` · ${event.venue}`}
          </p>
          {event.organizer && <p className="text-sm">Pre: {[event.organizer, event.organizerPerson].filter(Boolean).join(', ')}</p>}
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{firm?.legalName || company.companyName}</p>
          {firm?.address && <p>{firm.address}</p>}
          {firm?.ico && <p>IČO {firm.ico}{firm.dic && ` · DIČ ${firm.dic}`}</p>}
          {[firm?.phone, firm?.email].filter(Boolean).length > 0 && <p>{[firm?.phone, firm?.email].filter(Boolean).join(' · ')}</p>}
        </div>
      </header>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-1 pr-2">Položka</th>
            <th className="py-1 pr-2">Množstvo</th>
            <th className="py-1 pr-2 text-right">Cena/j.</th>
            <th className="py-1 text-right">Spolu</th>
          </tr>
        </thead>
        <tbody>
          {quote.lines.map((line) => (
            <tr key={line.label} className="border-b border-neutral-300">
              <td className="py-1 pr-2">{line.label}</td>
              <td className="py-1 pr-2">{line.detail}</td>
              <td className="py-1 pr-2 text-right">{money(line.unitPrice)}</td>
              <td className="py-1 text-right">{money(line.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-4 ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Medzisúčet</dt>
          <dd>{money(quote.subtotal)}</dd>
        </div>
        {quote.discount > 0 && (
          <div className="flex justify-between">
            <dt>Zľava na techniku {settings.discountPct} %</dt>
            <dd>−{money(quote.discount)}</dd>
          </div>
        )}
        {settings.withVat && (
          <>
            <div className="flex justify-between">
              <dt>Základ</dt>
              <dd>{money(quote.base)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>DPH {settings.vatPct} %</dt>
              <dd>{money(quote.vat)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between border-t-2 border-black pt-1 text-base font-bold">
          <dt>Spolu{settings.withVat ? ' s DPH' : ''}</dt>
          <dd>{money(quote.total)}</dd>
        </div>
      </dl>
      <p className="mt-8 text-xs text-neutral-600">
        Ponuka zo dňa {formatDate(today)}, platná do {formatDate(validUntil)}. Ceny prenájmu techniky sú za kus a deň.
      </p>
    </div>
  )
}
