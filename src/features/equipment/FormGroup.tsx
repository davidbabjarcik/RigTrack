import { ChevronDown } from 'lucide-react'
import { useSyncExternalStore, type ReactNode } from 'react'
import { isCollapsed, setCollapsed, subscribeCollapsed } from '@/components/layout/collapsed'
import { cn } from '@/lib/utils'

/** Skupina polí; kliknutím na nadpis sa zbalí a prehliadač si to pamätá (pre všetku techniku). */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = `equipment.form.${title}`
  const collapsed = useSyncExternalStore(subscribeCollapsed, () => isCollapsed(id))
  return (
    <fieldset className="rounded-xl border bg-surface p-4">
      <legend className="px-1 text-sm font-medium text-muted-foreground">
        <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" aria-expanded={!collapsed} onClick={() => setCollapsed(id, !collapsed)}>
          <ChevronDown className={cn('size-4 transition-transform', collapsed && '-rotate-90')} aria-hidden />
          {title}
        </button>
      </legend>
      <div className="grid gap-4 sm:grid-cols-2" hidden={collapsed}>
        {children}
      </div>
    </fieldset>
  )
}
