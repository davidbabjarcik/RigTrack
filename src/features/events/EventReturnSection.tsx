import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, PackageX, ScanLine, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button, LinkButton } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useCases } from '@/features/cases/useCases'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { incidentKeys, saveIncident, useIncidents, type IncidentKind } from '@/features/incidents/api'
import { usePackChecks } from '@/features/pack/api'
import { checkOf, packRows, type PackRow } from '@/features/pack/model'
import { closeEventReturn, reopenEventReturn, returnKeys, useEventReturns } from '@/features/pack/returns'
import type { Membership } from '@/features/companies/company-context'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import type { CompanyEvent } from './model'
import { tx, tf } from '@/lib/i18n'

const REPORT_LABELS: Record<'loss' | 'damage', string> = { loss: 'Strata', damage: 'Poškodené' }

/**
 * Vrátenie po evente: čo sa naložilo (pack list), ale nevrátilo. Pri každej veci nahlásenie straty alebo poškodenia
 * (zapíše sa do Škôd) a nakoniec uzavretie vrátenia – ostane záznam, kto a kedy ho uzavrel a čo chýbalo.
 */
export function EventReturnSection({ company, event }: { company: Membership; event: CompanyEvent }) {
  const companyId = company.companyId
  const userId = useAuth().session?.user.id
  const queryClient = useQueryClient()
  const checks = usePackChecks(companyId, event.id)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const cases = useCases(companyId)
  const returns = useEventReturns(companyId, can(company, 'events.view'))
  const incidents = useIncidents(companyId)
  const [reporting, setReporting] = useState<{ key: string; kind: 'loss' | 'damage' } | null>(null)
  const [note, setNote] = useState('')
  // Z Prehľadu (…#vratenie) sa stránka posunie na túto sekciu, keď sa načíta.
  const { hash } = useLocation()
  const loaded = Boolean(checks.data)
  useEffect(() => {
    if (hash === '#vratenie' && loaded) document.getElementById('vratenie')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, loaded])

  const report = useMutation({
    mutationFn: ({ row, kind, text }: { row: PackRow; kind: 'loss' | 'damage'; text: string }) =>
      saveIncident(companyId, null, {
        kind: kind as IncidentKind,
        occurredOn: todayIso(),
        memberId: null,
        personName: '',
        eventId: event.id,
        equipmentId: row.equipmentId ?? null,
        title: `${REPORT_LABELS[kind]}: ${row.name}`.slice(0, 200),
        description: [text.trim(), `Event: ${event.name}`].filter(Boolean).join('\n').slice(0, 2000),
        severity: kind === 'loss' ? 'medium' : 'minor',
        cost: null,
        paidBy: '',
        resolved: false,
      }),
    onSuccess: () => {
      setReporting(null)
      setNote('')
      void queryClient.invalidateQueries({ queryKey: incidentKeys.list(companyId) })
    },
  })
  const close = useMutation({
    mutationFn: (missing: string[]) => closeEventReturn(event.id, missing),
    onSettled: () => queryClient.invalidateQueries({ queryKey: returnKeys.closed(companyId) }),
  })
  const reopen = useMutation({
    mutationFn: () => reopenEventReturn(event.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: returnKeys.closed(companyId) }),
  })

  const all = checks.data ?? []
  // Sekcia má zmysel, až keď sa niečo naložilo (pack list) a event už začal.
  if (event.status === 'cancelled' || event.startsOn > todayIso() || !all.some((check) => check.phase === 'out')) return null

  const rows = packRows(event.equipment, equipment.data ?? [], cases.data ?? [])
  const missing = rows.filter((row) => checkOf(row, all, 'out') && !checkOf(row, all, 'back'))
  const closed = returns.data?.find((item) => item.eventId === event.id)
  const canClose = can(company, 'events.edit') || event.crew.some((person) => person.memberId === userId)
  const ended = event.endsOn < todayIso()
  // Čo už je nahlásené v Škodách k tomuto eventu (podľa názvu).
  const reported = (row: PackRow) => (incidents.data ?? []).find((item) => item.eventId === event.id && item.title.endsWith(`: ${row.name}`))
  const error = report.error ?? close.error ?? reopen.error

  return (
    <div id="vratenie">
      <CollapsibleSection
        id="event.return"
        title={tx('Vrátenie po evente')}
        summary={closed ? tx('uzavreté') : missing.length > 0 ? tf('nevrátené {0}', missing.length) : tx('všetko vrátené')}
        actions={
          !closed && (
            <LinkButton to={`/events/${event.id}/pack`} size="sm" variant="outline">
              <ScanLine className="size-4" aria-hidden />{tx('Návrat v balení')}</LinkButton>
          )
        }
      >
        <div className="rounded-xl border bg-surface p-4">
          {closed ? (
            <div className="flex flex-wrap items-start gap-3">
              <p className="min-w-0 flex-1 text-sm">
                <Check className="mr-1 inline size-4 text-emerald-600" aria-hidden />{tx('Vrátenie uzavrel')}{closed.closedByName ? ` ${closed.closedByName}` : 'i'} {formatDate(closed.closedAt.slice(0, 10))}.
                {closed.missing.length > 0 ? (
                  <span className="mt-1 block text-muted-foreground">{tx('Chýbalo (')}{closed.missing.length}): {closed.missing.join(', ')}</span>
                ) : (
                  <span className="mt-1 block text-muted-foreground">{tx('Všetko sa vrátilo.')}</span>
                )}
              </p>
              {can(company, 'events.edit') && (
                <Button size="sm" variant="ghost" disabled={reopen.isPending} onClick={() => reopen.mutate()}>{tx('Znova otvoriť')}</Button>
              )}
            </div>
          ) : (
            <>
              {missing.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tx('Všetko, čo sa naložilo, sa vrátilo.')}</p>
              ) : (
                <>
                  <p className="mb-2 text-sm">
                    <span className="font-medium text-destructive">{tx('Nevrátilo sa (')}{missing.length})</span>
                    <span className="text-muted-foreground">{' '}{tx('– naložené pri odchode, pri návrate neodškrtnuté.')}</span>
                  </p>
                  <ul className="divide-y rounded-lg border">
                    {missing.map((row) => {
                      const done = reported(row)
                      const open = reporting?.key === row.key
                      return (
                        <li key={row.key} className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="min-w-0 flex-1">
                              <Link to={row.caseId ? `/cases/${row.caseId}` : `/equipment/${row.equipmentId}`} className="font-medium break-words hover:underline">
                                {row.quantity > 1 ? `${row.quantity}× ` : ''}
                                {row.name}
                              </Link>
                              {row.caseId && <span className="text-sm text-muted-foreground">{' '}{tx('· case')}</span>}
                            </span>
                            {done ? (
                              <Link to="/incidents" className="text-sm text-accent hover:underline">{tx('nahlásené (')}{done.kind === 'loss' ? 'strata' : tx('poškodené')})
                              </Link>
                            ) : (
                              <>
                                <Button size="sm" variant={open && reporting.kind === 'loss' ? 'default' : 'outline'} onClick={() => setReporting(open && reporting.kind === 'loss' ? null : { key: row.key, kind: 'loss' })}>
                                  <PackageX className="size-4" aria-hidden />{tx('Strata')}</Button>
                                <Button size="sm" variant={open && reporting.kind === 'damage' ? 'default' : 'outline'} onClick={() => setReporting(open && reporting.kind === 'damage' ? null : { key: row.key, kind: 'damage' })}>
                                  <Wrench className="size-4" aria-hidden />{tx('Poškodené')}</Button>
                              </>
                            )}
                          </div>
                          {open && !done && (
                            <form
                              className="mt-2 flex flex-wrap items-end gap-2"
                              onSubmit={(formEvent) => {
                                formEvent.preventDefault()
                                report.mutate({ row, kind: reporting.kind, text: note })
                              }}
                            >
                              <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
                                {reporting.kind === 'loss' ? tx('Čo sa stalo (nepovinné)') : tx('Čo je poškodené (nepovinné)')}
                                <input
                                  className="h-10 rounded-lg border bg-background px-3"
                                  maxLength={500}
                                  autoFocus
                                  placeholder={reporting.kind === 'loss' ? tx('napr. ostal na stage, nikto ho nenašiel') : tx('napr. zlomený konektor')}
                                  value={note}
                                  onChange={(changeEvent) => setNote(changeEvent.target.value)}
                                />
                              </label>
                              <Button type="submit" size="sm" disabled={report.isPending}>
                                {report.isPending ? 'Zapisujem…' : tf('Nahlásiť: {0}', REPORT_LABELS[reporting.kind].toLowerCase())}
                              </Button>
                            </form>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
              {canClose && (ended || missing.length === 0) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={close.isPending}
                    onClick={() => {
                      if (missing.length > 0 && !window.confirm(tf('Ešte chýba {0} {1}. Uzavrieť vrátenie aj tak? Zoznam chýbajúcich sa uloží.', missing.length, missing.length === 1 ? 'vec' : missing.length < 5 ? 'veci' : 'vecí'))) return
                      close.mutate(missing.map((row) => `${row.quantity > 1 ? `${row.quantity}× ` : ''}${row.name}`))
                    }}
                  >
                    <Check className="size-4" aria-hidden />{tx('Uzavrieť vrátenie')}</Button>
                  <span className="text-xs text-muted-foreground">{tx('Po uzavretí event zmizne z „Ešte vonku“ na Prehľade.')}</span>
                </div>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error instanceof Error ? error.message : tx('Nepodarilo sa uložiť.')}
            </p>
          )}
        </div>
      </CollapsibleSection>
    </div>
  )
}
