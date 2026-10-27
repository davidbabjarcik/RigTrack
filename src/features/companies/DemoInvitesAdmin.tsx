import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { getSupabase } from '@/lib/supabase/client'
import { errorDetail } from '@/lib/supabase/errors'

type DemoInvite = { email: string; note: string; created_at: string }
const key = ['demo-invitations'] as const

async function fetchDemoInvites(): Promise<DemoInvite[]> {
  const { data, error } = await getSupabase().from('demo_invitations').select('email, note, created_at').order('created_at', { ascending: false })
  if (error) throw error
  return data as DemoInvite[]
}

/** Vývojár: pozvať človeka len do dema – smie sa zaregistrovať, ale nedostane prístup do žiadnej firmy. */
export function DemoInvitesAdmin() {
  const queryClient = useQueryClient()
  const invites = useQuery({ queryKey: key, queryFn: fetchDemoInvites, retry: false })
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase().from('demo_invitations').insert({ email: email.trim().toLowerCase(), note: note.trim() })
      if (error) throw error
    },
    onSuccess: () => {
      setEmail('')
      setNote('')
      return refresh()
    },
  })
  const remove = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await getSupabase().from('demo_invitations').delete().eq('email', value)
      if (error) throw error
    },
    onSettled: refresh,
  })

  if (invites.isError) return <p className="rounded-xl border bg-surface p-4 text-sm text-muted-foreground">Pozvánky do dema zatiaľ nie sú dostupné – treba spustiť migráciu 0111 (supabase/update-all.sql).</p>
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Pozvaný sa zaregistruje týmto e-mailom, ale neuvidí žiadnu firmu – po prihlásení si založí vlastnú demo firmu s ukážkovými dátami. Odkaz na appku mu pošlite sami.
      </p>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (valid) add.mutate()
        }}
      >
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
          E-mail
          <input type="email" required className="h-10 rounded-lg border bg-background px-3" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
          Poznámka (nepovinné)
          <input maxLength={200} className="h-10 rounded-lg border bg-background px-3" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <Button type="submit" disabled={!valid || add.isPending}>
          <UserPlus className="size-4" aria-hidden />
          Pozvať do dema
        </Button>
      </form>
      {add.isError && <p className="text-sm text-destructive">Nepodarilo sa. {errorDetail(add.error)}</p>}
      {(invites.data ?? []).length > 0 && (
        <ul className="divide-y rounded-xl border bg-surface">
          {invites.data!.map((invite) => (
            <li key={invite.email} className="flex items-center gap-3 p-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{invite.email}</span>
                <span className="block text-muted-foreground">{[invite.note, formatDate(invite.created_at.slice(0, 10))].filter(Boolean).join(' · ')}</span>
              </span>
              <Button size="sm" variant="ghost" aria-label={`Zrušiť pozvánku ${invite.email}`} disabled={remove.isPending} onClick={() => remove.mutate(invite.email)}>
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
