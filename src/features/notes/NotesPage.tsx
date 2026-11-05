import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListTodo, Pencil, Pin, PinOff, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { formatDate } from '@/lib/format'
import { getSupabase } from '@/lib/supabase/client'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { NoteToTasks } from './NoteToTasks'
import { noteLines } from './noteTasks'
import { fetchNotes, notesKey, type Note } from './api'
import { tx } from '@/lib/i18n'

type Draft = { id: string | null; title: string; body: string; pinned: boolean; people: string[] }

async function saveNote(companyId: string, draft: Draft) {
  const fields = { title: draft.title.trim(), body: draft.body.trim(), pinned: draft.pinned, people: draft.people }
  const db = getSupabase()
  const { error } = draft.id ? await db.from('company_notes').update(fields).eq('company_id', companyId).eq('id', draft.id) : await db.from('company_notes').insert({ company_id: companyId, ...fields })
  if (error) throw error
}

/** Firemné poznámky: zdieľané pre celú firmu, s pripnutím a označenými ľuďmi (dostanú upozornenie). */
export function NotesPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session?.user.id ?? null
  const queryClient = useQueryClient()
  const notes = useQuery({ queryKey: notesKey(companyId), queryFn: () => fetchNotes(companyId), retry: false })
  const members = useMembers(companyId)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [search, setSearch] = useState('')
  const [mine, setMine] = useState(false)
  const [converting, setConverting] = useState<string | null>(null)
  const [converted, setConverted] = useState<string | null>(null)
  const canTasks = can(company, 'tasks.edit')
  const refresh = () => queryClient.invalidateQueries({ queryKey: notesKey(companyId) })
  const save = useMutation({ mutationFn: (value: Draft) => saveNote(companyId, value), onSuccess: () => setDraft(null), onSettled: refresh })
  const pin = useMutation({ mutationFn: (note: Note) => saveNote(companyId, { ...note, pinned: !note.pinned }), onSettled: refresh })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('company_notes').delete().eq('company_id', companyId).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => setDraft(null),
    onSettled: refresh,
  })

  if (notes.isPending) return <LoadingBlock />
  if (notes.isError) return <ErrorBlock message={tx('Poznámky zatiaľ nie sú dostupné – treba spustiť migráciu 0118 (supabase/update-all.sql).')} />

  const words = search.trim().toLowerCase()
  const shown = notes.data.filter(
    (note) => (!mine || (userId && note.people.includes(userId))) && (!words || `${note.title} ${note.body} ${note.authorName}`.toLowerCase().includes(words)),
  )
  const canDelete = (note: Note) => note.createdBy === userId || company.role === 'admin' || company.role === 'ceo'
  const togglePerson = (person: string) => draft && setDraft({ ...draft, people: draft.people.includes(person) ? draft.people.filter((value) => value !== person) : [...draft.people, person] })

  return (
    <>
      <PageHeader
        title={tx('Poznámky')}
        description={tx('Zdieľané poznámky celej firmy – kto je označený, dostane upozornenie')}
        action={
          !draft && (
            <Button onClick={() => setDraft({ id: null, title: '', body: '', pinned: false, people: [] })}>
              <Plus className="size-4" aria-hidden />{tx('Nová poznámka')}</Button>
          )
        }
      />

      {draft && (
        <section className="mb-6 flex flex-col gap-3 rounded-xl border border-accent/40 bg-surface p-4">
          <Field label={tx('Nadpis')} maxLength={120} placeholder={tx('napr. Kľúče od skladu')} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <label className="flex flex-col gap-1.5 text-sm font-medium">{tx('Text')}<textarea
              rows={6}
              maxLength={10000}
              className="rounded-lg border bg-background px-3 py-2 text-base font-normal"
              placeholder={tx('Čo si treba zapamätať…')}
              value={draft.body}
              onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            />
          </label>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">{tx('Označiť ľudí (dostanú upozornenie)')}</legend>
            <div className="flex flex-wrap gap-1.5">
              {(members.data ?? []).map((member) => (
                <button
                  key={member.userId}
                  type="button"
                  aria-pressed={draft.people.includes(member.userId)}
                  onClick={() => togglePerson(member.userId)}
                  className={cn('h-8 rounded-full border px-3 text-sm', draft.people.includes(member.userId) ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
                >
                  {member.fullName || member.email}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={draft.pinned} onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })} />{tx('Pripnúť hore')}</label>
          {save.isError && <p className="text-sm text-destructive">{tx('Poznámku sa nepodarilo uložiť.')}</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={(!draft.title.trim() && !draft.body.trim()) || save.isPending} onClick={() => save.mutate(draft)}>
              {save.isPending ? tx('Ukladám…') : tx('Uložiť')}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>{tx('Zrušiť')}</Button>
          </div>
        </section>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input aria-label={tx('Hľadať v poznámkach')} placeholder={tx('Hľadať v poznámkach…')} className="h-10 w-full rounded-lg border bg-surface pr-3 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <button type="button" aria-pressed={mine} onClick={() => setMine(!mine)} className={cn('h-10 rounded-lg border px-3 text-sm', mine ? 'border-primary bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted')}>{tx('Kde som označený')}</button>
      </div>

      {converted && (
        <p role="status" className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
          <span>{tx('Úlohy z „')}{converted}{tx('“ sú v Úlohách.')}</span>
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setConverted(null)}>
            ✕
          </button>
        </p>
      )}

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-8 text-center text-sm text-muted-foreground">{notes.data.length === 0 ? tx('Zatiaľ žiadne poznámky.') : tx('Nič nenájdené.')}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((note) => (
            <li key={note.id} className={cn('flex flex-col gap-2 rounded-xl border bg-surface p-4', note.pinned && 'border-accent/50')}>
              <div className="flex items-start gap-2">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDraft({ id: note.id, title: note.title, body: note.body, pinned: note.pinned, people: note.people })}>
                  <span className="block font-medium break-words">{note.title || note.body.split('\n')[0]}</span>
                </button>
                <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={tx('Upraviť poznámku')} title={tx('Upraviť')} onClick={() => setDraft({ id: note.id, title: note.title, body: note.body, pinned: note.pinned, people: note.people })}>
                  <Pencil className="size-4" aria-hidden />
                </Button>
                {canTasks && noteLines(note.body).length > 0 && (
                  <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={tx('Previesť na úlohy')} title={tx('Previesť riadky na úlohy')} onClick={() => setConverting(converting === note.id ? null : note.id)}>
                    <ListTodo className="size-4" aria-hidden />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={note.pinned ? tx('Odopnúť') : tx('Pripnúť hore')} disabled={pin.isPending} onClick={() => pin.mutate(note)}>
                  {note.pinned ? <PinOff className="size-4" aria-hidden /> : <Pin className="size-4" aria-hidden />}
                </Button>
                {canDelete(note) && (
                  <Button size="sm" variant="ghost" className="size-8 p-0" aria-label={tx('Zmazať poznámku')} disabled={remove.isPending} onClick={() => window.confirm(tx('Zmazať poznámku?')) && remove.mutate(note.id)}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
              {converting === note.id && (
                <NoteToTasks
                  companyId={companyId}
                  note={note}
                  members={members.data ?? []}
                  onCancel={() => setConverting(null)}
                  onDone={() => {
                    setConverting(null)
                    setConverted(note.title || tx('poznámky'))
                  }}
                />
              )}
              {note.body && note.title && converting !== note.id && <p className="text-sm break-words whitespace-pre-wrap">{note.body}</p>}
              {note.people.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {note.people.map((person) => (
                    <span key={person} className={cn('rounded-full border px-2 py-0.5 text-xs', person === userId && 'border-accent text-accent')}>
                      {memberName(members.data, person) || tx('člen')}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {[note.authorName, formatDate(note.updatedAt.slice(0, 10))].filter(Boolean).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
