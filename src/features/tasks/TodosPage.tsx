import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Columns3, List, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useUserPrefs } from '@/features/settings/userPrefs'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { formatDate, todayIso } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { createPostEventTasks, setTaskStatus, taskKeys } from './api'
import { assigneesOf, isAssignedTo, isTaskOverdue, isTaskStale, priorityColor, sortTasks, TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type Task, type TaskPriority, type TaskStatus } from './model'
import { TaskKanban } from './TaskKanban'
import { TaskTemplatesSection } from './TaskTemplatesSection'
import { TaskEditor } from './TaskEditor'
import { useTasks } from './useTasks'

type Scope = 'mine' | 'all'

export function TodosPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session!.user.id
  const canEdit = can(company, 'tasks.edit')
  const queryClient = useQueryClient()
  const tasks = useTasks(companyId)
  const members = useMembers(companyId)
  const [scope, setScope] = useState<Scope>('mine')
  const [showDone, setShowDone] = useState(false)
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<TaskPriority | ''>('')
  const [person, setPerson] = useState('')
  const [search, setSearch] = useState('')
  const { prefs, update } = useUserPrefs()
  const view = prefs.tasksView ?? 'list'
  // Po skončených eventoch sa úlohy zo šablón založia samé (raz za načítanie stránky).
  const postEvent = useQuery({
    queryKey: ['company', companyId, 'tasks', 'post-event'],
    queryFn: async () => {
      const created = await createPostEventTasks(companyId)
      if (created > 0) await queryClient.invalidateQueries({ queryKey: taskKeys.list(companyId) })
      return created
    },
    retry: false,
    staleTime: 10 * 60_000,
  })
  // 'new' = formulár novej úlohy, inak id upravovanej úlohy
  const [editing, setEditing] = useState<string | null>(null)
  const today = todayIso()

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => setTaskStatus(companyId, id, status),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(companyId) }),
  })
  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setTaskStatus(companyId, id, done ? 'done' : 'open'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(companyId) }),
  })

  const all = sortTasks(tasks.data ?? [], today)
  const categories = [...new Set(all.map((task) => task.category ?? '').filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sk'))
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  const scoped = (scope === 'mine' ? all.filter((task) => isAssignedTo(task, userId)) : all).filter(
    (task) =>
      (!category || task.category === category) &&
      (!priority || task.priority === priority) &&
      (!person || isAssignedTo(task, person)) &&
      words.every((word) => `${task.title} ${task.note}`.toLowerCase().includes(word)),
  )
  const stale = scoped.filter((task) => isTaskStale(task, today))
  const open = scoped.filter((task) => task.status !== 'done')
  const done = scoped.filter((task) => task.status === 'done')
  const visible = showDone ? scoped : open

  const editor = (task: (typeof all)[number] | null) => (
    <TaskEditor
      companyId={companyId}
      task={task}
      members={members.data ?? []}
      defaultAssigneeId={userId}
      // Mazať smie admin a skladník, a každý svoju vlastnú úlohu (rovnako to stráži databáza).
      canDelete={can(company, 'tasks.delete') || task?.createdBy === userId}
      onClose={() => setEditing(null)}
    />
  )

  const card = (task: Task, compact: boolean) => (
    <div className="flex items-start gap-3 rounded-xl border border-l-4 bg-surface px-4 py-3" style={{ borderLeftColor: priorityColor(task.priority, prefs.priorityColors) }}>
      <input
        type="checkbox"
        className="mt-1 size-5 shrink-0 accent-(--accent)"
        aria-label={`Hotovo: ${task.title}`}
        checked={task.status === 'done'}
        disabled={!canEdit || toggle.isPending}
        onChange={(e) => toggle.mutate({ id: task.id, done: e.target.checked })}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium break-words', task.status === 'done' && 'text-muted-foreground line-through')}>{task.title}</p>
        <p className="text-sm text-muted-foreground">
          {task.priority !== 'none' && (
            <span className="mr-1 inline-flex items-center gap-1 font-medium" style={{ color: priorityColor(task.priority, prefs.priorityColors) }}>
              <span className="size-2 rounded-full" style={{ background: priorityColor(task.priority, prefs.priorityColors) }} aria-hidden />
              {TASK_PRIORITY_LABELS[task.priority].toLowerCase()}
              {' · '}
            </span>
          )}
          {[
            assigneesOf(task)
              .map((id) => memberName(members.data, id))
              .filter(Boolean)
              .join(', '),
            task.category,
            !compact && task.status === 'in_progress' && TASK_STATUS_LABELS.in_progress,
          ]
            .filter(Boolean)
            .join(' · ')}
          {task.dueOn && (
            <span className={isTaskOverdue(task, today) ? 'text-destructive' : undefined}>
              {' '}
              · do {formatDate(task.dueOn)}
              {isTaskOverdue(task, today) && ' (po termíne)'}
            </span>
          )}
        </p>
        {isTaskStale(task, today) && <p className="text-sm text-accent">Visí viac ako mesiac</p>}
        {task.eventId && (
          <Link to={`/events/${task.eventId}`} className="text-sm text-accent hover:underline">
            Otvoriť event
          </Link>
        )}
        {task.note && <p className={cn('mt-1 text-sm whitespace-pre-wrap', compact && 'line-clamp-3')}>{task.note}</p>}
        {task.link && (
          <Link to={task.link} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            Otvoriť a doplniť
          </Link>
        )}
      </div>
      {canEdit && (
        <Button variant="ghost" size="sm" aria-label={`Upraviť: ${task.title}`} onClick={() => setEditing(task.id)}>
          <Pencil className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  )

  return (
    <>
      <PageHeader
        title="Úlohy"
        description="Čo treba spraviť a kto to má na starosti"
        action={
          canEdit &&
          editing !== 'new' && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />
              Nová
            </Button>
          )
        }
      />

      {editing === 'new' && <div className="mb-4">{editor(null)}</div>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-2" role="group" aria-label="Čie úlohy">
          {(
            [
              ['mine', 'Moje'],
              ['all', 'Všetky'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={scope === value}
              onClick={() => setScope(value)}
              className={cn(
                'h-9 rounded-lg border px-3 text-sm font-medium',
                scope === value ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <SelectField label="Kategória" hideLabel className="w-44" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Všetky kategórie</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
        )}
        <SelectField label="Priorita" hideLabel className="w-40" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority | '')}>
          <option value="">Každá priorita</option>
          {TASK_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {TASK_PRIORITY_LABELS[value]}
            </option>
          ))}
        </SelectField>
        {scope === 'all' && (members.data ?? []).length > 1 && (
          <SelectField label="Kto" hideLabel className="w-44" value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">Ktokoľvek</option>
            {(members.data ?? []).map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.fullName || member.email}
              </option>
            ))}
          </SelectField>
        )}
        <Field label="Hľadať" hideLabel type="search" placeholder="Hľadať v úlohách" className="w-full sm:w-52" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1 rounded-lg border bg-surface p-1" role="group" aria-label="Zobrazenie">
          {(
            [
              ['list', 'Zoznam', List],
              ['kanban', 'Kanban', Columns3],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => update({ tasksView: value })}
              className={cn('flex h-7 items-center gap-1 rounded-md px-2 text-sm', view === value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" className="size-4 accent-(--accent)" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          aj hotové ({done.length})
        </label>
      </div>

      {stale.length > 0 && (
        <p role="status" className="mb-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <strong>{stale.length === 1 ? '1 úloha visí' : `${stale.length} úlohy visia`} dlhšie ako mesiac.</strong> Dokončite ich, posuňte termín alebo ich zrušte.
        </p>
      )}
      {(postEvent.data ?? 0) > 0 && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          Po skončených eventoch pribudlo úloh: {postEvent.data}.
        </p>
      )}

      {tasks.isPending ? (
        <LoadingBlock />
      ) : tasks.isError ? (
        <ErrorBlock message="Úlohy sa nepodarilo načítať." onRetry={() => void tasks.refetch()} />
      ) : (view === 'kanban' ? scoped.length === 0 : visible.length === 0) ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">{scope === 'mine' ? 'Nemáte žiadne otvorené úlohy' : 'Žiadne otvorené úlohy'}</p>
          {scope === 'mine' && all.some((task) => task.status !== 'done') && (
            <button type="button" className="mt-2 text-sm text-accent hover:underline" onClick={() => setScope('all')}>
              Zobraziť úlohy všetkých
            </button>
          )}
        </div>
      ) : (
        view === 'kanban' ? (
          <TaskKanban
            tasks={scoped}
            showDone={showDone}
            canEdit={canEdit}
            colors={prefs.priorityColors}
            onMove={(id, status) => move.mutate({ id, status })}
            renderCard={(task) => (editing === task.id ? editor(task) : card(task, true))}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {visible.map((task) => (
              <li key={task.id}>{editing === task.id ? editor(task) : card(task, false)}</li>
            ))}
          </ul>
        )
      )}

      {toggle.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zmena sa nepodarila.
        </p>
      )}

      <div className="mt-8">
        <TaskTemplatesSection companyId={companyId} canEdit={canEdit} />
      </div>
    </>
  )
}
