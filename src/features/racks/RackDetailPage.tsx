import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, LayoutGrid, Pencil, Trash2 } from 'lucide-react'
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
import { deleteRack, fetchRacks, fetchSlots, rackKeys } from './api'
import { useCatalog } from '@/features/equipment/catalog'
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
