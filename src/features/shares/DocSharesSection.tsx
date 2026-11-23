import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, ExternalLink, Eye, Share2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { formatDate, formatDateTime } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { createShare, docLink, fetchShares, revokeShare, shareKeys, shareState, type DocShare, type DocType } from './api'

const today = () => new Date().toLocaleDateString('sv-SE')

function ShareRow({ share, canEdit, onRevoke, revoking }: { share: DocShare; canEdit: boolean; onRevoke: () => void; revoking: boolean }) {
  const [copied, setCopied] = useState(false)
  const [showViews, setShowViews] = useState(false)
  const state = shareState(share, today())
  const url = docLink(share.token)
  const copy = () =>
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  const details = [
    tf('vytvorený {0}', formatDate(share.createdAt.slice(0, 10))),
    share.expiresOn && tf('platí do {0}', formatDate(share.expiresOn)),
    share.viewCount > 0 && share.lastViewedAt ? tf('zobrazený {0}× · naposledy {1} (verzia {2})', share.viewCount, formatDateTime(share.lastViewedAt), share.lastViewedVersion ?? '–') : tx('zatiaľ nezobrazený'),
  ].filter(Boolean)
  return (
    <li className="flex flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 font-medium break-words">{share.recipient}</span>
        {state !== 'active' && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{state === 'revoked' ? tx('zrušený') : tx('prepadnutý')}</span>}
      </div>
      <p className="text-sm text-muted-foreground">{details.join(' · ')}</p>
      <div className="flex flex-wrap gap-2">
        {state === 'active' && (
          <>
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? tx('Skopírované') : tx('Kopírovať odkaz')}
            </Button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              <ExternalLink className="size-4" aria-hidden />{tx('Otvoriť')}
            </a>
          </>
        )}
        {share.views.length > 0 && (
          <Button size="sm" variant="ghost" aria-expanded={showViews} onClick={() => setShowViews((value) => !value)}>
            <Eye className="size-4" aria-hidden />{tx('Zobrazenia')}
          </Button>
        )}
        {canEdit && state === 'active' && (
          <Button size="sm" variant="ghost" disabled={revoking} onClick={() => window.confirm(tf('Zrušiť odkaz pre „{0}“? Prestane fungovať.', share.recipient)) && onRevoke()}>
            <X className="size-4" aria-hidden />{tx('Zrušiť odkaz')}
          </Button>
        )}
      </div>
      {showViews && (
        <ul className="text-sm text-muted-foreground" aria-label={tx('Zobrazenia')}>
          {share.views.slice(0, 20).map((view, index) => (
            <li key={index}>{tf('{0} – verzia {1}', formatDateTime(view.viewedAt), view.version)}</li>
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * Zdieľanie dokumentu (rack, input / output list) s externými ľuďmi: odkaz pre konkrétneho príjemcu len na čítanie,
 * s platnosťou, zrušením a záznamom zobrazení. Príjemca vidí poslednú uloženú verziu a zmeny od svojho posledného zobrazenia.
 */
const TITLES: Record<DocType, string> = { rack: 'Zdieľanie racku ({0})', iolist: 'Zdieľanie input listu ({0})', stageplot: 'Zdieľanie stage plánu ({0})', synoptic: 'Zdieľanie synoptiky ({0})', rfplan: 'Zdieľanie HF plánu ({0})', siteplan: 'Zdieľanie site plánu ({0})' }

export function DocSharesSection({ companyId, docType, docId, canEdit, hint }: { companyId: string; docType: DocType; docId: string; canEdit: boolean; hint: string }) {
  const queryClient = useQueryClient()
  const key = shareKeys.ofDoc(companyId, docType, docId)
  const shares = useQuery({ queryKey: key, queryFn: () => fetchShares(companyId, docType, docId), retry: false })
  const [recipient, setRecipient] = useState('')
  const [expiresOn, setExpiresOn] = useState('')
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const create = useMutation({
    mutationFn: () => createShare(docType, docId, recipient, expiresOn || null),
    onSuccess: async (token) => {
      setRecipient('')
      setExpiresOn('')
      await navigator.clipboard?.writeText(docLink(token)).catch(() => undefined)
    },
    onSettled: refresh,
  })
  const revoke = useMutation({ mutationFn: revokeShare, onSettled: refresh })
  // Bez migrácie 0198 sa sekcia neukáže.
  if (!shares.data) return null
  const list = shares.data
  function submit(event: FormEvent) {
    event.preventDefault()
    if (recipient.trim()) create.mutate()
  }
  return (
    <CollapsibleSection id={`share.${docType}`} title={tf(TITLES[docType], list.filter((share) => shareState(share, today()) === 'active').length)}>
      <p className="mb-2 text-sm text-muted-foreground">{hint}</p>
      {list.length > 0 && (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface text-sm">
          {list.map((share) => (
            <ShareRow key={share.id} share={share} canEdit={canEdit} revoking={revoke.isPending} onRevoke={() => revoke.mutate(share.id)} />
          ))}
        </ul>
      )}
      {canEdit && (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <Field label={tx('Príjemca')} className="min-w-48 flex-1" maxLength={80} placeholder={tx('napr. FOH technik, Ukážkový klub')} value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <Field label={tx('Platí do (nepovinné)')} type="date" min={today()} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          <Button type="submit" size="sm" className="mb-0.5" disabled={create.isPending || !recipient.trim()}>
            <Share2 className="size-4" aria-hidden />{tx('Vytvoriť odkaz')}
          </Button>
        </form>
      )}
      {create.isSuccess && <p role="status" className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">{tx('Odkaz je vytvorený a skopírovaný – pošlite ho príjemcovi.')}</p>}
      {(create.isError || revoke.isError) && <p role="alert" className="mt-2 text-sm text-destructive">{(create.error ?? revoke.error)?.message || tx('Zmena sa nepodarila.')}</p>}
    </CollapsibleSection>
  )
}
