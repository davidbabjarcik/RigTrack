import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { OrdersTabs } from '@/components/layout/ModuleTabs'
import { SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { fetchOrders, orderKeys } from './api'
import { formatTotals, orderStats } from './model'

const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december']

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <span className="block h-full rounded-full bg-accent" style={{ width: `${max > 0 ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </span>
  )
}

const main = (totals: Record<string, number>) => totals.EUR ?? Object.values(totals)[0] ?? 0

/** Štatistiky objednávok: koľko sme minuli, kedy, u koho a kto objednával. */
export function OrderStatsPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const orders = useQuery({ queryKey: orderKeys.list(companyId), queryFn: () => fetchOrders(companyId) })
  const members = useMembers(companyId)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const all = orders.data ?? []
  const years = [...new Set([String(new Date().getFullYear()), ...all.map((order) => order.orderedAt.slice(0, 4))])].sort().reverse()
  const stats = orderStats(all.filter((order) => !year || order.orderedAt.startsWith(year)))
  const monthMax = Math.max(0, ...stats.byMonth.map((row) => main(row.totals)))
  const supplierMax = Math.max(0, ...stats.bySupplier.map((row) => main(row.totals)))
  const ordererMax = Math.max(0, ...stats.byOrderer.map((row) => main(row.totals)))

  return (
    <>
      <Link to="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Objednávky
      </Link>
      <OrdersTabs />
      <PageHeader title="Štatistiky objednávok" description="Nákupy pre nás; nákupy pre iných sa rátajú zvlášť." />
      {orders.isPending ? (
        <LoadingBlock />
      ) : orders.isError ? (
        <ErrorBlock message="Objednávky sa nepodarilo načítať." onRetry={() => void orders.refetch()} />
      ) : (
        <div className="flex flex-col gap-6">
          <SelectField label="Obdobie" className="w-48" value={year} onChange={(e) => setYear(e.target.value)}>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
            <option value="">Celé obdobie</option>
          </SelectField>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-surface p-4">
              <p className="text-sm text-muted-foreground">Minuté pre nás</p>
              <p className="mt-1 text-xl font-semibold">{formatTotals(stats.totals)}</p>
            </div>
            <div className="rounded-xl border bg-surface p-4">
              <p className="text-sm text-muted-foreground">Objednávok</p>
              <p className="mt-1 text-xl font-semibold">{stats.count}</p>
            </div>
            <div className="rounded-xl border bg-surface p-4">
              <p className="text-sm text-muted-foreground">Nákupy nie pre nás</p>
              <p className="mt-1 text-xl font-semibold">{formatTotals(stats.forOthers)}</p>
            </div>
          </div>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Po mesiacoch</h2>
            {stats.byMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground">V tomto období nič.</p>
            ) : (
              <ul className="divide-y rounded-xl border bg-surface">
                {stats.byMonth.map((row) => (
                  <li key={row.month} className="px-4 py-2.5">
                    <span className="flex justify-between gap-3 text-sm">
                      <span>
                        {MONTHS[Number(row.month.slice(5, 7)) - 1]} {row.month.slice(0, 4)} <span className="text-muted-foreground">· {row.count}×</span>
                      </span>
                      <span className="font-medium">{formatTotals(row.totals)}</span>
                    </span>
                    <Bar value={main(row.totals)} max={monthMax} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Dodávatelia</h2>
              <ul className="divide-y rounded-xl border bg-surface">
                {stats.bySupplier.slice(0, 15).map((row) => (
                  <li key={row.name} className="px-4 py-2.5">
                    <span className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {row.name} <span className="text-muted-foreground">· {row.count}×</span>
                      </span>
                      <span className="shrink-0 font-medium">{formatTotals(row.totals)}</span>
                    </span>
                    <Bar value={main(row.totals)} max={supplierMax} />
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">Kto objednával</h2>
              <ul className="divide-y rounded-xl border bg-surface">
                {stats.byOrderer.map((row) => (
                  <li key={row.id ?? 'unknown'} className="px-4 py-2.5">
                    <span className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {(row.id && memberName(members.data, row.id)) || 'neuvedené'} <span className="text-muted-foreground">· {row.count}×</span>
                      </span>
                      <span className="shrink-0 font-medium">{formatTotals(row.totals)}</span>
                    </span>
                    <Bar value={main(row.totals)} max={ordererMax} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  )
}
