import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ExternalLink, Link2, Mail, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { tf, tx } from '@/lib/i18n'
import { clientKeys, clientLink, fetchClientToken, shareEventClient, unshareEventClient } from './clientApi'
import type { CompanyEvent } from './model'

/**
 * Odkaz pre klienta k akcii: jedna stránka s ponukami a zmluvami, ktoré mu už boli zdieľané, a po akcii
 * s hodnotením. Vytvorí a zruší ho ten, kto upravuje eventy.
 */
export function EventClientCard({ companyId, event }: { companyId: string; event: CompanyEvent }) {
  const queryClient = useQueryClient()
  const key = clientKeys.event(companyId, event.id)
  const token = useQuery({ queryKey: key, queryFn: () => fetchClientToken(companyId, event.id), retry: false })
  const [copied, setCopied] = useState(false)
  const share = useMutation({ mutationFn: () => shareEventClient(event.id), onSuccess: (value) => queryClient.setQueryData(key, value) })
  const unshare = useMutation({ mutationFn: () => unshareEventClient(event.id), onSuccess: () => queryClient.setQueryData(key, null) })
  if (token.isPending || token.isError) return null
  const url = token.data ? clientLink(token.data) : ''
  const mail =
    event.organizerEmail && url
      ? `mailto:${encodeURIComponent(event.organizerEmail)}?subject=${encodeURIComponent(tf('Podklady k akcii {0}', event.name))}&body=${encodeURIComponent(tf('Dobrý deň, všetko k akcii nájdete na jednom mieste: {0}', url))}`
      : ''
  const copy = () =>
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })

  return (
    <section className="mb-4 flex flex-col gap-2 rounded-xl border bg-surface p-4" aria-label={tx('Odkaz pre klienta')}>
      <p className="flex items-center gap-2 font-medium">
        <Link2 className="size-4 text-accent" aria-hidden />
        {tx('Odkaz pre klienta')}
      </p>
      {url ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input aria-label={tx('Odkaz pre klienta')} readOnly className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm" value={url} onFocus={(focused) => focused.target.select()} />
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? tx('Skopírované') : tx('Kopírovať')}
            </Button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              <ExternalLink className="size-4" aria-hidden />{tx('Otvoriť')}
            </a>
            {mail && (
              <a href={mail} className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
                <Mail className="size-4" aria-hidden />{tx('Poslať e-mailom')}
              </a>
            )}
            <Button size="sm" variant="ghost" disabled={unshare.isPending} onClick={() => window.confirm(tx('Zrušiť odkaz? Klientovi prestane fungovať.')) && unshare.mutate()}>
              <X className="size-4" aria-hidden />{tx('Zrušiť odkaz')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{tx('Klient tu uvidí ponuky a zmluvy, ktoré ste mu zdieľali (tlačidlom Zdieľať pri nich), a po akcii aj hodnotenie.')}</p>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-muted-foreground">{tx('Jedna stránka pre klienta: zdieľané ponuky, zmluvy a po akcii hodnotenie – bez prihlásenia.')}</p>
          <Button size="sm" disabled={share.isPending} onClick={() => share.mutate()}>{tx('Vytvoriť odkaz')}</Button>
        </div>
      )}
      {(share.isError || unshare.isError) && <p className="text-sm text-destructive">{tx('Odkaz sa nepodarilo zmeniť (migrácia 0193).')}</p>}
    </section>
  )
}
