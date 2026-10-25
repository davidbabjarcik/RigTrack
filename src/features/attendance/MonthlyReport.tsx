import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, FileSpreadsheet, HandCoins } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { addPayment, fetchPayments, payoutKeys } from '@/features/payouts/api'
import { formatMoney, todayIso } from '@/lib/format'
import { fetchEventLogs, monthlyKeys, monthlyRows, monthRange, rewardNote, saveRate, useRates, type MonthRow, type Rate } from './monthly'
import { formatMinutes, timeOf, workedMinutes } from './model'
import { fetchSessions, WORK_PLACE_LABELS, workKeys } from './workApi'

const MONTH_NAMES = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december']

/** Posledných 12 mesiacov ako „2026-10“, najnovší prvý. */
function lastMonths(today: string) {
  const [year, month] = today.split('-').map(Number)
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1))
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  })
}

const hours = (minutes: number) => (Math.round((minutes / 60) * 10) / 10).toString().replace('.', ',')

/** Admin: mesačný výkaz dochádzky – hodiny po ľuďoch, sadzby, navrhovaná odmena, zápis do Odmien a export. */
export function MonthlyReport({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const members = useMembers(companyId)
  const months = lastMonths(todayIso())
  const [month, setMonth] = useState(months[0])
  const [now] = useState(() => Date.now())
  const { from, to } = monthRange(month)
  const sessions = useQuery({ queryKey: [...workKeys.sessions(companyId), 'month', month], queryFn: () => fetchSessions(companyId, `${from}T00:00:00`), retry: false })
  const logs = useQuery({ queryKey: monthlyKeys.logs(companyId, month), queryFn: () => fetchEventLogs(companyId, month), retry: false })
  const rates = useRates(companyId)
  const payments = useQuery({ queryKey: payoutKeys.list(companyId), queryFn: () => fetchPayments(companyId), retry: false })
  const save = useMutation({ mutationFn: (rate: Rate) => saveRate(companyId, rate), onSettled: () => queryClient.invalidateQueries({ queryKey: monthlyKeys.rates(companyId) }) })
  const reward = useMutation({
    mutationFn: (row: MonthRow) =>
      addPayment(companyId, { memberId: row.memberId, amount: row.amount!, kind: 'reward', happenedOn: todayIso() < to ? todayIso() : `${month}-28`, eventId: '', note: rewardNote(month, row) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: payoutKeys.list(companyId) }),
  })

  const monthSessions = (sessions.data ?? []).filter((item) => item.startedAt.slice(0, 10) < to)
  const rows = monthlyRows(monthSessions, logs.data ?? [], rates.data ?? [], now).sort((a, b) => memberName(members.data, a.memberId).localeCompare(memberName(members.data, b.memberId), 'sk'))
  const nameOf = (id: string) => memberName(members.data, id) || 'Bývalý člen'
  const written = (row: MonthRow) => (payments.data ?? []).some((payment) => payment.memberId === row.memberId && payment.note === rewardNote(month, row))
  const label = `${MONTH_NAMES[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`

  async function exportExcel() {
    const { default: writeXlsxFile } = await import('write-excel-file/browser')
    const bold = (value: string) => ({ value, fontWeight: 'bold' as const })
    const summary = [
      [bold('Meno'), bold('Firma (h)'), bold('Doma (h)'), bold('Eventy (h)'), bold('Spolu (h)'), bold('Navrhovaná odmena (€)')],
      ...rows.map((row) => [
        { value: nameOf(row.memberId) },
        { value: Math.round((row.companyMinutes / 60) * 100) / 100 },
        { value: Math.round((row.homeMinutes / 60) * 100) / 100 },
        { value: Math.round((row.eventMinutes / 60) * 100) / 100 },
        { value: Math.round(((row.companyMinutes + row.homeMinutes + row.eventMinutes) / 60) * 100) / 100 },
        row.amount === null ? { value: '' } : { value: row.amount },
      ]),
    ]
    const records = [
      [bold('Meno'), bold('Dátum'), bold('Kde'), bold('Od'), bold('Do'), bold('Prestávky (min)'), bold('Hodiny')],
      ...monthSessions.map((item) => [
        { value: nameOf(item.userId) },
        { value: item.startedAt.slice(0, 10) },
        { value: WORK_PLACE_LABELS[item.place] },
        { value: timeOf(item.startedAt) },
        { value: item.endedAt ? timeOf(item.endedAt) : '' },
        { value: item.breakMinutes + item.waitMinutes },
        { value: Math.round((workedMinutes(item, now) / 60) * 100) / 100 },
      ]),
      ...(logs.data ?? []).map((item) => [
        { value: nameOf(item.userId) },
        { value: item.workDate },
        { value: `Event: ${item.eventName}` },
        { value: item.startsAt.slice(0, 5) },
        { value: item.endsAt.slice(0, 5) },
        { value: item.breakMinutes },
        { value: Math.round((monthlyRows([], [item], [], now)[0].eventMinutes / 60) * 100) / 100 },
      ]),
    ]
    await writeXlsxFile([
      { sheet: 'Súhrn', data: summary, columns: [{ width: 24 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 22 }], stickyRowsCount: 1 },
      { sheet: 'Záznamy', data: records, columns: [{ width: 24 }, { width: 12 }, { width: 28 }, { width: 8 }, { width: 8 }, { width: 14 }, { width: 10 }], stickyRowsCount: 1 },
    ] as never).toFile(`dochadzka-${month}.xlsx`)
  }

  const rateInput = (row: MonthRow, key: 'companyRate' | 'homeRate' | 'eventRate', title: string) => (
    <input
      key={`${row.memberId}-${key}-${row.rate[key] ?? ''}`}
      type="number"
      min={0}
      step="0.5"
      aria-label={`${title} – ${nameOf(row.memberId)}`}
      placeholder="€/h"
      defaultValue={row.rate[key] ?? ''}
      className="h-8 w-16 rounded-md border bg-background px-1.5 text-right text-xs"
      onBlur={(event) => {
        const value = event.target.value.trim() === '' ? null : Math.max(0, Number(event.target.value))
        if (value !== row.rate[key]) save.mutate({ ...row.rate, [key]: value })
      }}
    />
  )

  return (
    <section className="mb-6 rounded-xl border bg-surface p-4" aria-labelledby="monthly-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="monthly-heading" className="font-medium">
          Mesačný výkaz
        </h2>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Mesiac" className="h-9 rounded-lg border bg-background px-2 text-sm" value={month} onChange={(event) => setMonth(event.target.value)}>
            {months.map((value) => (
              <option key={value} value={value}>
                {MONTH_NAMES[Number(value.slice(5)) - 1]} {value.slice(0, 4)}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" disabled={rows.length === 0} onClick={() => void exportExcel()}>
            <FileSpreadsheet className="size-4" aria-hidden />
            Export do Excelu
          </Button>
        </div>
      </div>
      {sessions.isPending || logs.isPending ? (
        <p className="text-sm text-muted-foreground">Načítavam…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">V mesiaci {label} nie je žiadna dochádzka.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Meno</th>
                <th className="px-2 py-2 text-right font-medium">Firma</th>
                <th className="px-2 py-2 text-right font-medium">Doma</th>
                <th className="px-2 py-2 text-right font-medium">Eventy</th>
                <th className="px-2 py-2 text-center font-medium">Sadzby €/h (firma · doma · event)</th>
                <th className="px-2 py-2 text-right font-medium">Odmena</th>
                <th className="py-2 pl-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.memberId} className="border-b last:border-0">
                  <td className="py-2 pr-2 font-medium">{nameOf(row.memberId)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{hours(row.companyMinutes)} h</td>
                  <td className="px-2 py-2 text-right tabular-nums">{hours(row.homeMinutes)} h</td>
                  <td className="px-2 py-2 text-right tabular-nums">{hours(row.eventMinutes)} h</td>
                  <td className="px-2 py-2">
                    <span className="flex justify-center gap-1">
                      {rateInput(row, 'companyRate', 'Sadzba na firme')}
                      {rateInput(row, 'homeRate', 'Sadzba doma')}
                      {rateInput(row, 'eventRate', 'Sadzba na evente')}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right font-medium tabular-nums">{row.amount === null ? '—' : formatMoney(row.amount, 'EUR')}</td>
                  <td className="py-2 pl-2 text-right">
                    {written(row) ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <Check className="size-3.5" aria-hidden />v Odmenách
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" disabled={!row.amount || reward.isPending} onClick={() => reward.mutate(row)}>
                        <HandCoins className="size-4" aria-hidden />
                        Zapísať do Odmien
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Hodiny: práca na firme a doma (táto stránka) a výkazy z eventov za {label}. Odmena = hodiny × sadzba; sadzbu vidí len admin a daný človek. Spolu{' '}
        {formatMinutes(rows.reduce((sum, row) => sum + row.companyMinutes + row.homeMinutes + row.eventMinutes, 0))}.
      </p>
      {(save.isError || reward.isError || rates.isError) && <p className="mt-2 text-sm text-destructive">Nepodarilo sa – táto časť databázy ešte nemusí byť pripravená (migrácia 0092).</p>}
    </section>
  )
}
