import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type SectionTab = { to: string; label: string; shown?: boolean; end?: boolean }

/** Záložky medzi príbuznými stránkami (napr. Objednávky | Wantlist, Servis | Žiadosti | Technici). */
export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const shown = tabs.filter((tab) => tab.shown !== false)
  if (shown.length < 2) return null
  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-surface p-1 print:hidden" aria-label="Časti">
      {shown.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end ?? true}
          className={({ isActive }) =>
            cn('shrink-0 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap', isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
