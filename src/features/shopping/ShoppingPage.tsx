import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { ErrorBlock, LoadingBlock } from '@/components/feedback/QueryState'
import { PageHeader } from '@/components/layout/PageHeader'
import { OrdersTabs } from '@/components/layout/ModuleTabs'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { RestockList } from '@/features/equipment/RestockList'
import { formatDate, formatMoney } from '@/lib/format'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { fetchShoppingItems, patchShoppingItem, setShoppingPhoto, shoppingKeys } from './api'
import {
  SHOPPING_LIST_LABELS,
  SHOPPING_LISTS,
  SHOPPING_STATUS_LABELS,
  shoppingTotal,
  sortShopping,
  type ShoppingItem,
  type ShoppingList,
  type ShoppingStatus,
} from './model'
import { ShoppingEditor } from './ShoppingEditor'
import { CompactPhoto } from '@/features/equipment/CompactPhoto'
import { discardPhotoFile, trashPhoto } from '@/features/equipment/photo'
import { usePhotoThumbs } from '@/features/equipment/usePhotoThumbs'

const NEXT_STATUS: Partial<Record<ShoppingStatus, { status: ShoppingStatus; label: string }>> = {
  planned: { status: 'ordered', label: 'Objednané' },
  ordered: { status: 'delivered', label: 'Doručené' },
}

export function ShoppingPage() {
  const company = useCompany().active!
  const companyId = company.companyId
  const userId = useAuth().session!.user.id
  const canEdit = can(company, 'shopping.edit')
  const queryClient = useQueryClient()
  const [list, setList] = useState<ShoppingList>('buy')
  // 'new' = formulár novej položky, inak id upravovanej položky
  const [editing, setEditing] = useState<string | null>(null)

  const items = useQuery({ queryKey: shoppingKeys.list(companyId), queryFn: () => fetchShoppingItems(companyId) })
  const members = useMembers(companyId)
  const patch = useMutation({
    mutationFn: ({ id, change }: { id: string; change: { list?: ShoppingList; status?: ShoppingStatus } }) =>
      patchShoppingItem(companyId, id, change),
    onSettled: () => queryClient.invalidateQueries({ queryKey: shoppingKeys.list(companyId) }),
  })

  const all = items.data ?? []
  const thumbs = usePhotoThumbs(
    companyId,
    all.map((item) => item.photoPath),
  )
  const visible = sortShopping(all.filter((item) => item.list === list))
  const pending = visible.filter((item) => item.status !== 'delivered')
  const count = (which: ShoppingList) => all.filter((item) => item.list === which && item.status !== 'delivered').length

  const editor = (item: ShoppingItem | null) => (
    <ShoppingEditor
      companyId={companyId}
      item={item}
      defaultList={list}
      members={members.data ?? []}
      // Mazať smie admin a skladník, a každý svoju vlastnú položku (rovnako to stráži databáza).
      canDelete={can(company, 'shopping.delete') || item?.createdBy === userId}
      onClose={() => setEditing(null)}
    />
  )

  return (
    <>
      <OrdersTabs />
      <PageHeader
        title="Wantlist"
        description={pending.length > 0 ? `Odhad spolu: ${formatMoney(shoppingTotal(pending), 'EUR')}` : 'Čo treba kúpiť a čo chceme časom'}
        action={
          canEdit &&
          editing !== 'new' && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />
              Pridať
            </Button>
          )
        }
      />

      <div className="mb-4 flex gap-2" role="group" aria-label="Zoznam">
        {SHOPPING_LISTS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={list === value}
            onClick={() => {
              setList(value)
              setEditing(null)
            }}
            className={cn(
              'h-9 rounded-lg border px-3 text-sm font-medium',
              list === value ? 'bg-primary text-primary-foreground' : 'bg-surface hover:bg-muted',
            )}
          >
            {SHOPPING_LIST_LABELS[value]} ({count(value)})
          </button>
        ))}
      </div>

      {editing === 'new' && <div className="mb-4">{editor(null)}</div>}

      {/* Zásoby, ktoré klesli na hranicu, patria k tomu, čo treba kúpiť. */}
      {list === 'buy' && <RestockList companyId={companyId} />}

      {items.isPending ? (
        <LoadingBlock />
      ) : items.isError ? (
        <ErrorBlock message="Zoznam sa nepodarilo načítať." onRetry={() => void items.refetch()} />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface px-6 py-16 text-center">
          <p className="font-medium">
            {list === 'buy' ? 'Nič konkrétne na nákup' : 'Zoznam želaní je prázdny'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {list === 'buy'
              ? 'Sem patria konkrétne položky s cenou, dodávateľom a termínom.'
              : 'Sem patrí technika, ktorú chcete kúpiť časom, s odhadom ceny a prioritou.'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => {
            if (editing === item.id) return <li key={item.id}>{editor(item)}</li>
            const next = NEXT_STATUS[item.status]
            const meta = [
              item.supplier,
              item.list === 'buy' && SHOPPING_STATUS_LABELS[item.status],
              item.priority === 'high' && 'vysoká priorita',
              item.dueOn && `do ${formatDate(item.dueOn)}`,
              memberName(members.data, item.assigneeId),
              item.orderNumber && `č. ${item.orderNumber}`,
            ].filter(Boolean)
            return (
              <li key={item.id} className="rounded-xl border bg-surface px-4 py-3">
                <div className="flex items-start gap-3">
                  {(item.photoPath || canEdit) && (
                    <CompactPhoto
                      name={item.name}
                      photoPath={item.photoPath}
                      thumbUrl={thumbs[item.photoPath]}
                      canEdit={canEdit}
                      onUpload={async (file) => {
                        await setShoppingPhoto(companyId, item.id, file)
                        if (item.photoPath) await discardPhotoFile(item.photoPath).catch(() => {})
                      }}
                      onRemove={() => trashPhoto('shopping_items', item.id)}
                      onChanged={() => queryClient.invalidateQueries({ queryKey: shoppingKeys.list(companyId) })}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn('font-medium break-words', item.status === 'delivered' && 'text-muted-foreground line-through')}>
                      {item.quantity > 1 && `${item.quantity}× `}
                      {item.name}
                    </p>
                    {meta.length > 0 && <p className="text-sm text-muted-foreground">{meta.join(' · ')}</p>}
                    {item.note && <p className="mt-1 text-sm whitespace-pre-wrap">{item.note}</p>}
                  </div>
                  {item.unitPrice !== null && (
                    <p className="shrink-0 text-right font-medium">
                      {formatMoney(item.unitPrice * item.quantity, 'EUR')}
                      {item.quantity > 1 && (
                        <span className="block text-sm font-normal text-muted-foreground">
                          {formatMoney(item.unitPrice, 'EUR')} / ks
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                    >
                      Otvoriť odkaz
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                  {canEdit && (
                    <span className="ml-auto flex flex-wrap gap-2">
                      {item.list === 'want' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={patch.isPending}
                          onClick={() => patch.mutate({ id: item.id, change: { list: 'buy' } })}
                        >
                          Presunúť do „Kúpiť“
                        </Button>
                      )}
                      {item.list === 'buy' && next && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={patch.isPending}
                          onClick={() => patch.mutate({ id: item.id, change: { status: next.status } })}
                        >
                          {next.label}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" aria-label={`Upraviť: ${item.name}`} onClick={() => setEditing(item.id)}>
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {patch.isError && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Zmena sa nepodarila.
        </p>
      )}
    </>
  )
}
