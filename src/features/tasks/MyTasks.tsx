import { ListTodo } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate, todayIso } from '@/lib/format'
import { isAssignedTo, isTaskOverdue, sortTasks } from './model'
import { useTasks } from './useTasks'

const SHOWN = 5

/** Moje otvorené úlohy na prehľade; bez úloh sa blok nezobrazí. */
export function MyTasks({ companyId }: { companyId: string }) {
  const userId = useAuth().session?.user.id
  const tasks = useTasks(companyId)
  const today = todayIso()
  const mine = sortTasks(
    (tasks.data ?? []).filter((task) => isAssignedTo(task, userId) && task.status !== 'done'),
    today,
  )
  if (mine.length === 0) return null

  return (
    <section aria-labelledby="my-tasks-heading" className="mb-6 rounded-xl border bg-surface p-4">
      <h2 id="my-tasks-heading" className="mb-2 flex items-center gap-2 font-medium">
        <ListTodo className="size-5 text-accent" aria-hidden />
        <Link to="/todos" className="hover:underline">
          Moje úlohy ({mine.length})
        </Link>
      </h2>
      <ul className="divide-y">
        {mine.slice(0, SHOWN).map((task) => (
          <li key={task.id} className="flex items-center justify-between gap-4 py-2">
            <span className="min-w-0 truncate">{task.title}</span>
            {task.dueOn && (
              <span className={isTaskOverdue(task, today) ? 'shrink-0 text-sm text-destructive' : 'shrink-0 text-sm text-muted-foreground'}>
                do {formatDate(task.dueOn)}
              </span>
            )}
          </li>
        ))}
      </ul>
      {mine.length > SHOWN && (
        <Link to="/todos" className="mt-2 inline-block text-sm text-accent hover:underline">
          a ďalších {mine.length - SHOWN}
        </Link>
      )}
    </section>
  )
}
