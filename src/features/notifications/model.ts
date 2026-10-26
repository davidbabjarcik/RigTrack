import { hoursState, needsRestock, serviceState, type Equipment } from '@/features/equipment/model'
import { isAwaitingIssue, isOverdue, type Loan } from '@/features/loans/model'
import { isAssignedTo, isTaskOverdue, isTaskStale, type Task } from '@/features/tasks/model'
import type { Responsibility } from '@/features/responsibilities/api'
import { describeDays, upcomingDeadlines, type Vehicle } from '@/features/vehicles/model'

// Upozornenia sú odvodené: vznikajú z aktuálneho stavu údajov a zmiznú, keď sa vec vybaví.

export type Notification = {
  id: string
  /** urgent = už horí; soon = treba sa pripraviť */
  severity: 'urgent' | 'soon'
  title: string
  detail: string
  to: string
  /** Technika, ktorej sa upozornenie týka (rovnaké upozornenia sa zlúčia). */
  equipmentId?: string
  /** Koľko rovnakých upozornení je zlúčených do jedného (napr. Beam 7R v 8 cases). */
  count?: number
  /** Koľko kusov techniky sa upozornenie týka (16 ks v 8 cases). */
  pieces?: number
}

export type NotificationSources = {
  equipment: Equipment[]
  loans: Loan[]
  tasks: Task[]
  vehicles: Vehicle[]
  /** Pozvánky do firiem čakajúce na prihláseného používateľa. */
  invitations: { id: string; companyName: string }[]
  /** Zodpovednosti (0089): technika, za ktorú niekto zodpovedá, sa pripomína len jemu. */
  responsibilities?: Pick<Responsibility, 'kinds' | 'caseIds' | 'memberIds'>[]
}

/** Je to moja starosť? Ak za techniku (druh alebo case) niekto zodpovedá, len jeho; inak všetkých. */
export function concernsMe(item: Pick<Equipment, 'kind' | 'caseId'>, responsibilities: NotificationSources['responsibilities'], userId: string) {
  const owners = (responsibilities ?? []).filter((r) => r.memberIds.length > 0 && (r.kinds.includes(item.kind) || (item.caseId !== null && r.caseIds.includes(item.caseId))))
  return owners.length === 0 || owners.some((r) => r.memberIds.includes(userId))
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
    if (!concernsMe(item, sources.responsibilities, userId)) continue
    const service = serviceState(item, today).state
    if (service === 'overdue' || service === 'soon') {
      list.push({
        id: `service-${item.id}`,
        severity: service === 'overdue' ? 'urgent' : 'soon',
        title: item.name,
        detail: service === 'overdue' ? 'servis po termíne' : 'servis do 30 dní',
        to: `/equipment/${item.id}`,
        equipmentId: item.id,
        pieces: item.quantity,
      })
    }
    const hours = hoursState(item, today).state
    if (hours === 'overdue' || hours === 'soon' || hours === 'unknown') {
      list.push({
        id: `hours-${item.id}`,
        severity: hours === 'soon' ? 'soon' : 'urgent',
        title: item.name,
        detail: hours === 'unknown' ? 'prevádzkové hodiny ešte neboli odčítané' : hours === 'overdue' ? 'treba odčítať prevádzkové hodiny' : 'odčítanie prevádzkových hodín do 30 dní',
        to: `/equipment/${item.id}`,
        equipmentId: item.id,
        pieces: item.quantity,
      })
    }
    if (needsRestock(item)) {
      list.push({
        id: `restock-${item.id}`,
        severity: item.quantity === 0 ? 'urgent' : 'soon',
        title: item.name,
        detail: item.quantity === 0 ? 'došlo, treba kúpiť' : `ostáva ${item.quantity} ks, treba kúpiť`,
        to: `/equipment/${item.id}`,
        equipmentId: item.id,
        pieces: item.quantity,
      })
    }
  }

  // Úlohy iba vlastné: cudzie termíny nie sú moje upozornenie.
  for (const task of sources.tasks) {
    if (isAssignedTo(task, userId) && isTaskOverdue(task, today)) {
      list.push({ id: `task-${task.id}`, severity: 'urgent', title: task.title, detail: 'vaša úloha je po termíne', to: '/todos' })
    } else if (isAssignedTo(task, userId) && isTaskStale(task, today)) {
      list.push({ id: `task-stale-${task.id}`, severity: 'soon', title: task.title, detail: 'vaša úloha visí viac ako mesiac', to: '/todos' })
    }
  }

  // Upozornenie, z ktorého už je otvorená úloha (tlačidlo „Do úloh“), sa neukazuje.
  const inTasks = new Set(sources.tasks.filter((task) => task.status !== 'done' && task.link).map((task) => task.link))
  return mergeSame(list)
    .filter((item) => !inTasks.has(item.to))
    .sort((a, b) => Number(b.severity === 'urgent') - Number(a.severity === 'urgent'))
}

/** Rovnaké upozornenia (napr. tá istá technika rozdelená do 8 cases) ako jedno „Beam 7R (8×)“. */
export function mergeSame(list: Notification[]): Notification[] {
  const merged = new Map<string, Notification & { ids: string[] }>()
  for (const item of list) {
    const key = `${item.title}|${item.detail}`
    const found = merged.get(key)
    if (!found) merged.set(key, { ...item, ids: item.equipmentId ? [item.equipmentId] : [] })
    else {
      found.count = (found.count ?? 1) + 1
      if (item.pieces !== undefined) found.pieces = (found.pieces ?? 0) + item.pieces
      if (item.equipmentId) found.ids.push(item.equipmentId)
      if (item.severity === 'urgent') found.severity = 'urgent'
    }
  }
  return [...merged.values()].map(({ ids, ...item }) => (ids.length > 1 ? { ...item, to: `/equipment/group?ids=${ids.join(',')}` } : item))
}
