import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { LinkButton } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { RestockList } from '@/features/equipment/RestockList'
import { formatDate, formatMoney } from '@/lib/format'
import { can } from '@/lib/permissions'
import { fetchOrders, orderKeys } from './api'
import { OrderLineSearch } from './OrderLineSearch'
import { SupplierBadge } from './SupplierBadge'

function itemsLabel(count: number) {
  if (count === 1) return '1 položka'
  if (count >= 2 && count <= 4) return `${count} položky`
  return `${count} položiek`
}

export function OrdersListPage() {
  const company = useCompany().active!
  const allowed = can(company, 'orders.view')
  const orders = useQuery({
    queryKey: orderKeys.list(company.companyId),
    queryFn: () => fetchOrders(company.companyId),
    enabled: allowed,
  })

  if (!allowed) {
    return (
      <>
        <PageHeader title="Objednávky" />
        <ErrorBlock message="Objednávky a nákupné ceny vidí iba admin a skladník." />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Objednávky"
        description="Nákupy techniky a ich položky"
        action={
          <LinkButton to="/orders/new">
            <Plus className="size-4" aria-hidden />
            Pridať
          </LinkButton>
        }
      />

      <RestockList companyId={company.companyId} />

      <OrderLineSearch companyId={company.companyId} />

      {orders.isPending ? (
        <LoadingBlock />
      ) : orders.isError ? (
        <ErrorBlock message="Objednávky sa nepodarilo načítať." onRetry={() => void orders.refetch()} />
      ) : orders.data.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">Zatiaľ tu nie je žiadna objednávka</p>
          <p className="mt-1 text-sm text-muted-foreground">Začnite tlačidlom Pridať.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {orders.data.map((order) => (
            <li key={order.id}>
              <Link to={`/orders/${order.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                <SupplierBadge supplier={order.supplier} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{order.supplier}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[formatDate(order.orderedAt), order.orderNumber, itemsLabel(order.itemCount)].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="shrink-0 font-medium">{formatMoney(order.total, order.currency)}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
