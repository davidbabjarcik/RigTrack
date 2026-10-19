import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { memberName, useMembers } from '@/features/companies/useMembers'
import { errorDetail } from '@/lib/supabase/errors'
import { setOrderFlags } from './api'
import type { OrderSummary } from './model'

/** Kto objednal, pre koho a či s faktúrou – v detaile objednávky, dá sa zmeniť aj dodatočne. */
export function OrderFlagsEditor({ companyId, order, canEdit }: { companyId: string; order: OrderSummary; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const members = useMembers(companyId)
  const [editing, setEditing] = useState(false)
  const [orderedBy, setOrderedBy] = useState(order.orderedBy ?? '')
  const [forUs, setForUs] = useState(order.forUs !== false)
  const [forWhom, setForWhom] = useState(order.forWhom ?? '')
  const [hasInvoice, setHasInvoice] = useState(order.hasInvoice !== false)
  const save = useMutation({
    mutationFn: () => setOrderFlags(companyId, order.id, { orderedBy: orderedBy || undefined, forUs, forWhom, hasInvoice }),
    onSuccess: () => setEditing(false),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['company', companyId, 'orders'] }),
  })
  // Bez migrácie 0060 objednávka tieto údaje nemá.
  if (order.createdAt === undefined) return null

  if (!editing) {
    const facts = [
      order.orderedBy && `Objednal: ${memberName(members.data, order.orderedBy) || 'bývalý člen'}`,
      order.forUs === false ? `Nie pre nás${order.forWhom ? `: ${order.forWhom}` : ''}` : 'Pre nás',
      order.addToStock === false && 'Nepridané do techniky',
      order.hasInvoice === false ? 'Bez faktúry' : 'S faktúrou / bločkom',
    ].filter(Boolean)
    return (
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border bg-surface px-4 py-3 text-sm">
        {facts.map((fact) => (
          <span key={String(fact)}>{fact}</span>
        ))}
        {canEdit && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEditing(true)}>
            Zmeniť
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="mb-6 grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
      <SelectField label="Objednal" value={orderedBy} onChange={(e) => setOrderedBy(e.target.value)}>
        <option value="">— neuvedené —</option>
        {(members.data ?? []).map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.fullName || member.email}
          </option>
        ))}
      </SelectField>
      <div className="flex flex-col justify-end gap-2 pb-1">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={!forUs} onChange={(e) => setForUs(!e.target.checked)} />
          Nie je pre nás
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={!hasInvoice} onChange={(e) => setHasInvoice(!e.target.checked)} />
          Bez faktúry / bločku
        </label>
      </div>
      {!forUs && <Field label="Pre koho" className="sm:col-span-2" maxLength={120} value={forWhom} onChange={(e) => setForWhom(e.target.value)} />}
      {save.isError && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          Uloženie zlyhalo. {errorDetail(save.error)}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
          Uložiť
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
          Zrušiť
        </Button>
      </div>
    </div>
  )
}
