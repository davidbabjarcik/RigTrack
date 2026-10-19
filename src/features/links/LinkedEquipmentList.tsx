import { Building2 } from 'lucide-react'
import { describeAttributes, KIND_LABELS } from '@/features/equipment/model'
import type { LinkedEquipment } from './api'

/** Zoznam techniky prepojených firiem (len na čítanie – bez cien a detailov). */
export function LinkedEquipmentList({ items }: { items: LinkedEquipment[] }) {
  if (items.length === 0) return null
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Technika prepojených firiem ({items.length})</h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {items.map((item) => (
          <li key={item.id} className="flex min-h-14 items-center gap-3 px-4 py-3">
            <Building2 className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.name}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {[[item.manufacturer, item.model].filter(Boolean).join(' '), ...describeAttributes(item), item.category || KIND_LABELS[item.kind]].filter(Boolean).join(' · ')}
              </span>
            </span>
            <span className="shrink-0 text-right text-sm">
              <span className="block font-medium">{item.quantity} ks</span>
              <span className="block text-xs text-muted-foreground">{item.companyName}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
