import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { eventKeys, fetchEvents } from '@/features/events/api'
import { fetchCompanyIncome } from '@/features/events/income'
import { useIncidents } from '@/features/incidents/api'
import { useOffice } from '@/features/office/api'
import { fetchOrders, orderKeys } from '@/features/orders/api'
import { fetchPayments, payoutKeys } from '@/features/payouts/api'
import { useServiceRecords } from '@/features/service/useServiceRecords'
import { useTasks } from '@/features/tasks/useTasks'
import { formatMoney, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { yearReport } from './model'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec']

function Tile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}

/**
 * Ročná správa: eventy, ľudia, technika, servis, škody, úlohy a (s oprávnením report.money) peniaze.
 * Kto ju vidí a kto v nej vidí peniaze, nastaví admin v Oprávneniach.
 */
export function YearReportPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const money = can(company, 'report.money')
  const [year, setYear] = useState(todayIso().slice(0, 4))
  const members = useMembers(companyId)
  const events = useQuery({ queryKey: eventKeys.list(companyId), queryFn: () => fetchEvents(companyId), enabled: can(company, 'events.view') })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const service = useServiceRecords(companyId)
  const incidents = useIncidents(companyId)
  const tasks = useTasks(companyId)
  const { purchases: office } = useOffice(companyId)
  const orders = useQuery({ queryKey: orderKeys.list(companyId), queryFn: () => fetchOrders(companyId), enabled: money && can(company, 'orders.view'), retry: false })
  const income = useQuery({ queryKey: ['company', companyId, 'income'], queryFn: () => fetchCompanyIncome(companyId), enabled: money, retry: false })
  const payouts = useQuery({ queryKey: payoutKeys.list(companyId), queryFn: () => fetchPayments(companyId), enabled: money, retry: false })

  const report = yearReport({
    year,
    events: events.data,
    equipment: equipment.data,
    service: service.data,
    incidents: incidents.data,
    tasks: tasks.data,
    orders: money ? orders.data : undefined,
    office: money ? office.data : undefined,
    income: money ? income.data : undefined,
    payouts: money ? payouts.data : undefined,
  })
  const firstYear = Math.min(Number(todayIso().slice(0, 4)), ...(events.data ?? []).map((event) => Number(event.startsOn.slice(0, 4))))
  const years = Array.from({ length: Number(todayIso().slice(0, 4)) - firstYear + 1 }, (_, index) => String(Number(todayIso().slice(0, 4)) - index))
  const maxMonth = Math.max(1, ...(report.events?.months.map((month) => month.events) ?? [0]))
  const spent = (report.money.orders ?? 0) + (report.money.office ?? 0) + (report.money.payouts ?? 0)

  return (
    <>
      <PageHeader
        title={`Ročná správa ${year}`}
        description={company.companyName}
        action={
          <div className="flex gap-2 print:hidden">
            <SelectField label="Rok" hideLabel className="w-28" value={year} onChange={(e) => setYear(e.target.value)}>
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectField>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              Tlačiť
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        {report.events && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Eventy</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile label="Eventov" value={report.events.count} />
              <Tile label="Dní na akciách" value={report.events.days} />
              <Tile label="Ľudí v posádkach" value={report.events.crew.length} />
              <Tile label="Klientov" value={report.events.clients.length} />
            </div>
            <div className="mt-3 flex h-32 items-end gap-1 rounded-xl border bg-surface p-3" aria-label="Eventy po mesiacoch">
              {report.events.months.map((month) => (
                <div key={month.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs">{month.events || ''}</span>
                  <span className="w-full rounded-t bg-accent" style={{ height: `${(month.events / maxMonth) * 70}px` }} />
                  <span className="text-[10px] text-muted-foreground">{MONTHS[month.month - 1]}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border bg-surface p-4">
                <p className="mb-2 text-sm text-muted-foreground">Kto bol na koľkých akciách</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {report.events.crew.slice(0, 20).map((person) => (
                    <li key={person.key} className="flex justify-between gap-3">
                      <span>{(person.memberId && memberName(members.data, person.memberId)) || person.name || 'neznámy'}</span>
                      <span className="text-muted-foreground">
                        {person.events}× · {person.days} d
                      </span>
                    </li>
                  ))}
                  {report.events.crew.length === 0 && <li className="text-muted-foreground">Bez posádok.</li>}
                </ul>
              </div>
              <div className="rounded-xl border bg-surface p-4">
                <p className="mb-2 text-sm text-muted-foreground">Najčastejší klienti</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {report.events.clients.map(([client, count]) => (
                    <li key={client} className="flex justify-between gap-3">
                      <span>{client}</span>
                      <span className="text-muted-foreground">{count}×</span>
                    </li>
                  ))}
                  {report.events.clients.length === 0 && <li className="text-muted-foreground">Bez zapísaných klientov.</li>}
                </ul>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Technika, servis a škody</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {report.equipment && <Tile label="Kúpenej techniky" value={`${report.equipment.bought} položiek`} />}
            {report.service && <Tile label="Servisov" value={`${report.service.count}${money ? ` · ${formatMoney(report.service.cost, 'EUR')}` : ''}`} />}
            {report.incidents && <Tile label="Škody / úrazy" value={`${report.incidents.damages} / ${report.incidents.injuries}`} />}
            {report.tasks && <Tile label="Hotových úloh" value={report.tasks.done} />}
          </div>
        </section>

        {money && (
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Peniaze</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {report.money.income !== undefined && <Tile label="Príjmy z akcií" value={formatMoney(report.money.income, 'EUR')} />}
              {report.money.orders !== undefined && <Tile label="Nákupy techniky" value={formatMoney(report.money.orders, 'EUR')} />}
              {report.money.office !== undefined && <Tile label="Kancelária" value={formatMoney(report.money.office, 'EUR')} />}
              {report.money.payouts !== undefined && <Tile label="Odmeny ľuďom" value={formatMoney(report.money.payouts, 'EUR')} />}
              {report.money.income !== undefined && <Tile label="Príjmy − výdavky" value={formatMoney(report.money.income - spent, 'EUR')} />}
              {report.incidents && <Tile label="Náklady na škody" value={formatMoney(report.incidents.cost, 'EUR')} />}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Nákupy len v eurách a len tie „pre nás“. Výdavky zahŕňajú nákupy techniky, kanceláriu a odmeny.</p>
          </section>
        )}
        {!money && <p className="text-sm text-muted-foreground">Peniaze v ročnej správe vidí len ten, komu ich admin povolí (Oprávnenia → Ročná správa).</p>}
      </div>
    </>
  )
}
