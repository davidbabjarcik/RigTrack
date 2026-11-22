import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { isGone } from '@/features/equipment/model'
import { tf, tx } from '@/lib/i18n'
import { copyLayoutTo, type CaseLayout } from './layout'
import { layoutKey, saveLayout } from './layoutApi'
import { caseBaseName, caseTitle } from './model'
import { useCases } from './useCases'

type Piece = { id: string; name: string; quantity: number; trackUnits: boolean; unitIds: number[] }

/**
 * Rovnaké rozloženie aj pre ďalšie cases zo sady (rovnaký názov bez čísla, rovnaký druh): časti a poznámky sa
 * skopírujú a technika sa priradí podľa názvu (Blinder #1–#4 → v druhom case #5–#8).
 */
export function CopyLayoutToSet({ companyId, caseId, layout, content }: { companyId: string; caseId: string; layout: CaseLayout; content: Piece[] }) {
  const queryClient = useQueryClient()
  const cases = useCases(companyId)
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const current = cases.data?.find((item) => item.id === caseId)
  const siblings = current
    ? (cases.data ?? [])
        .filter((item) => item.id !== caseId && (item.kind ?? 'case') === (current.kind ?? 'case') && caseBaseName(item) === caseBaseName(current))
        .sort((a, b) => caseTitle(a).localeCompare(caseTitle(b), 'sk', { numeric: true }))
    : []
  const chosen = picked ?? new Set(siblings.map((item) => item.id))
  const copy = useMutation({
    mutationFn: async () => {
      const results: string[] = []
      for (const target of siblings.filter((item) => chosen.has(item.id))) {
        const inside = (equipment.data ?? []).filter((item) => item.caseId === target.id && !isGone(item.status))
        const result = copyLayoutTo(layout, content, inside)
        await saveLayout(companyId, target.id, result.layout)
        results.push(`${caseTitle(target)} (${result.placed})`)
      }
      return results
    },
    onSuccess: (results) => {
      setDone(tf('Hotovo – rozložené: {0}', results.join(', ')))
      setOpen(false)
    },
    onSettled: () => {
      for (const target of siblings) void queryClient.invalidateQueries({ queryKey: layoutKey(companyId, target.id) })
    },
  })
  if (siblings.length === 0 || layout.sections.length === 0) return null

  return (
    <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm">
      {!open ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex-1">{tf('V sade je ďalších {0} rovnakých cases. Chcete ich poskladať rovnako?', siblings.length)}</span>
          <Button size="sm" variant="outline" disabled={!equipment.data} onClick={() => (setOpen(true), setDone(null))}>
            <Copy className="size-4" aria-hidden />
            {tx('Rovnaké rozloženie aj pre ďalšie cases')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="font-medium">{tx('Do ktorých cases rozloženie preniesť?')}</p>
          <ul className="flex flex-col gap-1">
            {siblings.map((item) => (
              <li key={item.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={chosen.has(item.id)}
                    onChange={(event) => {
                      const next = new Set(chosen)
                      if (event.target.checked) next.add(item.id)
                      else next.delete(item.id)
                      setPicked(next)
                    }}
                  />
                  {caseTitle(item)}
                </label>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{tx('Technika sa priradí podľa názvu v rovnakom poradí. Ak už case rozloženie má, prepíše sa.')}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={chosen.size === 0 || copy.isPending} onClick={() => copy.mutate()}>
              {copy.isPending ? tx('Ukladám…') : tf('Preniesť do {0}', chosen.size)}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>{tx('Zrušiť')}</Button>
          </div>
        </div>
      )}
      {done && <p role="status" className="mt-2 text-muted-foreground">{done}</p>}
      {copy.isError && <p className="mt-2 text-destructive">{tx('Rozloženie sa nepodarilo preniesť.')}</p>}
    </div>
  )
}
