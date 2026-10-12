import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border bg-surface p-4 shadow-lg md:bottom-6"
    >
      <p className="text-sm">Je dostupná nová verzia aplikácie.</p>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
          Neskôr
        </Button>
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          Aktualizovať
        </Button>
      </div>
    </div>
  )
}
