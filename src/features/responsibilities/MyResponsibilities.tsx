import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Gauge, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchMyResponsibilityTasks, responsibilityKeys } from './api'

/** Na Prehľade: čo mám urobiť zo svojich zodpovedností (odčítať hodiny, skontrolovať case). Bez úloh sa nezobrazí. */
export function MyResponsibilities({ companyId }: { companyId: string }) {
  const tasks = useQuery({ queryKey: responsibilityKeys.mine(companyId), queryFn: () => fetchMyResponsibilityTasks(companyId), retry: false, staleTime: 5 * 60_000 })
  if (!tasks.data || tasks.data.length === 0) return null
  return (
    <section aria-labelledby="my-responsibilities-heading" className="mb-6 rounded-xl border border-accent/40 bg-surface p-4">
      <h2 id="my-responsibilities-heading" className="mb-2 flex items-center gap-2 font-medium">
        <UserCheck className="size-5 text-accent" aria-hidden />
        Moje zodpovednosti
      </h2>
      <ul className="flex flex-col gap-2 text-sm">
        {tasks.data.map((task) => {
          const Icon = task.task === 'hours' ? Gauge : ClipboardCheck
          return (
            <li key={`${task.responsibilityId}-${task.task}`}>
              <Link to={task.task === 'hours' ? '/equipment' : '/cases'} className="flex items-start gap-2 rounded-lg p-2 hover:bg-muted">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-medium">
                    {task.task === 'hours' ? 'Odčítať prevádzkové hodiny' : 'Skontrolovať case'} – {task.name} ({task.dueCount})
                  </span>
                  <span className="block truncate text-muted-foreground">{task.items.join(', ')}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
