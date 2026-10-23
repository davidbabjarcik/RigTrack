import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Check, FileChartColumn, SlidersHorizontal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { formatNumber } from '@/features/equipment/model'
import { useEquipmentLookups } from '@/features/equipment/useEquipmentLookups'
import { valueSummary } from '@/features/equipment/value'
import { dutyKeys, fetchAllDuties, fetchWorkLogs, useDutyTypes } from '@/features/duties/api'
import { dutyRanking, hoursByPerson } from '@/features/duties/model'
import { isoToLocal, workedMinutes } from '@/features/attendance/model'
import { fetchSessions, workKeys } from '@/features/attendance/workApi'
import { useLoans } from '@/features/loans/useLoans'
import { useServiceRecords } from '@/features/service/useServiceRecords'
import { fetchVehicleCosts, vehicleKeys } from '@/features/vehicles/api'
import { useVehicles } from '@/features/vehicles/useVehicles'
import { formatMoney, todayIso } from '@/lib/format'
import { addDays } from '@/features/calendar/model'
import { useAuth } from '@/features/auth/auth-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { bothBases, fetchCompanyIncome, METHOD_LABELS, PAYMENT_METHODS } from '@/features/events/income'
import { useEvents } from '@/features/events/useEvents'
import { fetchPayments, payoutKeys } from '@/features/payouts/api'
import { can } from '@/lib/permissions'
import { SelectField } from '@/components/ui/field'
import { DonutChart } from './DonutChart'
import { byMonth, byRole, byYear, inYear, moneyYears, sum } from './money'
import { buildStats, type Ranked } from './model'
import {
  DEFAULT_ORDER,
  loadHidden,
  loadOrder,
  move,
  saveHidden,
  saveOrder,
  STAT_SECTIONS,
  STAT_WIDGETS,
  type StatSectionId,
  type StatsOrder,
  type StatWidgetId,
} from './widgets'

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Poradie s pruhmi: jedna farba pre veľkosť, hodnota vždy vypísaná číslom vedľa pruhu,
 * takže sa dá čítať aj bez neho.
 */
function Ranking({ title, rows, format, empty }: { title: string; rows: Ranked[]; format: (value: number) => string; empty: string }) {
  const max = Math.max(...rows.map((row) => row.value), 0)
  return (
    <div className="rounded-xl border bg-surface p-4">
      <h3 className="mb-3 font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{row.label}</span>
                <span className="shrink-0 font-medium tabular-nums">{format(row.value)}</span>
              </div>
              <div className="mt-1 h-2 rounded-r bg-muted" aria-hidden>
                <div className="h-2 min-w-1 rounded-r bg-accent" style={{ width: `${max === 0 ? 0 : (row.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Dve malé šípky na posun položky hore a dole. */
function MoveButtons({ label, canUp, canDown, onMove }: { label: string; canUp: boolean; canDown: boolean; onMove: (direction: -1 | 1) => void }) {
  const button = 'flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30'
  return (
    <span className="flex shrink-0">
      <button type="button" className={button} disabled={!canUp} aria-label={`Posunúť vyššie: ${label}`} onClick={() => onMove(-1)}>
        <ArrowUp className="size-4" aria-hidden />
      </button>
      <button type="button" className={button} disabled={!canDown} aria-label={`Posunúť nižšie: ${label}`} onClick={() => onMove(1)}>
        <ArrowDown className="size-4" aria-hidden />
      </button>
    </span>
  )
}

const count = (value: number) => String(value)
const daysLabel = (value: number) => `${value} ${value === 1 ? 'deň' : value <= 4 ? 'dni' : 'dní'}`
const timesLabel = (value: number) => `${value}×`
const money = (value: number) => formatMoney(value, 'EUR')

export function StatsPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session!.user.id
  const [year, setYear] = useState(() => todayIso().slice(0, 4))
  const today = todayIso()
  const [editing, setEditing] = useState(false)
  const [hidden, setHidden] = useState(() => loadHidden(companyId))
  const [order, setOrder] = useState(() => loadOrder(companyId))
  const reorder = (next: StatsOrder) => {
    setOrder(next)
    saveOrder(companyId, next)
  }
  const moveSection = (id: StatSectionId, direction: -1 | 1) => reorder({ ...order, sections: move(order.sections, id, direction) })
  const sectionOf = (id: StatWidgetId) => STAT_WIDGETS.find((widget) => widget.id === id)!.section
  const moveWidget = (id: StatWidgetId, direction: -1 | 1, visible: Set<StatWidgetId>) =>
    reorder({ ...order, widgets: move(order.widgets, id, direction, (other) => visible.has(other) && sectionOf(other) === sectionOf(id)) })
  const toggle = (id: StatWidgetId) => {
    const next = hidden.includes(id) ? hidden.filter((other) => other !== id) : [...hidden, id]
    setHidden(next)
    saveHidden(companyId, next)
  }
  const showAll = () => {
    setHidden([])
    saveHidden(companyId, [])
  }

  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const loans = useLoans(companyId)
  const service = useServiceRecords(companyId)
  const vehicles = useVehicles(companyId)
  const vehicleCosts = useQuery({ queryKey: vehicleKeys.costs(companyId), queryFn: () => fetchVehicleCosts(companyId) })
  const canIncome = can(company, 'payouts.manage')
  // Odmeny: databáza vráti všetky (s oprávnením) alebo len moje.
  const payments = useQuery({ queryKey: payoutKeys.list(companyId), queryFn: () => fetchPayments(companyId) })
  const income = useQuery({ queryKey: ['company', companyId, 'income'], queryFn: () => fetchCompanyIncome(companyId), enabled: canIncome })
  const events = useEvents(companyId)
  const members = useMembers(companyId)
  const { categories } = useEquipmentLookups(companyId)
  // Ľudia: výkazy času a činnosti pri eventoch (bez migrácie 0077 sa činnosti len neukážu).
  const workLogs = useQuery({ queryKey: dutyKeys.workLogs(companyId), queryFn: () => fetchWorkLogs(companyId), retry: false })
  const dutyTypes = useDutyTypes(companyId)
  const duties = useQuery({ queryKey: dutyKeys.all(companyId), queryFn: () => fetchAllDuties(companyId), retry: false })
  const sessions = useQuery({ queryKey: [...workKeys.sessions(companyId), 'all'], queryFn: () => fetchSessions(companyId, '2000-01-01T00:00:00Z'), retry: false })
  const sources = [equipment, loans, service, vehicles, vehicleCosts, payments, events]

  if (sources.some((source) => source.isPending)) return <LoadingBlock />
  if (sources.some((source) => source.isError)) {
    return <ErrorBlock message="Štatistiky sa nepodarilo načítať." onRetry={() => sources.forEach((source) => void source.refetch())} />
  }

  const stats = buildStats(
    {
      equipment: equipment.data ?? [],
      loans: loans.data ?? [],
      service: service.data ?? [],
      vehicles: vehicles.data ?? [],
      vehicleCosts: vehicleCosts.data ?? [],
    },
    today,
    addDays(today, -365),
  )

  const value = valueSummary(equipment.data ?? [], (item) => categories.find((category) => category.id === item.categoryId)?.name ?? 'Bez kategórie')

  // Peniaze vo zvolenom roku.
  const allPayments = payments.data ?? []
  const yearPayments = allPayments.filter((payment) => inYear(payment.happenedOn, year))
  const myPayments = yearPayments.filter((payment) => payment.memberId === userId)
  const yearIncome = (income.data ?? []).filter((payment) => inYear(payment.receivedOn, year))
  const incomeGross = sum(yearIncome.map((payment) => ({ amount: bothBases(payment).gross ?? payment.amount })))
  const incomeNet = sum(yearIncome.map((payment) => ({ amount: bothBases(payment).net ?? payment.amount })))
  const payoutTotal = sum(yearPayments)
  const payoutPaid = sum(yearPayments.filter((payment) => payment.paidAt))
  const years = moneyYears([...allPayments.map((payment) => payment.happenedOn), ...(income.data ?? []).map((payment) => payment.receivedOn), todayIso()])
  const amounts = (list: { happenedOn: string; amount: number }[]) => list.map((payment) => ({ date: payment.happenedOn, amount: payment.amount }))
  const memberTotals = new Map<string, number>()
  for (const payment of yearPayments) memberTotals.set(payment.memberId, (memberTotals.get(payment.memberId) ?? 0) + payment.amount)
  const byMember: Ranked[] = [...memberTotals]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, value]) => ({ id, label: memberName(members.data, id) || 'Bývalý člen', value: Math.round(value * 100) / 100 }))
  const byMethod: Ranked[] = PAYMENT_METHODS.map((method) => ({
    id: method,
    label: METHOD_LABELS[method],
    value: sum(yearIncome.filter((payment) => payment.method === method).map((payment) => ({ amount: bothBases(payment).gross ?? payment.amount }))),
  })).filter((row) => row.value > 0)
  const period = year === 'all' ? 'spolu' : `v roku ${year}`
  const eventStart = new Map((events.data ?? []).map((event) => [event.id, event.startsOn]))
  const personName = (userId: string) => memberName(members.data, userId) || 'Bývalý člen'
  const hours = hoursByPerson(
    workLogs.data ?? [],
    year,
    personName,
    10,
    (sessions.data ?? []).filter((item) => item.endedAt).map((item) => ({ userId: item.userId, date: isoToLocal(item.startedAt).date, minutes: workedMinutes(item, Date.parse(item.endedAt!)) })),
  )
  const dutyRankings = (dutyTypes.data ?? []).map((type) => ({
    type,
    rows: dutyRanking(duties.data ?? [], type.id, (id) => eventStart.get(id), year, (duty) => (duty.memberId ? personName(duty.memberId) : duty.personName.trim())),
  }))

  // Jeden zápis pre každý widget zo zoznamu STAT_WIDGETS; chýbajúci by neprešiel kontrolou typov.
  const render: Record<StatWidgetId, ReactNode> = {
    'money.income': <Tile label="Príjmy z akcií (s DPH)" value={money(incomeGross)} hint={`bez DPH ${money(incomeNet)} · ${period}`} />,
    'money.payouts': <Tile label="Odmeny členom" value={money(payoutTotal)} hint={`vyplatené ${money(payoutPaid)} · ${period}`} />,
    'money.balance': <Tile label="Zostáva po odmenách" value={money(Math.round((incomeNet - payoutTotal) * 100) / 100)} hint="príjmy bez DPH mínus odmeny" />,
    'money.mine': <Tile label="Moje zárobky" value={money(sum(myPayments))} hint={`vyplatené ${money(sum(myPayments.filter((payment) => payment.paidAt)))} · ${period}`} />,
    'money.incomeByMonth': (
      <Ranking title="Príjmy firmy podľa mesiacov (s DPH)" rows={byMonth(yearIncome.map((payment) => ({ date: payment.receivedOn, amount: bothBases(payment).gross ?? payment.amount })))} format={money} empty="Žiadne zapísané príjmy z akcií." />
    ),
    'money.incomeByMethod': <DonutChart title="Príjmy podľa spôsobu platby" rows={byMethod} format={money} empty="Žiadne zapísané príjmy z akcií." />,
    'money.payoutsByMember': <DonutChart title="Odmeny podľa členov" rows={byMember} format={money} empty="Žiadne zapísané odmeny." />,
    'money.payoutsByRole': <DonutChart title="Odmeny podľa role na evente" rows={byRole(yearPayments, events.data ?? [])} format={money} empty="Žiadne zapísané odmeny." />,
    'money.mineByRole': <DonutChart title="Moje zárobky podľa role" rows={byRole(myPayments, events.data ?? [])} format={money} empty="Zatiaľ nemáte zapísané žiadne odmeny." />,
    'money.mineByMonth': <Ranking title="Moje najlepšie mesiace" rows={byMonth(amounts(myPayments))} format={money} empty="Zatiaľ nemáte zapísané žiadne odmeny." />,
    'money.mineByYear': (
      <Ranking title="Moje zárobky podľa rokov" rows={byYear(amounts(allPayments.filter((payment) => payment.memberId === userId)))} format={money} empty="Zatiaľ nemáte zapísané žiadne odmeny." />
    ),
    'equipment.items': <Tile label="Položiek" value={String(stats.equipment.items)} hint={`${stats.equipment.pieces} kusov`} />,
    'equipment.availability': (
      <Tile label="Dostupnosť" value={`${Math.round(stats.equipment.availability * 100)} %`} hint="kusov pripravených na výdaj" />
    ),
    'equipment.value': (
      <Tile
        label="Hodnota techniky"
        value={money(value.total)}
        hint={`podľa nákupných cien${value.unpriced > 0 ? ` · ${value.unpriced} položiek bez ceny` : ''}`}
      />
    ),
    'equipment.valueByCategory': (
      <Ranking
        title="Hodnota techniky podľa kategórií"
        rows={value.groups.map((group) => ({ id: group.name, label: group.name, value: group.value }))}
        format={money}
        empty="Technika zatiaľ nemá zadanú nákupnú cenu (Technika → Upraviť → Nákup)."
      />
    ),
    'equipment.packed': <Tile label="V cases" value={String(stats.equipment.packed)} hint={`${stats.equipment.unpacked} mimo cases`} />,
    'loans.open': (
      <Tile
        label="Otvorené výpožičky"
        value={String(stats.loans.open)}
        hint={stats.loans.overdue > 0 ? `${stats.loans.overdue} po termíne` : 'žiadna po termíne'}
      />
    ),
    'equipment.byStatus': <Ranking title="Technika podľa stavu" rows={stats.equipment.byStatus} format={count} empty="Zatiaľ žiadna technika." />,
    'loans.mostLent': (
      <Ranking
        title="Najviac požičiavaná technika (posledných 12 mesiacov)"
        rows={stats.loans.mostLent}
        format={daysLabel}
        empty="Zatiaľ sa nič nepožičalo."
      />
    ),
    'service.records': <Tile label="Servisné záznamy" value={String(stats.service.records)} hint={`${stats.service.open} rozpracovaných`} />,
    'service.hours': <Tile label="Odpracované hodiny" value={`${formatNumber(stats.service.hours)} h`} />,
    'service.cost': <Tile label="Servisné náklady" value={money(stats.service.cost)} />,
    'service.byKind': <Ranking title="Záznamy podľa typu" rows={stats.service.byKind} format={count} empty="Zatiaľ žiadne servisné záznamy." />,
    'service.costliest': <Ranking title="Najdrahšia technika na servis" rows={stats.service.costliest} format={money} empty="Žiadne zapísané náklady." />,
    'vehicles.count': <Tile label="Aktívne vozidlá" value={String(stats.vehicles.count)} />,
    'vehicles.due': <Tile label="Termíny na vybavenie" value={String(stats.vehicles.due)} hint="po termíne alebo do 30 dní" />,
    'people.hours': (
      <Ranking title={`Odpracované hodiny ${period} (eventy, firma, doma)`} rows={hours} format={(value) => `${formatNumber(value)} h`} empty="Žiadne zapísané výkazy času." />
    ),
    'people.duties':
      dutyRankings.length === 0 ? (
        <Ranking title="Kto čo robil najviac" rows={[]} format={count} empty="Činnosti si nastavíte v Nastaveniach → Pripomienky (nakladanie, kontrola hliníka…)." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {dutyRankings.map(({ type, rows }) => (
            <Ranking key={type.id} title={`${type.name} – ${period}`} rows={rows} format={timesLabel} empty="Zatiaľ nikto." />
          ))}
        </div>
      ),
    'vehicles.costs': <Ranking title="Náklady na prevádzku podľa vozidla" rows={stats.vehicles.costs} format={money} empty="Žiadne zapísané náklady." />,
  }
  // Widgety, na ktoré člen nemá oprávnenie, sa ani neponúkajú.
  const allowed = STAT_WIDGETS.filter((widget) => !('needs' in widget) || widget.needs.every((permission) => can(company, permission)))
  const position = (id: StatWidgetId) => order.widgets.indexOf(id)
  const sortedAllowed = [...allowed].sort((a, b) => position(a.id) - position(b.id))
  const allowedIds = new Set<StatWidgetId>(allowed.map((widget) => widget.id))
  const sections = order.sections.map((id) => STAT_SECTIONS.find((section) => section.id === id)!)
  const shown = sortedAllowed.filter((widget) => !hidden.includes(widget.id))

  return (
    <>
      <PageHeader
        title="Štatistiky"
        description="Prehľad z údajov, ktoré sú v aplikácii zapísané"
        action={
          <div className="flex flex-wrap justify-end gap-2">
            {can(company, 'report.view') && (
              <LinkButton to="/report" variant="outline">
                <FileChartColumn className="size-4" aria-hidden />
                Ročná správa
              </LinkButton>
            )}
            <Button variant="outline" onClick={() => setEditing(!editing)}>
              {editing ? <Check className="size-4" aria-hidden /> : <SlidersHorizontal className="size-4" aria-hidden />}
              {editing ? 'Hotovo' : 'Upraviť'}
            </Button>
          </div>
        }
      />

      {editing && (
        <section aria-labelledby="stats-edit-heading" className="mb-8 rounded-xl border bg-surface p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="stats-edit-heading" className="font-medium">
              Čo chcem vidieť
            </h2>
            <span className="flex gap-3">
              {hidden.length > 0 && (
                <button type="button" className="text-sm text-accent hover:underline" onClick={showAll}>
                  Zobraziť všetko
                </button>
              )}
              <button type="button" className="text-sm text-accent hover:underline" onClick={() => reorder(DEFAULT_ORDER)}>
                Pôvodné poradie
              </button>
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sections.map((section, sectionIndex) => (
              <fieldset key={section.id} className="rounded-lg border p-3">
                <legend className="flex items-center gap-1 px-1 text-sm font-medium">
                  {section.label}
                  <MoveButtons
                    label={section.label}
                    canUp={sectionIndex > 0}
                    canDown={sectionIndex < sections.length - 1}
                    onMove={(direction) => moveSection(section.id, direction)}
                  />
                </legend>
                <div className="flex flex-col gap-1">
                  {sortedAllowed
                    .filter((widget) => widget.section === section.id)
                    .map((widget, index, peers) => (
                      <div key={widget.id} className="flex items-start gap-1">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 py-1 text-sm">
                          <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={!hidden.includes(widget.id)} onChange={() => toggle(widget.id)} />
                          {widget.label}
                        </label>
                        <MoveButtons
                          label={widget.label}
                          canUp={index > 0}
                          canDown={index < peers.length - 1}
                          onMove={(direction) => moveWidget(widget.id, direction, allowedIds)}
                        />
                      </div>
                    ))}
                </div>
              </fieldset>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Šípkami zmeníte poradie sekcií aj štatistík v nich. Výber a poradie sa pamätajú v tomto prehliadači a platia len pre vás.</p>
        </section>
      )}

      {shown.length === 0 && (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">Všetky štatistiky sú skryté</p>
          <button type="button" className="mt-2 text-sm text-accent hover:underline" onClick={showAll}>
            Zobraziť všetko
          </button>
        </div>
      )}

      {sections.map((section) => {
        const tiles = shown.filter((widget) => widget.section === section.id && widget.kind === 'tile')
        const rankings = shown.filter((widget) => widget.section === section.id && widget.kind !== 'tile')
        if (tiles.length + rankings.length === 0) return null
        return (
          <Section key={section.id} title={section.label}>
            {section.id === 'money' && (
              <SelectField label="Rok" hideLabel className="mb-3 w-40" value={year} onChange={(event) => setYear(event.target.value)}>
                {years.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value="all">Všetky roky</option>
              </SelectField>
            )}
            {tiles.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {tiles.map((widget) => (
                  <div key={widget.id} className="contents">
                    {render[widget.id]}
                  </div>
                ))}
              </div>
            )}
            {rankings.length > 0 && (
              <div className={rankings.length > 1 ? 'grid gap-3 lg:grid-cols-2' : undefined}>
                {rankings.map((widget) => (
                  <div key={widget.id} className="contents">
                    {render[widget.id]}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )
      })}
    </>
  )
}
