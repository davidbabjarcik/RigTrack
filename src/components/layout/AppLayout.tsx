import { Menu } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { OfflineBanner } from '@/components/feedback/OfflineBanner'
import { UpdatePrompt } from '@/components/feedback/UpdatePrompt'
import { BinAutoPurge } from '@/features/bin/BinAutoPurge'
import { useCompany } from '@/features/companies/company-context'
import { CompanyLogo } from '@/features/companies/CompanyLogo'
import { Credits } from './Credits'
import { ThemeToggle } from './ThemeToggle'
import { visibleNavItems, type NavItem } from '@/lib/navigation'
import { usePinnedNav } from '@/lib/usePinnedNav'
import { cn } from '@/lib/utils'

const MORE_ITEM = { id: 'more', label: 'Viac', to: '/more', icon: Menu }

function SidebarLink({ item }: { item: Pick<NavItem, 'label' | 'to' | 'icon'> }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      <item.icon className="size-5" aria-hidden />
      {item.label}
    </NavLink>
  )
}

function TabLink({ item }: { item: Pick<NavItem, 'label' | 'to' | 'icon'> }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium',
          isActive ? 'text-accent' : 'text-muted-foreground',
        )
      }
    >
      <item.icon className="size-5" aria-hidden />
      <span className="max-w-full truncate px-1">{item.label}</span>
    </NavLink>
  )
}

export function AppLayout() {
  const { pinned } = usePinnedNav()
  const { active } = useCompany()
  const navItems = visibleNavItems(active)
  const pinnedItems = navItems.filter((item) => pinned.includes(item.id)).sort((a, b) => pinned.indexOf(a.id) - pinned.indexOf(b.id))

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-surface md:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <img src="/icons/icon.svg" alt="" className="size-8 rounded-lg" />
          <span className="flex-1 text-lg font-semibold tracking-tight">RigTrack</span>
          <ThemeToggle className="-mr-2" />
        </div>
        {active && (
          <Link
            to="/company/select"
            title="Zmeniť firmu"
            className="mx-3 mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <CompanyLogo companyId={active.companyId} className="h-8 max-w-16" />
            <span className="min-w-0 truncate">{active.companyName}</span>
          </Link>
        )}
        <nav aria-label="Hlavná navigácia" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
          {navItems.map((item) => (
            <SidebarLink key={item.id} item={item} />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        {/* Na mobile nie je bočný panel, preto má vlastnú úzku hlavičku. */}
        <header className="flex h-12 items-center gap-2 border-b bg-surface px-4 md:hidden">
          <img src="/icons/icon.svg" alt="" className="size-6 rounded-md" />
          <span className="flex-1 font-semibold tracking-tight">RigTrack</span>
          <ThemeToggle className="-mr-2" />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-10 md:px-8">
          <Outlet />
        </main>
        {/* Na mobile leží pod pätičkou spodná navigácia, preto väčší spodný okraj. */}
        <Credits className="px-4 pb-24 md:pb-6" />
      </div>

      <nav
        aria-label="Hlavná navigácia"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {pinnedItems.map((item) => (
          <TabLink key={item.id} item={item} />
        ))}
        <TabLink item={MORE_ITEM} />
      </nav>

      {active?.role === 'admin' && <BinAutoPurge companyId={active.companyId} />}
      <UpdatePrompt />
    </div>
  )
}
