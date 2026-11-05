import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Link2, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field, SelectField } from '@/components/ui/field'
import { LINK_TAG_LABELS, LINK_TAGS, type LinkTag } from './plan'
import { addLink, deleteLink, fetchLinks, planKeys } from './planApi'
import { safeUrl } from '@/lib/safeUrl'
import { tx, tf } from '@/lib/i18n'

/** Krátky popis odkazu, keď chýba názov: „drive.google.com“. */
function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Odkazy pri evente so štítkom (rider, lightplot, stage plot…), najlepšie na zdieľaný priečinok v Google Disku. */
export function EventLinksSection({ companyId, eventId, canEdit }: { companyId: string; eventId: string; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const key = planKeys.links(companyId, eventId)
  const links = useQuery({ queryKey: key, queryFn: () => fetchLinks(companyId, eventId), retry: false })
  const [adding, setAdding] = useState(false)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState<LinkTag>('rider')
  const add = useMutation({
    mutationFn: () => addLink(companyId, eventId, { url, title, tag }),
    onSuccess: () => {
      setUrl('')
      setTitle('')
      setAdding(false)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
  const remove = useMutation({ mutationFn: deleteLink, onSettled: () => queryClient.invalidateQueries({ queryKey: key }) })
  if (links.isError) return null
  const valid = /^https?:\/\/\S+$/i.test(url.trim())
  function submit(event: FormEvent) {
    event.preventDefault()
    if (valid) add.mutate()
  }

  return (
    <CollapsibleSection
      id="event.links"
      title={`Rider, lightplot a odkazy (${links.data?.length ?? 0})`}
      actions={
        canEdit &&
        !adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden />{tx('Pridať odkaz')}</Button>
        )
      }
    >
      {links.data && links.data.length > 0 && (
        <ul className="mb-3 divide-y overflow-hidden rounded-xl border bg-surface">
          {links.data.map((link) => (
            <li key={link.id} className="flex items-center gap-3 px-4 py-3">
              <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{tx(LINK_TAG_LABELS[link.tag])}</span>
              <a href={safeUrl(link.url)} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 flex-1 items-center gap-1 text-accent hover:underline">
                <span className="truncate">{link.title || hostOf(link.url)}</span>
                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              </a>
              {canEdit && (
                <Button variant="ghost" size="sm" aria-label={tf('Odstrániť odkaz {0}', link.title || link.url)} disabled={remove.isPending} onClick={() => remove.mutate(link.id)}>
                  <X className="size-4" aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {links.data?.length === 0 && !adding && (
        <p className="mb-3 rounded-xl border border-dashed bg-surface p-4 text-sm text-muted-foreground">{tx('Zatiaľ žiadne odkazy. Odporúčame dať rider, lightplot a ostatné podklady do zdieľaného priečinka v Google Disku a sem vložiť odkaz.')}</p>
      )}
      {adding && (
        <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <SelectField label={tx('Čo to je')} className="sm:w-44" value={tag} onChange={(event) => setTag(event.target.value as LinkTag)}>
            {LINK_TAGS.map((option) => (
              <option key={option} value={option}>
                {tx(LINK_TAG_LABELS[option])}
              </option>
            ))}
          </SelectField>
          <Field label={tx('Odkaz *')} type="url" placeholder={tx('https://drive.google.com/…')} className="min-w-56 flex-1" autoFocus value={url} onChange={(event) => setUrl(event.target.value)} />
          <Field label={tx('Názov (nepovinné)')} className="sm:w-56" maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!valid || add.isPending}>{tx('Pridať')}</Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>{tx('Zrušiť')}</Button>
          </div>
          {add.isError && <p className="w-full text-sm text-destructive">{tx('Odkaz sa nepodarilo uložiť.')}</p>}
        </form>
      )}
    </CollapsibleSection>
  )
}
