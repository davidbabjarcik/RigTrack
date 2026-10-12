import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, SelectField, TextareaField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { formatDateTime } from '@/lib/format'
import { canDeleteInventory } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import {
  addComment,
  addSuggestion,
  deleteComment,
  deleteSuggestion,
  fetchSuggestions,
  setSuggestionStatus,
  SUGGESTION_STATUS_LABELS,
  SUGGESTION_STATUSES,
  suggestionKeys,
  type Suggestion,
  type SuggestionStatus,
} from './api'

const STATUS_STYLES: Record<SuggestionStatus, string> = {
  new: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  in_progress: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  done: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
}

type CardProps = {
  companyId: string
  suggestion: Suggestion
  userId: string
  /** Stav návrhu mení admin a skladník. */
  canManage: boolean
  isAdmin: boolean
}

function SuggestionCard({ companyId, suggestion, userId, canManage, isAdmin }: CardProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: suggestionKeys.list(companyId) })

  const status = useMutation({ mutationFn: (value: SuggestionStatus) => setSuggestionStatus(suggestion.id, value), onSettled: refresh })
  const remove = useMutation({ mutationFn: () => deleteSuggestion(suggestion.id), onSettled: refresh })
  const comment = useMutation({
    mutationFn: () => addComment(companyId, suggestion.id, text),
    onSuccess: () => setText(''),
    onSettled: refresh,
  })
  const removeComment = useMutation({ mutationFn: deleteComment, onSettled: refresh })
  const canDelete = isAdmin || suggestion.createdBy === userId

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (text.trim()) comment.mutate()
  }

  return (
    <li className="rounded-xl border bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn('font-medium break-words', suggestion.status === 'done' && 'text-muted-foreground')}>{suggestion.title}</p>
          <p className="text-sm text-muted-foreground">
            {suggestion.authorName || 'neznámy'} · {formatDateTime(suggestion.createdAt)}
          </p>
        </div>
        {canManage ? (
          <SelectField
            label={`Stav: ${suggestion.title}`}
            hideLabel
            className="w-36 shrink-0"
            value={suggestion.status}
            disabled={status.isPending}
            onChange={(e) => status.mutate(e.target.value as SuggestionStatus)}
          >
            {SUGGESTION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {SUGGESTION_STATUS_LABELS[value]}
              </option>
            ))}
          </SelectField>
        ) : (
          <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[suggestion.status])}>
            {SUGGESTION_STATUS_LABELS[suggestion.status]}
          </span>
        )}
      </div>

      {suggestion.body && <p className="mt-2 whitespace-pre-wrap">{suggestion.body}</p>}

      <div className="mt-3 flex items-center gap-2">
        <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          <MessageSquare className="size-4" aria-hidden />
          Komentáre ({suggestion.comments.length})
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            aria-label={`Odstrániť návrh: ${suggestion.title}`}
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm('Odstrániť tento návrh aj s komentármi?')) remove.mutate()
            }}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 border-t pt-3">
          {suggestion.comments.length > 0 && (
            <ul className="mb-3 flex flex-col gap-3">
              {suggestion.comments.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">
                      {item.authorName || 'neznámy'} · {formatDateTime(item.createdAt)}
                    </p>
                    <p className="whitespace-pre-wrap">{item.body}</p>
                  </div>
                  {(isAdmin || item.createdBy === userId) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Odstrániť komentár"
                      disabled={removeComment.isPending}
                      onClick={() => removeComment.mutate(item.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <Field
              label="Nový komentár"
              hideLabel
              placeholder="Napíšte komentár"
              maxLength={2000}
              className="flex-1"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <Button type="submit" disabled={comment.isPending || !text.trim()}>
              Pridať
            </Button>
          </form>
        </div>
      )}

      {(status.isError || remove.isError || comment.isError || removeComment.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zmena sa nepodarila.
        </p>
      )}
    </li>
  )
}

export function SuggestionsPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session!.user.id
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const suggestions = useQuery({ queryKey: suggestionKeys.list(companyId), queryFn: () => fetchSuggestions(companyId) })
  const add = useMutation({
    mutationFn: () => addSuggestion(companyId, title, body),
    onSuccess: () => {
      setTitle('')
      setBody('')
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: suggestionKeys.list(companyId) }),
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (title.trim()) add.mutate()
  }

  return (
    <>
      <PageHeader title="Návrhy" description="Nápady a zlepšenia od kohokoľvek z firmy" />

      <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3 rounded-xl border bg-surface p-4">
        <Field label="Váš návrh" required maxLength={200} placeholder="Čo by sa dalo zlepšiť?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextareaField label="Podrobnosti (nepovinné)" rows={3} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
        {add.isError && (
          <p role="alert" className="text-sm text-destructive">
            Návrh sa nepodarilo uložiť.
          </p>
        )}
        <Button type="submit" className="self-start" disabled={add.isPending || !title.trim()}>
          {add.isPending ? 'Odosielam…' : 'Pridať návrh'}
        </Button>
      </form>

      {suggestions.isPending ? (
        <LoadingBlock />
      ) : suggestions.isError ? (
        <ErrorBlock message="Návrhy sa nepodarilo načítať." onRetry={() => void suggestions.refetch()} />
      ) : suggestions.data.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface px-6 py-12 text-center text-sm text-muted-foreground">
          Zatiaľ žiadne návrhy. Buďte prvý.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {suggestions.data.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              companyId={companyId}
              suggestion={suggestion}
              userId={userId}
              canManage={canDeleteInventory(company.role)}
              isAdmin={company.role === 'admin'}
            />
          ))}
        </ul>
      )}
    </>
  )
}
