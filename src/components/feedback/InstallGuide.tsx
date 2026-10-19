import { Download, Smartphone, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const HIDE_KEY = 'rigtrack:install-hint-hidden'

/** Beží appka ako nainštalovaná (z plochy)? */
function isInstalled() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function platform() {
  const agent = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/i.test(agent)) return 'android'
  return 'desktop'
}

/** Návod, ako si pridať RigTrack na plochu; kde to prehliadač vie, aj tlačidlo „Nainštalovať“. */
export function InstallGuide({ compact = false, onHide }: { compact?: boolean; onHide?: () => void }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [installed, setInstalled] = useState(isInstalled)
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallPrompt)
    }
    const done = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', capture)
    window.addEventListener('appinstalled', done)
    return () => {
      window.removeEventListener('beforeinstallprompt', capture)
      window.removeEventListener('appinstalled', done)
    }
  }, [])

  if (installed) {
    return compact ? null : <p className="rounded-xl border bg-surface p-4 text-sm">RigTrack už máte nainštalovaný – spúšťate ho z plochy. 👍</p>
  }
  const os = platform()
  return (
    <div className={cn('rounded-xl border bg-surface p-4 text-sm', compact && 'border-accent/40 bg-accent/10')}>
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Pridajte si RigTrack na plochu</p>
          <p className="text-muted-foreground">Otvára sa potom ako aplikácia, na celú obrazovku a rýchlejšie.</p>
          {prompt && (
            <Button size="sm" className="mt-2" onClick={() => void prompt.prompt().then(() => setPrompt(null))}>
              <Download className="size-4" aria-hidden />
              Nainštalovať
            </Button>
          )}
          {(!compact || !prompt) && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {(os === 'ios' || !compact) && (
                <li>
                  <span className="font-medium">iPhone / iPad (Safari):</span> ťuknite na ikonu Zdieľať (štvorček so šípkou) → „Pridať na plochu“ → Pridať.
                </li>
              )}
              {(os === 'android' || !compact) && (
                <li>
                  <span className="font-medium">Android (Chrome):</span> menu ⋮ vpravo hore → „Nainštalovať aplikáciu“ alebo „Pridať na plochu“.
                </li>
              )}
              {(os === 'desktop' || !compact) && (
                <li>
                  <span className="font-medium">Počítač (Chrome, Edge):</span> ikona inštalácie vpravo v adresnom riadku, alebo menu → „Nainštalovať RigTrack“.
                </li>
              )}
            </ul>
          )}
        </div>
        {onHide && (
          <button type="button" aria-label="Skryť" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={onHide}>
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}

/** Krátka ponuka na Prehľade (na mobile), kým appka nie je nainštalovaná; dá sa skryť. */
export function InstallHint() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === '1'
    } catch {
      return false
    }
  })
  if (hidden || isInstalled() || platform() === 'desktop') return null
  return (
    <div className="mb-4">
      <InstallGuide
        compact
        onHide={() => {
          setHidden(true)
          try {
            localStorage.setItem(HIDE_KEY, '1')
          } catch {
            // nič
          }
        }}
      />
    </div>
  )
}
