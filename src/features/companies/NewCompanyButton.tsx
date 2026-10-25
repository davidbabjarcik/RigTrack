import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Plus, Send, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { cancelCompanyRequest, creationKeys, fetchMyRequests, sendCompanyRequest, useCanCreateCompany } from './creation'

/** „Vytvoriť novú firmu“, alebo – bez povolenia – žiadosť o založenie firmy pre správcu aplikácie. */
export function NewCompanyButton({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const canCreate = useCanCreateCompany(userId)
  const requests = useQuery({ queryKey: creationKeys.mine(userId), queryFn: () => fetchMyRequests(userId), enabled: canCreate.data === false, retry: false })
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: creationKeys.mine(userId) })
  const send = useMutation({ mutationFn: () => sendCompanyRequest(name, note), onSuccess: () => (setOpen(false), setName(''), setNote('')), onSettled: refresh })
  const cancel = useMutation({ mutationFn: cancelCompanyRequest, onSettled: refresh })

  if (canCreate.isPending) return null
  if (canCreate.data) {
    return (
      <Link to="/company/create" className="flex h-11 items-center justify-center gap-2 rounded-lg border bg-surface px-4 text-sm font-medium hover:bg-muted">
        <Plus className="size-4" aria-hidden />
        Vytvoriť novú firmu
      </Link>
    )
  }

  const pending = (requests.data ?? []).find((item) => item.status === 'pending')
  const rejected = (requests.data ?? []).find((item) => item.status === 'rejected')
  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim()) send.mutate()
  }

  if (pending) {
    return (
      <p className="flex flex-wrap items-center gap-2 rounded-lg border bg-surface px-4 py-2.5 text-sm">
        <Clock className="size-4 text-accent" aria-hidden />
        Žiadosť o firmu „{pending.companyName}“ čaká na schválenie správcom aplikácie.
        <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => cancel.mutate(pending.id)}>
          <X className="size-3.5" aria-hidden />
          Zrušiť
        </button>
      </p>
    )
  }

  return open ? (
    <form onSubmit={submit} className="flex w-full flex-col gap-3 rounded-xl border bg-surface p-4 sm:max-w-md">
      <p className="text-sm text-muted-foreground">Novú firmu zakladá správca aplikácie. Pošlite mu žiadosť – po schválení si ju založíte sami.</p>
      <Field label="Názov firmy *" maxLength={120} autoFocus value={name} onChange={(event) => setName(event.target.value)} />
      <Field label="Poznámka (napr. kto ste, na čo firmu potrebujete)" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
      {send.isError && <p className="text-sm text-destructive">Žiadosť sa nepodarilo poslať.</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!name.trim() || send.isPending}>
          <Send className="size-4" aria-hidden />
          Poslať žiadosť
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Zrušiť
        </Button>
      </div>
    </form>
  ) : (
    <div className="flex flex-col gap-1">
      <Button variant="outline" className="h-11" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Požiadať o založenie firmy
      </Button>
      {rejected && <p className="text-xs text-muted-foreground">Posledná žiadosť („{rejected.companyName}“) bola zamietnutá.</p>}
    </div>
  )
}
