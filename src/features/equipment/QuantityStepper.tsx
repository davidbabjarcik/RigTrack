import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { equipmentKeys, setEquipmentQuantity } from './api'

type Props = { companyId: string; equipmentId: string; quantity: number; canEdit: boolean }

/** Počet kusov s tlačidlami −/+ na rýchle odpísanie spotreby alebo doplnenie. */
export function QuantityStepper({ companyId, equipmentId, quantity, canEdit }: Props) {
  const queryClient = useQueryClient()
  const change = useMutation({
    mutationFn: (next: number) => setEquipmentQuantity(companyId, equipmentId, next),
    // Prefix zoznamu pokrýva aj detail tejto položky.
    onSettled: () => queryClient.invalidateQueries({ queryKey: equipmentKeys.list(companyId) }),
  })

  if (!canEdit) return <>{quantity}</>

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        aria-label="Ubrať kus"
        disabled={change.isPending || quantity <= 0}
        onClick={() => change.mutate(quantity - 1)}
      >
        <Minus className="size-4" aria-hidden />
      </Button>
      <span className="min-w-8 text-center tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <Button
        variant="outline"
        size="sm"
        aria-label="Pridať kus"
        disabled={change.isPending}
        onClick={() => change.mutate(quantity + 1)}
      >
        <Plus className="size-4" aria-hidden />
      </Button>
    </span>
  )
}
