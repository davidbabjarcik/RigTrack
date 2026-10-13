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
import type { PermissionKey } from '@/features/permissions/catalog'
import { RequireAuth, RequireCompany, RequirePermission } from './route-guards'

// Obrazovky modulov sa sťahujú až pri prvom otvorení, aby úvodný bundle ostal malý.
const lazyPage = (load: () => Promise<ComponentType>, permission?: PermissionKey) => async () => {
  const Page = await load()
  return {
    element: (
      <BackendRequired>
        <RequirePermission permission={permission}>
          <Page />
        </RequirePermission>
      </BackendRequired>
    ),
  }
}

const equipmentList = lazyPage(() => import('@/features/equipment/EquipmentListPage').then((m) => m.EquipmentListPage), 'equipment.view')
const equipmentDetail = lazyPage(() => import('@/features/equipment/EquipmentDetailPage').then((m) => m.EquipmentDetailPage), 'equipment.view')
const equipmentForm = lazyPage(() => import('@/features/equipment/EquipmentFormPage').then((m) => m.EquipmentFormPage), 'equipment.view')
const cableSet = lazyPage(() => import('@/features/equipment/CableSetPage').then((m) => m.CableSetPage), 'equipment.view')
const casesList = lazyPage(() => import('@/features/cases/CasesListPage').then((m) => m.CasesListPage), 'cases.view')
const caseDetail = lazyPage(() => import('@/features/cases/CaseDetailPage').then((m) => m.CaseDetailPage), 'cases.view')
const caseForm = lazyPage(() => import('@/features/cases/CaseFormPage').then((m) => m.CaseFormPage), 'cases.view')
const caseLabel = lazyPage(() => import('@/features/cases/CaseLabelPage').then((m) => m.CaseLabelPage), 'cases.view')
const caseContent = lazyPage(() => import('@/features/cases/CaseContentSheetPage').then((m) => m.CaseContentSheetPage), 'cases.view')
const vehiclesList = lazyPage(() => import('@/features/vehicles/VehiclesListPage').then((m) => m.VehiclesListPage), 'vehicles.view')
const vehicleDetail = lazyPage(() => import('@/features/vehicles/VehicleDetailPage').then((m) => m.VehicleDetailPage), 'vehicles.view')
const vehicleForm = lazyPage(() => import('@/features/vehicles/VehicleFormPage').then((m) => m.VehicleFormPage), 'vehicles.view')
const loansList = lazyPage(() => import('@/features/loans/LoansListPage').then((m) => m.LoansListPage), 'loans.view')
const loanDetail = lazyPage(() => import('@/features/loans/LoanDetailPage').then((m) => m.LoanDetailPage), 'loans.view')
const loanSheet = lazyPage(() => import('@/features/loans/LoanSheetPage').then((m) => m.LoanSheetPage), 'loans.view')
const loanForm = lazyPage(() => import('@/features/loans/LoanFormPage').then((m) => m.LoanFormPage), 'loans.view')
const serviceList = lazyPage(() => import('@/features/service/ServiceListPage').then((m) => m.ServiceListPage), 'service.view')
const serviceForm = lazyPage(() => import('@/features/service/ServiceFormPage').then((m) => m.ServiceFormPage), 'service.view')
const todos = lazyPage(() => import('@/features/tasks/TodosPage').then((m) => m.TodosPage), 'tasks.view')
const shopping = lazyPage(() => import('@/features/shopping/ShoppingPage').then((m) => m.ShoppingPage), 'shopping.view')
const calendar = lazyPage(() => import('@/features/calendar/CalendarPage').then((m) => m.CalendarPage))
const suggestions = lazyPage(() => import('@/features/suggestions/SuggestionsPage').then((m) => m.SuggestionsPage), 'suggestions.view')
const notifications = lazyPage(() => import('@/features/notifications/NotificationsPage').then((m) => m.NotificationsPage))
const stats = lazyPage(() => import('@/features/stats/StatsPage').then((m) => m.StatsPage))
const eventsList = lazyPage(() => import('@/features/events/EventsListPage').then((m) => m.EventsListPage), 'events.view')
const eventDetail = lazyPage(() => import('@/features/events/EventDetailPage').then((m) => m.EventDetailPage), 'events.view')
const eventForm = lazyPage(() => import('@/features/events/EventFormPage').then((m) => m.EventFormPage), 'events.view')
const audit = lazyPage(() => import('@/features/audit/AuditPage').then((m) => m.AuditPage), 'audit.view')
const warehouse = lazyPage(() => import('@/features/warehouse/WarehousePage').then((m) => m.WarehousePage), 'cases.view')
const recycleBin = lazyPage(() => import('@/features/bin/RecycleBinPage').then((m) => m.RecycleBinPage))
const payouts = lazyPage(() => import('@/features/payouts/PayoutsPage').then((m) => m.PayoutsPage))
const ordersList = lazyPage(() => import('@/features/orders/OrdersListPage').then((m) => m.OrdersListPage), 'orders.view')
const orderDetail = lazyPage(() => import('@/features/orders/OrderDetailPage').then((m) => m.OrderDetailPage), 'orders.view')
const orderForm = lazyPage(() => import('@/features/orders/OrderFormPage').then((m) => m.OrderFormPage), 'orders.view')

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
          // Tlačová listina stojí mimo rozloženia aplikácie, aby sa netlačilo menu.
          { path: 'loans/:id/sheet', lazy: loanSheet },
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
              { path: 'loans/:id/edit', lazy: loanForm },
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
              { path: 'payouts', lazy: payouts },
              { path: 'admin/recycle-bin', lazy: recycleBin },
              { path: 'warehouse', lazy: warehouse },
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
