import type { ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { BackendRequired } from '@/components/feedback/BackendRequired'
import { AppLayout } from '@/components/layout/AppLayout'
import { CenteredLayout } from '@/components/layout/CenteredLayout'
import { AuthPage } from '@/features/auth/AuthPage'
import { UpdatePasswordPage } from '@/features/auth/UpdatePasswordPage'
import { CompanyCreatePage } from '@/features/companies/CompanyCreatePage'
import { CompanySelectPage } from '@/features/companies/CompanySelectPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { CustomizeMenuPage } from './pages/CustomizeMenuPage'
import { DashboardPage } from './pages/DashboardPage'
import { MorePage } from './pages/MorePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteErrorPage } from './pages/RouteErrorPage'
import { RequireAuth, RequireCompany } from './route-guards'

// Obrazovky modulov sa sťahujú až pri prvom otvorení, aby úvodný bundle ostal malý.
const lazyPage = (load: () => Promise<ComponentType>) => async () => {
  const Page = await load()
  return {
    element: (
      <BackendRequired>
        <Page />
      </BackendRequired>
    ),
  }
}

const equipmentList = lazyPage(() => import('@/features/equipment/EquipmentListPage').then((m) => m.EquipmentListPage))
const equipmentDetail = lazyPage(() => import('@/features/equipment/EquipmentDetailPage').then((m) => m.EquipmentDetailPage))
const equipmentForm = lazyPage(() => import('@/features/equipment/EquipmentFormPage').then((m) => m.EquipmentFormPage))
const cableSet = lazyPage(() => import('@/features/equipment/CableSetPage').then((m) => m.CableSetPage))
const casesList = lazyPage(() => import('@/features/cases/CasesListPage').then((m) => m.CasesListPage))
const caseDetail = lazyPage(() => import('@/features/cases/CaseDetailPage').then((m) => m.CaseDetailPage))
const caseForm = lazyPage(() => import('@/features/cases/CaseFormPage').then((m) => m.CaseFormPage))
const caseLabel = lazyPage(() => import('@/features/cases/CaseLabelPage').then((m) => m.CaseLabelPage))
const caseContent = lazyPage(() => import('@/features/cases/CaseContentSheetPage').then((m) => m.CaseContentSheetPage))
const vehiclesList = lazyPage(() => import('@/features/vehicles/VehiclesListPage').then((m) => m.VehiclesListPage))
const vehicleDetail = lazyPage(() => import('@/features/vehicles/VehicleDetailPage').then((m) => m.VehicleDetailPage))
const vehicleForm = lazyPage(() => import('@/features/vehicles/VehicleFormPage').then((m) => m.VehicleFormPage))
const loansList = lazyPage(() => import('@/features/loans/LoansListPage').then((m) => m.LoansListPage))
const loanDetail = lazyPage(() => import('@/features/loans/LoanDetailPage').then((m) => m.LoanDetailPage))
const loanForm = lazyPage(() => import('@/features/loans/LoanFormPage').then((m) => m.LoanFormPage))
const serviceList = lazyPage(() => import('@/features/service/ServiceListPage').then((m) => m.ServiceListPage))
const serviceForm = lazyPage(() => import('@/features/service/ServiceFormPage').then((m) => m.ServiceFormPage))
const todos = lazyPage(() => import('@/features/tasks/TodosPage').then((m) => m.TodosPage))
const shopping = lazyPage(() => import('@/features/shopping/ShoppingPage').then((m) => m.ShoppingPage))
const calendar = lazyPage(() => import('@/features/calendar/CalendarPage').then((m) => m.CalendarPage))
const suggestions = lazyPage(() => import('@/features/suggestions/SuggestionsPage').then((m) => m.SuggestionsPage))
const notifications = lazyPage(() => import('@/features/notifications/NotificationsPage').then((m) => m.NotificationsPage))
const stats = lazyPage(() => import('@/features/stats/StatsPage').then((m) => m.StatsPage))
const eventsList = lazyPage(() => import('@/features/events/EventsListPage').then((m) => m.EventsListPage))
const eventDetail = lazyPage(() => import('@/features/events/EventDetailPage').then((m) => m.EventDetailPage))
const eventForm = lazyPage(() => import('@/features/events/EventFormPage').then((m) => m.EventFormPage))
const audit = lazyPage(() => import('@/features/audit/AuditPage').then((m) => m.AuditPage))
const ordersList = lazyPage(() => import('@/features/orders/OrdersListPage').then((m) => m.OrdersListPage))
const orderDetail = lazyPage(() => import('@/features/orders/OrderDetailPage').then((m) => m.OrderDetailPage))
const orderForm = lazyPage(() => import('@/features/orders/OrderFormPage').then((m) => m.OrderFormPage))

export const routes: RouteObject[] = [
  {
    element: <CenteredLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: 'auth', element: <AuthPage /> },
      { path: 'auth/update-password', element: <UpdatePasswordPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <CenteredLayout />,
        children: [
          { path: 'company/select', element: <BackendRequired><CompanySelectPage /></BackendRequired> },
          { path: 'company/create', element: <BackendRequired><CompanyCreatePage /></BackendRequired> },
        ],
      },
      {
        element: <RequireCompany />,
        children: [
          {
            path: '/',
            element: <AppLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'settings', element: <BackendRequired><SettingsPage /></BackendRequired> },
              { path: 'equipment', lazy: equipmentList },
              { path: 'equipment/new', lazy: equipmentForm },
              { path: 'equipment/new-cables', lazy: cableSet },
              { path: 'equipment/:id', lazy: equipmentDetail },
              { path: 'equipment/:id/edit', lazy: equipmentForm },
              { path: 'cases', lazy: casesList },
              { path: 'cases/new', lazy: caseForm },
              { path: 'cases/:id', lazy: caseDetail },
              { path: 'cases/:id/edit', lazy: caseForm },
              { path: 'cases/:id/label', lazy: caseLabel },
              { path: 'cases/:id/content', lazy: caseContent },
              { path: 'vehicles', lazy: vehiclesList },
              { path: 'vehicles/new', lazy: vehicleForm },
              { path: 'vehicles/:id', lazy: vehicleDetail },
              { path: 'vehicles/:id/edit', lazy: vehicleForm },
              { path: 'loans', lazy: loansList },
              { path: 'loans/new', lazy: loanForm },
              { path: 'loans/:id', lazy: loanDetail },
              { path: 'service', lazy: serviceList },
              { path: 'service/new', lazy: serviceForm },
              { path: 'service/:id', lazy: serviceForm },
              { path: 'todos', lazy: todos },
              { path: 'shopping', lazy: shopping },
              { path: 'calendar', lazy: calendar },
              { path: 'suggestions', lazy: suggestions },
              { path: 'notifications', lazy: notifications },
              { path: 'stats', lazy: stats },
              { path: 'events', lazy: eventsList },
              { path: 'events/new', lazy: eventForm },
              { path: 'events/:id', lazy: eventDetail },
              { path: 'events/:id/edit', lazy: eventForm },
              { path: 'audit', lazy: audit },
              { path: 'orders', lazy: ordersList },
              { path: 'orders/new', lazy: orderForm },
              { path: 'orders/:id', lazy: orderDetail },
              { path: 'more', element: <MorePage /> },
              { path: 'more/customize', element: <CustomizeMenuPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
