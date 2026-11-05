import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ShieldCheck, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { plain } from '@/features/search/searchAll'
import {
  approveCatalogEntry,
  CATALOG_KINDS,
  catalogKeys,
  deleteCatalogEntry,
  fetchReviewQueue,
  rejectCatalogEntry,
  useCatalog,
  verifyCatalogEntries,
  type CatalogReviewItem,
} from './catalog'
import { describeAttributes, KIND_LABELS, type EquipmentKind } from './model'
import { tx, tf } from '@/lib/i18n'

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
      <CatalogList />
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
  const details = describeAttributes({ attributes: item.attributes })
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

type Filter = 'unverified' | 'verified' | 'all'
const SHOWN = 100

/**
 * Oficiálny katalóg: overovanie modelov (všetko prevzaté z katalógov výrobcov je neoverené), hľadanie a zmazanie
 * chybného modelu. „Overiť zobrazené“ overí všetko, čo filter a hľadanie práve ukazujú (napr. celú značku).
 */
function CatalogList() {
  const queryClient = useQueryClient()
  const catalog = useCatalog()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('unverified')
  const refresh = () => queryClient.invalidateQueries({ queryKey: catalogKeys.all })
  const remove = useMutation({ mutationFn: deleteCatalogEntry, onSuccess: refresh })
  const verify = useMutation({ mutationFn: ({ ids, verified }: { ids: string[]; verified: boolean }) => verifyCatalogEntries(ids, verified), onSuccess: refresh })
  const all = catalog.data ?? []
  const verifiedCount = all.filter((entry) => entry.verified).length
  const words = plain(search.trim()).split(/\s+/).filter(Boolean)
  const matching = all.filter(
    (entry) =>
      (filter === 'all' || entry.verified === (filter === 'verified')) &&
      words.every((word) => plain(`${entry.manufacturer} ${entry.model} ${KIND_LABELS[entry.kind]}`).includes(word)),
  )
  const shown = matching.slice(0, SHOWN)
  const toVerify = matching.filter((entry) => !entry.verified)

  return (
    <section>
      <h3 className="mb-1 text-sm font-medium">{tf('Katalóg – {0} modelov, overených {1}', all.length, verifiedCount)}</h3>
      <p className="mb-2 text-xs text-muted-foreground">
        {tx('Pri výbere modelu firmy vidia, či sú údaje overené. Skontrolujte údaje a overte ich – jednotlivo alebo všetky zobrazené.')}
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input className={`${input} max-w-md`} placeholder={tx('Hľadať značku alebo model…')} value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className={`${input} w-auto`} aria-label={tx('Zobraziť')} value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
          <option value="unverified">{tx('Neoverené')}</option>
          <option value="verified">{tx('Overené')}</option>
          <option value="all">{tx('Všetko')}</option>
        </select>
        {toVerify.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={verify.isPending}
            onClick={() =>
              window.confirm(tf('Overiť všetkých {0} zobrazených modelov? Skontrolovali ste ich údaje?', toVerify.length)) &&
              verify.mutate({ ids: toVerify.map((entry) => entry.id), verified: true })
            }
          >
            <ShieldCheck className="size-4" aria-hidden />
            {tf('Overiť zobrazené ({0})', toVerify.length)}
          </Button>
        )}
      </div>
      {verify.isError && <p className="mb-2 text-sm text-destructive">{tx('Overenie sa nepodarilo – je spustená migrácia 0153?')}</p>}
      {matching.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tx('Nič sa nenašlo.')}</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-surface">
          {shown.map((entry) => {
            const details = describeAttributes({ attributes: entry.attributes })
            return (
              <li key={entry.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                <span className="w-24 shrink-0 pt-0.5 text-muted-foreground">{tx(KIND_LABELS[entry.kind])}</span>
                <span className="min-w-0 flex-1">
                  <span className="block">
                    <span className="font-medium">{entry.manufacturer}</span> {entry.model}
                  </span>
                  <span className="block text-xs text-muted-foreground">{details || tx('bez technických údajov')}</span>
                </span>
                <Button
                  size="sm"
                  variant={entry.verified ? 'ghost' : 'outline'}
                  className="shrink-0"
                  disabled={verify.isPending}
                  aria-label={entry.verified ? tf('Zrušiť overenie: {0} {1}', entry.manufacturer, entry.model) : tf('Overiť: {0} {1}', entry.manufacturer, entry.model)}
                  onClick={() => verify.mutate({ ids: [entry.id], verified: !entry.verified })}
                >
                  {entry.verified ? <ShieldCheck className="size-4 text-emerald-600" aria-hidden /> : <Check className="size-4" aria-hidden />}
                  {entry.verified ? tx('Overené') : tx('Overiť')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 shrink-0 p-0"
                  aria-label={tf('Zmazať {0} {1}', entry.manufacturer, entry.model)}
                  disabled={remove.isPending}
                  onClick={() => window.confirm(tf('Zmazať z katalógu {0} {1}? Technika firiem ostane.', entry.manufacturer, entry.model)) && remove.mutate(entry.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            )
          })}
          {matching.length > SHOWN && <li className="px-3 py-2 text-xs text-muted-foreground">{tf('a ďalších {0} – spresnite hľadanie', matching.length - SHOWN)}</li>}
        </ul>
      )}
    </section>
  )
}
