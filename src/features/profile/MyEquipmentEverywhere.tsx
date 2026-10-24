import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, X } from 'lucide-react'
import type { Membership } from '@/features/companies/company-context'
import { Button } from '@/components/ui/button'
import { myEquipmentKeys, shareEquipment, syncEquipment, unshareEquipment, useMyEquipment } from './myEquipment'

/** Moja vlastná technika: v ktorých firmách je, pridanie do ďalšej firmy, prenesenie zmien a odobratie. */
export function MyEquipmentEverywhere({ userId, memberships }: { userId: string; memberships: Membership[] }) {
  const queryClient = useQueryClient()
  const gear = useMyEquipment(userId)
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: myEquipmentKeys.all(userId) }), queryClient.invalidateQueries({ queryKey: ['company'] })])
  const share = useMutation({ mutationFn: ({ id, companyId }: { id: string; companyId: string }) => shareEquipment(id, companyId), onSettled: refresh })
  const sync = useMutation({ mutationFn: syncEquipment, onSettled: refresh })
  const unshare = useMutation({ mutationFn: unshareEquipment, onSettled: refresh })
  const busy = share.isPending || sync.isPending || unshare.isPending
  const nameOf = (companyId: string) => memberships.find((item) => item.companyId === companyId)?.companyName ?? 'firma'

  if (gear.isPending) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Načítavam…</p>
  if (gear.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Technika sa nepodarila načítať.</p>

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">
        Technika, ktorá patrí vám (vo firme má ako vlastníka vás). Pridajte ju aj do ďalšej svojej firmy – bude tam ako vaša vlastná technika
        a dá sa dať na event. Zmeny (názov, počet, parametre) prenesiete tlačidlom „Aktualizovať kópie“.
      </p>
      {gear.data.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Zatiaľ nemáte žiadnu vlastnú techniku. Vo firme ju pridáte v Technike – ako vlastníka vyberte seba.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {gear.data.map(({ original, copies }) => {
            const present = new Set([original.companyId, ...copies.map((copy) => copy.companyId)])
            const missing = memberships.filter((item) => !present.has(item.companyId))
            return (
              <li key={original.id} className="flex flex-col gap-2 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {original.name} <span className="font-normal text-muted-foreground">· {original.quantity} ks</span>
                  </span>
                  {copies.length > 0 && (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => sync.mutate(original.id)}>
                      <RefreshCw className="size-4" aria-hidden />
                      Aktualizovať kópie
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">{nameOf(original.companyId)}</span>
                  {copies.map((copy) => (
                    <span key={copy.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                      {nameOf(copy.companyId)}
                      <button
                        type="button"
                        aria-label={`Odobrať z firmy ${nameOf(copy.companyId)}`}
                        className="text-muted-foreground hover:text-foreground"
                        disabled={busy}
                        onClick={() => window.confirm(`Odobrať „${original.name}“ z firmy ${nameOf(copy.companyId)}?`) && unshare.mutate(copy.id)}
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </span>
                  ))}
                  {missing.map((item) => (
                    <button
                      key={item.companyId}
                      type="button"
                      disabled={busy}
                      onClick={() => share.mutate({ id: original.id, companyId: item.companyId })}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Plus className="size-3.5" aria-hidden />
                      {item.companyName}
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {(share.isError || sync.isError || unshare.isError) && (
        <p className="text-sm text-destructive">Zmena sa nepodarila. Táto časť databázy ešte nie je pripravená – kontaktujte vývojára aplikácie.</p>
      )}
    </div>
  )
}
