import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Trash2, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/features/companies/company-context'
import { equipmentKeys, fetchEquipmentList } from '@/features/equipment/api'
import { discardPhotoFile } from '@/features/equipment/photo'
import { PhotoThumb } from '@/features/equipment/PhotoThumb'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'
import { formatDate, formatMoney } from '@/lib/format'
import { can } from '@/lib/permissions'
import { deleteOrder, fetchOrder, orderKeys, unlinkOrderItem } from './api'
import { LinkLineForm } from './LinkLineForm'
import { describeUnitIds } from '@/features/equipment/model'
import { SOURCE_LABELS, supplierProductUrl } from './model'
import { OrderFlagsEditor } from './OrderFlagsEditor'
import { OrderPhoto } from './OrderPhoto'
import { SupplierBadge } from './SupplierBadge'

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const company = useCompany().active!
  const companyId = company.companyId
  const allowed = can(company, 'orders.view')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const order = useQuery({
    queryKey: orderKeys.detail(companyId, id),
    queryFn: () => fetchOrder(companyId, id),
    enabled: allowed,
  })
  const equipment = useQuery({
    queryKey: equipmentKeys.list(companyId),
    queryFn: () => fetchEquipmentList(companyId),
    enabled: allowed,
  })

  // Fotka riadku je fotka prvej techniky, ktorá z neho vznikla alebo bola doplnená.
  const photoOf = (equipmentId: string | undefined) => equipment.data?.find((item) => item.id === equipmentId)?.photoPath ?? ''
  const thumbs = usePhotoThumbs(
    companyId,
    (order.data?.lines ?? []).map((line) => photoOf(line.equipment[0]?.equipmentId)),
  )

  const unlink = useMutation({
    mutationFn: ({ itemId, equipmentId }: { itemId: string; equipmentId: string }) => unlinkOrderItem(itemId, equipmentId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['company', companyId] }),
  })
  const remove = useMutation({
    mutationFn: async () => {
      const photoPath = order.data?.photoPath
      await deleteOrder(companyId, id)
      // Súbor už nemá majiteľa; zlyhanie upratania nevadí.
      if (photoPath) await discardPhotoFile(photoPath).catch(() => {})
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['company', companyId] })
      navigate('/orders', { replace: true })
    },
  })

  const back = (
    <Link to="/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      Objednávky
    </Link>
  )

  if (!allowed) return <ErrorBlock message="Objednávky a nákupné ceny vidí iba admin a skladník." />
  if (order.isPending) return <LoadingBlock />
  if (order.isError) return <ErrorBlock message="Objednávku sa nepodarilo načítať." onRetry={() => void order.refetch()} />
  if (!order.data) {
    return (
      <>
        {back}
        <ErrorBlock message="Táto objednávka neexistuje alebo k nej nemáte prístup." />
      </>
    )
  }

  const data = order.data
  const money = (amount: number) => formatMoney(amount, data.currency)
  const equipmentName = (equipmentId: string) => equipment.data?.find((item) => item.id === equipmentId)?.name ?? 'Technika'

  return (
    <>
      {back}
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SupplierBadge supplier={data.supplier} source={data.source} />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{data.supplier}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[
                data.source === 'marketplace' && `${SOURCE_LABELS.marketplace}, kúpené ${formatDate(data.orderedAt)}`,
                data.source === 'shop' && formatDate(data.orderedAt),
                data.seller && `predajca ${data.seller}`,
                data.orderNumber && `č. ${data.orderNumber}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        {can(company, 'orders.delete') && (
          <Button
            variant="destructive"
            size="sm"
            disabled={remove.isPending}
            onClick={() => {
              const message = 'Naozaj odstrániť objednávku? Technika, ktorá z nej vznikla, ostane v evidencii aj s počtami kusov.'
              if (window.confirm(message)) remove.mutate()
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Odstrániť
          </Button>
        )}
      </header>

      {remove.isError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          Objednávku sa nepodarilo odstrániť.
        </p>
      )}

      <div className="mb-6">
        <OrderPhoto companyId={companyId} orderId={data.id} name={data.supplier} photoPath={data.photoPath} canEdit={can(company, 'orders.edit')} />
      </div>

      <OrderFlagsEditor companyId={companyId} order={data} canEdit={can(company, 'orders.edit')} />

      {data.note && <p className="mb-6 rounded-xl border bg-surface p-4 whitespace-pre-wrap">{data.note}</p>}

      <ul className="divide-y overflow-hidden rounded-xl border bg-surface">
        {data.lines.map((line) => (
          <li key={line.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <PhotoThumb url={thumbs[photoOf(line.equipment[0]?.equipmentId)]} />
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{line.name}</p>
                <p className="text-sm text-muted-foreground">
                  {line.quantity} ks × {money(line.unitPrice)}
                  {line.articleNumber && ` · kód ${line.articleNumber}`}
                  {supplierProductUrl(data.supplier, line.articleNumber) && (
                    <>
                      {' · '}
                      <a
                        href={supplierProductUrl(data.supplier, line.articleNumber)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        u dodávateľa
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    </>
                  )}
                </p>
              </div>
              <p className="shrink-0 font-medium">{money(line.quantity * line.unitPrice)}</p>
            </div>
            {line.equipment.length > 0 && (
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">V technike: </span>
                {line.equipment.map((link, index) => (
                  <span key={link.equipmentId}>
                    {index > 0 && ', '}
                    <Link to={`/equipment/${link.equipmentId}`} className="text-accent hover:underline">
                      {equipmentName(link.equipmentId)}
                      {line.mode === 'link'
                        ? link.unitNumbers.length > 0
                          ? ` – kusy ${describeUnitIds(link.unitNumbers)}`
                          : ' (prepojené)'
                        : line.equipment.length > 1
                          ? ` #${index + 1}`
                          : link.quantity > 1
                            ? ` (+${link.quantity} ks)`
                            : ''}
                    </Link>
                    {line.mode === 'link' && can(company, 'orders.edit') && (
                      <button
                        type="button"
                        aria-label={`Zrušiť prepojenie s ${equipmentName(link.equipmentId)}`}
                        className="ml-1 inline-flex align-middle text-muted-foreground hover:text-foreground"
                        disabled={unlink.isPending}
                        onClick={() => window.confirm('Zrušiť prepojenie? Technika ani objednávka sa nezmažú.') && unlink.mutate({ itemId: line.id, equipmentId: link.equipmentId })}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    )}
                  </span>
                ))}
              </p>
            )}
            {can(company, 'orders.edit') && (line.mode === 'none' || line.mode === 'link') && (
              <LinkLineForm companyId={companyId} itemId={line.id} equipment={equipment.data ?? []} />
            )}
          </li>
        ))}
        <li className="flex items-center justify-between gap-4 bg-muted px-4 py-3 font-semibold">
          <span>Spolu</span>
          <span>{money(data.total)}</span>
        </li>
      </ul>
    </>
  )
}
