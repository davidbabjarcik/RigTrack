import { useQuery } from '@tanstack/react-query'
import { ChartColumn, ChevronRight, Plus, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { useCompany } from '@/features/companies/company-context'
import { RestockList } from '@/features/equipment/RestockList'
import { formatDate, formatMoney } from '@/lib/format'
import { can } from '@/lib/permissions'
import { fetchOrders, orderKeys } from './api'
import { filterOrders, formatTotals, NO_ORDER_FILTER, ORDER_SORT_LABELS, ORDER_SORTS, orderStats, SOURCE_LABELS, type OrderFilter } from './model'
import { OrderLineSearch } from './OrderLineSearch'
import { SupplierBadge } from './SupplierBadge'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'

function itemsLabel(count: number) {
  if (count === 1) return '1 položka'
  if (count >= 2 && count <= 4) return `${count} položky`
  return `${count} položiek`
}

const FILTER_KEY = 'rigtrack.orders.filter'

function savedFilter(): OrderFilter {
  try {
    const saved = sessionStorage.getItem(FILTER_KEY)
    return saved ? { ...NO_ORDER_FILTER, ...(JSON.parse(saved) as OrderFilter) } : NO_ORDER_FILTER
  } catch {
    return NO_ORDER_FILTER
  }
}

export function OrdersListPage() {
  const company = useCompany().active!
  const allowed = can(company, 'orders.view')
  const members = useMembers(company.companyId)
  const [filter, setFilter] = useState<OrderFilter>(savedFilter)
  const set = (patch: Partial<OrderFilter>) => setFilter((current) => ({ ...current, ...patch }))
  const [more, setMore] = useState(() => [filter.orderedBy, filter.forWhom, filter.source, filter.year, filter.flag].some(Boolean))
  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_KEY, JSON.stringify(filter))
    } catch {
      // Bez úložiska sa filter len nezapamätá.
    }
  }, [filter])
  const orders = useQuery({
    queryKey: orderKeys.list(company.companyId),
    queryFn: () => fetchOrders(company.companyId),
    enabled: allowed,
  })
  const thumbs = usePhotoThumbs(
    company.companyId,
    (orders.data ?? []).map((order) => order.photoPath),
  )

  const all = orders.data ?? []
  const visible = filterOrders(all, filter)
  const years = [...new Set(all.map((order) => order.orderedAt.slice(0, 4)))].sort().reverse()
  const orderers = [...new Set(all.map((order) => order.orderedBy).filter((id): id is string => Boolean(id)))]
  const filtered = JSON.stringify({ ...filter, sort: '' }) !== JSON.stringify({ ...NO_ORDER_FILTER, sort: '' })
  const extra = [filter.orderedBy, filter.forWhom, filter.source, filter.year, filter.flag].filter(Boolean).length
  const sums = orderStats(visible)

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
          <div className="flex flex-wrap justify-end gap-2">
            <LinkButton to="/orders/stats" variant="outline">
              <ChartColumn className="size-4" aria-hidden />
              Štatistiky
            </LinkButton>
            <LinkButton to="/orders/new">
              <Plus className="size-4" aria-hidden />
              Pridať
            </LinkButton>
          </div>
        }
      />

      <RestockList companyId={company.companyId} />

      <OrderLineSearch companyId={company.companyId} />

      {all.length > 0 && (
        <div className="mb-4 flex flex-col gap-3">
          <Field
            label="Hľadať v objednávkach"
            hideLabel
            type="search"
            placeholder="Hľadať objednávku: dodávateľ, číslo, poznámka, pre koho"
            value={filter.search}
            onChange={(e) => set({ search: e.target.value })}
          />
          <div className="flex flex-wrap items-end gap-2">
            <Button variant="outline" size="sm" aria-expanded={more} onClick={() => setMore(!more)}>
              <SlidersHorizontal className="size-4" aria-hidden />
              Filter{extra > 0 && ` (${extra})`}
            </Button>
            <SelectField label="Triediť" hideLabel className="w-60" value={filter.sort} onChange={(e) => set({ sort: e.target.value as OrderFilter['sort'] })}>
              {ORDER_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {ORDER_SORT_LABELS[sort]}
                </option>
              ))}
            </SelectField>
          </div>
          {more && (
            <div className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
              <SelectField label="Objednal" value={filter.orderedBy} onChange={(e) => set({ orderedBy: e.target.value })}>
                <option value="">Ktokoľvek</option>
                {orderers.map((id) => (
                  <option key={id} value={id}>
                    {memberName(members.data, id) || 'bývalý člen'}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Pre koho" value={filter.forWhom} onChange={(e) => set({ forWhom: e.target.value as OrderFilter['forWhom'] })}>
                <option value="">Všetky</option>
                <option value="us">Pre nás</option>
                <option value="others">Nie pre nás</option>
              </SelectField>
              <SelectField label="Zdroj" value={filter.source} onChange={(e) => set({ source: e.target.value as OrderFilter['source'] })}>
                <option value="">Obchod aj bazár</option>
                <option value="shop">{SOURCE_LABELS.shop}</option>
                <option value="marketplace">{SOURCE_LABELS.marketplace}</option>
              </SelectField>
              <SelectField label="Rok" value={filter.year} onChange={(e) => set({ year: e.target.value })}>
                <option value="">Všetky roky</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Iné" value={filter.flag} onChange={(e) => set({ flag: e.target.value as OrderFilter['flag'] })}>
                <option value="">Bez ohľadu</option>
                <option value="noInvoice">Bez faktúry</option>
                <option value="noStock">Nepridané do techniky</option>
              </SelectField>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {visible.length} z {all.length} · pre nás {formatTotals(sums.totals)}
            {Object.keys(sums.forOthers).length > 0 && ` · nie pre nás ${formatTotals(sums.forOthers)}`}
            {filtered && (
              <button type="button" className="ml-3 text-accent hover:underline" onClick={() => setFilter({ ...NO_ORDER_FILTER, sort: filter.sort })}>
                Zrušiť filter
              </button>
            )}
          </p>
        </div>
      )}

      {orders.isPending ? (
        <LoadingBlock />
      ) : orders.isError ? (
        <ErrorBlock message="Objednávky sa nepodarilo načítať." onRetry={() => void orders.refetch()} />
      ) : all.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">Zatiaľ tu nie je žiadna objednávka</p>
          <p className="mt-1 text-sm text-muted-foreground">Začnite tlačidlom Pridať.</p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
          {visible.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Filtru nič nezodpovedá.</li>}
          {visible.map((order) => (
            <li key={order.id}>
              <Link to={`/orders/${order.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-muted">
                {order.photoPath ? <PhotoThumb url={thumbs[order.photoPath]} /> : <SupplierBadge supplier={order.supplier} source={order.source} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{order.supplier}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {[
                      formatDate(order.orderedAt),
                      order.source === 'marketplace' ? ['bazár', order.seller].filter(Boolean).join(': ') : order.orderNumber,
                      itemsLabel(order.itemCount),
                      order.orderedBy && memberName(members.data, order.orderedBy),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {(order.forUs === false || order.addToStock === false || order.hasInvoice === false) && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {order.forUs === false && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                          nie pre nás{order.forWhom && `: ${order.forWhom}`}
                        </span>
                      )}
                      {order.addToStock === false && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">nie do techniky</span>}
                      {order.hasInvoice === false && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">bez faktúry</span>}
                    </span>
                  )}
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
