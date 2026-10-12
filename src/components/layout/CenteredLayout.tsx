import { Outlet } from 'react-router-dom'
import { OfflineBanner } from '@/components/feedback/OfflineBanner'

/** Obrazovky mimo hlavnej navigácie: prihlásenie a výber firmy. */
export function CenteredLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <OfflineBanner />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 flex items-center justify-center gap-3">
          <img src="/icons/icon.svg" alt="" className="size-10 rounded-xl" />
          <span className="text-2xl font-semibold tracking-tight">RigTrack</span>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
