import { useState, type ReactNode } from 'react'
import type { Membership } from '@/features/companies/company-context'
import { formatMoney, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { statsByCompany, summarize, useMyStats, type MyStatsFilter, type Ranked } from './myStats'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec']
const MONTH_NAMES = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december']
const METRICS = [
  { id: 'events', label: 'Akcie' },
  { id: 'hours', label: 'Hodiny' },
  { id: 'earned', label: 'Odmeny' },
] as const
type Metric = (typeof METRICS)[number]['id']

const decimal = (value: number) => value.toLocaleString('sk-SK', { maximumFractionDigits: 1 })
const money = (value: number) => formatMoney(Math.round(value * 100) / 100, 'EUR')
const selectClass = 'h-10 rounded-lg border bg-background px-3 text-sm'

/** Moje čísla vo všetkých firmách s filtrom (firma, rok, mesiac): akcie, hodiny, odmeny, jazdy, činnosti, klienti. */
export function MyStatsCard({ userId, memberships }: { userId: string; memberships: Membership[] }) {
  const stats = useMyStats(userId)
  const thisYear = todayIso().slice(0, 4)
  const [filter, setFilter] = useState<MyStatsFilter>({ companyId: '', year: thisYear, month: '' })
  const [metric, setMetric] = useState<Metric>('events')
  if (stats.isPending) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Načítavam…</p>
  if (stats.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Štatistiky sa nepodarilo načítať.</p>

  const data = stats.data
  const summary = summarize(data, filter)
  const period = filter.year ? (filter.month ? `${filter.year}-${filter.month}` : filter.year) : ''
  const periodLabel = !filter.year ? 'spolu' : filter.month ? `${MONTH_NAMES[Number(filter.month) - 1]} ${filter.year}` : filter.year
  const companyIds = filter.companyId ? [filter.companyId] : memberships.map((item) => item.companyId)
  const rows = statsByCompany(companyIds, data.events, data.payments, data.minutes, period)
  const years = [...new Set([thisYear, ...data.events.map((item) => item.startsOn.slice(0, 4)), ...data.payments.map((item) => item.date.slice(0, 4))])].sort().reverse()
  const nameOf = (companyId: string) => memberships.find((item) => item.companyId === companyId)?.companyName ?? 'firma'
  const hoursTotal = summary.hoursEvent + summary.hoursCompany + summary.hoursHome
  const set = (patch: Partial<MyStatsFilter>) => setFilter({ ...filter, ...patch })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-surface p-3">
        <select aria-label="Firma" className={selectClass} value={filter.companyId} onChange={(e) => set({ companyId: e.target.value })}>
          <option value="">Všetky firmy</option>
          {memberships.map((item) => (
            <option key={item.companyId} value={item.companyId}>
              {item.companyName}
            </option>
          ))}
        </select>
        <select aria-label="Rok" className={selectClass} value={filter.year} onChange={(e) => set({ year: e.target.value, month: e.target.value ? filter.month : '' })}>
          {years.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
          <option value="">Všetky roky</option>
        </select>
        <select aria-label="Mesiac" className={selectClass} disabled={!filter.year} value={filter.month} onChange={(e) => set({ month: e.target.value })}>
          <option value="">Celý rok</option>
          {MONTH_NAMES.map((name, index) => (
            <option key={name} value={String(index + 1).padStart(2, '0')}>
              {name}
            </option>
          ))}
        </select>
        <p className="ml-auto text-xs text-muted-foreground">Len vaše údaje – eventy, dochádzka, jazdy a odmeny.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Akcie" value={String(summary.events)} hint={`${summary.days} ${summary.days === 1 ? 'deň' : summary.days >= 2 && summary.days <= 4 ? 'dni' : 'dní'} na akciách`} />
        <Tile
          label="Odpracované"
          value={`${decimal(hoursTotal)} h`}
          hint={[summary.hoursEvent && `eventy ${decimal(summary.hoursEvent)} h`, summary.hoursCompany && `firma ${decimal(summary.hoursCompany)} h`, summary.hoursHome && `doma ${decimal(summary.hoursHome)} h`].filter(Boolean).join(' · ') || 'bez záznamov'}
        />
        <Tile label="Odmeny" value={money(summary.earned)} hint={summary.events > 0 ? `≈ ${money(summary.perEvent)} na akciu` : '—'} />
        <Tile label="Jazdy" value={`${decimal(summary.km)} km`} hint={`${summary.drives} ${summary.drives === 1 ? 'jazda' : summary.drives >= 2 && summary.drives <= 4 ? 'jazdy' : 'jázd'} za volantom`} />
      </div>

      {summary.months.length > 0 && !filter.month && (
        <section className="rounded-xl border bg-surface p-4" aria-labelledby="months-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 id="months-heading" className="font-medium">
              Po mesiacoch {filter.year}
            </h3>
            <div role="tablist" aria-label="Čo ukázať" className="flex gap-1 rounded-lg bg-muted p-1">
              {METRICS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={metric === item.id}
                  onClick={() => setMetric(item.id)}
                  className={cn('rounded-md px-3 py-1 text-xs font-medium', metric === item.id ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <MonthBars
            months={summary.months.map((item) => ({ month: item.month, value: item[metric] }))}
            format={(value) => (metric === 'earned' ? money(value) : metric === 'hours' ? `${decimal(value)} h` : String(value))}
            onPick={(month) => set({ month: month.slice(5) })}
          />
        </section>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <TopList title="Čo som robil" empty="Žiadne činnosti" items={summary.duties} unit="×" />
        <TopList title="Najčastejší klienti" empty="Bez klientov" items={summary.clients} unit="akcií" />
        <TopList title="Najčastejšie miesta" empty="Bez miest" items={summary.venues} unit="akcií" />
      </div>

      <section className="rounded-xl border bg-surface p-4" aria-labelledby="by-company-heading">
        <h3 id="by-company-heading" className="mb-2 font-medium">
          Po firmách – {periodLabel}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Firma</th>
                <th className="px-2 py-2 text-right font-medium">Akcie</th>
                <th className="px-2 py-2 text-right font-medium">Odmeny</th>
                <th className="px-2 py-2 text-right font-medium">Hodiny</th>
                <th className="py-2 pl-2 text-right font-medium">Celkovo akcií / odmeny</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.companyId} className="border-b last:border-0">
                  <td className="py-2 pr-2 font-medium">{nameOf(row.companyId)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row.eventsYear}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{money(row.earnedYear)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{decimal(row.hoursYear)} h</td>
                  <td className="py-2 pl-2 text-right text-muted-foreground tabular-nums">
                    {row.events} / {money(row.earned)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {summary.declined > 0 && <p className="mt-2 text-xs text-muted-foreground">Odmietnuté pozvánky v tomto období: {summary.declined}.</p>}
      </section>
    </div>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint: ReactNode }) {
  return (
    <div className="rounded-xl border bg-surface p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

/** Jednoduchý stĺpcový graf po mesiacoch; klik na mesiac ho zvolí vo filtri. */
function MonthBars({ months, format, onPick }: { months: { month: string; value: number }[]; format: (value: number) => string; onPick: (month: string) => void }) {
  const max = Math.max(...months.map((item) => item.value), 0)
  return (
    <div className="flex h-44 items-end gap-1 sm:gap-2" role="list">
      {months.map((item, index) => {
        const height = max > 0 ? Math.max(item.value > 0 ? 3 : 0, (item.value / max) * 100) : 0
        return (
          <button
            key={item.month}
            type="button"
            role="listitem"
            title={`${MONTH_NAMES[index]}: ${format(item.value)}`}
            aria-label={`${MONTH_NAMES[index]}: ${format(item.value)}`}
            onClick={() => onPick(item.month)}
            className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-[10px] text-muted-foreground tabular-nums opacity-0 group-hover:opacity-100 sm:text-xs">{item.value > 0 ? format(item.value) : ''}</span>
            <span className="flex w-full max-w-10 flex-1 items-end">
              <span className="w-full rounded-t bg-accent transition-opacity group-hover:opacity-80" style={{ height: `${height}%` }} />
            </span>
            <span className="text-[10px] text-muted-foreground sm:text-xs">{MONTHS[index]}</span>
          </button>
        )
      })}
    </div>
  )
}

function TopList({ title, items, empty, unit }: { title: string; items: Ranked[]; empty: string; unit: string }) {
  const max = Math.max(...items.map((item) => item.value), 1)
  return (
    <section className="rounded-xl border bg-surface p-4">
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((item) => (
            <li key={item.label}>
              <div className="flex justify-between gap-2">
                <span className="truncate">{item.label}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {item.value} {unit}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
