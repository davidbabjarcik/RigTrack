import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { AuthProvider } from './features/auth/AuthProvider'
import { CompanyProvider } from './features/companies/CompanyProvider'
import { installErrorReporting } from './lib/errorReporting'
import { installStorageGuard } from './lib/consent'
import { ConsentBanner } from './components/consent/ConsentBanner'
import { i18nReady, useLangKey } from './lib/i18n'
import './lib/theme'
import './styles/index.css'

// Funkčné údaje sa do prehliadača nezapíšu bez súhlasu (ešte pred prvým renderom).
installStorageGuard()
installErrorReporting()

const queryClient = new QueryClient()

/** Pri zmene jazyka sa obrazovky vykreslia nanovo (texty zo slovníka sa čítajú pri vykreslení). */
function Screens() {
  return (
    <div key={useLangKey()} className="contents">
      <RouterProvider router={router} />
      <ConsentBanner />
    </div>
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
