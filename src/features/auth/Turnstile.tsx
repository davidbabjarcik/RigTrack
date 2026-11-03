import { TURNSTILE_SITE_KEY } from './loginGuard'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Cloudflare Turnstile – overenie, že prihlásenie / registráciu / obnovu hesla robí človek. Token overuje Supabase Auth
// (Attack Protection → CAPTCHA); appka ho len získa a pošle. Site key je verejný (nie je tajomstvo).

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let loading: Promise<TurnstileApi> | null = null
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile sa nenačítal.')))
    script.onerror = () => {
      loading = null
      reject(new Error('Turnstile sa nenačítal.'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export type TurnstileHandle = { reset: () => void }

/**
 * Widget Turnstile; onToken dostane token (alebo null, keď vyprší). Token platí na jeden pokus – po ňom reset().
 * onUnavailable: widget sa nenačítal alebo hlási chybu – formulár sa potom odošle bez tokenu a rozhodne Supabase
 * (so zapnutou CAPTCHA odmietne), takže chyba widgetu nikdy nezamkne prihlásenie, ale ani neobíde ochranu.
 */
export const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string | null) => void; onUnavailable: (unavailable: boolean) => void }>(function Turnstile({ onToken, onUnavailable }, ref) {
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const callback = useRef(onToken)
  const unavailable = useRef(onUnavailable)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    callback.current = onToken
    unavailable.current = onUnavailable
  }, [onToken, onUnavailable])

  useImperativeHandle(ref, () => ({
    reset: () => {
      callback.current(null)
      if (widget.current && window.turnstile) window.turnstile.reset(widget.current)
    },
  }))

  useEffect(() => {
    let alive = true
    loadTurnstile()
      .then((api) => {
        if (!alive || !box.current) return
        const dark = document.documentElement.dataset.theme === 'dark'
        widget.current = api.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: dark ? 'dark' : 'light',
          language: 'sk',
          size: 'flexible',
          callback: (token: string) => {
            unavailable.current(false)
            callback.current(token)
          },
          'expired-callback': () => callback.current(null),
          'error-callback': () => {
            callback.current(null)
            unavailable.current(true)
          },
        })
      })
      .catch(() => {
        if (!alive) return
        setFailed(true)
        unavailable.current(true)
      })
    return () => {
      alive = false
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current)
      widget.current = null
    }
  }, [])

  return (
    <div>
      <div ref={box} className="min-h-[65px]" />
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          Overenie, že nie ste robot, sa nenačítalo. Skontrolujte pripojenie (alebo blokovanie obsahu) a obnovte stránku.
        </p>
      )}
    </div>
  )
})
