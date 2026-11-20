import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Headphones } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { isGone } from '@/features/equipment/model'
import { tf, tx } from '@/lib/i18n'
import { addEventEquipment, eventKeys } from './api'
import type { CompanyEvent } from './model'

/**
 * Pri DJ v „Kto hrá“: jeho vlastná technika (pult, slúchadlá…), ktorá ešte nie je na evente, sa pridá jedným ťuknutím.
 * Pridá sa len to, čo je na jeho karte v Zamestnancoch ako vlastník; práva rieši databáza ako pri bežnom pridaní.
 */
export function DjGearButton({ companyId, event, staffId }: { companyId: string; event: CompanyEvent; staffId: string }) {
  const queryClient = useQueryClient()
  const equipment = useQuery({ queryKey: equipmentKeys.list(companyId), queryFn: () => fetchEquipmentList(companyId) })
  const onEvent = new Set(event.equipment.map((line) => line.equipmentId))
  const missing = (equipment.data ?? []).filter((item) => item.ownerStaffId === staffId && !isGone(item.status) && item.status !== 'archived' && !onEvent.has(item.id))
  const add = useMutation({
    mutationFn: async () => {
      for (const item of missing) await addEventEquipment(companyId, event.id, item.id)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) }),
  })
  if (missing.length === 0) return null
  return (
    <span className="mt-1 flex flex-wrap items-center gap-2 text-sm">
      <Button size="sm" variant="outline" disabled={add.isPending} onClick={() => add.mutate()} title={missing.map((item) => item.name).join(', ')}>
        <Headphones className="size-4" aria-hidden />{tf('Pridať jeho techniku ({0})', missing.length)}
      </Button>
      {add.isError && <span className="text-destructive">{tx('Techniku sa nepodarilo pridať.')}</span>}
    </span>
  )
}
