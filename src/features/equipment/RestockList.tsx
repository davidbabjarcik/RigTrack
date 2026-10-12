import { useQuery } from '@tanstack/react-query'
import { ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { equipmentKeys, fetchEquipmentList } from './api'
import { needsRestock } from './model'

/** Zoznam „treba kúpiť“: položky, ktorých zásoba klesla na nastavenú hranicu. Bez takých položiek sa nezobrazí. */
export function RestockList({ companyId }: { companyId: string }) {
  const equipment = useQuery({
    queryKey: equipmentKeys.list(companyId),
    queryFn: () => fetchEquipmentList(companyId),
  })
  // Najprv to, čo už úplne došlo.
  const low = (equipment.data ?? []).filter(needsRestock).sort((a, b) => a.quantity - b.quantity)
  if (low.length === 0) return null

  return (
    <section aria-labelledby="restock-heading" className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
      <h2 id="restock-heading" className="mb-2 flex items-center gap-2 font-medium">
        <ShoppingCart className="size-5 text-destructive" aria-hidden />
        Treba kúpiť ({low.length})
      </h2>
      <ul className="divide-y divide-destructive/20">
        {low.map((item) => (
          <li key={item.id}>
            <Link to={`/equipment/${item.id}`} className="flex items-center justify-between gap-4 py-2 hover:underline">
              <span className="min-w-0 truncate font-medium">{item.name}</span>
              <span className="shrink-0 text-sm text-destructive">
                {item.quantity === 0 ? 'došlo' : item.quantity === 1 ? 'posledný kus' : `ostáva ${item.quantity} ks`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
