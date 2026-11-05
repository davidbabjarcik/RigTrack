import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { AuthProvider } from './features/auth/AuthProvider'
import { CompanyProvider } from './features/companies/CompanyProvider'
import { installErrorReporting } from './lib/errorReporting'
import { installStorageGuard } from './lib/consent'
import { ConsentBanner } from './components/consent/ConsentBanner'
import { i18nReady, useLangKey } from './lib/i18n'
import { PRINT_PATH, startDomTranslation } from './lib/domTranslate'
import { UpdatePrompt } from './components/feedback/UpdatePrompt'
import './lib/theme'
import './styles/index.css'

// Funkčné údaje sa do prehliadača nezapíšu bez súhlasu (ešte pred prvým renderom).
installStorageGuard()
installErrorReporting()

const queryClient = new QueryClient()

/** Pri zmene jazyka sa obrazovky vykreslia nanovo (texty zo slovníka sa čítajú pri vykreslení). */
function Screens() {
  const key = useLangKey()
  // V angličtine poistka preloží aj texty, ktoré v kóde nie sú obalené v tx() (okrem tlačových stránok).
  useEffect(() => {
    if (key !== 'en') return
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    return startDomTranslation(document.body, () => PRINT_PATH.test(window.location.pathname.slice(base.length)))
  }, [key])
  return (
    <>
      {/* Nová verzia sa ponúkne na každej stránke (aj pri prihlásení, výbere firmy či tlači). */}
      <UpdatePrompt />
      <div key={key} className="contents">
      <RouterProvider router={router} />
      <ConsentBanner />
      </div>
    </>
  )
}

void i18nReady().finally(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CompanyProvider>
          <Screens />
        </CompanyProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
))
