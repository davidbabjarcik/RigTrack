import { Link, Outlet } from 'react-router-dom'
import { OfflineBanner } from '@/components/feedback/OfflineBanner'
import { Credits } from './Credits'
import { ThemeToggle } from './ThemeToggle'

/** Obrazovky mimo hlavnej navigácie: prihlásenie a výber firmy. */
export function CenteredLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <OfflineBanner />
      <header className="flex justify-end px-2 pt-2">
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        {/* Logo vedie na Prehľad (napr. z „Čo je nové“); neprihláseného presmeruje na prihlásenie. */}
        <Link to="/" title="Na prehľad" className="mb-8 flex items-center justify-center gap-3 self-center rounded-lg">
          <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" className="size-10 rounded-xl" />
          <span className="text-2xl font-semibold tracking-tight">RigTrack</span>
        </Link>
        <Outlet />
      </main>
      <Credits className="px-4 pb-6" />
    </div>
  )
}
