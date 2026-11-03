import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Printer, QrCode, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { addToPrintQueue, markPrinted, printKeys } from './api'

export type MissingEntry = { kind: 'case' | 'equipment'; id: string; name: string; detail: string; to: string }

const naturally = (a: MissingEntry, b: MissingEntry) => a.name.localeCompare(b.name, 'sk', { numeric: true }) || a.detail.localeCompare(b.detail, 'sk', { numeric: true })

/**
 * Bez QR štítku: cases a technika bez vytlačeného QR. Nič sa nedeje hromadne naslepo – najprv sa vyberie, čo pridať do
 * tlače alebo označiť ako olepené (a to sa ešte potvrdí).
 */
export function MissingLabels({ companyId, entries }: { companyId: string; entries: MissingEntry[] }) {
  const queryClient = useQueryClient()
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [search, setSearch] = useState('')
  const key = (entry: MissingEntry) => `${entry.kind}|${entry.id}`
  const refresh = () => {
    setPicked(new Set())
    void queryClient.invalidateQueries({ queryKey: printKeys.queue(companyId) })
  }
  const chosen = entries.filter((entry) => picked.has(key(entry)))
  const toList = (list: MissingEntry[]) => list.map((entry) => ({ kind: entry.kind, targetId: entry.id }))
  const addSelected = useMutation({ mutationFn: () => addToPrintQueue(companyId, toList(chosen)), onSettled: refresh })
  const markSelected = useMutation({ mutationFn: () => markPrinted(companyId, toList(chosen).map((item) => ({ ...item, label: 'qr' as const }))), onSettled: refresh })

  const words = search.trim().toLowerCase()
  const visible = (kind: MissingEntry['kind']) =>
    entries.filter((entry) => entry.kind === kind && (!words || `${entry.name} ${entry.detail}`.toLowerCase().includes(words))).sort(naturally)
  const setMany = (list: MissingEntry[], on: boolean) =>
    setPicked((current) => {
      const next = new Set(current)
      for (const entry of list) {
        if (on) next.add(key(entry))
        else next.delete(key(entry))
      }
      return next
    })
  const toggle = (entry: MissingEntry) => setMany([entry], !picked.has(key(entry)))

  return (
    <section className="mt-6 rounded-xl border bg-surface p-4">
      <h2 className="mb-1 flex items-center gap-2 font-medium">
        <QrCode className="size-5 text-accent" aria-hidden />
        Bez QR štítku ({entries.length})
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Cases a technika (okrem káblov a spotrebného materiálu), ktoré ešte nemajú vytlačený QR štítok. Zaškrtnite, čo chcete pridať do tlače alebo
        označiť ako už olepené. Štítok sa zapamätá aj po „Vytlačené – vyprázdniť“.
      </p>
      <label className="relative mb-3 block max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input aria-label="Hľadať" placeholder="Hľadať…" className="h-9 w-full rounded-lg border bg-background pr-3 pl-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <div className="mb-3 grid gap-4 sm:grid-cols-2">
        {(['case', 'equipment'] as const).map((kind) => {
          const list = visible(kind)
          const all = list.length > 0 && list.every((entry) => picked.has(key(entry)))
          return (
            <div key={kind} className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="flex-1 text-sm font-medium text-muted-foreground">
                  {kind === 'case' ? 'Cases' : 'Technika'} ({list.length})
                </h3>
                {list.length > 0 && (
                  <button type="button" className="text-xs text-accent hover:underline" onClick={() => setMany(list, !all)}>
                    {all ? 'zrušiť výber' : 'vybrať všetko'}
                  </button>
                )}
              </div>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">{words ? 'nič sa nenašlo' : 'všetko má štítok'}</p>
              ) : (
                <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border text-sm">
                  {list.map((entry) => (
                    <li key={key(entry)} className="flex shrink-0 items-center gap-2 px-2 py-1.5">
                      <input type="checkbox" aria-label={`Vybrať ${entry.name}`} className="size-4 shrink-0" checked={picked.has(key(entry))} onChange={() => toggle(entry)} />
                      <span className="min-w-0 flex-1 truncate">
                        <Link to={entry.to} className="hover:underline">
                          {entry.name}
                        </Link>
                        {entry.detail && <span className="text-muted-foreground"> · {entry.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={chosen.length === 0 || addSelected.isPending} onClick={() => addSelected.mutate()}>
          <Printer className="size-4" aria-hidden />
          Do tlače ({chosen.length})
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={chosen.length === 0 || markSelected.isPending}
          onClick={() => window.confirm(`Naozaj majú ${chosen.length} ${chosen.length === 1 ? 'položka' : 'položiek'} nalepený QR štítok? Zmiznú zo zoznamu.`) && markSelected.mutate()}
        >
          <Check className="size-4" aria-hidden />
          Už olepené ({chosen.length})
        </Button>
        {chosen.length > 0 && (
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setPicked(new Set())}>
            Zrušiť výber
          </button>
        )}
      </div>
    </section>
  )
}
