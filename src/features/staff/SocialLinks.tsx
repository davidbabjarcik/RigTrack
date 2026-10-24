import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Pencil } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { getSupabase } from '@/lib/supabase/client'
import { SOCIAL_NETWORKS, socialUrl, type Socials } from './socials'

const key = (companyId: string, staffId: string) => ['company', companyId, 'staff', staffId, 'socials'] as const

/** Sociálne siete na karte zamestnanca (0061); upraviť ich môže človek sám aj správca tímu. */
export function SocialLinks({ companyId, staffId, canEdit }: { companyId: string; staffId: string; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const socials = useQuery({
    queryKey: key(companyId, staffId),
    queryFn: async () => {
      const { data, error } = await getSupabase().from('staff').select('socials').eq('company_id', companyId).eq('id', staffId).maybeSingle()
      if (error) throw error
      return ((data as { socials: Socials } | null)?.socials ?? {}) as Socials
    },
    retry: false,
  })
  const [draft, setDraft] = useState<Socials | null>(null)
  const save = useMutation({
    mutationFn: async (value: Socials) => {
      const clean = Object.fromEntries(Object.entries(value).map(([name, text]) => [name, (text ?? '').trim()]).filter(([, text]) => text))
      const { error } = await getSupabase().from('staff').update({ socials: clean }).eq('company_id', companyId).eq('id', staffId)
      if (error) throw error
    },
    onSuccess: () => setDraft(null),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key(companyId, staffId) }),
  })
  // Bez migrácie 0061 stĺpec chýba – sekcia sa neukáže.
  if (socials.isError || !socials.data) return null
  const filled = SOCIAL_NETWORKS.filter((network) => socials.data[network.key])
  if (filled.length === 0 && !canEdit) return null

  return (
    <CollapsibleSection
      id="staff.socials"
      title="Sociálne siete"
      actions={
        canEdit &&
        !draft && (
          <Button variant="outline" size="sm" onClick={() => setDraft(socials.data)}>
            <Pencil className="size-4" aria-hidden />
            Upraviť
          </Button>
        )
      }
    >
      {draft ? (
        <div className="grid gap-3 rounded-xl border bg-surface p-4 sm:grid-cols-2">
          {SOCIAL_NETWORKS.map((network) => (
            <Field
              key={network.key}
              label={network.label}
              placeholder={network.key === 'web' ? 'napr. jefproduction.sk' : 'meno alebo odkaz'}
              maxLength={200}
              value={draft[network.key] ?? ''}
              onChange={(e) => setDraft({ ...draft, [network.key]: e.target.value })}
            />
          ))}
          {save.isError && <p className="text-sm text-destructive sm:col-span-2">Nepodarilo sa uložiť.</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" disabled={save.isPending} onClick={() => save.mutate(draft)}>
              Uložiť
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)}>
              Zrušiť
            </Button>
          </div>
        </div>
      ) : filled.length === 0 ? (
        <p className="text-sm text-muted-foreground">Zatiaľ nič – pridajte Instagram, Facebook, LinkedIn…</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {filled.map((network) => (
            <li key={network.key}>
              <a
                href={socialUrl(network.base, socials.data[network.key]!)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-lg border bg-surface px-3 py-1.5 text-sm hover:bg-muted"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                {network.label}: {socials.data[network.key]!.replace(/^https?:\/\/(www\.)?/i, '')}
              </a>
            </li>
          ))}
        </ul>
      )}
    </CollapsibleSection>
  )
}
