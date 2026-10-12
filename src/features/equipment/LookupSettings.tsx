import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteLookup, renameLookup, setCategoryConsumable, type LookupTable } from './api'
import type { Lookup } from './model'

type Props = {
  companyId: string
  table: LookupTable
  items: Lookup[]
  /** Slovo do otázok a hlásení, napr. „kategóriu“. */
  noun: string
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
  const busy = rename.isPending || remove.isPending || consumable.isPending

  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">Zatiaľ žiadne.</p>
  }

  return (
    <>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
            <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
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
      {(rename.isError || remove.isError || consumable.isError) && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zmena sa nepodarila. Názov možno už existuje.
        </p>
      )}
    </>
  )
}
