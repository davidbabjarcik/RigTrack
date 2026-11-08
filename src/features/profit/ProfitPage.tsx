import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useCompany } from '@/features/companies/company-context'
import { formatDate, formatMoney, todayIso } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { profitKeys, profitOf, saveProfitSettings, useProfitData, type ProfitData } from './api'
import { profitSummary } from './model'

const eur = (amount: number) => formatMoney(amount, 'EUR')
const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december']
const signed = (amount: number) => `${amount >= 0 ? '+' : ''}${eur(amount)}`
const tone = (amount: number) => (amount >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive')

function Settings({ companyId, data }: { companyId: string; data: ProfitData }) {
  const queryClient = useQueryClient()
  const [kmRate, setKmRate] = useState(String(data.settings.kmRate).replace('.', ','))
  const [useDays, setUseDays] = useState(String(data.settings.gearUseDays))
  const rate = Number(kmRate.replace(',', '.'))
  const days = Math.round(Number(useDays))
  const valid = Number.isFinite(rate) && rate >= 0 && rate <= 100 && days >= 1 && days <= 366
  const save = useMutation({
    mutationFn: () => saveProfitSettings(companyId, { kmRate: rate, gearUseDays: days }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: profitKeys.data(companyId) }),
  })
  return (
    <section className="mt-8 rounded-xl border bg-surface p-4">
      <h2 className="font-semibold">{tx('Nastavenie výpočtu')}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label={tx('Náklad na 1 km auta (€)')} inputMode="decimal" value={kmRate} onChange={(e) => setKmRate(e.target.value)} />
        <Field label={tx('Koľko dní v roku je technika na akciách')} inputMode="numeric" value={useDays} onChange={(e) => setUseDays(e.target.value)} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {tx('Km sa berú z Dopravy pri evente. Ak naftu zapisujete do výdavkov, do sadzby dajte len opotrebenie auta. Opotrebenie techniky = ročný odpis (nákupná cena / roky) delený dňami na akciách, krát dni eventu.')}
      </p>
      {save.isError && <p role="alert" className="mt-2 text-sm text-destructive">{tx('Uloženie zlyhalo.')}</p>}
      <Button className="mt-3" size="sm" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
        {save.isSuccess ? tx('Uložené') : tx('Uložiť nastavenie')}
      </Button>
    </section>
  )
}

/** Zisk eventov za rok alebo mesiac, poradie klientov a nastavenie výpočtu. */
export function ProfitPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const { events, equipment, data } = useProfitData(companyId)
  const [year, setYear] = useState(todayIso().slice(0, 4))
  const [month, setMonth] = useState('')

  if (events.isPending || equipment.isPending || data.isPending) return <LoadingBlock />
  if (data.isError) return <ErrorBlock message={tx('Zisk sa nepodarilo načítať. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.')} onRetry={() => void data.refetch()} />
  if (events.isError || equipment.isError) return <ErrorBlock message={tx('Údaje sa nepodarilo načítať.')} />

  const years = [...new Set([todayIso().slice(0, 4), ...events.data.map((event) => event.startsOn.slice(0, 4))])].sort().reverse()
  const prefix = month ? `${year}-${month}` : year
  const rows = events.data
    .filter((event) => event.status !== 'cancelled' && event.startsOn.startsWith(prefix))
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))
    .map((event) => ({ event, client: event.client || event.organizer, profit: profitOf(event, data.data, equipment.data) }))
  const summary = profitSummary(rows)

  return (
    <>
      <PageHeader title={tx('Zisk z eventov')} description={tx('Príjem bez DPH mínus odmeny, doprava, výdavky, prenájmy a opotrebenie techniky')} />
      <div className="mb-4 flex flex-wrap gap-3">
        <SelectField label={tx('Rok')} value={year} onChange={(e) => setYear(e.target.value)}>
          {years.map((value) => <option key={value} value={value}>{value}</option>)}
        </SelectField>
        <SelectField label={tx('Mesiac')} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">{tx('celý rok')}</option>
          {MONTHS.map((name, index) => <option key={name} value={String(index + 1).padStart(2, '0')}>{tx(name)}</option>)}
        </SelectField>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [tx('Eventy'), String(rows.length), ''],
          [tx('Príjem bez DPH'), eur(summary.income), ''],
          [tx('Náklady'), eur(summary.costs), ''],
          [tx('Zisk'), signed(summary.profit), tone(summary.profit)],
        ].map(([label, value, className]) => (
          <div key={label} className="rounded-xl border bg-surface p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn('mt-1 text-xl font-semibold tabular-nums', className)}>{value}</p>
            {label === tx('Zisk') && summary.margin !== null && <p className="text-xs text-muted-foreground">{tf('marža {0} %', summary.margin)}</p>}
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed bg-surface p-6 text-center text-muted-foreground">{tx('V tomto období nie sú žiadne eventy.')}</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section>
            <h2 className="mb-2 font-semibold">{tx('Eventy')}</h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-surface text-sm">
              {rows.map(({ event, client, profit }) => (
                <li key={event.id}>
                  <Link to={`/events/${event.id}?tab=money`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium break-words">{event.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[formatDate(event.startsOn), client].filter(Boolean).join(' · ')}
                        {profit.income.source === 'offer' && ` · ${tx('podľa ponuky')}`}
                        {profit.income.source === 'none' && ` · ${tx('bez príjmu')}`}
                      </span>
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="block text-xs text-muted-foreground">{eur(profit.income.amount)} − {eur(profit.costs)}</span>
                      <span className={cn('block font-semibold', tone(profit.profit))}>
                        {signed(profit.profit)}
                        {profit.margin !== null && <span className="ml-1 font-normal text-muted-foreground">({profit.margin} %)</span>}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-2 font-semibold">{tx('Klienti podľa zisku')}</h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-surface text-sm">
              {summary.clients.map((client) => (
                <li key={client.client} className="flex items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium break-words">{client.client}</span>
                    <span className="block text-xs text-muted-foreground">{tf('{0} eventov · príjem {1}', client.events, eur(client.income))}</span>
                  </span>
                  <span className={cn('font-semibold tabular-nums', tone(client.profit))}>{signed(client.profit)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <Settings key={`${data.data.settings.kmRate}-${data.data.settings.gearUseDays}`} companyId={companyId} data={data.data} />
    </>
  )
}
