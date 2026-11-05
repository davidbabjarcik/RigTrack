import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ClipboardCheck, Gauge, PackageCheck, ShieldCheck, Truck, Wrench } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/features/auth/auth-context'
import { caseTitle, needsCheck, type Case } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { cableBaseName, formatNumber, groupSplitEquipment, hoursState, serviceState, type Equipment } from '@/features/equipment/model'
import { describeDue, isLate, needsAttention, useMaintenanceDue, useMaintenanceRules, type MaintenanceDue } from '@/features/maintenance/api'
import { concernsMe } from '@/features/notifications/model'
import { useResponsibilities, type Responsibility } from '@/features/responsibilities/api'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { useEvents } from '@/features/events/useEvents'
import { lastReturns, returnedUnchecked, stillOut, useRecentPackMarks } from '@/features/pack/returns'
import { useCheckLevels } from './levels'
import { tx, tf } from '@/lib/i18n'

/** Case je moja starosť, keď zaň (alebo za techniku v ňom) zodpovedám; ak nezodpovedá nikto, je to starosť všetkých. */
function caseConcernsMe(item: Case, inside: Equipment[], responsibilities: Responsibility[], userId: string) {
  const kinds = new Set(inside.map((part) => part.kind))
  const owners = responsibilities.filter((r) => r.memberIds.length > 0 && (r.caseIds.includes(item.id) || r.kinds.some((kind) => kinds.has(kind as Equipment['kind']))))
  return owners.length === 0 || owners.some((r) => r.memberIds.includes(userId))
}

function Section({ icon, title, count, children }: { icon: ReactNode; title: string; count: number; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 font-medium">
        {icon}
        {title} ({count})
      </h2>
      {count === 0 ? <p className="rounded-xl border border-dashed bg-surface px-4 py-6 text-center text-sm text-muted-foreground">{tx('Nič – všetko je v poriadku.')}</p> : <ul className="divide-y overflow-hidden rounded-xl border bg-surface">{children}</ul>}
    </section>
  )
}

function Row({ to, title, detail, late }: { to: string; title: string; detail: string; late?: boolean }) {
  return (
    <li>
      <Link to={to} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{title}</span>
          <span className={late ? 'block truncate text-sm text-destructive' : 'block truncate text-sm text-muted-foreground'}>{detail}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  )
}

/** Kontroly: cases a racky na kontrolu, odčítanie prevádzkových hodín a servis – predvolene len to, za čo zodpovedám. */
export function ChecksPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session!.user.id
  // Veci ostatných vidí len ten, kto má oprávnenie „Kontroly – vidieť aj veci iných“ (admin vždy).
  const canSeeAll = can(company, 'checks.all')
  const [onlyMineChoice, setOnlyMine] = useState(true)
  const onlyMine = onlyMineChoice || !canSeeAll
  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const responsibilities = useResponsibilities(companyId).data ?? []
  const checkDays = useCheckLevels(companyId).days
  const rules = useMaintenanceRules(companyId).data ?? []
  const maintenance = useMaintenanceDue(companyId, rules.length > 0)
  const marks = useRecentPackMarks(companyId).data ?? []
  const events = useEvents(companyId)
  const today = todayIso()
  const [now] = useState(() => Date.now())

  if (cases.isPending || equipment.isPending) return <LoadingBlock />
  if (cases.isError || equipment.isError) return <ErrorBlock message={tx('Údaje sa nepodarilo načítať.')} onRetry={() => void Promise.all([cases.refetch(), equipment.refetch()])} />

  const gear = (equipment.data ?? []).filter((item) => item.status !== 'retired')
  const mine = (item: Equipment) => !onlyMine || concernsMe(item, responsibilities, userId)
  const returns = lastReturns(marks)
  // Vrátené z eventu a nespočítané majú prednosť pred bežnou kontrolou podľa úrovne.
  const isReturned = (item: Case) => returnedUnchecked(returns.get(item.id), item.lastCheck?.checkedAt)
  const caseIsMine = (item: Case) => !onlyMine || caseConcernsMe(item, gear.filter((part) => part.caseId === item.id), responsibilities, userId)
  const returnedCases = cases.data.filter(isReturned).filter(caseIsMine)
  const outside = stillOut(marks, events.data ?? [], today)
  const dueCases = cases.data
    .filter((item) => !isReturned(item) && needsCheck(item, now, checkDays))
    .filter((item) => !onlyMine || caseConcernsMe(item, gear.filter((part) => part.caseId === item.id), responsibilities, userId))
  // Rozdelená technika (napr. 8× Beam v cases) je jeden riadok s odkazom na prehľad – tam sa dajú odčítať hodiny všetkým naraz.
  const groups = groupSplitEquipment(gear.filter(mine))
  const hours = groups.filter((group) => group.items.some((item) => ['overdue', 'unknown', 'soon'].includes(hoursState(item, today, checkDays).state)))
  const service = groups.filter((group) => group.items.some((item) => ['overdue', 'soon'].includes(serviceState(item, today).state)))
  const linkOf = (items: Equipment[]) => (items.length === 1 ? `/equipment/${items[0].id}` : `/equipment/group?ids=${items.map((item) => item.id).join(',')}`)
  const nameOf = (items: Equipment[]) => (items[0].kind === 'cable' ? cableBaseName(items[0].name) : items[0].name)
  // Limity a revízie: jeden riadok na pravidlo a techniku, najhorší stav jej kusov.
  const STATE_ORDER = ['failed', 'overdue', 'unknown', 'soon', 'ok']
  const limitRows = Object.values(
    (maintenance.data ?? [])
      .filter((row) => needsAttention(row, rules.find((rule) => rule.id === row.ruleId)))
      .reduce<Record<string, MaintenanceDue[]>>((all, row) => {
        ;(all[`${row.ruleId}|${row.equipmentId}`] ??= []).push(row)
        return all
      }, {}),
  )
    .map((rows) => ({ rows, item: gear.find((item) => item.id === rows[0].equipmentId), rule: rules.find((rule) => rule.id === rows[0].ruleId)! }))
    .filter((entry): entry is typeof entry & { item: Equipment } => Boolean(entry.item) && mine(entry.item!))
    .map((entry) => ({ ...entry, worst: [...entry.rows].sort((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state))[0] }))
    .sort((a, b) => STATE_ORDER.indexOf(a.worst.state) - STATE_ORDER.indexOf(b.worst.state) || a.item.name.localeCompare(b.item.name, 'sk'))
  const someoneResponsible = responsibilities.some((r) => r.memberIds.length > 0)

  return (
    <>
      <PageHeader title={tx('Kontroly')} description={tx('Čo treba skontrolovať, odčítať a dať do servisu')} />
      <label className={canSeeAll ? 'mb-4 flex items-center gap-2 text-sm' : 'hidden'}>
        <input type="checkbox" className="size-4" checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} />{tx('Len to, za čo zodpovedám')}{!someoneResponsible && <span className="text-muted-foreground">{tx('(zodpovednosti nie sú nastavené – vidíte všetko)')}</span>}
      </label>

      {returnedCases.length > 0 && (
        <Section icon={<PackageCheck className="size-5 text-accent" aria-hidden />} title={tx('Vrátené z eventu – spočítať obsah')} count={returnedCases.length}>
          {returnedCases.map((item) => {
            const back = returns.get(item.id)!
            const event = events.data?.find((candidate) => candidate.id === back.eventId)
            return <Row key={item.id} to={`/cases/${item.id}`} title={caseTitle(item)} detail={tf('Vrátený {0}{1} – obsah ešte nikto neskontroloval', formatDate(back.checkedAt.slice(0, 10)), event ? ` z ${event.name}` : '')} late />
          })}
        </Section>
      )}

      {outside.length > 0 && (
        <Section icon={<Truck className="size-5 text-accent" aria-hidden />} title={tx('Ešte vonku – event skončil, nevrátené')} count={outside.reduce((total, group) => total + group.items.length, 0)}>
          {outside.map(({ event, items }) => (
            <Row
              key={event.id}
              to={`/events/${event.id}/pack`}
              title={tf('{0} (skončil {1})', event.name, formatDate(event.endsOn))}
              detail={items
                .map((mark) => (mark.caseId ? (cases.data.find((item) => item.id === mark.caseId) ? caseTitle(cases.data.find((item) => item.id === mark.caseId)!) : 'case') : (gear.find((item) => item.id === mark.equipmentId)?.name ?? 'technika')))
                .join(', ')}
              late
            />
          ))}
        </Section>
      )}

      <Section icon={<ClipboardCheck className="size-5 text-accent" aria-hidden />} title={tx('Cases a racky na kontrolu')} count={dueCases.length}>
        {dueCases.map((item) => (
          <Row key={item.id} to={`/cases/${item.id}`} title={caseTitle(item)} detail={item.lastCheck ? `Naposledy ${formatDate(item.lastCheck.checkedAt.slice(0, 10))} · ${item.lastCheck.checkedByName || tx('neznámy')}` : tx('Zatiaľ nekontrolované')} late />
        ))}
      </Section>

      <Section icon={<Gauge className="size-5 text-accent" aria-hidden />} title={tx('Odčítať prevádzkové hodiny')} count={hours.length}>
        {hours.map((group) => {
          const states = group.items.map((item) => hoursState(item, today, checkDays).state)
          const late = states.some((state) => state === 'overdue' || state === 'unknown')
          return (
            <Row
              key={group.key}
              to={linkOf(group.items)}
              title={nameOf(group.items)}
              detail={[group.items.length > 1 && `${group.items.length} častí – odčítať všetkým naraz`, states.includes('unknown') ? 'ešte neodčítané' : late ? 'po termíne' : 'do 30 dní'].filter(Boolean).join(' · ')}
              late={late}
            />
          )
        })}
      </Section>

      <Section icon={<Wrench className="size-5 text-accent" aria-hidden />} title={tx('Servis')} count={service.length}>
        {service.map((group) => {
          const late = group.items.some((item) => serviceState(item, today).state === 'overdue')
          return <Row key={group.key} to={linkOf(group.items)} title={nameOf(group.items)} detail={late ? tx('servis po termíne') : tx('servis do 30 dní')} late={late} />
        })}
      </Section>

      {rules.length > 0 && (
        <Section icon={<ShieldCheck className="size-5 text-accent" aria-hidden />} title={tx('Limity a revízie')} count={limitRows.length}>
          {limitRows.map(({ rows, item, rule, worst }) => (
            <Row
              key={`${rule.id}|${item.id}`}
              to={`/equipment/${item.id}`}
              title={`${rule.name}: ${item.name}`}
              detail={[rows.length > 1 && `${rows.length} ks`, rows.length === 1 && rows[0].unit !== null && `#${rows[0].unit}`, describeDue(worst, rule, formatDate, formatNumber)].filter(Boolean).join(' · ')}
              late={isLate(worst.state)}
            />
          ))}
        </Section>
      )}
    </>
  )
}
