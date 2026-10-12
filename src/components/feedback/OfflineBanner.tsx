import { WifiOff } from 'lucide-react'
import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine)
}

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-white">
      <WifiOff className="size-4" aria-hidden />
      Ste offline. Údaje sa načítajú a uložia až po obnovení pripojenia.
    </div>
  )
}
