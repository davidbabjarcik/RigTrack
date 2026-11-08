import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import {
  approveCatalogEntry,
  CATALOG_KINDS,
  catalogKeys,
  fetchReviewQueue,
  rejectCatalogEntry,
  type CatalogReviewItem,
} from './catalog'
import { describeAttributes, KIND_LABELS, type EquipmentKind } from './model'
import { tx } from '@/lib/i18n'

const input = 'h-9 w-full rounded-lg border bg-background px-2 text-sm'

/**
 * Vývojár: návrhy do spoločnej databázy techniky (model, ktorý firma zadala a v katalógu nie je). Rovnaký model od
 * viacerých firiem je jeden riadok. Schváliť (aj s opravou značky, modelu a druhu) alebo zamietnuť; pod tým katalóg.
 */
export function CatalogReviewPanel() {
  const queue = useQuery({ queryKey: catalogKeys.review, queryFn: fetchReviewQueue, retry: false })
  if (queue.isPending) return <LoadingBlock />
  if (queue.isError) return <ErrorBlock message={tx('Návrhy sa nepodarilo načítať – je spustená migrácia 0146?')} onRetry={() => void queue.refetch()} />
  return (
    <div className="flex flex-col gap-6">
      {queue.data.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">{tx('Žiadne návrhy na overenie.')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {queue.data.map((item) => (
            <ReviewRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ReviewRow({ item }: { item: CatalogReviewItem }) {
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<EquipmentKind>(item.kind)
  const [manufacturer, setManufacturer] = useState(item.manufacturer)
  const [model, setModel] = useState(item.model)
  const [note, setNote] = useState('')
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: catalogKeys.review }), queryClient.invalidateQueries({ queryKey: catalogKeys.all })])
  const approve = useMutation({ mutationFn: () => approveCatalogEntry(item.id, { kind, manufacturer, model, attributes: item.attributes }), onSuccess: refresh })
  const reject = useMutation({ mutationFn: () => rejectCatalogEntry(item.id, note), onSuccess: refresh })
  const details = describeAttributes({ attributes: item.attributes }).join(' · ')
  const busy = approve.isPending || reject.isPending

  return (
    <li className="rounded-xl border bg-surface p-4">
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr_1fr]">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">{tx('Druh')}<select className={input} value={kind} onChange={(event) => setKind(event.target.value as EquipmentKind)}>
            {CATALOG_KINDS.map((value) => (
              <option key={value} value={value}>
                {tx(KIND_LABELS[value])}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">{tx('Značka')}<input className={input} value={manufacturer} maxLength={80} onChange={(event) => setManufacturer(event.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">{tx('Model')}<input className={input} value={model} maxLength={80} onChange={(event) => setModel(event.target.value)} />
        </label>
      </div>
      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">{tx('Názov vo firme:')}</span> {item.name || '—'} · {item.companies === 1 ? tx('1 firma') : `${item.companies} firmy`} · {new Date(item.submittedAt).toLocaleDateString('sk-SK')}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{details || tx('Bez technických údajov – schválením pribudne len značka a model.')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={busy || !manufacturer.trim()} onClick={() => approve.mutate()}>
          <Check className="size-4" aria-hidden />{tx('Schváliť do katalógu')}</Button>
        <input className={`${input} max-w-64`} placeholder={tx('Dôvod zamietnutia (nepovinné)')} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => reject.mutate()}>
          <X className="size-4" aria-hidden />{tx('Zamietnuť')}</Button>
      </div>
      {(approve.isError || reject.isError) && <p className="mt-2 text-sm text-destructive">{tx('Nepodarilo sa uložiť.')}</p>}
    </li>
  )
}
