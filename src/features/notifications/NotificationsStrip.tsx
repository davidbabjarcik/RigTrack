import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing, Check, ChevronRight, CircleAlert, ListPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { companyKeys, fetchMyInvitations } from '@/features/companies/api'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { useLoans } from '@/features/loans/useLoans'
import { useTasks } from '@/features/tasks/useTasks'
import { useVehicles } from '@/features/vehicles/useVehicles'
import { todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useResponsibilities } from '@/features/responsibilities/api'
import { addTodoFromField, taskKeys } from '@/features/tasks/api'
import { buildNotifications, type Notification } from './model'

/** „16 ks“ pri zlúčenej technike (kusy, nie časti), inak „3×“. */
const countLabel = (item: Notification) => (item.count && item.count > 1 ? (item.pieces ? `${item.pieces} ks` : `${item.count}×`) : '')

/** Upozornenia hore v appke (servis, výpožičky, autá, úlohy, pozvánky) – zbalené, klikom sa rozbalia. */
export function NotificationsStrip() {
  const company = useCompany().active!
  const companyId = company.companyId
  const user = useAuth().session!.user
  const [open, setOpen] = useState(false)
  // Upozornenie → moja úloha s vysokou prioritou (s odkazom tam, kam vedie upozornenie).
  const queryClient = useQueryClient()
  const [added, setAdded] = useState<Set<string>>(() => new Set())
  const toTask = useMutation({
    mutationFn: (item: Notification) => {
      const what = item.detail.charAt(0).toUpperCase() + item.detail.slice(1)
      return addTodoFromField(companyId, user.id, `${what} – ${item.title}${countLabel(item) ? ` (${countLabel(item)})` : ''}`, item.to, { category: 'Upozornenie', priority: 'high' })
    },
    onSuccess: (_, item) => {
      setAdded((current) => new Set(current).add(item.id))
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(companyId) })
    },
  })
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId), enabled: can(company, 'equipment.view') })
  const loans = useLoans(companyId)
  const tasks = useTasks(companyId)
  const vehicles = useVehicles(companyId)
  const responsibilities = useResponsibilities(companyId)
  const invitations = useQuery({ queryKey: companyKeys.myInvitations(user.id), queryFn: () => fetchMyInvitations(user.email!) })
  const all = buildNotifications(
    {
      equipment: equipment.data ?? [],
      loans: loans.data ?? [],
      tasks: tasks.data ?? [],
      vehicles: vehicles.data ?? [],
      invitations: invitations.data ?? [],
      responsibilities: responsibilities.data ?? [],
    },
    todayIso(),
    user.id,
  )
  if (all.length === 0) return null
  const canAddTask = can(company, 'tasks.edit')
  const urgent = all.filter((item) => item.severity === 'urgent').length
  const Icon = urgent > 0 ? CircleAlert : BellRing

  return (
    <div className={cn('rounded-xl border p-3 text-sm', urgent > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-accent/40 bg-accent/10')}>
      <button type="button" className="flex w-full items-center gap-2 text-left" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon className={cn('size-4 shrink-0', urgent > 0 ? 'text-destructive' : 'text-accent')} aria-hidden />
        <span className="flex-1 font-medium">
          {all.length === 1 ? '1 upozornenie' : all.length < 5 ? `${all.length} upozornenia` : `${all.length} upozornení`}
          {urgent > 0 && <span className="text-destructive"> · {urgent} naliehavé</span>}
          <span className="font-normal text-muted-foreground"> – {open ? 'skryť' : 'ukázať'}</span>
        </span>
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1">
          {all.map((item) => (
            <li key={item.id}>
              <div className="flex items-center gap-1 rounded-lg hover:bg-muted">
                <Link to={item.to} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5" onClick={() => setOpen(false)}>
                  <span className={cn('size-2 shrink-0 rounded-full', item.severity === 'urgent' ? 'bg-destructive' : 'bg-accent')} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{item.title}</span>
                    {countLabel(item) && <span className="font-medium"> ({countLabel(item)})</span>}
                    <span className="text-muted-foreground"> – {item.detail}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
                {canAddTask && !item.id.startsWith('task-') && !item.id.startsWith('invite-') && (
                  <button
                    type="button"
                    title="Pridať do mojich úloh s vysokou prioritou"
                    disabled={toTask.isPending || added.has(item.id)}
                    onClick={() => toTask.mutate(item)}
                    className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-60"
                  >
                    {added.has(item.id) ? <Check className="size-3.5" aria-hidden /> : <ListPlus className="size-3.5" aria-hidden />}
                    {added.has(item.id) ? 'V úlohách' : 'Do úloh'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
