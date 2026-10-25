import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CloudOff, ScanLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useEvents } from '@/features/events/useEvents'
import { LiveScanner } from '@/features/scan/LiveScanner'
import { parseQr } from '@/features/scan/qr'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { fetchPackChecks, packKeys, setPackCheck, usePackChecks, type PackPhase } from './api'
import { enqueue, isNetworkError, mergeChecks, readQueue, readSnapshot, writeQueue, writeSnapshot, type PendingTick } from './offline'
import { checkOf, packProgress, packRows, type PackRow } from './model'

const PHASE_LABELS: Record<PackPhase, string> = { out: 'Nakladanie', back: 'Návrat' }

/** Pack list eventu na mobil: odškrtávanie techniky a cases pri nakladaní a pri návrate. */
export function PackPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session?.user.id
  const queryClient = useQueryClient()
  const events = useEvents(companyId)
  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const checks = usePackChecks(companyId, id)
  const [phase, setPhase] = useState<PackPhase>('out')
  const [scanning, setScanning] = useState(false)
  // Odškrtnutia idú najprv do fronty v telefóne a odošlú sa hneď, alebo keď sa chytí sieť.
  const [queue, setQueueState] = useState<PendingTick[]>(() => readQueue(id))
  const [failed, setFailed] = useState(false)
  const flushing = useRef(false)
  const setQueue = useCallback(
    (next: PendingTick[]) => {
      writeQueue(id, next)
      setQueueState(next)
    },
    [id],
  )
  const flush = useCallback(async () => {
    if (flushing.current || !navigator.onLine) return
    let pending = readQueue(id)
    if (pending.length === 0) return
    flushing.current = true
    try {
      const server = await fetchPackChecks(companyId, id)
      for (const tick of [...pending]) {
        const existing = server.find((check) => check.phase === tick.phase && (tick.caseId ? check.caseId === tick.caseId : check.equipmentId === tick.equipmentId))
        try {
          if (tick.checked !== Boolean(existing)) await setPackCheck(companyId, id, { equipmentId: tick.equipmentId, caseId: tick.caseId }, tick.phase, tick.checked, existing?.id)
        } catch (error) {
          if (isNetworkError(error)) break
          setFailed(true)
        }
        pending = pending.filter((item) => item !== tick)
        setQueue(pending)
      }
    } catch {
      // Sieť ešte nie je – skúsi sa znova pri ďalšej zmene alebo keď sa chytí signál.
    } finally {
      flushing.current = false
      void queryClient.invalidateQueries({ queryKey: packKeys.ofEvent(companyId, id) })
    }
  }, [companyId, id, queryClient, setQueue])
  useEffect(() => {
    // Pri otvorení odoslať, čo ostalo vo fronte; potom vždy, keď sa chytí signál.
    const timer = window.setTimeout(() => void flush(), 0)
    window.addEventListener('online', flush)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('online', flush)
    }
  }, [flush])
  const tick = (row: PackRow, checked: boolean) => {
    setFailed(false)
    setQueue(enqueue(readQueue(id), { rowKey: row.key, equipmentId: row.equipmentId, caseId: row.caseId, phase, checked, at: new Date().toISOString() }))
    void flush()
  }

  // Posledný načítaný pack list sa pamätá – offline sa otvorí z telefónu.
  const event = events.data?.find((item) => item.id === id)
  const liveRows = event ? packRows(event.equipment, equipment.data ?? [], cases.data ?? []) : null
  const liveCanTick = event ? can(company, 'events.edit') || event.crew.some((person) => person.memberId === userId) : false
  useEffect(() => {
    if (event && liveRows && checks.data) writeSnapshot(id, { eventName: event.name, startsOn: event.startsOn, rows: liveRows, checks: checks.data, canTick: liveCanTick, savedAt: new Date().toISOString() })
  })
  const snapshot = !event || checks.isError ? readSnapshot(id) : null

  if (!snapshot && (events.isPending || checks.isPending)) return <LoadingBlock />
  if (!snapshot && !event) return <ErrorBlock message="Event sa nenašiel." />
  if (!snapshot && checks.isError) return <ErrorBlock message="Pack list sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie." />

  const eventName = event?.name ?? snapshot!.eventName
  const startsOn = event?.startsOn ?? snapshot!.startsOn
  const rows = liveRows ?? snapshot!.rows
  const all = mergeChecks(checks.data ?? snapshot?.checks ?? [], queue)
  const canTick = event ? liveCanTick : snapshot!.canTick
  const progress = packProgress(rows, all, phase)
  const missingBack = rows.filter((row) => checkOf(row, all, 'out') && !checkOf(row, all, 'back'))

  return (
    <>
      <Link to={`/events/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {eventName}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Pack list</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {eventName} · {formatDate(startsOn)}
      </p>
      {(queue.length > 0 || snapshot) && (
        <p role="status" className="mb-3 flex items-start gap-2 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <CloudOff className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>
            {snapshot && `Bez spojenia – pack list z ${new Date(snapshot.savedAt).toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}. `}
            {queue.length > 0 && `Čaká na odoslanie: ${queue.length}. Odošle sa samo, keď bude signál.`}
          </span>
        </p>
      )}

      {canTick && rows.length > 0 && (
        <Button variant="outline" className="mb-3 w-full" onClick={() => setScanning(true)}>
          <ScanLine className="size-4" aria-hidden />
          Skenovať QR štítky ({PHASE_LABELS[phase].toLowerCase()})
        </Button>
      )}
      {scanning && (
        <LiveScanner
          title={`Pack list – ${PHASE_LABELS[phase].toLowerCase()}`}
          onClose={() => setScanning(false)}
          onResult={(text) => {
            const target = parseQr(text)
            if (!target) return 'Tento QR kód nie je z RigTracku.'
            const row = rows.find((candidate) => (target.kind === 'case' ? candidate.caseId : candidate.equipmentId) === target.id)
            if (!row) {
              const name = target.kind === 'case' ? cases.data?.find((item) => item.id === target.id)?.name : equipment.data?.find((item) => item.id === target.id)?.name
              return `✗ ${name ?? 'Toto'} nie je v pack liste eventu.`
            }
            if (checkOf(row, all, phase)) return `✓ ${row.name} už je odškrtnuté.`
            tick(row, true)
            return `✓ ${row.name}`
          }}
        />
      )}

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border bg-surface p-1" role="group" aria-label="Fáza">
        {(['out', 'back'] as const).map((value) => {
          const { done, total } = packProgress(rows, all, value)
          return (
            <button
              key={value}
              type="button"
              aria-pressed={phase === value}
              onClick={() => setPhase(value)}
              className={cn('rounded-lg px-3 py-2 text-sm font-medium', phase === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              {PHASE_LABELS[value]} {done}/{total}
            </button>
          )
        })}
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} />
      </div>

      {phase === 'back' && missingBack.length > 0 && (
        <p role="status" className="mb-4 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <span className="font-medium">Ešte sa nevrátilo ({missingBack.length}):</span> {missingBack.map((row) => row.name).join(', ')}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">Na evente zatiaľ nie je žiadna technika.</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {rows.map((row) => {
            const check = checkOf(row, all, phase)
            return (
              <li key={row.key}>
                <button
                  type="button"
                  disabled={!canTick}
                  onClick={() => tick(row, !check)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left enabled:hover:bg-muted"
                  aria-pressed={Boolean(check)}
                >
                  <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-md border-2', check ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/40')}>
                    {check && <Check className="size-5" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block font-medium break-words', check && 'text-muted-foreground line-through')}>
                      {row.quantity > 1 ? `${row.quantity}× ` : ''}
                      {row.name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {[row.caseId && 'case', row.detail, check && `${check.checkedByName || 'neznámy'} ${new Date(check.checkedAt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {!canTick && <p className="mt-3 text-sm text-muted-foreground">Odškrtávať môže posádka eventu a kto upravuje eventy.</p>}
      {failed && <p className="mt-3 text-sm text-destructive">Niektorú zmenu databáza neprijala – skontrolujte odškrtnutia.</p>}
    </>
  )
}
