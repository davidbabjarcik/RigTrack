import { useQuery } from '@tanstack/react-query'
import { ChevronRight, ClipboardCheck, Gauge, Wrench } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/features/auth/auth-context'
import { caseTitle, needsCheck, type Case } from '@/features/cases/model'
import { useCases } from '@/features/cases/useCases'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { cableBaseName, groupSplitEquipment, hoursState, serviceState, type Equipment } from '@/features/equipment/model'
import { concernsMe } from '@/features/notifications/model'
import { useResponsibilities, type Responsibility } from '@/features/responsibilities/api'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { useCheckLevels } from './levels'

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
      {count === 0 ? <p className="rounded-xl border border-dashed bg-surface px-4 py-6 text-center text-sm text-muted-foreground">Nič – všetko je v poriadku.</p> : <ul className="divide-y overflow-hidden rounded-xl border bg-surface">{children}</ul>}
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
  const [onlyMine, setOnlyMine] = useState(true)
  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const responsibilities = useResponsibilities(companyId).data ?? []
  const checkDays = useCheckLevels(companyId).days
  const today = todayIso()
  const [now] = useState(() => Date.now())

  if (cases.isPending || equipment.isPending) return <LoadingBlock />
  if (cases.isError || equipment.isError) return <ErrorBlock message="Údaje sa nepodarilo načítať." onRetry={() => void Promise.all([cases.refetch(), equipment.refetch()])} />

  const gear = (equipment.data ?? []).filter((item) => item.status !== 'retired')
  const mine = (item: Equipment) => !onlyMine || concernsMe(item, responsibilities, userId)
  const dueCases = cases.data
    .filter((item) => needsCheck(item, now, checkDays))
    .filter((item) => !onlyMine || caseConcernsMe(item, gear.filter((part) => part.caseId === item.id), responsibilities, userId))
  // Rozdelená technika (napr. 8× Beam v cases) je jeden riadok s odkazom na prehľad – tam sa dajú odčítať hodiny všetkým naraz.
  const groups = groupSplitEquipment(gear.filter(mine))
  const hours = groups.filter((group) => group.items.some((item) => ['overdue', 'unknown', 'soon'].includes(hoursState(item, today, checkDays).state)))
  const service = groups.filter((group) => group.items.some((item) => ['overdue', 'soon'].includes(serviceState(item, today).state)))
  const linkOf = (items: Equipment[]) => (items.length === 1 ? `/equipment/${items[0].id}` : `/equipment/group?ids=${items.map((item) => item.id).join(',')}`)
  const nameOf = (items: Equipment[]) => (items[0].kind === 'cable' ? cableBaseName(items[0].name) : items[0].name)
  const someoneResponsible = responsibilities.some((r) => r.memberIds.length > 0)

  return (
    <>
      <PageHeader title="Kontroly" description="Čo treba skontrolovať, odčítať a dať do servisu" />
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={onlyMine} onChange={(event) => setOnlyMine(event.target.checked)} />
        Len to, za čo zodpovedám
        {!someoneResponsible && <span className="text-muted-foreground">(zodpovednosti nie sú nastavené – vidíte všetko)</span>}
      </label>

      <Section icon={<ClipboardCheck className="size-5 text-accent" aria-hidden />} title="Cases a racky na kontrolu" count={dueCases.length}>
        {dueCases.map((item) => (
          <Row key={item.id} to={`/cases/${item.id}`} title={caseTitle(item)} detail={item.lastCheck ? `Naposledy ${formatDate(item.lastCheck.checkedAt.slice(0, 10))} · ${item.lastCheck.checkedByName || 'neznámy'}` : 'Zatiaľ nekontrolované'} late />
        ))}
      </Section>

      <Section icon={<Gauge className="size-5 text-accent" aria-hidden />} title="Odčítať prevádzkové hodiny" count={hours.length}>
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

      <Section icon={<Wrench className="size-5 text-accent" aria-hidden />} title="Servis" count={service.length}>
        {service.map((group) => {
          const late = group.items.some((item) => serviceState(item, today).state === 'overdue')
          return <Row key={group.key} to={linkOf(group.items)} title={nameOf(group.items)} detail={late ? 'servis po termíne' : 'servis do 30 dní'} late={late} />
        })}
      </Section>
    </>
  )
}
