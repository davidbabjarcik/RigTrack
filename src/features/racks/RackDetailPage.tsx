import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, BookmarkPlus, FileDown, LayoutGrid, PackagePlus, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button, LinkButton } from '@/components/ui/button'
import { caseTitle } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useEvents } from '@/features/events/useEvents'
import { formatDate } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import { copyRack, deleteRack, fetchRacks, fetchSlots, rackKeys, rackToEvent } from './api'
import { useCatalog } from '@/features/equipment/catalog'
import { brandingKeys, fetchBranding, fetchLogoBlob, logoForLightBackground } from '@/features/companies/branding'
import { fileSlug } from '@/features/cases/canvas'
import { todayIso } from '@/lib/format'
import { rackPdf } from './rackPdf'
import { rackSummary, rackWarnings, slotInfo, type FitSlot } from './fit'
import { RACK_RAIL_LABELS, RACK_TYPE_LABELS, rackHeightMm } from './model'
import { RackGrid } from './RackGrid'

/** Detail racku: údaje, predok a zadok po U a zoznam osadenia. */
export function RackDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const racks = useQuery({ queryKey: rackKeys.list(companyId), queryFn: () => fetchRacks(companyId) })
  const slots = useQuery({ queryKey: rackKeys.slots(companyId, id), queryFn: () => fetchSlots(companyId, id), enabled: Boolean(id) })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const cases = useCases(companyId)
  const events = useEvents(companyId)
  const catalog = useCatalog()
  const [eventForTemplate, setEventForTemplate] = useState('')
  const [notice, setNotice] = useState('')
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: rackKeys.list(companyId) }), queryClient.invalidateQueries({ queryKey: ['company', companyId, 'events'] })])
  const asTemplate = useMutation({
    mutationFn: (name: string) => copyRack(id, name, true, null),
    onSuccess: async (newId) => {
      await refresh()
      navigate(`/racks/${newId}`)
    },
  })
  const intoEvent = useMutation({
    mutationFn: () => copyRack(id, racks.data?.find((item) => item.id === id)?.name ?? '', false, eventForTemplate),
    onSuccess: async (newId) => {
      await refresh()
      navigate(`/racks/${newId}`)
    },
  })
  const toPackList = useMutation({
    mutationFn: () => rackToEvent(id),
    onSuccess: async (count) => {
      await refresh()
      setNotice(tf('Do techniky akcie pridané alebo doplnené: {0} položiek (pack list, rezervácia v termíne akcie).', count))
    },
  })
  const branding = useQuery({ queryKey: brandingKeys.branding(companyId), queryFn: () => fetchBranding(companyId) })
  // PDF: logo, názov a kontakt firmy z Nastavení, sériové čísla kusov z techniky.
  const pdf = useMutation({
    mutationFn: async () => {
      const current = racks.data?.find((item) => item.id === id)
      if (!current) return
      const logoPath = branding.data?.logoPath ?? ''
      const logo = logoPath ? await fetchLogoBlob(logoPath).then(logoForLightBackground).then((blob) => createImageBitmap(blob)).catch(() => null) : null
      const sources = { equipment: equipment.data ?? [], catalog: catalog.data ?? [] }
      const event = current.eventId ? events.data?.find((item) => item.id === current.eventId) : undefined
      const blob = await rackPdf({
        rack: current,
        slots: (slots.data ?? []).map(({ id: key, ...slot }) => ({ ...slot, key })),
        sources,
        companyName: company.companyName,
        logo,
        contact: branding.data?.labelFooter ?? '',
        event: event ? { name: event.name, startsOn: event.startsOn, endsOn: event.endsOn } : null,
        serialOf: (slot) => {
          const item = slot.equipmentId ? equipment.data?.find((piece) => piece.id === slot.equipmentId) : undefined
          if (!item) return ''
          return (slot.unit ? item.unitInfo?.[String(slot.unit)]?.serial : '') || (slot.unit ? '' : item.serialNumber) || ''
        },
        generatedOn: todayIso(),
      })
      logo?.close()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `rack-${fileSlug(current.name)}.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteRack(companyId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rackKeys.list(companyId) })
      navigate('/racks')
    },
  })

  if (racks.isPending) return <LoadingBlock />
  const rack = racks.data?.find((item) => item.id === id)
  if (racks.isError || !rack) return <ErrorBlock message={tx('Tento rack neexistuje alebo k nemu nemáte prístup.')} />

  const sources = { equipment: equipment.data ?? [], catalog: catalog.data ?? [] }
  const describe = (slot: FitSlot) => slotInfo(slot, sources)
  const box = rack.caseId ? cases.data?.find((item) => item.id === rack.caseId) : undefined
  const event = rack.eventId ? events.data?.find((item) => item.id === rack.eventId) : undefined
  const list: FitSlot[] = (slots.data ?? []).map(({ id: key, ...slot }) => ({ ...slot, key }))
  const summary = rackSummary(rack, list, sources)
  const warnings = rackWarnings(rack, list, sources).filter((warning) => warning.level === 'warn')

  return (
    <>
      <Link to="/racks" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {tx('Racky')}
      </Link>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 grow basis-56">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{rack.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              tx(RACK_TYPE_LABELS[rack.rackType]),
              `${rack.units} U (${rackHeightMm(rack.units)} mm)`,
              rack.depthMm && tf('hĺbka {0} mm', rack.depthMm),
              tx(RACK_RAIL_LABELS[rack.rails]),
              rack.maxLoadKg !== null && tf('nosnosť {0} kg', rack.maxLoadKg),
              rack.ownWeightKg !== null && tf('rack {0} kg', rack.ownWeightKg),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="text-sm text-muted-foreground">
            {[
              event && tf('Akcia: {0} ({1})', event.name, formatDate(event.startsOn)),
              box && tf('Fyzický rack: {0}', caseTitle(box)),
              rack.isTemplate && tx('Šablóna'),
              tf('Verzia {0} · {1}', rack.version, formatDate(rack.updatedAt.slice(0, 10))),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pdf.isPending || !slots.data || !equipment.data} onClick={() => pdf.mutate()}>
            <FileDown className="size-4" aria-hidden />
            {pdf.isPending ? tx('Pripravujem PDF…') : 'PDF'}
          </Button>
          {can(company, 'racks.edit') && (
            <LinkButton to={`/racks/${rack.id}/fit`}>
              <LayoutGrid className="size-4" aria-hidden />
              {tx('Upraviť osadenie')}
            </LinkButton>
          )}
          {can(company, 'racks.edit') && (
            <LinkButton to={`/racks/${rack.id}/edit`} variant="outline">
              <Pencil className="size-4" aria-hidden />
              {tx('Upraviť údaje')}
            </LinkButton>
          )}
          {can(company, 'racks.delete') && (
            <Button variant="destructive" disabled={remove.isPending} onClick={() => window.confirm(tf('Zmazať rack „{0}“?', rack.name)) && remove.mutate()}>
              <Trash2 className="size-4" aria-hidden />
              {tx('Zmazať')}
            </Button>
          )}
        </div>
      </header>
      {rack.note && <p className="mb-4 rounded-xl border bg-surface p-3 text-sm whitespace-pre-wrap">{rack.note}</p>}
      {can(company, 'racks.edit') && (
        <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border bg-surface p-3 text-sm">
          {rack.isTemplate ? (
            <>
              <label className="flex min-w-56 flex-1 flex-col gap-1 font-medium">
                {tx('Vložiť šablónu do akcie')}
                <select className="h-10 rounded-lg border bg-background px-2 font-normal" value={eventForTemplate} onChange={(changed) => setEventForTemplate(changed.target.value)}>
                  <option value="">{tx('— vyberte akciu —')}</option>
                  {(events.data ?? [])
                    .filter((item) => item.endsOn >= todayIso())
                    .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({formatDate(item.startsOn)})
                      </option>
                    ))}
                </select>
              </label>
              <Button disabled={!eventForTemplate || intoEvent.isPending} onClick={() => intoEvent.mutate()}>
                <PackagePlus className="size-4" aria-hidden />
                {tx('Vložiť do akcie')}
              </Button>
            </>
          ) : (
            <Button variant="outline" disabled={asTemplate.isPending} onClick={() => {
              const name = window.prompt(tx('Názov šablóny:'), rack.name)
              if (name?.trim()) asTemplate.mutate(name.trim())
            }}>
              <BookmarkPlus className="size-4" aria-hidden />
              {tx('Uložiť ako šablónu')}
            </Button>
          )}
          {rack.eventId && can(company, 'events.edit') && (
            <Button variant="outline" disabled={toPackList.isPending || list.every((slot) => !slot.equipmentId)} onClick={() => toPackList.mutate()}>
              <PackagePlus className="size-4" aria-hidden />
              {tx('Pridať kusy do pack listu akcie')}
            </Button>
          )}
          {rack.isTemplate && <p className="basis-full text-xs text-muted-foreground">{tx('Vznikne kópia racku k akcii a jej kusy sa pridajú do techniky akcie (rezervácia).')}</p>}
          {notice && <p role="status" className="basis-full text-emerald-700 dark:text-emerald-400">{notice}</p>}
          {(asTemplate.isError || intoEvent.isError || toPackList.isError) && <p role="alert" className="basis-full text-destructive">{tx('Nepodarilo sa – skontrolujte oprávnenia alebo kolízie techniky v termíne akcie.')}</p>}
        </div>
      )}

      {list.length > 0 && (
        <p className="mb-3 text-sm">
          {[tf('Obsadené {0} U', summary.usedU), tf('Voľné {0} U', summary.freeU), tf('Spolu {0} kg', summary.totalKg), tf('Príkon {0} W', summary.powerW)].join(' · ')}
        </p>
      )}
      {warnings.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1 text-sm">
          {warnings.map((warning, index) => (
            <li key={index} className="flex items-start gap-2 rounded-lg border border-amber-400 bg-amber-50 p-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {warning.text}
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        {(['front', 'rear'] as const).map((side) => (
          <figure key={side} className="flex flex-col gap-1">
            <figcaption className="text-sm font-medium">{side === 'front' ? tx('Predok') : tx('Zadok')}</figcaption>
            <RackGrid units={rack.units} slots={list} side={side} selected={null} flagged={new Set()} describe={describe} onSelect={() => undefined} />
          </figure>
        ))}
      </div>
      {list.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">{tx('Rack je zatiaľ prázdny – zariadenia pridáte tlačidlom Upraviť osadenie.')}</p>
      )}
      {remove.isError && <p role="alert" className="mt-3 text-sm text-destructive">{tx('Rack sa nepodarilo zmazať.')}</p>}
    </>
  )
}
