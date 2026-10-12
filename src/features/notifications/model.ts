import { needsRestock, serviceState, type Equipment } from '@/features/equipment/model'
import { isAwaitingIssue, isOverdue, type Loan } from '@/features/loans/model'
import { isTaskOverdue, type Task } from '@/features/tasks/model'
import { describeDays, upcomingDeadlines, type Vehicle } from '@/features/vehicles/model'

// Upozornenia sú odvodené: vznikajú z aktuálneho stavu údajov a zmiznú, keď sa vec vybaví.

export type Notification = {
  id: string
  /** urgent = už horí; soon = treba sa pripraviť */
  severity: 'urgent' | 'soon'
  title: string
  detail: string
  to: string
}

export type NotificationSources = {
  equipment: Equipment[]
  loans: Loan[]
  tasks: Task[]
  vehicles: Vehicle[]
  /** Pozvánky do firiem čakajúce na prihláseného používateľa. */
  invitations: { id: string; companyName: string }[]
}

export function buildNotifications(sources: NotificationSources, today: string, userId: string): Notification[] {
  const list: Notification[] = []

  for (const invitation of sources.invitations) {
    list.push({ id: `invite-${invitation.id}`, severity: 'soon', title: invitation.companyName, detail: 'pozvánka do firmy', to: '/company/select' })
  }

  for (const loan of sources.loans) {
    if (isOverdue(loan, today)) {
      list.push({ id: `loan-late-${loan.id}`, severity: 'urgent', title: loan.borrower, detail: 'nevrátená technika po termíne', to: `/loans/${loan.id}` })
    } else if (isAwaitingIssue(loan, today)) {
      list.push({ id: `loan-wait-${loan.id}`, severity: 'soon', title: loan.borrower, detail: 'rezervácia čaká na vydanie', to: `/loans/${loan.id}` })
    }
  }

  for (const { vehicle, deadline } of upcomingDeadlines(sources.vehicles, today)) {
    list.push({
      id: `vehicle-${vehicle.id}-${deadline.key}`,
      severity: deadline.state === 'expired' ? 'urgent' : 'soon',
      title: vehicle.plate,
      detail: `${deadline.label} — ${describeDays(deadline.days)}`,
      to: `/vehicles/${vehicle.id}`,
    })
  }

  for (const item of sources.equipment) {
    if (item.status === 'retired') continue
    const service = serviceState(item, today).state
    if (service === 'overdue' || service === 'soon') {
      list.push({
        id: `service-${item.id}`,
        severity: service === 'overdue' ? 'urgent' : 'soon',
        title: item.name,
        detail: service === 'overdue' ? 'servis po termíne' : 'servis do 30 dní',
        to: `/equipment/${item.id}`,
      })
    }
    if (needsRestock(item)) {
      list.push({
        id: `restock-${item.id}`,
        severity: item.quantity === 0 ? 'urgent' : 'soon',
        title: item.name,
        detail: item.quantity === 0 ? 'došlo, treba kúpiť' : `ostáva ${item.quantity} ks, treba kúpiť`,
        to: `/equipment/${item.id}`,
      })
    }
  }

  // Úlohy iba vlastné: cudzie termíny nie sú moje upozornenie.
  for (const task of sources.tasks) {
    if (task.assigneeId === userId && isTaskOverdue(task, today)) {
      list.push({ id: `task-${task.id}`, severity: 'urgent', title: task.title, detail: 'vaša úloha je po termíne', to: '/todos' })
    }
  }

  return list.sort((a, b) => Number(b.severity === 'urgent') - Number(a.severity === 'urgent'))
}
