import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteLookup, renameLookup, setCategoryColor, setCategoryConsumable, type LookupTable } from './api'
import { CATEGORY_COLORS, COLOR_CLASSES, COLOR_LABELS, suggestedColor, type CategoryColor } from './categoryColors'
import type { Lookup } from './model'

type Props = {
  companyId: string
  table: LookupTable
  items: Lookup[]
  /** Slovo do otázok a hlásení, napr. „kategóriu“. */
  noun: string
}

function autoLabel(name: string) {
  const guess = suggestedColor(name)
  return guess ? `Automaticky (${COLOR_LABELS[guess].toLowerCase()})` : 'Bez farby'
}

/** Premenovanie a mazanie kategórií či umiestnení; pri kategóriách aj príznak spotrebného materiálu. */
export function LookupSettings({ companyId, table, items, noun }: Props) {
  const queryClient = useQueryClient()
  // Názvy sa zobrazujú pri technike, cases aj objednávkach, preto celý strom firmy.
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company', companyId] })

  const rename = useMutation({ mutationFn: (args: { id: string; name: string }) => renameLookup(table, args.id, args.name), onSettled: refresh })
  const remove = useMutation({ mutationFn: (id: string) => deleteLookup(table, id), onSettled: refresh })
  const consumable = useMutation({
    mutationFn: (args: { id: string; value: boolean }) => setCategoryConsumable(args.id, args.value),
    onSettled: refresh,
  })
  const color = useMutation({
    mutationFn: (args: { id: string; value: CategoryColor | null }) => setCategoryColor(args.id, args.value),
    onSettled: refresh,
  })
  const busy = rename.isPending || remove.isPending || consumable.isPending || color.isPending

  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">Zatiaľ žiadne.</p>
  }

  return (
    <>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
            {table === 'equipment_categories' && (
              <span className={`h-6 w-1.5 shrink-0 rounded-full ${COLOR_CLASSES[item.color ?? suggestedColor(item.name) ?? 'gray']}`} aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
            {table === 'equipment_categories' && (
              <select
                aria-label={`Farba kategórie ${item.name}`}
                className="h-9 rounded-lg border bg-surface px-2 text-sm"
                value={item.color ?? ''}
                disabled={busy}
                onChange={(e) => color.mutate({ id: item.id, value: (e.target.value || null) as CategoryColor | null })}
              >
                <option value="">{autoLabel(item.name)}</option>
                {CATEGORY_COLORS.map((option) => (
                  <option key={option} value={option}>
                    {COLOR_LABELS[option]}
                  </option>
                ))}
              </select>
            )}
            {table === 'equipment_categories' && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-4 accent-(--accent)"
                  checked={Boolean(item.consumable)}
                  disabled={busy}
                  onChange={(e) => consumable.mutate({ id: item.id, value: e.target.checked })}
                />
                spotrebný materiál
              </label>
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Premenovať: ${item.name}`}
              disabled={busy}
              onClick={() => {
                const name = window.prompt(`Nový názov pre „${item.name}“`, item.name)?.trim()
                if (name && name !== item.name) rename.mutate({ id: item.id, name })
              }}
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Odstrániť: ${item.name}`}
              disabled={busy}
              onClick={() => {
                if (window.confirm(`Odstrániť ${noun} „${item.name}“? Technika ostane, len ju stratí.`)) remove.mutate(item.id)
              }}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      {(rename.isError || remove.isError || consumable.isError || color.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zmena sa nepodarila. Názov možno už existuje.
        </p>
      )}
    </>
  )
}
