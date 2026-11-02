import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { addToPrintQueue, printKeys, usePrintQueue, type PrintItem } from './api'

type Props = {
  companyId: string
  kind: PrintItem['kind']
  /** Jedna alebo viac položiek (napr. všetky časti rozdelenej techniky, všetky cases sady). */
  targetIds: string[]
  label?: PrintItem['label']
}

/** „Do tlače“: pridá štítky do tlačovej fronty; všetko vo fronte sa potom vytlačí naraz (menu Tlač). */
export function AddToPrintButton({ companyId, kind, targetIds, label = 'qr' }: Props) {
  const queryClient = useQueryClient()
  const queue = usePrintQueue(companyId)
  const [justAdded, setJustAdded] = useState(false)
  const add = useMutation({
    mutationFn: () => addToPrintQueue(companyId, targetIds.map((targetId) => ({ kind, targetId, label }))),
    onSuccess: () => setJustAdded(true),
    onSettled: () => queryClient.invalidateQueries({ queryKey: printKeys.queue(companyId) }),
  })
  // Bez migrácie 0120 sa tlačidlo neukáže.
  if (queue.isError) return null
  const inQueue = targetIds.length > 0 && targetIds.every((id) => (queue.data ?? []).some((item) => item.kind === kind && item.targetId === id && item.label === label))
  if (inQueue || justAdded) {
    return (
      <Link to="/print" className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm text-emerald-600 hover:bg-muted dark:text-emerald-400">
        <Check className="size-4" aria-hidden />
        {label === 'tape' ? 'Páska v tlači' : 'V tlači'}
      </Link>
    )
  }
  return (
    <Button variant="outline" size="sm" disabled={add.isPending || targetIds.length === 0} onClick={() => add.mutate()} title="Pridať štítky do tlačovej fronty – vytlačíte ich naraz v menu Tlač">
      <Printer className="size-4" aria-hidden />
      {label === 'tape' ? 'Páska do tlače' : 'Do tlače'}
      {targetIds.length > 1 ? ` (${targetIds.length})` : ''}
    </Button>
  )
}
