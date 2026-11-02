import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronUp, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { appErrorKeys, deleteAppErrors, fetchAppErrors, groupAppErrors, resolveAppErrors, SOURCE_LABELS, type AppErrorGroup } from './appErrors'

/** Vývojár: chyby, ktoré appka zachytila sama (spadnutá stránka, neošetrená chyba) – zoskupené, s počtom ľudí a verziami. */
export function AppErrorsPanel() {
  const queryClient = useQueryClient()
  const errors = useQuery({ queryKey: appErrorKeys.list, queryFn: fetchAppErrors, retry: false })
  const [showResolved, setShowResolved] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const refresh = () => queryClient.invalidateQueries({ queryKey: appErrorKeys.list })
  const resolve = useMutation({ mutationFn: ({ ids, resolved }: { ids: string[]; resolved: boolean }) => resolveAppErrors(ids, resolved), onSettled: refresh })
  const remove = useMutation({ mutationFn: deleteAppErrors, onSettled: refresh })

  if (errors.isPending) return <p className="text-sm text-muted-foreground">Načítavam…</p>
  if (errors.isError)
    return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Zoznam chýb zatiaľ nie je dostupný – treba spustiť migráciu 0127 (supabase/update-all.sql).</p>

  const groups = groupAppErrors(errors.data)
  const openGroups = groups.filter((group) => !group.resolved)
  const shown = showResolved ? groups : openGroups
  const busy = resolve.isPending || remove.isPending

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <p className="flex-1 text-muted-foreground">
          {openGroups.length === 0 ? 'Žiadne nevyriešené chyby.' : `${openGroups.length} nevyriešených chýb`} Appka ich ukladá sama, keď niekomu spadne stránka alebo nastane neošetrená chyba.
        </p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showResolved} onChange={(event) => setShowResolved(event.target.checked)} />
          Aj vyriešené
        </label>
        <Button size="sm" variant="outline" onClick={() => void errors.refetch()}>
          Obnoviť
        </Button>
      </div>
      {shown.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface text-sm">
          {shown.map((group) => (
            <ErrorRow
              key={`${group.fingerprint}${group.resolved}`}
              group={group}
              expanded={open === group.ids[0]}
              busy={busy}
              onToggle={() => setOpen(open === group.ids[0] ? null : group.ids[0])}
              onResolve={() => resolve.mutate({ ids: group.ids, resolved: !group.resolved })}
              onDelete={() => window.confirm('Zmazať túto chybu zo zoznamu?') && remove.mutate(group.ids)}
            />
          ))}
        </ul>
      )}
      {(resolve.isError || remove.isError) && (
        <p role="alert" className="text-sm text-destructive">
          Zmenu sa nepodarilo uložiť.
        </p>
      )}
    </div>
  )
}

type RowProps = { group: AppErrorGroup; expanded: boolean; busy: boolean; onToggle: () => void; onResolve: () => void; onDelete: () => void }

function ErrorRow({ group, expanded, busy, onToggle, onResolve, onDelete }: RowProps) {
  return (
    <li className={group.resolved ? 'opacity-60' : undefined}>
      <div className="flex items-start gap-3 px-3 py-2.5">
        <button type="button" className="flex min-w-0 flex-1 items-start gap-2 text-left" aria-expanded={expanded} onClick={onToggle}>
          {expanded ? <ChevronUp className="mt-0.5 size-4 shrink-0" aria-hidden /> : <ChevronDown className="mt-0.5 size-4 shrink-0" aria-hidden />}
          <span className="min-w-0">
            <span className="block font-medium break-words">{group.message}</span>
            <span className="block text-muted-foreground">
              {SOURCE_LABELS[group.source]} · {group.total}× · {group.users.length} {group.users.length === 1 ? 'človek' : group.users.length < 5 ? 'ľudia' : 'ľudí'} · naposledy{' '}
              {formatDateTime(group.lastAt)} · verzia {group.versions.join(', ') || '?'}
            </span>
          </span>
        </button>
        <Button size="sm" variant="outline" disabled={busy} onClick={onResolve}>
          {group.resolved ? <RotateCcw className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
          {group.resolved ? 'Otvoriť' : 'Vyriešené'}
        </Button>
        <Button size="sm" variant="ghost" className="size-8 p-0" aria-label="Zmazať chybu" disabled={busy} onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
      {expanded && (
        <div className="flex flex-col gap-2 border-t bg-muted/30 px-3 py-3">
          <p>
            <span className="text-muted-foreground">Kto: </span>
            {group.users.join(', ')}
          </p>
          <p>
            <span className="text-muted-foreground">Stránky: </span>
            {group.pages.join(', ') || '–'}
          </p>
          <p>
            <span className="text-muted-foreground">Prvýkrát: </span>
            {formatDateTime(group.firstAt)}
          </p>
          {group.stack && <pre className="max-h-64 overflow-auto rounded-lg border bg-background p-2 text-xs whitespace-pre-wrap">{group.stack}</pre>}
        </div>
      )}
    </li>
  )
}
