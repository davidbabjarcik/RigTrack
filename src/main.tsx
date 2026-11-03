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
import './lib/theme'
import './styles/index.css'

// Funkčné údaje sa do prehliadača nezapíšu bez súhlasu (ešte pred prvým renderom).
installStorageGuard()
installErrorReporting()

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CompanyProvider>
          <RouterProvider router={router} />
          <ConsentBanner />
        </CompanyProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
