import type { Ranked } from './model'

const COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#2dd4bf', '#f472b6', '#a3e635', '#94a3b8']

const onCircle = (radius: number, turn: number) => ({
  x: 50 + radius * Math.sin(turn * 2 * Math.PI),
  y: 50 - radius * Math.cos(turn * 2 * Math.PI),
})

/** Výsek prstenca od `from` do `to` (v podieloch celého kruhu). */
function slicePath(from: number, to: number) {
  const end = Math.min(to, from + 0.9999)
  const [outerStart, outerEnd, innerEnd, innerStart] = [onCircle(48, from), onCircle(48, end), onCircle(27, end), onCircle(27, from)]
  const large = end - from > 0.5 ? 1 : 0
  return `M ${outerStart.x} ${outerStart.y} A 48 48 0 ${large} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A 27 27 0 ${large} 0 ${innerStart.x} ${innerStart.y} Z`
}

const percent = (share: number) => `${String(Math.round(share * 1000) / 10).replace('.', ',')} %`

/** Koláčový graf s legendou; hodnoty sú vypísané aj číslami, takže sa dá čítať bez rozlišovania farieb. */
export function DonutChart({ title, rows, format, empty }: { title: string; rows: Ranked[]; format: (value: number) => string; empty: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const shares = rows.map((row) => (total === 0 ? 0 : row.value / total))
  const starts = shares.map((_, index) => shares.slice(0, index).reduce((sum, share) => sum + share, 0))
  return (
    <div className="rounded-xl border bg-surface p-4">
      <h3 className="mb-3 font-medium">{title}</h3>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <svg viewBox="0 0 100 100" className="w-36 shrink-0" role="img" aria-label={`${title}, spolu ${format(total)}`}>
            {rows.map((row, index) => (
              <path key={row.id} d={slicePath(starts[index], starts[index] + shares[index])} fill={COLORS[index % COLORS.length]} stroke="var(--surface, #ffffff)" strokeWidth={0.8}>
                <title>
                  {row.label}: {format(row.value)} ({percent(shares[index])})
                </title>
              </path>
            ))}
            <text x="50" y="47" textAnchor="middle" fontSize="6" fill="currentColor" opacity={0.7}>
              spolu
            </text>
            <text x="50" y="57" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor">
              {format(total)}
            </text>
          </svg>
          <ol className="flex w-full min-w-0 flex-col gap-1.5 text-sm">
            {rows.map((row, index) => (
              <li key={row.id} className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                <span className="shrink-0 font-medium tabular-nums">{format(row.value)}</span>
                <span className="w-14 shrink-0 text-right text-muted-foreground tabular-nums">{percent(shares[index])}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
