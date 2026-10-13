import { useState } from 'react'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { shareByMember, type Payment } from './model'

const COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#2dd4bf', '#f472b6', '#a3e635', '#94a3b8']
const SCOPES = [
  { id: 'all', label: 'Všetko zapísané' },
  { id: 'paid', label: 'Len vyplatené' },
] as const

type Props = { payments: Payment[]; nameOf: (memberId: string) => string }

const money = (amount: number) => formatMoney(amount, 'EUR')
const percent = (share: number) => `${String(Math.round(share * 1000) / 10).replace('.', ',')} %`

/** Bod na kružnici; uhol 0 je hore a rastie v smere hodinových ručičiek. */
const onCircle = (radius: number, turn: number) => ({
  x: 50 + radius * Math.sin(turn * 2 * Math.PI),
  y: 50 - radius * Math.cos(turn * 2 * Math.PI),
})

/** Výsek prstenca od `from` do `to` (v podieloch celého kruhu). */
function slicePath(from: number, to: number) {
  // Celý kruh sa jedným oblúkom nakresliť nedá; nechávame mu nepatrnú medzeru.
  const end = Math.min(to, from + 0.9999)
  const [outerStart, outerEnd, innerEnd, innerStart] = [onCircle(48, from), onCircle(48, end), onCircle(27, end), onCircle(27, from)]
  const large = end - from > 0.5 ? 1 : 0
  return `M ${outerStart.x} ${outerStart.y} A 48 48 0 ${large} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A 27 27 0 ${large} 0 ${innerStart.x} ${innerStart.y} Z`
}

/**
 * Koláčový graf: kto dostal akú časť odmien. Vedľa je to isté číslami,
 * takže graf sa dá prečítať aj bez rozlišovania farieb.
 */
export function PayoutShareChart({ payments, nameOf }: Props) {
  const [scope, setScope] = useState<(typeof SCOPES)[number]['id']>('all')
  const { rows, total } = shareByMember(payments, scope === 'paid', COLORS.length - 1)
  // Kde ktorý výsek začína: súčet podielov tých pred ním.
  const starts = rows.map((_, index) => rows.slice(0, index).reduce((sum, row) => sum + row.share, 0))

  return (
    <section className="mb-6" aria-labelledby="share-heading">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="share-heading" className="text-sm font-medium text-muted-foreground">
          Kto koľko dostal
        </h2>
        <div className="flex gap-2" role="group" aria-label="Čo rátať">
          {SCOPES.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={scope === option.id}
              onClick={() => setScope(option.id)}
              className={cn(
                'h-8 rounded-lg border px-3 text-sm font-medium',
                scope === option.id ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">
          {scope === 'paid' ? 'Zatiaľ nebola vyplatená žiadna odmena.' : 'Zatiaľ nie je zapísaná žiadna odmena.'}
        </p>
      ) : (
        <div className="flex flex-col items-center gap-5 rounded-xl border bg-surface p-4 sm:flex-row sm:items-start">
          <svg viewBox="0 0 100 100" className="w-44 shrink-0" role="img" aria-label={`Koláčový graf odmien, spolu ${money(total)}`}>
            {rows.map((row, index) => {
              return (
                <path key={row.memberId ?? 'rest'} d={slicePath(starts[index], starts[index] + row.share)} fill={COLORS[index % COLORS.length]} stroke="var(--surface, #ffffff)" strokeWidth={0.8}>
                  <title>
                    {row.memberId ? nameOf(row.memberId) : 'Ostatní'}: {money(row.amount)} ({percent(row.share)})
                  </title>
                </path>
              )
            })}
            <text x="50" y="47" textAnchor="middle" fontSize="6" fill="currentColor" opacity={0.7}>
              spolu
            </text>
            <text x="50" y="57" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="currentColor">
              {money(total)}
            </text>
          </svg>
          <ol className="flex w-full min-w-0 flex-col gap-1.5 text-sm">
            {rows.map((row, index) => (
              <li key={row.memberId ?? 'rest'} className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="min-w-0 flex-1 truncate">
                  {index + 1}. {row.memberId ? nameOf(row.memberId) : `Ostatní (${row.members})`}
                </span>
                <span className="shrink-0 font-medium tabular-nums">{money(row.amount)}</span>
                <span className="w-14 shrink-0 text-right text-muted-foreground tabular-nums">{percent(row.share)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
