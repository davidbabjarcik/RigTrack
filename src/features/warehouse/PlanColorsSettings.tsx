import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { savePlanColors, warehouseKeys } from './api'
import { SPOT_KIND_FILLS, SPOT_KIND_LABELS, type SpotKind, type Warehouse } from './model'
import { tx, tf } from '@/lib/i18n'

/** Druhy, ktorým sa dá zmeniť farba (palety majú farbu pri type palety). */
const KINDS: SpotKind[] = ['rack', 'zone', 'room', 'door', 'window', 'column', 'wall']

/** Nastavenia → Sklad: vlastné farby plánu (regál, miesto, hliník…); „Predvolené“ vráti pôvodné. */
export function PlanColorsSettings({ companyId, warehouse }: { companyId: string; warehouse: Warehouse }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Partial<Record<SpotKind, string>>>(warehouse.planColors ?? {})
  const save = useMutation({
    mutationFn: (colors: Partial<Record<SpotKind, string>>) => savePlanColors(companyId, colors),
    onSettled: () => queryClient.invalidateQueries({ queryKey: warehouseKeys.plan(companyId) }),
  })
  const changed = JSON.stringify(draft) !== JSON.stringify(warehouse.planColors ?? {})

  return (
    <div>
      <h3 className="mb-1 font-medium">{tx('Farby v pláne')}</h3>
      <p className="mb-2 text-sm text-muted-foreground">{tx('Farby druhov miest v pôdoryse skladu. Farbu palety nastavíte pri type palety vyššie.')}</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {KINDS.map((kind) => (
          <li key={kind} className="flex items-center gap-2 rounded-xl border bg-surface px-3 py-2 text-sm">
            <input
              type="color"
              aria-label={`Farba: ${SPOT_KIND_LABELS[kind]}`}
              className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border bg-surface p-0.5"
              value={draft[kind] ?? SPOT_KIND_FILLS[kind]}
              onChange={(e) => setDraft({ ...draft, [kind]: e.target.value })}
            />
            <span className="min-w-0 flex-1 truncate">{tx(SPOT_KIND_LABELS[kind])}</span>
            {draft[kind] && (
              <button
                type="button"
                aria-label={tf('Predvolená farba: {0}', SPOT_KIND_LABELS[kind])}
                title={tx('Predvolená')}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                onClick={() => {
                  const next = { ...draft }
                  delete next[kind]
                  setDraft(next)
                }}
              >
                <RotateCcw className="size-4" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      {changed && (
        <Button size="sm" className="mt-2" disabled={save.isPending} onClick={() => save.mutate(draft)}>
          {save.isPending ? tx('Ukladám…') : tx('Uložiť farby')}
        </Button>
      )}
      {save.isError && <p className="mt-1 text-sm text-destructive">{save.error.message}</p>}
    </div>
  )
}
