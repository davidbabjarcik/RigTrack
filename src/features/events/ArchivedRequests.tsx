import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Check, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { memberName, useMembers } from '@/features/companies/useMembers'
import type { Equipment } from '@/features/equipment/model'
import { formatDate } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { getSupabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { eventKeys } from './api'

// Žiadosti o archívnu techniku na event (0176): žiada, kto upravuje eventy; CEO schváli alebo zamietne.

type RequestStatus = 'pending' | 'approved' | 'rejected'
type EquipmentRequest = {
  id: string
  equipmentId: string
  quantity: number
  note: string
  status: RequestStatus
  answer: string
  requestedBy: string
  createdAt: string
}

const requestKeys = { ofEvent: (companyId: string, eventId: string) => ['company', companyId, 'events', eventId, 'equipment-requests'] as const }

async function fetchRequests(companyId: string, eventId: string): Promise<EquipmentRequest[]> {
  const { data, error } = await getSupabase()
    .from('equipment_requests')
    .select('id, equipment_id, quantity, note, status, answer, requested_by, created_at')
    .eq('company_id', companyId)
    .eq('event_id', eventId)
    .order('created_at')
  if (error) throw error
  return (data as { id: string; equipment_id: string; quantity: number; note: string; status: RequestStatus; answer: string; requested_by: string; created_at: string }[]).map((row) => ({
    id: row.id,
    equipmentId: row.equipment_id,
    quantity: row.quantity,
    note: row.note,
    status: row.status,
    answer: row.answer,
    requestedBy: row.requested_by,
    createdAt: row.created_at,
  }))
}

const STATUS_LABELS: Record<RequestStatus, string> = { pending: 'Čaká na CEO', approved: 'Schválené', rejected: 'Zamietnuté' }
const STATUS_TONES: Record<RequestStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  approved: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  rejected: 'bg-red-500/15 text-red-800 dark:text-red-200',
}

type Props = { companyId: string; eventId: string; archived: Equipment[]; canDecide: boolean; canRequest: boolean }

/** Žiadosti o archívnu techniku pri evente: formulár na žiadosť a zoznam s rozhodnutím CEO. */
export function ArchivedRequests({ companyId, eventId, archived, canDecide, canRequest }: Props) {
  const queryClient = useQueryClient()
  const userId = useAuth().session?.user.id
  const members = useMembers(companyId)
  const requests = useQuery({ queryKey: requestKeys.ofEvent(companyId, eventId), queryFn: () => fetchRequests(companyId, eventId), retry: false })
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [note, setNote] = useState('')
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: requestKeys.ofEvent(companyId, eventId) })
    void queryClient.invalidateQueries({ queryKey: eventKeys.list(companyId) })
  }
  const ask = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase()
        .from('equipment_requests')
        .insert({ company_id: companyId, event_id: eventId, equipment_id: itemId, quantity: Math.max(1, Math.floor(Number(quantity)) || 1), note: note.trim() })
      if (error) throw error
    },
    onSuccess: () => {
      setItemId('')
      setQuantity('1')
      setNote('')
    },
    onSettled: refresh,
  })
  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await getSupabase().rpc('decide_equipment_request', { _id: id, _approve: approve, _answer: '' })
      if (error) throw error
    },
    onSettled: refresh,
  })
  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase().from('equipment_requests').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: refresh,
  })

  // Bez migrácie 0176 tabuľka chýba – časť sa ticho skryje.
  if (requests.isError || requests.isPending) return null
  const list = requests.data
  if (list.length === 0 && !(canRequest && archived.length > 0)) return null
  const nameOf = (id: string) => archived.find((item) => item.id === id)?.name ?? tx('Archívna technika')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (itemId) ask.mutate()
  }

  return (
    <div className="mt-4 rounded-xl border bg-violet-500/5 p-4">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Archive className="size-4 text-violet-600 dark:text-violet-400" aria-hidden />
        {tx('Archívna technika')}
      </h3>
      {list.length > 0 && (
        <ul className="mt-2 flex flex-col divide-y rounded-lg border bg-surface">
          {list.map((request) => (
            <li key={request.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-medium">
                  {request.quantity}× {nameOf(request.equipmentId)}
                </span>
                <span className="block text-muted-foreground">
                  {[memberName(members.data, request.requestedBy), formatDate(request.createdAt.slice(0, 10)), request.note, request.answer && tf('odpoveď: {0}', request.answer)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_TONES[request.status])}>{tx(STATUS_LABELS[request.status])}</span>
              {request.status === 'pending' && canDecide && (
                <>
                  <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: request.id, approve: true })}>
                    <Check className="size-4" aria-hidden />
                    {tx('Schváliť')}
                  </Button>
                  <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ id: request.id, approve: false })}>
                    <X className="size-4" aria-hidden />
                    {tx('Zamietnuť')}
                  </Button>
                </>
              )}
              {request.status === 'pending' && !canDecide && request.requestedBy === userId && (
                <Button size="sm" variant="ghost" disabled={cancel.isPending} onClick={() => cancel.mutate(request.id)}>
                  {tx('Zrušiť žiadosť')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canRequest && !canDecide && archived.length > 0 && (
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
          <SelectField label={tx('Požiadať CEO o archívnu techniku')} className="min-w-48 flex-1" value={itemId} onChange={(event) => setItemId(event.target.value)}>
            <option value="">{tx('— vyberte techniku —')}</option>
            {archived.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectField>
          <Field label={tx('Počet')} type="number" inputMode="numeric" min={1} className="w-20" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <Field label={tx('Prečo (nepovinné)')} maxLength={300} className="min-w-40 flex-1" value={note} onChange={(event) => setNote(event.target.value)} />
          <Button type="submit" disabled={!itemId || ask.isPending}>
            {tx('Požiadať')}
          </Button>
        </form>
      )}
      {(ask.isError || decide.isError || cancel.isError) && <p role="alert" className="mt-2 text-sm text-destructive">{tx('Zmena sa nepodarila.')}</p>}
    </div>
  )
}
