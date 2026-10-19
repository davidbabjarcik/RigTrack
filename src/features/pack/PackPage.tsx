import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ScanLine } from 'lucide-react'
import { useState } from 'react'
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
import { packKeys, setPackCheck, usePackChecks, type PackPhase } from './api'
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
  const toggle = useMutation({
    mutationFn: ({ row, checked, existingId }: { row: PackRow; checked: boolean; existingId?: string }) =>
      setPackCheck(companyId, id, { equipmentId: row.equipmentId, caseId: row.caseId }, phase, checked, existingId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: packKeys.ofEvent(companyId, id) }),
  })

  if (events.isPending || checks.isPending) return <LoadingBlock />
  const event = events.data?.find((item) => item.id === id)
  if (!event) return <ErrorBlock message="Event sa nenašiel." />
  if (checks.isError) return <ErrorBlock message="Pack list sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie." />

  const rows = packRows(event.equipment, equipment.data ?? [], cases.data ?? [])
  const all = checks.data ?? []
  const canTick = can(company, 'events.edit') || event.crew.some((person) => person.memberId === userId)
  const progress = packProgress(rows, all, phase)
  const missingBack = rows.filter((row) => checkOf(row, all, 'out') && !checkOf(row, all, 'back'))

  return (
    <>
      <Link to={`/events/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {event.name}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Pack list</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {event.name} · {formatDate(event.startsOn)}
      </p>

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
            toggle.mutate({ row, checked: true })
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
                  disabled={!canTick || toggle.isPending}
                  onClick={() => toggle.mutate({ row, checked: !check, existingId: check?.id })}
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
      {toggle.isError && <p className="mt-3 text-sm text-destructive">Zmena sa nepodarila.</p>}
    </>
  )
}
