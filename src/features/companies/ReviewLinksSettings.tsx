import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { EMPTY_LINKS, fetchReviewLinks, isSafeLink, ratingKeys, saveReviewLinks, type ReviewLinks } from '@/features/events/ratingApi'
import { tx } from '@/lib/i18n'

const FIELDS: { key: keyof ReviewLinks; label: string; hint: string }[] = [
  { key: 'google', label: 'Google', hint: 'Profil firmy na Google → „Požiadať o recenzie“ → skopírovať odkaz.' },
  { key: 'facebook', label: 'Facebook', hint: 'Adresa vašej stránky s /reviews na konci.' },
  { key: 'web', label: 'Váš web', hint: 'Stránka s recenziami alebo kontaktom.' },
]

/** Odkazy na recenzie firmy: klient ich uvidí po hodnotení 4–5 hviezdičkami. */
export function ReviewLinksSettings({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient()
  const links = useQuery({ queryKey: ratingKeys.links(companyId), queryFn: () => fetchReviewLinks(companyId), retry: false })
  const [draft, setDraft] = useState<ReviewLinks | null>(null)
  const value = draft ?? links.data ?? EMPTY_LINKS
  const save = useMutation({
    mutationFn: () => saveReviewLinks(companyId, value),
    onSuccess: () => setDraft(null),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ratingKeys.links(companyId) }),
  })
  const valid = Object.values(value).every((link) => isSafeLink(link.trim()))
  const submit = (submitted: FormEvent) => {
    submitted.preventDefault()
    if (valid) save.mutate()
  }
  if (links.isError) return <p className="text-sm text-muted-foreground">{tx('Odkazy na recenzie potrebujú migráciu 0184.')}</p>
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border bg-surface p-4">
      <p className="text-sm text-muted-foreground">{tx('Po evente pošlete klientovi odkaz na hodnotenie. Kto dá 4–5 hviezdičiek, uvidí tieto odkazy a môže vás ohodnotiť aj verejne.')}</p>
      {FIELDS.map((field) => (
        <div key={field.key}>
          <Field
            label={tx(field.label)}
            type="url"
            inputMode="url"
            placeholder="https://…"
            maxLength={500}
            error={isSafeLink(value[field.key].trim()) ? undefined : tx('Odkaz musí začínať https://')}
            value={value[field.key]}
            onChange={(changed) => setDraft({ ...value, [field.key]: changed.target.value })}
          />
          <p className="mt-1 text-xs text-muted-foreground">{tx(field.hint)}</p>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!valid || save.isPending || !draft}>{tx('Uložiť')}</Button>
        {save.isSuccess && !draft && <span className="text-sm text-muted-foreground">{tx('Uložené')}</span>}
        {save.isError && <span className="text-sm text-destructive">{tx('Nepodarilo sa uložiť.')}</span>}
      </div>
    </form>
  )
}
