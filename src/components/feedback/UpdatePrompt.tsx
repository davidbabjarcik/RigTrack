import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'
import { tx } from '@/lib/i18n'

/**
 * Prepne na novú verziu. Pri dvoch vydaniach tesne po sebe môže knižnica poslať pokyn staršej (už neplatnej)
 * čakajúcej verzii – preto ho pošleme aj tej, ktorá čaká teraz, a keby sa nič nestalo, stránku obnovíme sami.
 */
export async function applyUpdate(update: (reload: boolean) => Promise<void>) {
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
  let reloading = false
  const reload = () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  }
  sw?.addEventListener('controllerchange', reload)
  window.setTimeout(reload, 4000)
  try {
    const registration = await sw?.getRegistration()
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
  } catch {
    // obnovenie stránky to vyrieši
  }
  await update(true).catch(() => {})
}

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Nainštalovaná aplikácia beží dlho bez znovunačítania – novú verziu hľadáme pri návrate do nej a každú hodinu.
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) void registration.update().catch(() => {})
      }
      setInterval(check, 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  if (!needRefresh) return null
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border bg-surface p-4 shadow-lg md:bottom-6"
    >
      <p className="text-sm">{tx('Je dostupná nová verzia aplikácie.')}</p>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>{tx('Neskôr')}</Button>
        <Button size="sm" onClick={() => void applyUpdate(updateServiceWorker)}>{tx('Aktualizovať')}</Button>
      </div>
    </div>
  )
}
