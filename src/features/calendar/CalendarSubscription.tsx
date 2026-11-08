import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarSync, Copy, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { AnchorButton, Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { tf, tx } from '@/lib/i18n'
import { appUrl } from './export'
import { createCalendarFeed, deleteCalendarFeed, feedKeys, googleSubscribeUrl, useCalendarFeeds, webcalUrl, type FeedScope } from './feedApi'

const SCOPE_LABELS: Record<FeedScope, string> = { mine: 'Moje eventy (kde som v posádke)', all: 'Všetky eventy firmy' }

/** Odber eventov v kalendári telefónu (Google, Apple, Outlook, TickTick…) cez tajný odkaz. */
export function CalendarSubscription({ companyId, companyName, canSeeAll, onDownload }: { companyId: string; companyName: string; canSeeAll: boolean; /** Jednorazová kópia (.ics) – neaktualizuje sa. */ onDownload?: () => void }) {
  const feeds = useCalendarFeeds(companyId)
  const queryClient = useQueryClient()
  const [created, setCreated] = useState<{ scope: FeedScope; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: feedKeys.list(companyId) })
  const create = useMutation({
    mutationFn: (scope: FeedScope) => createCalendarFeed(companyId, scope, appUrl('/')).then((url) => ({ scope, url })),
    onSuccess: (result) => {
      setCreated(result)
      setCopied(false)
    },
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: deleteCalendarFeed, onSettled: refresh })
  // Bez migrácie 0167 sa sekcia neukáže.
  if (feeds.isError) return null

  return (
    <CollapsibleSection id="calendar.subscribe" title={tx('Kalendár v mobile')}>
      <p className="text-sm text-muted-foreground">
        {tx('Jeden odkaz pridáte do Google či Apple kalendára, Outlooku alebo TickTicku. Eventy sa tam objavia samé a zmena termínu sa prejaví aj v mobile.')}
      </p>
      <p className="mt-1 text-sm">
        {tf('Odkaz je pre firmu {0}', companyName)}
        <span className="text-muted-foreground">{' '}{tx('(pre inú firmu ju najprv prepnite).')}</span>
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(['mine', ...(canSeeAll ? ['all'] : [])] as FeedScope[]).map((scope) => (
          <Button key={scope} variant="outline" size="sm" disabled={create.isPending} onClick={() => create.mutate(scope)}>
            <CalendarSync className="size-4" aria-hidden />
            {feeds.data?.some((feed) => feed.scope === scope) ? tf('Nový odkaz: {0}', tx(SCOPE_LABELS[scope])) : tf('Vytvoriť odkaz: {0}', tx(SCOPE_LABELS[scope]))}
          </Button>
        ))}
      </div>
      {create.isError && <p role="alert" className="mt-2 text-sm text-destructive">{tx('Odkaz sa nepodarilo vytvoriť.')}</p>}

      {created && (
        <div className="mt-3 rounded-xl border bg-surface p-3 text-sm">
          <p className="font-medium">{tx(SCOPE_LABELS[created.scope])}{' · '}{companyName}</p>
          <p className="mt-1 text-muted-foreground">{tx('Odkaz si skopírujte teraz – z bezpečnostných dôvodov ho appka neukladá. Kto ho má, uvidí tieto eventy; neposielajte ho ďalej.')}</p>
          <div className="mt-2 flex gap-2">
            <input readOnly aria-label={tx('Odkaz na kalendár')} className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-xs" value={created.url} onFocus={(e) => e.target.select()} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void navigator.clipboard?.writeText(created.url).then(() => setCopied(true))}
            >
              <Copy className="size-4" aria-hidden />{copied ? tx('Skopírované') : tx('Kopírovať')}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <AnchorButton variant="outline" size="sm" href={webcalUrl(created.url)}>{tx('Otvoriť v kalendári telefónu')}</AnchorButton>
            <AnchorButton variant="outline" size="sm" href={googleSubscribeUrl(created.url)} target="_blank" rel="noopener noreferrer">{tx('Pridať do Google Kalendára')}</AnchorButton>
          </div>
          <ul className="mt-3 list-disc pl-5 text-muted-foreground">
            <li>{tx('Google Kalendár (aj Notion Calendar): Ďalšie kalendáre → + → Z webovej adresy → vložiť odkaz.')}</li>
            <li>{tx('iPhone: Nastavenia → Kalendár → Účty → Pridať účet → Iné → Pridať odoberaný kalendár.')}</li>
            <li>{tx('TickTick: Nastavenia → Kalendár → Pridať odber kalendára → vložiť odkaz.')}</li>
            <li>{tx('Outlook: Pridať kalendár → Prihlásiť sa na odber z webu.')}</li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{tx('iPhone a TickTick zmeny načítajú zhruba do hodiny. Google Kalendár je pomalší – nové eventy a zmeny sa v ňom môžu ukázať až o niekoľko hodín, niekedy až na druhý deň.')}</p>
        </div>
      )}

      {(feeds.data ?? []).length > 0 && (
        <ul className="mt-3 divide-y rounded-xl border bg-surface text-sm">
          {feeds.data!.map((feed) => (
            <li key={feed.id} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{tx(SCOPE_LABELS[feed.scope])}</span>
                <span className="block text-xs text-muted-foreground">
                  {tf('vytvorený {0}', formatDate(feed.createdAt.slice(0, 10)))}
                  {' · '}
                  {feed.lastUsedAt ? tf('naposledy načítaný {0}', formatDate(feed.lastUsedAt.slice(0, 10))) : tx('zatiaľ nenačítaný')}
                </span>
              </span>
              <Button variant="ghost" size="sm" disabled={remove.isPending} aria-label={tf('Zrušiť odkaz: {0}', tx(SCOPE_LABELS[feed.scope]))} onClick={() => remove.mutate(feed.id)}>
                <Trash2 className="size-4" aria-hidden />{tx('Zrušiť')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {onDownload && (
        <p className="mt-3 text-xs text-muted-foreground">
          {tx('Bez odberu:')}{' '}
          <button type="button" className="text-accent hover:underline" onClick={onDownload}>{tx('stiahnuť jednorazovú kópiu (.ics)')}</button>
          {' '}{tx('– eventy a výpožičky od minulého mesiaca; zmeny sa do nej už neprenesú.')}
        </p>
      )}
    </CollapsibleSection>
  )
}
