import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Copy, Mail, Phone } from 'lucide-react'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { addContact, partnerKeys, savePartner, type Partner } from '@/features/partners/api'
import { fetchLinkedPartners, linkKeys, type LinkedPartner } from './api'

/** Kontakty, ktoré nám zdieľajú prepojené firmy; dajú sa skopírovať do nášho adresára. */
export function LinkedPartnersSection({ companyId, own, canEdit }: { companyId: string; own: Partner[]; canEdit: boolean }) {
  const queryClient = useQueryClient()
  const linked = useQuery({ queryKey: linkKeys.partners(companyId), queryFn: () => fetchLinkedPartners(companyId), retry: false })
  const copy = useMutation({
    mutationFn: async (partner: LinkedPartner) => {
      const id = await savePartner(companyId, null, { name: partner.name, ico: partner.ico, dic: partner.dic, address: partner.address, usesApp: false, note: partner.note })
      for (const contact of partner.contacts) await addContact(companyId, id, contact)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: partnerKeys.list(companyId) }),
  })
  if (!linked.data || linked.data.length === 0) return null
  const have = (partner: LinkedPartner) => own.some((item) => item.name.trim().toLowerCase() === partner.name.trim().toLowerCase())

  return (
    <CollapsibleSection id="partners.linked" title={`Od prepojených firiem (${linked.data.length})`}>
      <ul className="grid gap-3 lg:grid-cols-2">
        {linked.data.map((partner) => (
          <li key={partner.id} className="flex flex-col gap-2 rounded-xl border bg-surface p-4 text-sm">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{partner.name}</p>
                <p className="text-muted-foreground">{[partner.ico && `IČO ${partner.ico}`, partner.address, `zdieľa ${partner.companyName}`].filter(Boolean).join(' · ')}</p>
              </div>
              {canEdit &&
                (have(partner) ? (
                  <span className="text-xs text-muted-foreground">už máme</span>
                ) : (
                  <Button variant="outline" size="sm" disabled={copy.isPending} onClick={() => copy.mutate(partner)}>
                    <Copy className="size-4" aria-hidden />
                    K nám
                  </Button>
                ))}
            </div>
            {partner.contacts.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {partner.contacts.map((contact) => (
                  <li key={`${contact.name}-${contact.phone}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <span className="font-medium">{contact.name}</span>
                    {contact.role && <span className="text-muted-foreground">{contact.role}</span>}
                    {contact.phone && (
                      <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                        <Phone className="size-3.5" aria-hidden />
                        {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 break-all text-accent hover:underline">
                        <Mail className="size-3.5" aria-hidden />
                        {contact.email}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  )
}
