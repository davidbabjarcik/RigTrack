import { AudioWaveform, ChevronRight, LayoutGrid, MonitorPlay, ToggleRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { CalculatorTabs } from '@/components/layout/ModuleTabs'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { tx } from '@/lib/i18n'

type Calculator = { to: string; label: string; description: string; icon: LucideIcon; shown: boolean }

/** Všetky kalkulačky na jednom mieste. */
export function CalculatorsPage() {
  const company = useCompany().active
  const calculators: Calculator[] = [
    { to: '/stage', label: tx('Pódium Nivtec'), description: tx('Dosky, nohy, plachty, zábradlie a schody'), icon: LayoutGrid, shown: !company || can(company, 'events.view') },
    { to: '/delay', label: tx('Delay subov'), description: tx('Cardioid, end-fire, rad, arc a delay veža'), icon: AudioWaveform, shown: true },
    { to: '/dmx', label: tx('DMX dip switch'), description: tx('Adresa na prepínače a späť, adresy pre rad svetiel'), icon: ToggleRight, shown: true },
    { to: '/led', label: tx('LED stena'), description: tx('Panely, prúd a fázy, hliník, rigging, procesor a Full HD'), icon: MonitorPlay, shown: true },
  ]
  return (
    <>
      <CalculatorTabs />
      <PageHeader title={tx('Kalkulačky')} description={tx('Výpočty na prípravu akcií')} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {calculators
          .filter((item) => item.shown)
          .map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="flex h-full items-center gap-3 rounded-xl border bg-surface p-4 hover:bg-muted">
                <item.icon className="size-6 shrink-0 text-accent" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{tx(item.label)}</span>
                  <span className="block text-sm text-muted-foreground">{tx(item.description)}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
      </ul>
    </>
  )
}
