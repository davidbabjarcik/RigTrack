import { ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { NAV_ITEMS } from '@/lib/navigation'
import { usePinnedNav } from '@/lib/usePinnedNav'

export function MorePage() {
  const { pinned } = usePinnedNav()
  const rest = NAV_ITEMS.filter((item) => !pinned.includes(item.id))

  return (
    <>
      <PageHeader title="Viac" description="Ostatné moduly aplikácie" />
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {rest.map((item) => (
          <li key={item.id}>
            <Link to={item.to} className="flex min-h-14 items-center gap-3 px-4 hover:bg-muted">
              <item.icon className="size-5 text-muted-foreground" aria-hidden />
              <span className="flex-1 font-medium">{item.label}</span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
        <li>
          <Link to="/more/customize" className="flex min-h-14 items-center gap-3 px-4 hover:bg-muted">
            <SlidersHorizontal className="size-5 text-muted-foreground" aria-hidden />
            <span className="flex-1 font-medium">Prispôsobiť spodnú lištu</span>
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      </ul>
    </>
  )
}
