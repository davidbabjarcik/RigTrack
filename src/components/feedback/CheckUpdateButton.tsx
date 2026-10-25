import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type State = 'idle' | 'checking' | 'latest' | 'found' | 'offline' | 'error'
const MESSAGES: Record<Exclude<State, 'idle' | 'checking'>, string> = {
  latest: 'Máte najnovšiu verziu.',
  found: 'Nová verzia sa sťahuje – o chvíľu sa ukáže tlačidlo „Aktualizovať“.',
  offline: 'Ste offline – skúste to, keď budete pripojení.',
  error: 'Nepodarilo sa overiť – skúste obnoviť stránku.',
}

/** Ručná kontrola novej verzie aplikácie (inak sa kontroluje sama pri návrate do appky a každú hodinu). */
export function CheckUpdateButton({ className }: { className?: string }) {
  const [state, setState] = useState<State>('idle')

  async function check() {
    if (!navigator.onLine) return setState('offline')
    setState('checking')
    try {
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
      if (!registration) {
        // Bez service workera (napr. vývoj) stačí načítať stránku znova.
        window.location.reload()
        return
      }
      await registration.update()
      setState(registration.installing || registration.waiting ? 'found' : 'latest')
    } catch {
      setState('error')
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button variant="outline" size="sm" disabled={state === 'checking'} onClick={() => void check()}>
        <RefreshCw className={cn('size-4', state === 'checking' && 'animate-spin')} aria-hidden />
        {state === 'checking' ? 'Kontrolujem…' : 'Skontrolovať aktualizácie'}
      </Button>
      {state !== 'idle' && state !== 'checking' && (
        <span role="status" className="text-sm text-muted-foreground">
          {MESSAGES[state]}
        </span>
      )}
    </div>
  )
}
