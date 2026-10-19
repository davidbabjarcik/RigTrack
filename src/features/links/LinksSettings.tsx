import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Link2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { errorDetail } from '@/lib/supabase/errors'
import { acceptLink, fetchLinkCode, linkKeys, removeLink, requestLink, setLinkSharing, useLinks, type CompanyLink } from './api'

/**
 * Prepojenie s inými firmami v RigTracku: náš kód, žiadosť kódom druhej firmy, potvrdenie a čo zdieľame
 * (technika, vybrané kontakty). Spoločné eventy sa zdieľajú priamo v detaile eventu.
 */
export function LinksSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const links = useLinks(companyId)
  const code = useQuery({ queryKey: linkKeys.code(companyId), queryFn: () => fetchLinkCode(companyId), retry: false })
  const [other, setOther] = useState('')
  const [copied, setCopied] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['company', companyId, 'links'] })
  const request = useMutation({ mutationFn: () => requestLink(companyId, other), onSuccess: () => setOther(''), onSettled: refresh })
  const accept = useMutation({ mutationFn: acceptLink, onSettled: refresh })
  const sharing = useMutation({
    mutationFn: ({ link, equipment, contacts }: { link: CompanyLink; equipment: boolean; contacts: boolean }) => setLinkSharing(link.linkId, companyId, equipment, contacts),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: removeLink, onSettled: refresh })

  if (links.isError || code.isError) {
    return <p className="text-sm text-destructive">Prepojené firmy sa nepodarilo načítať. Ak ste ešte nespustili migráciu 0065, spustite ju v Supabase.</p>
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (other.trim()) request.mutate()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border bg-surface p-4 text-sm">
        <p className="text-muted-foreground">
          Prepojte sa s firmou, ktorá tiež používa RigTrack: pošlite jej kód vašej firmy, alebo zadajte jej kód. Druhá strana žiadosť potvrdí. Potom každá firma
          sama zvolí, či zdieľa techniku a vybrané kontakty, a eventy sa dajú robiť spoločne.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Kód našej firmy</p>
            <p className="font-mono text-lg font-semibold tracking-widest">{code.data ?? '…'}</p>
          </div>
          {code.data && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(code.data!).then(() => setCopied(true))
              }}
            >
              <Copy className="size-4" aria-hidden />
              {copied ? 'Skopírované' : 'Kopírovať'}
            </Button>
          )}
        </div>
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Kód druhej firmy" className="w-48" placeholder="napr. 7F3A9C21" maxLength={12} value={other} onChange={(e) => setOther(e.target.value.toUpperCase())} />
          <Button type="submit" disabled={!other.trim() || request.isPending}>
            <Link2 className="size-4" aria-hidden />
            Poslať žiadosť
          </Button>
        </form>
        {request.isSuccess && <p className="mt-2 text-sm">Žiadosť odoslaná firme {request.data}. Prepojenie začne platiť, keď ju potvrdí ich admin.</p>}
        {request.isError && <p className="mt-2 text-sm text-destructive">{errorDetail(request.error)}</p>}
      </div>

      {(links.data ?? []).length > 0 && (
        <ul className="flex flex-col gap-2">
          {links.data!.map((link) => (
            <li key={link.linkId} className="flex flex-col gap-2 rounded-xl border bg-surface p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex-1 font-medium">{link.name}</span>
                {link.status === 'pending' ? (
                  link.incoming ? (
                    <Button size="sm" disabled={accept.isPending} onClick={() => accept.mutate(link.linkId)}>
                      Potvrdiť prepojenie
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">čaká na potvrdenie</span>
                  )
                ) : (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">prepojené</span>
                )}
                <button
                  type="button"
                  aria-label={`Zrušiť prepojenie s ${link.name}`}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  onClick={() => window.confirm(`Zrušiť prepojenie s ${link.name}? Prestanete si zdieľať techniku, kontakty aj eventy.`) && remove.mutate(link.linkId)}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              {link.status === 'accepted' && (
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={link.iShareEquipment}
                      disabled={sharing.isPending}
                      onChange={(e) => sharing.mutate({ link, equipment: e.target.checked, contacts: link.iShareContacts })}
                    />
                    Zdieľať im našu techniku
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={link.iShareContacts}
                      disabled={sharing.isPending}
                      onChange={(e) => sharing.mutate({ link, equipment: link.iShareEquipment, contacts: e.target.checked })}
                    />
                    Zdieľať im vybrané kontakty
                  </label>
                  <span className="text-muted-foreground">
                    Oni nám: {[link.theyShareEquipment && 'techniku', link.theyShareContacts && 'kontakty'].filter(Boolean).join(' a ') || 'zatiaľ nič'}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Zdieľaná technika je bez cien, sériových čísel a poznámok (a bez vlastnej techniky zamestnancov). Kontakty zdieľate po jednom vo Firmy a kontakty.
      </p>
    </div>
  )
}
