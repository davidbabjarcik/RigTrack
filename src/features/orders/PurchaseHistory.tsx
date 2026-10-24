import { useQuery } from '@tanstack/react-query'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Link } from 'react-router-dom'
import { formatDate, formatMoney } from '@/lib/format'
import { ExternalLink } from 'lucide-react'
import { fetchPurchases, orderKeys } from './api'
import { supplierProductUrl } from './model'
import { describeUnitIds } from '@/features/equipment/model'

/** Nákupy daného kusu techniky; najnovší je prvý. Bez nákupov sa sekcia nezobrazí. */
export function PurchaseHistory({ companyId, equipmentId }: { companyId: string; equipmentId: string }) {
  const purchases = useQuery({
    queryKey: orderKeys.purchases(companyId, equipmentId),
    queryFn: () => fetchPurchases(companyId, equipmentId),
  })

  if (!purchases.data || purchases.data.length === 0) return null

  // Odkaz podľa najnovšieho nákupu, ktorý má kód tovaru u dodávateľa s podporovaným odkazom.
  const productUrl =
    purchases.data.map((purchase) => supplierProductUrl(purchase.supplier, purchase.articleNumber)).find(Boolean) ?? null

  return (
    <CollapsibleSection id="equipment.purchases" title="Nákupy" className="mt-6" actions={
      <>
        {productUrl && (
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Zobraziť u dodávateľa
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </>
    }>
      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {purchases.data.map((purchase, index) => (
          <li key={purchase.orderId}>
            <Link to={`/orders/${purchase.orderId}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted">
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {formatDate(purchase.orderedAt)}
                  {index === 0 && purchases.data.length > 1 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">posledný</span>
                  )}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {purchase.source === 'marketplace'
                    ? [`bazár ${purchase.supplier}`, purchase.seller].filter(Boolean).join(' · ')
                    : purchase.supplier}
                  {purchase.unitNumbers.length > 0 && ` · kusy ${describeUnitIds(purchase.unitNumbers)}`}
                  {!purchase.hasInvoice && <span className="text-accent"> · bez faktúry</span>}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-medium">
                  {purchase.quantity} ks × {formatMoney(purchase.unitPrice, purchase.currency)}
                </span>
                {purchase.quantity > 1 && (
                  <span className="block text-sm text-muted-foreground">
                    spolu {formatMoney(purchase.quantity * purchase.unitPrice, purchase.currency)}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  )
}
