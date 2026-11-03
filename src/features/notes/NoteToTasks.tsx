import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ListTodo } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Member } from '@/features/companies/api'
import { saveTask, taskKeys } from '@/features/tasks/api'
import { TASK_CATEGORIES } from '@/features/tasks/model'
import { getSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { noteLines, remainingBody } from './noteTasks'

type Note = { id: string; title: string; body: string; people: string[] }

type Props = { companyId: string; note: Note; members: Member[]; onDone: () => void; onCancel: () => void }

/**
 * Poznámka → úlohy (ako v TickTicku): každý vybraný riadok je jedna úloha, kategória a ľudia podľa poznámky
 * (dajú sa zmeniť). Prevedené riadky z poznámky zmiznú; prázdna poznámka sa môže zmazať.
 */
export function NoteToTasks({ companyId, note, members, onDone, onCancel }: Props) {
  const queryClient = useQueryClient()
  const lines = noteLines(note.body)
  const [picked, setPicked] = useState<Set<number>>(() => new Set(lines.map((_, index) => index)))
  const [category, setCategory] = useState(note.title.trim().slice(0, 60))
  const [people, setPeople] = useState<string[]>(note.people)
  const [dropEmpty, setDropEmpty] = useState(true)

  const convert = useMutation({
    mutationFn: async () => {
      const chosen = lines.filter((_, index) => picked.has(index))
      for (const title of chosen) {
        await saveTask(companyId, null, { title: title.slice(0, 200), note: '', assigneeId: people[0] ?? '', assigneeIds: people, category, priority: 'normal', dueOn: '', status: 'open' })
      }
      const rest = remainingBody(note.body, picked)
      const db = getSupabase().from('company_notes')
      const { error } = rest.trim() === '' && dropEmpty ? await db.delete().eq('company_id', companyId).eq('id', note.id) : await db.update({ body: rest }).eq('company_id', companyId).eq('id', note.id)
      if (error) throw error
      return chosen.length
    },
    onSuccess: onDone,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.list(companyId) })
      void queryClient.invalidateQueries({ queryKey: ['company', companyId, 'notes'] })
    },
  })

  const toggle = (index: number) => setPicked((current) => {
    const next = new Set(current)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    return next
  })

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-accent/40 bg-background p-3 text-sm">
      <p className="font-medium">Previesť na úlohy ({picked.size} z {lines.length})</p>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
        {lines.map((line, index) => (
          <li key={index}>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5 size-4" checked={picked.has(index)} onChange={() => toggle(index)} />
              <span className="break-words">{line}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="text-xs text-accent hover:underline" onClick={() => setPicked(new Set(lines.map((_, index) => index)))}>
          vybrať všetko
        </button>
        <button type="button" className="text-xs text-accent hover:underline" onClick={() => setPicked(new Set())}>
          nič
        </button>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-muted-foreground">Kategória úloh</span>
        <input className="h-9 rounded-lg border bg-surface px-2" maxLength={60} list="note-task-categories" value={category} onChange={(e) => setCategory(e.target.value)} />
        <datalist id="note-task-categories">
          {TASK_CATEGORIES.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </label>
      <div>
        <span className="mb-1 block text-muted-foreground">Kto ich má urobiť</span>
        <div className="flex flex-wrap gap-1.5">
          {members.map((member) => {
            const on = people.includes(member.userId)
            return (
              <button
                key={member.userId}
                type="button"
                aria-pressed={on}
                onClick={() => setPeople(on ? people.filter((id) => id !== member.userId) : [...people, member.userId])}
                className={cn('h-8 rounded-full border px-3', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}
              >
                {member.fullName || member.email}
              </button>
            )
          })}
        </div>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" className="size-4" checked={dropEmpty} onChange={(e) => setDropEmpty(e.target.checked)} />
        Zmazať poznámku, keď v nej nič neostane
      </label>
      {convert.isError && <p className="text-destructive">Úlohy sa nepodarilo vytvoriť – možno nemáte oprávnenie na úlohy.</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={picked.size === 0 || convert.isPending} onClick={() => convert.mutate()}>
          <ListTodo className="size-4" aria-hidden />
          {convert.isPending ? 'Vytváram…' : `Vytvoriť ${picked.size} úloh`}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Zrušiť
        </Button>
      </div>
    </div>
  )
}
