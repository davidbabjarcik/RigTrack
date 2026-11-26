import { tf, tx } from '@/lib/i18n'
import type { rackSummary } from './fit'

type Summary = ReturnType<typeof rackSummary>

const formatNumber = (value: number) => new Intl.NumberFormat('sk-SK', { maximumFractionDigits: 1 }).format(value)

/** Súhrn racku v štyroch číslach: prístroje, obsadené U, hmotnosť a príkon s prúdom pri 230 V. */
export function RackStats({ summary }: { summary: Summary }) {
  const kg = (value: number) => `${formatNumber(value)} kg`
  const stats: { label: string; value: string; detail: string }[] = [
    {
      label: tx('Prístroje'),
      value: String(summary.devices),
      detail: summary.items > summary.devices ? tf('+ {0} doplnkov', summary.items - summary.devices) : tx('bez doplnkov'),
    },
    { label: tx('Obsadené U'), value: `${summary.usedU} / ${summary.units} U`, detail: tf('spredu · voľné {0} U', summary.freeU) },
    {
      label: tx('Hmotnosť'),
      value: kg(summary.totalKg),
      detail: [tf('obsah {0}', kg(summary.contentsKg)), summary.noWeight > 0 && tf('{0} bez hmotnosti', summary.noWeight)].filter(Boolean).join(' · '),
    },
    { label: tx('Príkon'), value: `${formatNumber(summary.powerW)} W`, detail: tf('{0} A pri 230 V', formatNumber(summary.amps)) },
  ]
  return (
    <dl className="grid grid-cols-2 divide-x divide-y overflow-hidden rounded-xl border bg-surface sm:grid-cols-4 sm:divide-y-0">
      {stats.map((stat) => (
        <div key={stat.label} className="px-4 py-3">
          <dt className="text-xs text-muted-foreground">{stat.label}</dt>
          <dd className="text-lg font-semibold tabular-nums">{stat.value}</dd>
          <dd className="text-xs text-muted-foreground">{stat.detail}</dd>
        </div>
      ))}
    </dl>
  )
}
