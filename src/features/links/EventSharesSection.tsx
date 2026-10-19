import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Handshake, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { errorDetail } from '@/lib/supabase/errors'
import { fetchEventShares, linkKeys, setOwnerPart, shareEvent, unshareEvent, useLinks } from './api'

/** Spoločný event s prepojenou firmou: kto čo dodá (napr. my zvuk a svetlo, oni LED stenu v prenájme). */
export function EventSharesSection({ companyId, eventId, canEdit }: { companyId: string; eventId: string; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const links = useLinks(companyId)
  const key = linkKeys.eventShares(companyId, eventId)
  const shares = useQuery({ queryKey: key, queryFn: () => fetchEventShares(eventId), retry: false })
  const [partner, setPartner] = useState('')
  const [part, setPart] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const add = useMutation({
    mutationFn: () => shareEvent(companyId, eventId, partner, part),
    onSuccess: () => {
      setPartner('')
      setPart('')
    },
    onSettled: refresh,
  })
  const save = useMutation({ mutationFn: (partnerCompany: string) => setOwnerPart(eventId, partnerCompany, draft), onSuccess: () => setEditing(null), onSettled: refresh })
  const remove = useMutation({ mutationFn: (partnerCompany: string) => unshareEvent(eventId, partnerCompany), onSettled: refresh })

  const accepted = (links.data ?? []).filter((link) => link.status === 'accepted')
  // Bez migrácie 0065 alebo bez prepojených firiem sa sekcia neukáže.
  if (shares.isError || links.isError || !shares.data || (accepted.length === 0 && shares.data.length === 0)) return null
  const nameOf = (id: string) => accepted.find((link) => link.companyId === id)?.name ?? 'prepojená firma'
  const available = accepted.filter((link) => !shares.data.some((share) => share.partnerCompany === link.companyId))
  function submit(event: FormEvent) {
    event.preventDefault()
    if (partner) add.mutate()
  }

  return (
    <CollapsibleSection id="event.shares" title={`Spoločný event s firmami (${shares.data.length})`}>
      {shares.data.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {shares.data.map((share) => (
            <li key={share.partnerCompany} className="flex flex-col gap-2 rounded-xl border bg-surface p-4 text-sm">
              <div className="flex items-center gap-2">
                <Handshake className="size-4 text-accent" aria-hidden />
                <span className="flex-1 font-medium">{nameOf(share.partnerCompany)}</span>
                {canEdit && (
                  <button type="button" aria-label="Prestať zdieľať" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => remove.mutate(share.partnerCompany)}>
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              {editing === share.partnerCompany ? (
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="My dodáme" className="flex-1" maxLength={1000} value={draft} onChange={(e) => setDraft(e.target.value)} />
                  <Button size="sm" disabled={save.isPending} onClick={() => save.mutate(share.partnerCompany)}>
                    Uložiť
                  </Button>
                </div>
              ) : (
                <p>
                  <span className="text-muted-foreground">My dodáme: </span>
                  {share.ownerPart || '—'}
                  {canEdit && (
                    <button
                      type="button"
                      className="ml-2 text-accent hover:underline"
                      onClick={() => {
                        setEditing(share.partnerCompany)
                        setDraft(share.ownerPart)
                      }}
                    >
                      upraviť
                    </button>
                  )}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Oni dodajú: </span>
                {share.partnerPart || <span className="text-muted-foreground">zatiaľ nezapísali</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
      {canEdit && available.length > 0 && (
        <form onSubmit={submit} className="grid gap-2 rounded-xl border bg-surface p-4 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
          <SelectField label="Prepojená firma" value={partner} onChange={(e) => setPartner(e.target.value)}>
            <option value="">— vyberte —</option>
            {available.map((link) => (
              <option key={link.companyId} value={link.companyId}>
                {link.name}
              </option>
            ))}
          </SelectField>
          <Field label="My dodáme" placeholder="napr. zvuk a svetlo, LED stenu im prenajmeme" maxLength={1000} value={part} onChange={(e) => setPart(e.target.value)} />
          <Button type="submit" size="sm" disabled={!partner || add.isPending}>
            Zdieľať event
          </Button>
          {add.isError && <p className="text-sm text-destructive sm:col-span-3">{errorDetail(add.error)}</p>}
        </form>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Prepojená firma uvidí názov, termín, miesto a program po dňoch a zapíše, čo dodá ona.</p>
    </CollapsibleSection>
  )
}
