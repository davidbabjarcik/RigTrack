import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Columns3, List, Pencil, Plus, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { createPostEventTasks, setTaskStatus, taskKeys, updateTaskFields } from './api'
import { assigneesOf, isTaskOverdue, isTaskStale, priorityColor, TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TASK_STATUSES, type Task, type TaskStatus } from './model'
import { BOARD_BY_LABELS, boardColumns, boardKey, canDragBy, filterTasks, NO_TASK_FILTER, sortTaskList, TASK_SORT_LABELS, type BoardBy, type TaskFilter, type TaskSort } from './board'
import { TaskKanban } from './TaskKanban'
import { TaskTemplatesSection } from './TaskTemplatesSection'
import { TaskEditor } from './TaskEditor'
import { useTasks } from './useTasks'
import { tx, tf } from '@/lib/i18n'

const FILTER_KEY = 'rigtrack.tasks.filter'

function savedFilter(): TaskFilter {
  try {
    const saved = sessionStorage.getItem(FILTER_KEY)
    return saved ? { ...NO_TASK_FILTER, ...(JSON.parse(saved) as TaskFilter) } : NO_TASK_FILTER
  } catch {
    return NO_TASK_FILTER
  }
}

const extraCount = (filter: TaskFilter) => [filter.person, filter.category, filter.priority, filter.status, filter.due, filter.fill].filter(Boolean).length

export function TodosPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session!.user.id
  const canEdit = can(company, 'tasks.edit')
  const queryClient = useQueryClient()
  const tasks = useTasks(companyId)
  const members = useMembers(companyId)
  const [filter, setFilter] = useState<TaskFilter>(savedFilter)
  const [more, setMore] = useState(() => extraCount(savedFilter()) > 0)
  const set = (patch: Partial<TaskFilter>) => setFilter((current) => ({ ...current, ...patch }))
  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(filter))
    } catch {
      // Bez úložiska sa filter len nezapamätá.
    }
  }, [filter])
  const { prefs, update } = useUserPrefs()
  const view = prefs.tasksView ?? 'list'
  const boardBy: BoardBy = prefs.tasksBoardBy ?? 'status'
  const sort: TaskSort = prefs.tasksSort ?? 'smart'
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

  // Presun v kanbane mení to, podľa čoho sú stĺpce (stav, priorita, kategória, kto).
  const move = useMutation({
    mutationFn: ({ task, column }: { task: Task; column: string }) =>
      boardBy === 'status'
        ? setTaskStatus(companyId, task.id, column as TaskStatus)
        : boardBy === 'priority'
          ? updateTaskFields(companyId, task.id, { priority: column })
          : boardBy === 'category'
            ? updateTaskFields(companyId, task.id, { category: column })
            : updateTaskFields(companyId, task.id, { assigneeId: column || null }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(companyId) }),
  })
  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setTaskStatus(companyId, id, done ? 'done' : 'open'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.list(companyId) }),
  })

  const all = tasks.data ?? []
  const categories = [...new Set(all.map((task) => task.category ?? '').filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sk'))
  // Kanban podľa stavu ukazuje aj stĺpec Hotovo, preto tam filter stavu nechá všetky.
  const effective = view === 'kanban' && boardBy === 'status' && filter.status === '' ? { ...filter, status: 'all' as const } : filter
  const visible = sortTaskList(filterTasks(all, effective, userId, today), sort, today)
  const stale = visible.filter((task) => isTaskStale(task, today))
  const fillCount = filterTasks(all, { ...NO_TASK_FILTER, scope: filter.scope, fill: true }, userId, today).length
  const people = (members.data ?? []).map((member) => ({ id: member.userId, name: member.fullName || member.email }))
  const columns = boardColumns(boardBy, visible, people, (value) => priorityColor(value, prefs.priorityColors))
  const extra = extraCount(filter)

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
              {' '}{tx('· do')}{' '}{formatDate(task.dueOn)}
              {isTaskOverdue(task, today) && tx(' (po termíne)')}
            </span>
          )}
        </p>
        {isTaskStale(task, today) && <p className="text-sm text-accent">{tx('Visí viac ako mesiac')}</p>}
        {task.eventId && (
          <Link to={`/events/${task.eventId}`} className="text-sm text-accent hover:underline">{tx('Otvoriť event')}</Link>
        )}
        {task.note && <p className={cn('mt-1 text-sm whitespace-pre-wrap', compact && 'line-clamp-3')}>{task.note}</p>}
        {task.link && (
          <Link to={task.link} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">{tx('Otvoriť a doplniť')}</Link>
        )}
      </div>
      {canEdit && (
        <Button variant="ghost" size="sm" aria-label={tf('Upraviť: {0}', task.title)} onClick={() => setEditing(task.id)}>
          <Pencil className="size-4" aria-hidden />
        </Button>
      )}
    </div>
  )

  return (
    <>
      <PageHeader
        title={tx('Úlohy')}
        description={tx('Čo treba spraviť a kto to má na starosti')}
        action={
          canEdit &&
          editing !== 'new' && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />{tx('Nová')}</Button>
          )
        }
      />

      {editing === 'new' && <div className="mb-4">{editor(null)}</div>}

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2" role="group" aria-label={tx('Čie úlohy')}>
            {(
              [
                ['mine', 'Moje'],
                ['all', tx('Všetky')],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter.scope === value}
                onClick={() => set({ scope: value })}
                className={cn('h-9 rounded-lg border px-3 text-sm font-medium', filter.scope === value ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
              >
                {label}
              </button>
            ))}
          </div>
          {fillCount > 0 && (
            <button
              type="button"
              aria-pressed={filter.fill}
              onClick={() => set({ fill: !filter.fill })}
              className={cn('h-9 rounded-lg border px-3 text-sm font-medium', filter.fill ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
            >{tx('Doplniť (')}{fillCount})
            </button>
          )}
          <Field label={tx('Hľadať')} hideLabel type="search" placeholder={tx('Hľadať v úlohách')} className="min-w-40 flex-1" value={filter.search} onChange={(e) => set({ search: e.target.value })} />
          <Button variant="outline" aria-expanded={more} onClick={() => setMore(!more)}>
            <SlidersHorizontal className="size-4" aria-hidden />{tx('Filter a triedenie')}{extra > 0 && ` (${extra})`}
          </Button>
          <div className="flex gap-1 rounded-lg border bg-surface p-1" role="group" aria-label={tx('Zobrazenie')}>
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
        </div>
        {view === 'kanban' && (
          <div className="flex flex-wrap items-center gap-1 text-sm" role="group" aria-label={tx('Stĺpce kanbanu podľa')}>
            <span className="mr-1 text-muted-foreground">{tx('Stĺpce podľa:')}</span>
            {(Object.keys(BOARD_BY_LABELS) as BoardBy[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={boardBy === value}
                onClick={() => update({ tasksBoardBy: value })}
                className={cn('h-8 rounded-lg border px-3 font-medium', boardBy === value ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
              >
                {tx(BOARD_BY_LABELS[value])}
              </button>
            ))}
          </div>
        )}
        {more && (
          <div className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField label={tx('Triediť')} value={sort} onChange={(e) => update({ tasksSort: e.target.value as TaskSort })}>
              {(Object.keys(TASK_SORT_LABELS) as TaskSort[]).map((value) => (
                <option key={value} value={value}>
                  {tx(TASK_SORT_LABELS[value])}
                </option>
              ))}
            </SelectField>
            <SelectField label={tx('Stav')} value={filter.status} onChange={(e) => set({ status: e.target.value as TaskFilter['status'] })}>
              <option value="">{tx('Nehotové')}</option>
              {TASK_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {tx(TASK_STATUS_LABELS[value])}
                </option>
              ))}
              <option value="all">{tx('Všetky aj hotové')}</option>
            </SelectField>
            <SelectField label={tx('Priorita')} value={filter.priority} onChange={(e) => set({ priority: e.target.value })}>
              <option value="">{tx('Každá')}</option>
              {TASK_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {tx(TASK_PRIORITY_LABELS[value])}
                </option>
              ))}
            </SelectField>
            <SelectField label={tx('Kategória')} value={filter.category} onChange={(e) => set({ category: e.target.value })}>
              <option value="">{tx('Všetky')}</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </SelectField>
            <SelectField label={tx('Kto')} value={filter.person} onChange={(e) => set({ person: e.target.value, ...(e.target.value ? { scope: 'all' as const } : {}) })}>
              <option value="">{tx('Ktokoľvek')}</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </SelectField>
            <SelectField label={tx('Termín')} value={filter.due} onChange={(e) => set({ due: e.target.value as TaskFilter['due'] })}>
              <option value="">{tx('Kedykoľvek')}</option>
              <option value="overdue">{tx('Po termíne')}</option>
              <option value="today">{tx('Dnes')}</option>
              <option value="week">{tx('Do 7 dní')}</option>
              <option value="later">{tx('Neskôr')}</option>
              <option value="none">{tx('Bez termínu')}</option>
            </SelectField>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={filter.fill} onChange={(e) => set({ fill: e.target.checked })} />{tx('Len „Doplniť“ (z @todo / 31121800)')}</label>
            {extra > 0 && (
              <button type="button" className="self-center text-left text-sm text-accent hover:underline" onClick={() => setFilter({ ...NO_TASK_FILTER, scope: filter.scope, search: filter.search })}>{tx('Zrušiť filter')}</button>
            )}
          </div>
        )}
      </div>

      {stale.length > 0 && (
        <p role="status" className="mb-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <strong>{stale.length === 1 ? tx('1 úloha visí') : tf('{0} úlohy visia', stale.length)}{' '}{tx('dlhšie ako mesiac.')}</strong>{' '}{tx('Dokončite ich, posuňte termín alebo ich zrušte.')}</p>
      )}
      {(postEvent.data ?? 0) > 0 && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">{tx('Po skončených eventoch pribudlo úloh:')}{' '}{postEvent.data}.
        </p>
      )}

      {tasks.isPending ? (
        <LoadingBlock />
      ) : tasks.isError ? (
        <ErrorBlock message={tx('Úlohy sa nepodarilo načítať.')} onRetry={() => void tasks.refetch()} />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">{extra > 0 || filter.search ? tx('Filtru nič nezodpovedá') : filter.scope === 'mine' ? tx('Nemáte žiadne otvorené úlohy') : tx('Žiadne otvorené úlohy')}</p>
          {filter.scope === 'mine' && all.some((task) => task.status !== 'done') && (
            <button type="button" className="mt-2 text-sm text-accent hover:underline" onClick={() => set({ scope: 'all' })}>{tx('Zobraziť úlohy všetkých')}</button>
          )}
        </div>
      ) : (
        view === 'kanban' ? (
          <TaskKanban
            tasks={visible}
            columns={columns}
            columnOf={(task) => boardKey(task, boardBy, today)}
            onMove={canEdit && canDragBy(boardBy) ? (task, column) => move.mutate({ task, column }) : undefined}
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
        <p role="alert" className="mt-2 text-sm text-destructive">{tx('Zmena sa nepodarila.')}</p>
      )}

      <div className="mt-8">
        <TaskTemplatesSection companyId={companyId} canEdit={canEdit} />
      </div>
    </>
  )
}
