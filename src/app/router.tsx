import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { CustomizeMenuPage } from './pages/CustomizeMenuPage'
import { DashboardPage } from './pages/DashboardPage'
import { MorePage } from './pages/MorePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

// Routy modulov, ktoré ešte nemajú vlastnú obrazovku. Pri implementácii modulu
// sa jeho riadky odtiaľto presunú do `routes` nižšie s reálnym komponentom.
const PENDING: [path: string, title: string, description: string][] = [
  ['company/create', 'Nová firma', 'Vytvorenie firmy'],
  ['company/select', 'Výber firmy', 'Prepnutie aktívnej firmy'],
  ['settings', 'Nastavenia', 'Firma, členovia a roly'],
  ['equipment', 'Technika', 'Zoznam techniky'],
  ['equipment/new', 'Nová technika', 'Pridanie kusu techniky'],
  ['equipment/:id', 'Detail techniky', 'Údaje a história kusu techniky'],
  ['equipment/:id/edit', 'Úprava techniky', 'Zmena údajov techniky'],
  ['loans', 'Výpožičky', 'Zoznam výpožičiek'],
  ['loans/new', 'Nová výpožička', 'Vydanie techniky'],
  ['cases', 'Kufre', 'Zoznam kufrov'],
  ['cases/new', 'Nový kufor', 'Pridanie kufra'],
  ['cases/:id', 'Detail kufra', 'Obsah kufra'],
  ['cases/:id/edit', 'Úprava kufra', 'Zmena údajov kufra'],
  ['service', 'Servis', 'Servisné záznamy'],
  ['service/new', 'Nový servisný záznam', 'Zápis servisu'],
  ['events', 'Eventy', 'Zoznam eventov'],
  ['events/new', 'Nový event', 'Vytvorenie eventu'],
  ['events/:id', 'Detail eventu', 'Technika, posádka a dokumenty'],
  ['events/:id/edit', 'Úprava eventu', 'Zmena údajov eventu'],
  ['calendar', 'Kalendár', 'Kalendárový prehľad'],
  ['todos', 'Úlohy', 'Zoznam úloh'],
  ['notifications', 'Notifikácie', 'Upozornenia'],
  ['suggestions', 'Návrhy', 'Návrhy na zlepšenie'],
]

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'more', element: <MorePage /> },
      { path: 'more/customize', element: <CustomizeMenuPage /> },
      ...PENDING.map(([path, title, description]) => ({
        path,
        element: <PlaceholderPage title={title} description={description} />,
      })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
