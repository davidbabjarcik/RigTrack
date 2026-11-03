import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { caseTitle, groupCases, type Case } from '@/features/cases/model'
import { equipmentKeys, mergeEquipment, splitEquipmentIntoCase } from './api'
import type { Equipment } from './model'

type Props = {
  companyId: string
  /** Všetky časti techniky (v cases aj mimo). */
  parts: Equipment[]
  cases: Case[]
  /** Ids na adrese stránky – po presune sa doplnia nové časti. */
  ids: string[]
}

const plain = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/**
 * Technika počítaná na kusy (bez čísel #1, #2…), napr. háky: kusy mimo case sa rozdelia do viacerých cases naraz –
 * zaškrtnuté cases, v každom rovnaký počet. Ak v case táto technika už je, kusy sa pridajú k nej.
 */
export function GroupToCases({ companyId, parts, cases, ids }: Props) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const countIn = (caseId: string) => parts.filter((item) => item.caseId === caseId).reduce((sum, item) => sum + item.quantity, 0)
  const free = parts.filter((item) => !item.caseId).reduce((sum, item) => sum + item.quantity, 0)
  // Návrh: sada cases, v ktorej už technika je (napr. K10 Case #1–#9) – cases, kde ešte chýba, a počet ako v ostatných.
  const set = groupCases(cases).find((group) => group.items.some((box) => countIn(box.id) > 0))
  const perCase = set ? Math.max(1, ...set.items.map((box) => countIn(box.id))) : 1
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(perCase)
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<string[]>(() => (set?.items ?? []).filter((box) => countIn(box.id) === 0).map((box) => box.id))

  const move = useMutation({
    mutationFn: async ({ caseIds, each }: { caseIds: string[]; each: number }) => {
      const added: string[] = []
      for (const caseId of caseIds) {
        // Berie sa z najväčšej časti mimo case (po každom presune sa zmenší).
        const latest = queryClient.getQueryData<Equipment[]>(equipmentKeys.list(companyId)) ?? parts
        const source = latest
          .filter((item) => ids.includes(item.id) || added.includes(item.id))
          .filter((item) => !item.caseId && item.quantity > 0)
          .sort((a, b) => b.quantity - a.quantity)[0]
        if (!source) break
        const moved = await splitEquipmentIntoCase(source.id, caseId, Math.min(each, source.quantity))
        const existing = parts.find((item) => item.caseId === caseId && item.id !== moved)
        if (existing) await mergeEquipment(moved, existing.id)
        else added.push(moved)
        await queryClient.invalidateQueries({ queryKey: equipmentKeys.list(companyId) })
      }
      return added
    },
    onSuccess: async (added) => {
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      navigate(`/equipment/group?ids=${[...new Set([...ids, ...added])].join(',')}`, { replace: true })
    },
  })

  if (free === 0) return null
  const total = picked.length * count
  const sorted = [...cases].sort(
    (a, b) => Number(!(set?.items.some((box) => box.id === a.id) ?? false)) - Number(!(set?.items.some((box) => box.id === b.id) ?? false)) || caseTitle(a).localeCompare(caseTitle(b), 'sk', { numeric: true }),
  )
  const shown = search.trim() ? sorted.filter((box) => plain(caseTitle(box)).includes(plain(search.trim()))) : sorted
  const toggle = (id: string) => setPicked((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Package className="size-4" aria-hidden />
        Dať do viacerých cases
      </Button>
    )
  }

  return (
    <section className="mt-3 w-full rounded-xl border bg-surface p-4" aria-labelledby="to-cases-heading">
      <h2 id="to-cases-heading" className="font-semibold">
        Dať do viacerých cases
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">Mimo case je {free} ks. Zaškrtnite cases a koľko kusov dať do každého.</p>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Do každého case (ks)
          <input
            type="number"
            min={1}
            max={free}
            inputMode="numeric"
            className="h-10 w-28 rounded-lg border bg-background px-3"
            value={count}
            onChange={(event) => setCount(Math.max(1, Math.min(free, Math.round(Number(event.target.value) || 1))))}
          />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
          Hľadať case
          <input className="h-10 rounded-lg border bg-background px-3" placeholder="napr. K10" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <Button size="sm" variant="ghost" onClick={() => setPicked(shown.filter((box) => countIn(box.id) === 0).map((box) => box.id))}>
          Vybrať zobrazené bez tejto techniky
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPicked([])}>
          Zrušiť výber
        </Button>
      </div>
      <ul className="mb-3 max-h-72 divide-y overflow-y-auto rounded-lg border">
        {shown.map((box) => (
          <li key={box.id} className="shrink-0">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted">
              <input type="checkbox" className="size-4" checked={picked.includes(box.id)} onChange={() => toggle(box.id)} />
              <span className="min-w-0 flex-1 truncate">{caseTitle(box)}</span>
              {countIn(box.id) > 0 && <span className="shrink-0 text-xs text-muted-foreground">už {countIn(box.id)} ks</span>}
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Žiadny case sa nenašiel.</li>}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={picked.length === 0 || total > free || move.isPending} onClick={() => move.mutate({ caseIds: picked, each: count })}>
          <Package className="size-4" aria-hidden />
          {move.isPending ? 'Presúvam…' : `Dať do ${picked.length} cases (spolu ${total} ks)`}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Zavrieť
        </Button>
        {total > free && <span className="text-sm text-destructive">Mimo case je len {free} ks – vyberte menej cases alebo menší počet.</span>}
      </div>
      {move.isError && <p className="mt-2 text-sm text-destructive">Presun do cases sa nepodaril{move.error instanceof Error ? `: ${move.error.message}` : ''}.</p>}
    </section>
  )
}
