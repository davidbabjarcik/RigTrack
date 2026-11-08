import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ScanLine, Warehouse as WarehouseIcon, Wrench, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { SelectField, TextareaField } from '@/components/ui/field'
import { caseKeys } from '@/features/cases/api'
import { caseTitle } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { addEventCase, addEventEquipment, eventKeys, setEventEquipmentQuantity } from '@/features/events/api'
import { isLive } from '@/features/events/model'
import { useEvents } from '@/features/events/useEvents'
import { saveServiceRecord, serviceKeys } from '@/features/service/api'
import { fetchCaseBays, fetchWarehouse, placeCase, warehouseKeys } from '@/features/warehouse/api'
import { describeSpot, isStructure } from '@/features/warehouse/model'
import { formatDate, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { addScan, eventAdditions, placements, type Scanned } from './bulkMove'
import { LiveScanner } from './LiveScanner'
import { parseQr } from './qr'

type Target = 'warehouse' | 'event' | 'service'

/** Hromadný presun: naskenujete viac cases a techniky za sebou a jedným ťuknutím ich presuniete. */
export function BulkMovePage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const queryClient = useQueryClient()
  const today = todayIso()
  const [scanned, setScanned] = useState<Scanned[]>([])
  const [scanning, setScanning] = useState(false)
  const [done, setDone] = useState('')
  const targets = ([
    can(company, 'cases.edit') && 'warehouse',
    can(company, 'events.edit') && 'event',
    can(company, 'service.edit') && 'service',
  ].filter(Boolean) as Target[])
  const [target, setTarget] = useState<Target>(targets[0] ?? 'warehouse')
  const [spotId, setSpotId] = useState('')
  const [level, setLevel] = useState(1)
  const [eventId, setEventId] = useState('')
  const [problem, setProblem] = useState('')

  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const plan = useQuery({ queryKey: warehouseKeys.plan(companyId), queryFn: () => fetchWarehouse(companyId), enabled: target === 'warehouse', retry: false })
  const bays = useQuery({ queryKey: warehouseKeys.bays(companyId), queryFn: () => fetchCaseBays(companyId), enabled: target === 'warehouse' })
  const events = useEvents(companyId)
  const spots = (plan.data?.spots ?? []).filter((spot) => !isStructure(spot.kind))
  const spot = spots.find((candidate) => candidate.id === spotId)
  const upcoming = (events.data ?? []).filter((event) => isLive(event) && event.endsOn >= today).sort((a, b) => a.startsOn.localeCompare(b.startsOn))
  const event = upcoming.find((candidate) => candidate.id === eventId)

  const caseOf = (id: string) => cases.data?.find((item) => item.id === id)
  const pieceOf = (id: string) => equipment.data?.find((item) => item.id === id)
  const label = (item: Scanned) => {
    if (item.kind === 'case') return caseOf(item.id) ? caseTitle(caseOf(item.id)!) : tx('Case')
    const name = pieceOf(item.id)?.name ?? tx('Technika')
    return item.units.length > 0 ? `${name} #${item.units.join(', #')}` : item.count > 1 ? `${item.count}× ${name}` : name
  }
  const scannedCases = scanned.filter((item) => item.kind === 'case')
  const scannedPieces = scanned.filter((item) => item.kind === 'equipment')

  const onScan = (text: string): string | void => {
    const qr = parseQr(text)
    if (!qr) return tx('Tento QR kód nie je z RigTracku.')
    if (qr.kind === 'spot') {
      const place = spots.find((candidate) => candidate.id === qr.id)
      if (!place) return tx('Toto miesto v pláne skladu nie je.')
      setTarget('warehouse')
      setSpotId(place.id)
      return tf('Cieľ: {0}', place.name)
    }
    const known = qr.kind === 'case' ? caseOf(qr.id) : pieceOf(qr.id)
    if (!known) return tx('✗ Toto v evidencii nie je.')
    const result = addScan(scanned, qr)
    setScanned(result.list)
    setDone('')
    const name = qr.kind === 'case' ? caseTitle(caseOf(qr.id)!) : pieceOf(qr.id)!.name
    return result.added ? tf('✓ {0} ({1} v zozname)', name, result.list.length) : tf('{0} už v zozname je.', name)
  }

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: caseKeys.list(companyId) }),
      queryClient.invalidateQueries({ queryKey: warehouseKeys.bays(companyId) }),
      queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) }),
      queryClient.invalidateQueries({ queryKey: serviceKeys.list(companyId) }),
    ])

  const move = useMutation({
    mutationFn: async (): Promise<string> => {
      if (target === 'warehouse') {
        if (!spot) throw new Error('spot')
        const all = (cases.data ?? []).map((item) => ({ ...item, spotBay: bays.data?.get(item.id)?.bay ?? null, spotPallet: bays.data?.get(item.id)?.pallet ?? null }))
        const moving = all.filter((item) => scannedCases.some((scan) => scan.id === item.id))
        for (const place of placements(spot, all.filter((item) => item.spotId === spot.id), moving, level)) await placeCase(companyId, place.caseId, spot.id, place.level, place.bay)
        return tf('{0} cases uložených: {1}', moving.length, describeSpot(spot, spot.levels > 1 && !(spot.bays?.length) ? level : null))
      }
      if (target === 'event') {
        if (!event) throw new Error('event')
        const additions = eventAdditions(scanned, equipment.data ?? [], event.equipment)
        for (const box of additions.cases) if (box.content.length > 0) await addEventCase(companyId, event.id, box.caseId, box.content)
        for (const item of additions.items) {
          if (item.isNew) await addEventEquipment(companyId, event.id, item.equipmentId)
          if (!item.isNew || item.quantity > 1) await setEventEquipmentQuantity(event.id, item.equipmentId, item.quantity)
        }
        return tf('Na event {0} pribudlo: {1} cases, {2} položiek techniky.', event.name, additions.cases.length, additions.items.length)
      }
      for (const item of scannedPieces) {
        await saveServiceRecord(companyId, null, {
          equipmentId: item.id,
          unitNumbers: item.units,
          quantity: item.count,
          kind: 'repair',
          status: 'open',
          happenedOn: today,
          problem: problem.trim().slice(0, 2000),
          workDone: '',
          technician: '',
          technicianId: '',
        })
      }
      return tf('Do servisu: {0} záznamov.', scannedPieces.length)
    },
    onSuccess: (message) => {
      setDone(message)
      setScanned([])
      setProblem('')
    },
    onSettled: refresh,
  })

  const ready =
    target === 'warehouse' ? Boolean(spot) && scannedCases.length > 0 : target === 'event' ? Boolean(event) && scanned.length > 0 : scannedPieces.length > 0
  const ignored = target === 'warehouse' ? scannedPieces.length : target === 'service' ? scannedCases.length : 0

  return (
    <>
      <PageHeader
        title={tx('Hromadný presun')}
        description={tx('Naskenujte viac cases alebo techniky za sebou a presuňte ich naraz do skladu, na event alebo do servisu.')}
        action={
          <Button onClick={() => setScanning(true)}>
            <ScanLine className="size-4" aria-hidden />{tx('Skenovať')}
          </Button>
        }
      />
      {scanning && <LiveScanner title={tx('Skenujte štítky za sebou')} onClose={() => setScanning(false)} onResult={onScan} />}

      {done && <p role="status" className="mb-4 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">{done}</p>}

      <section className="mb-5">
        <h2 className="mb-2 text-sm font-medium">{tf('Naskenované ({0})', scanned.length)}</h2>
        {scanned.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-surface px-6 py-8 text-center text-sm text-muted-foreground">
            {tx('Zatiaľ nič. Ťuknite na Skenovať a naskenujte štítky cases alebo techniky. Štítok miesta v sklade nastaví cieľ.')}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-surface text-sm">
            {scanned.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 px-3 py-2">
                <span className="w-14 shrink-0 text-xs text-muted-foreground">{item.kind === 'case' ? tx('case') : tx('technika')}</span>
                <Link to={item.kind === 'case' ? `/cases/${item.id}` : `/equipment/${item.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">{label(item)}</Link>
                <Button variant="ghost" size="sm" aria-label={tf('Odobrať zo zoznamu: {0}', label(item))} onClick={() => setScanned(scanned.filter((other) => other !== item))}>
                  <X className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {targets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tx('Na presuny nemáte oprávnenie (sklad, eventy ani servis).')}</p>
      ) : (
        <section className="rounded-xl border bg-surface p-4">
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label={tx('Kam')}>
            {targets.map((value) => {
              const Icon = value === 'warehouse' ? WarehouseIcon : value === 'event' ? CalendarDays : Wrench
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={target === value}
                  onClick={() => setTarget(value)}
                  className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium', target === value ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
                >
                  <Icon className="size-4" aria-hidden />
                  {value === 'warehouse' ? tx('Do skladu') : value === 'event' ? tx('Na event') : tx('Do servisu')}
                </button>
              )
            })}
          </div>

          {target === 'warehouse' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label={tx('Miesto v sklade')} value={spotId} onChange={(e) => setSpotId(e.target.value)}>
                <option value="">{plan.data && spots.length === 0 ? tx('— v pláne skladu nie sú miesta —') : tx('— vyberte alebo naskenujte miesto —')}</option>
                {spots.map((place) => (
                  <option key={place.id} value={place.id}>{place.name}</option>
                ))}
              </SelectField>
              {spot && spot.levels > 1 && !(spot.bays?.length) && (
                <SelectField label={tx('Poschodie')} value={level} onChange={(e) => setLevel(Number(e.target.value))}>
                  {Array.from({ length: spot.levels }, (_, index) => (
                    <option key={index} value={index + 1}>{tf('{0}. poschodie', index + 1)}</option>
                  ))}
                </SelectField>
              )}
              {spot && (spot.bays?.length ?? 0) > 0 && <p className="self-end text-sm text-muted-foreground">{tx('Cases sa rozložia do prvých voľných polí a políc.')}</p>}
            </div>
          )}

          {target === 'event' && (
            <SelectField label={tx('Event')} value={eventId} onChange={(e) => setEventId(e.target.value)}>
              <option value="">{tx('— vyberte event —')}</option>
              {upcoming.map((item) => (
                <option key={item.id} value={item.id}>{`${item.name} (${formatDate(item.startsOn)})`}</option>
              ))}
            </SelectField>
          )}

          {target === 'service' && (
            <TextareaField label={tx('Čo treba opraviť (pre všetky naskenované)')} rows={3} maxLength={2000} value={problem} onChange={(e) => setProblem(e.target.value)} />
          )}

          {ignored > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {target === 'warehouse' ? tf('Technika mimo case ({0}) sa na miesto v sklade neukladá.', ignored) : tf('Do servisu ide len technika – cases ({0}) sa preskočia.', ignored)}
            </p>
          )}
          {move.isError && <p role="alert" className="mt-2 text-sm text-destructive">{tx('Presun sa nepodaril celý – skontrolujte zoznam a skúste znova.')}</p>}
          <Button className="mt-3" disabled={!ready || move.isPending} onClick={() => move.mutate()}>
            {move.isPending ? tx('Presúva sa…') : target === 'warehouse' ? tf('Uložiť {0} cases', scannedCases.length) : target === 'event' ? tf('Pridať na event ({0})', scanned.length) : tf('Poslať do servisu ({0})', scannedPieces.length)}
          </Button>
        </section>
      )}
    </>
  )
}
