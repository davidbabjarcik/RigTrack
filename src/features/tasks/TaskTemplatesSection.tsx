import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { cn } from '@/lib/utils'
import { addTaskTemplate, deleteTaskTemplate, fetchTaskTemplates, setTaskTemplateActive, taskKeys } from './api'

/** Úlohy, ktoré sa po každom skončenom evente založia samé (napr. vyúčtovanie, fotky na soc. siete). */
export function TaskTemplatesSection({ companyId, canEdit }: { companyId: string; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const key = taskKeys.templates(companyId)
  const templates = useQuery({ queryKey: key, queryFn: () => fetchTaskTemplates(companyId), retry: false })
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Po evente')
  const [days, setDays] = useState(1)
  const [assignees, setAssignees] = useState<string[]>([])
  const members = useMembers(companyId)
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const add = useMutation({
    mutationFn: () => addTaskTemplate(companyId, { title, category, daysAfter: days, assigneeIds: assignees }),
    onSuccess: () => {
      setTitle('')
      setAssignees([])
    },
    onSettled: refresh,
  })
  const toggle = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => setTaskTemplateActive(id, active), onSettled: refresh })
  const remove = useMutation({ mutationFn: deleteTaskTemplate, onSettled: refresh })
  // Bez migrácie 0061 sa sekcia neukáže.
  if (templates.isError || !templates.data) return null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (title.trim() && days >= 0) add.mutate()
  }

  return (
    <CollapsibleSection id="tasks.templates" title={`Úlohy po evente (${templates.data.length})`}>
      <p className="mb-3 text-sm text-muted-foreground">
        Po skončení každého eventu sa tieto úlohy založia samé, napr. „Vyúčtovanie“ alebo „Fotky na soc. siete“. Termín je počet dní po konci akcie.
      </p>
      {templates.data.length > 0 && (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface">
          {templates.data.map((template) => (
            <li key={template.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <label className="flex min-w-0 flex-1 items-center gap-2">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={template.active}
                  disabled={!canEdit || toggle.isPending}
                  onChange={(e) => toggle.mutate({ id: template.id, active: e.target.checked })}
                />
                <span className="min-w-0">
                  <span className="block font-medium break-words">{template.title}</span>
                  <span className="block text-sm text-muted-foreground">
                    {[
                      template.category,
                      template.daysAfter === 0 ? 'v deň konca' : `${template.daysAfter} d po evente`,
                      template.assigneeIds.map((id) => memberName(members.data, id)).filter(Boolean).join(', '),
                      !template.active && 'vypnutá',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </label>
              {canEdit && (
                <button type="button" aria-label={`Odstrániť ${template.title}`} className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => remove.mutate(template.id)}>
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <form onSubmit={submit} className="grid gap-2 rounded-xl border bg-surface p-4 sm:grid-cols-[1fr_10rem_7rem_auto] sm:items-end">
          <Field label="Úloha" placeholder="napr. Vyúčtovanie" maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Field label="Kategória" maxLength={60} value={category} onChange={(e) => setCategory(e.target.value)} />
          <Field label="Dní po evente" type="number" inputMode="numeric" min={0} max={60} value={Number.isNaN(days) ? '' : days} onChange={(e) => setDays(e.target.valueAsNumber)} />
          <div className="flex flex-wrap gap-2 sm:col-span-4">
            <span className="w-full text-sm font-medium">Kto ju dostane (napr. soc media maker)</span>
            {(members.data ?? []).map((member) => {
              const on = assignees.includes(member.userId)
              return (
                <button
                  key={member.userId}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAssignees(on ? assignees.filter((id) => id !== member.userId) : [...assignees, member.userId])}
                  className={cn('h-9 rounded-lg border px-3 text-sm font-medium', on ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
                >
                  {member.fullName || member.email}
                </button>
              )
            })}
          </div>
          <Button type="submit" size="sm" disabled={!title.trim() || add.isPending}>
            <Plus className="size-4" aria-hidden />
            Pridať
          </Button>
        </form>
      )}
    </CollapsibleSection>
  )
}
