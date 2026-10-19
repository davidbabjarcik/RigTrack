import type { HourReading } from './api'
import { formatNumber } from './model'

const WIDTH = 600
const HEIGHT = 180
const PAD = { left: 48, right: 12, top: 12, bottom: 28 }

/** Graf prevádzkových hodín v čase: ako rastie stav počítadla medzi odčítaniami. */
export function HoursChart({ readings }: { readings: HourReading[] }) {
  const points = [...readings].sort((a, b) => a.readOn.localeCompare(b.readOn))
  const times = points.map((point) => Date.parse(point.readOn))
  const minT = Math.min(...times)
  const maxT = Math.max(...times)
  const maxH = Math.max(...points.map((point) => point.hours), 1)
  const minH = Math.min(...points.map((point) => point.hours))
  const low = Math.max(0, minH - (maxH - minH) * 0.1)
  const x = (t: number) => PAD.left + (maxT === minT ? 0.5 : (t - minT) / (maxT - minT)) * (WIDTH - PAD.left - PAD.right)
  const y = (h: number) => PAD.top + (1 - (h - low) / (maxH - low || 1)) * (HEIGHT - PAD.top - PAD.bottom)
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(times[index]).toFixed(1)},${y(point.hours).toFixed(1)}`).join(' ')
  const first = points[0]
  const last = points[points.length - 1]
  const days = (maxT - minT) / 86_400_000
  const perMonth = days > 0 ? ((last.hours - first.hours) / days) * 30 : null
  const label = (iso: string) => new Date(iso).toLocaleDateString('sk-SK', { month: 'short', year: '2-digit' })

  return (
    <figure className="mt-4 border-t pt-3">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={`Graf prevádzkových hodín od ${formatNumber(first.hours)} h po ${formatNumber(last.hours)} h`}>
        {[low, (low + maxH) / 2, maxH].map((value) => (
          <g key={value}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} className="stroke-border" strokeDasharray="3 3" />
            <text x={PAD.left - 6} y={y(value) + 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>
              {formatNumber(Math.round(value))}
            </text>
          </g>
        ))}
        <path d={path} fill="none" className="stroke-accent" strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={point.id} cx={x(times[index])} cy={y(point.hours)} r={3.5} className="fill-accent">
            <title>{`${formatNumber(point.hours)} h · ${new Date(point.readOn).toLocaleDateString('sk-SK')}`}</title>
          </circle>
        ))}
        <text x={PAD.left} y={HEIGHT - 8} className="fill-muted-foreground" fontSize={11}>
          {label(first.readOn)}
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 8} textAnchor="end" className="fill-muted-foreground" fontSize={11}>
          {label(last.readOn)}
        </text>
      </svg>
      <figcaption className="text-sm text-muted-foreground">
        +{formatNumber(Math.round((last.hours - first.hours) * 10) / 10)} h za {Math.round(days)} dní
        {perMonth !== null && ` · priemerne ${formatNumber(Math.round(perMonth * 10) / 10)} h mesačne`}
      </figcaption>
    </figure>
  )
}
