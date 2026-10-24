import { useState } from 'react'
import type { Membership } from '@/features/companies/company-context'
import { formatMoney, todayIso } from '@/lib/format'
import { statsByCompany, useMyStats } from './myStats'

/** Moje čísla vo všetkých firmách: koľko akcií, koľko som zarobil a koľko hodín odpracoval. */
export function MyStatsCard({ userId, memberships }: { userId: string; memberships: Membership[] }) {
  const stats = useMyStats(userId)
  const thisYear = todayIso().slice(0, 4)
  const [year, setYear] = useState(thisYear)
  if (stats.isPending) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Načítavam…</p>
  if (stats.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Štatistiky sa nepodarilo načítať.</p>

  const rows = statsByCompany(
    memberships.map((item) => item.companyId),
    stats.data.events,
    stats.data.payments,
    stats.data.minutes,
    year,
  )
  const total = rows.reduce(
    (sum, row) => ({ events: sum.events + row.events, eventsYear: sum.eventsYear + row.eventsYear, earned: sum.earned + row.earned, earnedYear: sum.earnedYear + row.earnedYear, hoursYear: sum.hoursYear + row.hoursYear }),
    { events: 0, eventsYear: 0, earned: 0, earnedYear: 0, hoursYear: 0 },
  )
  const years = [...new Set([thisYear, ...stats.data.events.map((item) => item.startsOn.slice(0, 4)), ...stats.data.payments.map((item) => item.date.slice(0, 4))])].sort().reverse()
  const money = (value: number) => formatMoney(Math.round(value * 100) / 100, 'EUR')
  const nameOf = (companyId: string) => memberships.find((item) => item.companyId === companyId)?.companyName ?? 'firma'

  return (
    <div className="rounded-xl border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Akcie, kde ste v posádke, vaše odmeny a odpracované hodiny (eventy aj firma / doma).</p>
        <select aria-label="Rok" className="h-9 rounded-lg border bg-background px-2 text-sm" value={year} onChange={(event) => setYear(event.target.value)}>
          {years.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-2 font-medium">Firma</th>
              <th className="px-2 py-2 text-right font-medium">Akcie {year}</th>
              <th className="px-2 py-2 text-right font-medium">Zarobené {year}</th>
              <th className="px-2 py-2 text-right font-medium">Hodiny {year}</th>
              <th className="py-2 pl-2 text-right font-medium">Spolu akcií / zarobené</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.companyId} className="border-b">
                <td className="py-2 pr-2 font-medium">{nameOf(row.companyId)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{row.eventsYear}</td>
                <td className="px-2 py-2 text-right tabular-nums">{money(row.earnedYear)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{row.hoursYear.toString().replace('.', ',')} h</td>
                <td className="py-2 pl-2 text-right text-muted-foreground tabular-nums">
                  {row.events} / {money(row.earned)}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 1 && (
            <tfoot>
              <tr className="font-semibold">
                <td className="py-2 pr-2">Spolu</td>
                <td className="px-2 py-2 text-right tabular-nums">{total.eventsYear}</td>
                <td className="px-2 py-2 text-right tabular-nums">{money(total.earnedYear)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{(Math.round(total.hoursYear * 10) / 10).toString().replace('.', ',')} h</td>
                <td className="py-2 pl-2 text-right tabular-nums">
                  {total.events} / {money(total.earned)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
