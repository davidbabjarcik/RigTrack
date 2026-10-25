import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Eye, Printer, Save, Trash2 } from 'lucide-react'
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
import { can } from '@/lib/permissions'
import { buildQuote, DEFAULT_QUOTE, type QuoteSettings } from './model'
import { deleteQuote, QUOTE_STATUS_LABELS, quoteNumber, saveQuote, savedQuoteKeys, setQuoteStatus, useSavedQuotes, type QuoteDoc, type QuoteStatus } from './saved'

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

/** Vytlačiteľný dokument ponuky (živej aj uloženej). */
function QuoteDocument({ doc, number }: { doc: QuoteDoc; number?: string }) {
  const money = (value: number) => formatMoney(value, 'EUR')
  return (
    <>
      <header className="mb-6 flex flex-wrap justify-between gap-4 border-b border-neutral-400 pb-3">
        <div>
          <h1 className="text-2xl font-bold">Cenová ponuka{number && ` č. ${number}`}</h1>
          <p className="text-sm">
            {doc.eventName} · {doc.eventDates}
            {doc.venue && ` · ${doc.venue}`}
          </p>
          {doc.client && <p className="text-sm">Pre: {doc.client}</p>}
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{doc.firm.name}</p>
          {doc.firm.address && <p>{doc.firm.address}</p>}
          {doc.firm.ico && (
            <p>
              IČO {doc.firm.ico}
              {doc.firm.dic && ` · DIČ ${doc.firm.dic}`}
            </p>
          )}
          {doc.firm.contact && <p>{doc.firm.contact}</p>}
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
          {doc.lines.map((line) => (
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
          <dd>{money(doc.subtotal)}</dd>
        </div>
        {doc.discount > 0 && (
          <div className="flex justify-between">
            <dt>Zľava na techniku {doc.discountPct} %</dt>
            <dd>−{money(doc.discount)}</dd>
          </div>
        )}
        {doc.withVat && (
          <>
            <div className="flex justify-between">
              <dt>Základ</dt>
              <dd>{money(doc.base)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>DPH {doc.vatPct} %</dt>
              <dd>{money(doc.vat)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between border-t-2 border-black pt-1 text-base font-bold">
          <dt>Spolu{doc.withVat ? ' s DPH' : ''}</dt>
          <dd>{money(doc.total)}</dd>
        </div>
      </dl>
      <p className="mt-8 text-xs text-neutral-600">
        Ponuka zo dňa {formatDate(doc.issuedOn)}, platná do {formatDate(doc.validUntil)}. Ceny prenájmu techniky sú za kus a deň.
      </p>
    </>
  )
}

/** Cenová ponuka z eventu: technika s cenami prenájmu, doprava, obsluha, zľava a DPH – na tlač / PDF, s históriou uložených verzií. */
export function QuotePage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const canEdit = can(company, 'events.edit')
  const queryClient = useQueryClient()
  const events = useEvents(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const place = useQuery({ queryKey: planKeys.place(companyId, id), queryFn: () => fetchPlace(companyId, id), retry: false })
  const profile = useCompanyProfile(companyId)
  const saved = useSavedQuotes(companyId, id)
  const [viewing, setViewing] = useState<string | null>(null)
  const [settings, setSettings] = useState<QuoteSettings>(() => loadSettings(companyId))
  const set = (patch: Partial<QuoteSettings>) => setSettings((current) => ({ ...current, ...patch }))
  const refresh = () => queryClient.invalidateQueries({ queryKey: savedQuoteKeys.ofEvent(companyId, id) })
  const save = useMutation({ mutationFn: (doc: QuoteDoc) => saveQuote(companyId, id, doc), onSuccess: (newId) => setViewing(newId), onSettled: refresh })
  const status = useMutation({ mutationFn: ({ quoteId, value }: { quoteId: string; value: QuoteStatus }) => setQuoteStatus(quoteId, value), onSettled: refresh })
  const remove = useMutation({ mutationFn: deleteQuote, onSuccess: () => setViewing(null), onSettled: refresh })
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
  const live: QuoteDoc = {
    eventName: event.name,
    eventDates: event.startsOn === event.endsOn ? formatDate(event.startsOn) : `${formatDate(event.startsOn)} – ${formatDate(event.endsOn)}`,
    venue: event.venue,
    client: [event.organizer, event.organizerPerson].filter(Boolean).join(', '),
    firm: {
      name: firm?.legalName || company.companyName,
      address: firm?.address ?? '',
      ico: firm?.ico ?? '',
      dic: firm?.dic ?? '',
      contact: [firm?.phone, firm?.email].filter(Boolean).join(' · '),
    },
    lines: quote.lines,
    subtotal: quote.subtotal,
    discount: quote.discount,
    discountPct: settings.discountPct,
    base: quote.base,
    vat: quote.vat,
    vatPct: settings.vatPct,
    withVat: settings.withVat,
    total: quote.total,
    issuedOn: today,
    validUntil,
  }
  const shown = saved.data?.find((item) => item.id === viewing)

  return (
    <div className="min-h-dvh bg-white p-6 text-black">
      <style>{PRINT_CSS}</style>
      <div className="mb-6 flex flex-col gap-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to={`/events/${id}`} className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-black">
            <ArrowLeft className="size-4" aria-hidden />
            Späť na event
          </Link>
          <div className="flex flex-wrap gap-2">
            {canEdit && !shown && saved.isSuccess && (
              <Button variant="outline" disabled={save.isPending || live.lines.length === 0} onClick={() => save.mutate(live)}>
                <Save className="size-4" aria-hidden />
                {save.isPending ? 'Ukladám…' : 'Uložiť ponuku'}
              </Button>
            )}
            <Button onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              Tlačiť / PDF
            </Button>
          </div>
        </div>

        {saved.isSuccess && saved.data.length > 0 && (
          <div className="rounded-xl border p-3">
            <p className="mb-2 text-sm font-medium">Uložené ponuky</p>
            <ul className="flex flex-col gap-1.5 text-sm">
              {saved.data.map((item) => (
                <li key={item.id} className={`flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 ${item.id === viewing ? 'bg-amber-100' : ''}`}>
                  <span className="font-medium">č. {quoteNumber(item)}</span>
                  <span className="text-neutral-600">{formatDate(item.createdAt.slice(0, 10))}</span>
                  <span className="font-medium">{money(item.total)}</span>
                  {canEdit ? (
                    <select
                      aria-label={`Stav ponuky ${quoteNumber(item)}`}
                      className="h-8 rounded-md border px-1.5 text-sm"
                      value={item.status}
                      onChange={(e) => status.mutate({ quoteId: item.id, value: e.target.value as QuoteStatus })}
                    >
                      {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span>{QUOTE_STATUS_LABELS[item.status]}</span>
                  )}
                  <span className="ml-auto flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(item.id === viewing ? null : item.id)}>
                      <Eye className="size-4" aria-hidden />
                      {item.id === viewing ? 'Späť na aktuálnu' : 'Zobraziť'}
                    </Button>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Zmazať ponuku ${quoteNumber(item)}`}
                        onClick={() => window.confirm(`Zmazať uloženú ponuku č. ${quoteNumber(item)}?`) && remove.mutate(item.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {shown ? (
          <p className="rounded-lg bg-amber-100 p-2 text-sm">
            Zobrazená je uložená ponuka č. {quoteNumber(shown)} z {formatDate(shown.createdAt.slice(0, 10))} – presne tak, ako bola uložená. Tlačí sa táto verzia.
          </p>
        ) : (
          <>
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
          </>
        )}
        {(save.isError || status.isError || remove.isError) && <p className="text-sm text-red-700">Nepodarilo sa uložiť. Táto časť databázy ešte nemusí byť pripravená (migrácia 0093).</p>}
      </div>

      {shown ? <QuoteDocument doc={shown.doc} number={quoteNumber(shown)} /> : <QuoteDocument doc={live} />}
    </div>
  )
}
