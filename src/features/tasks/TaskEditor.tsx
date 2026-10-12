import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import type { Member } from '@/features/companies/api'
import { PRIORITIES, PRIORITY_LABELS } from '@/lib/priority'
import { deleteTask, saveTask, taskKeys } from './api'
import { TASK_STATUS_LABELS, TASK_STATUSES, taskSchema, type Task, type TaskFormValues } from './model'

type Props = {
  companyId: string
  /** null = nová úloha */
  task: Task | null
  members: Member[]
  /** Komu sa nová úloha predvolene priradí. */
  defaultAssigneeId: string
  canDelete: boolean
  onClose: () => void
}

/** Formulár na novú úlohu alebo úpravu existujúcej, zobrazený priamo v zozname. */
export function TaskEditor({ companyId, task, members, defaultAssigneeId, canDelete, onClose }: Props) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      note: task?.note ?? '',
      assigneeId: task ? (task.assigneeId ?? '') : defaultAssigneeId,
      priority: task?.priority ?? 'normal',
      dueOn: task?.dueOn ?? '',
      status: task?.status ?? 'open',
    },
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: taskKeys.list(companyId) })
  const save = useMutation({
    mutationFn: (values: TaskFormValues) => saveTask(companyId, task?.id ?? null, values),
    onSuccess: async () => {
      await refresh()
      onClose()
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteTask(companyId, task!.id),
    onSuccess: async () => {
      await refresh()
      onClose()
    },
  })

  return (
    <form
      onSubmit={handleSubmit((values) => save.mutate(values))}
      noValidate
      className="flex flex-col gap-3 rounded-xl border bg-surface p-4"
    >
      <Field label="Čo treba spraviť *" autoFocus error={errors.title?.message} {...register('title')} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Kto" error={errors.assigneeId?.message} {...register('assigneeId')}>
          <option value="">— nikto konkrétny —</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.fullName || member.email}
            </option>
          ))}
        </SelectField>
        <SelectField label="Priorita" error={errors.priority?.message} {...register('priority')}>
          {PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <Field label="Termín" type="date" error={errors.dueOn?.message} {...register('dueOn')} />
        <SelectField label="Stav" error={errors.status?.message} {...register('status')}>
          {TASK_STATUSES.map((value) => (
            <option key={value} value={value}>
              {TASK_STATUS_LABELS[value]}
            </option>
          ))}
        </SelectField>
      </div>
      <TextareaField label="Poznámka" rows={2} error={errors.note?.message} {...register('note')} />

      {(save.isError || remove.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Zmena sa nepodarila. Skúste to znova.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending ? 'Ukladám…' : 'Uložiť'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Zrušiť
        </Button>
        {task && canDelete && (
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm('Odstrániť túto úlohu?')) remove.mutate()
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Odstrániť
          </Button>
        )}
      </div>
    </form>
  )
}
