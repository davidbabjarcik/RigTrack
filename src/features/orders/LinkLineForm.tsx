import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { parseUnitRanges, type Equipment } from '@/features/equipment/model'
import { linkOrderItem } from './api'

/** Dodatočné prepojenie riadku objednávky s technikou, ktorú už máme (napr. faktúra ku kusom #1–4). */
export function LinkLineForm({ companyId, itemId, equipment }: { companyId: string; itemId: string; equipment: Equipment[] }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [equipmentId, setEquipmentId] = useState('')
  const [units, setUnits] = useState('')
  const link = useMutation({
    mutationFn: () => linkOrderItem(itemId, equipmentId, parseUnitRanges(units)),
    onSuccess: () => {
      setOpen(false)
      setUnits('')
    },
    // Nákupy sa zobrazujú aj pri technike – obnoví sa celá firma.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['company', companyId] }),
  })
  const piece = equipment.find((item) => item.id === equipmentId)

  if (!open) {
    return (
      <button type="button" className="mt-1 inline-flex items-center gap-1 text-sm text-accent hover:underline" onClick={() => setOpen(true)}>
        <Link2 className="size-3.5" aria-hidden />
        Prepojiť s technikou, ktorú už mám
      </button>
    )
  }
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border bg-background p-2 text-sm">
      <select aria-label="Technika" className="h-9 min-w-48 flex-1 rounded-lg border bg-surface px-2" value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)}>
        <option value="">— ktorá technika —</option>
        {equipment.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.quantity} ks)
          </option>
        ))}
      </select>
      {piece?.trackUnits && (
        <input aria-label="Ktoré kusy" placeholder="kusy, napr. 1-4" className="h-9 w-36 rounded-lg border bg-surface px-2" value={units} onChange={(event) => setUnits(event.target.value)} />
      )}
      <Button size="sm" disabled={!equipmentId || link.isPending} onClick={() => link.mutate()}>
        Prepojiť
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Zrušiť
      </Button>
      <p className="basis-full text-xs text-muted-foreground">Počet kusov v technike sa nezmení.</p>
      {link.isError && <p className="basis-full text-destructive">Prepojenie sa nepodarilo. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>}
    </div>
  )
}
