import { ChevronDown } from 'lucide-react'
import { useId, useSyncExternalStore, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { isCollapsed, setCollapsed, subscribeCollapsed } from './collapsed'

type Props = {
  /** Kľúč, pod ktorým si prehliadač pamätá zbalenie, napr. „event.equipment“. Platí pre všetky eventy naraz. */
  id: string
  title: ReactNode
  /** Tlačidlá vpravo v hlavičke; pri zbalenej sekcii sa skryjú. */
  actions?: ReactNode
  /** Krátke zhrnutie, ktoré sa ukáže vedľa nadpisu, keď je sekcia zbalená. */
  summary?: ReactNode
  className?: string
  children: ReactNode
}

/** Sekcia stránky, ktorá sa dá kliknutím na nadpis zbaliť a rozbaliť. */
export function CollapsibleSection({ id, title, actions, summary, className, children }: Props) {
  const collapsed = useSyncExternalStore(subscribeCollapsed, () => isCollapsed(id))
  const bodyId = useId()
  return (
    <section className={cn('mb-6', className)}>
      <div className={cn('flex flex-wrap items-center justify-between gap-x-3 gap-y-2', !collapsed && 'mb-2')}>
        <h2 className="min-w-0 flex-1 text-sm font-medium text-muted-foreground">
          <button
            type="button"
            className="-mx-1 inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:text-foreground"
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={() => setCollapsed(id, !collapsed)}
          >
            <ChevronDown className={cn('size-4 shrink-0 transition-transform', collapsed && '-rotate-90')} aria-hidden />
            <span className="min-w-0">{title}</span>
            {collapsed && summary && <span className="truncate font-normal"> · {summary}</span>}
          </button>
        </h2>
        {!collapsed && actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
      <div id={bodyId} hidden={collapsed}>
        {children}
      </div>
    </section>
  )
}
