import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { reportError } from '@/lib/errorReporting'
import { tx } from '@/lib/i18n'
import { isStaleChunkError, reloadForNewVersion } from '@/lib/staleChunks'

/** Záchranná obrazovka, keď niektorá stránka spadne alebo sa nepodarí stiahnuť jej kód. */
export function RouteErrorPage() {
  const error = useRouteError()
  const stale = isStaleChunkError(error)
  useEffect(() => {
    // Starý súbor po novej verzii: stránka sa raz sama obnoví (nie je to chyba appky, nehlási sa).
    if (stale && reloadForNewVersion()) return
    // Chyba sa uloží pre vývojára (Nastavenia → Vývojár → Chyby v appke).
    reportError(error, 'render')
  }, [error, stale])
  return (
    <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-xl font-semibold">{tx('Niečo sa pokazilo')}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{tx('Stránku sa nepodarilo zobraziť. Obnovenie zvyčajne pomôže; ak nie, skúste to o chvíľu znova.')}</p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>{tx('Obnoviť stránku')}</Button>
        <Button variant="outline" onClick={() => window.location.assign(import.meta.env.BASE_URL)}>{tx('Na prehľad')}</Button>
      </div>
    </div>
  )
}
