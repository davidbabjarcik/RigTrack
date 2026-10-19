import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CollapsibleSection } from '@/components/layout/CollapsibleSection'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import type { CompanyEvent } from '@/features/events/model'
import { fetchEventPartners, linkPartner, partnerKeys, setEventOrganizer, unlinkPartner, usePartners, type EventPartner } from './api'
import { PartnerCard } from './PartnerCard'
import { PartnerForm } from './PartnerForm'

const KIND_LABELS: Record<EventPartner['kind'], string> = { organizer: 'Organizátor', partner: 'Spolupracujúca firma' }

/** Organizátor (aj viac firiem pod jednou skupinou) a spolupracujúce firmy pri evente, s ľuďmi a číslami. */
export function EventPartnersSection({ companyId, event, canEdit }: { companyId: string; event: CompanyEvent; canEdit: boolean }) {
  const eventId = event.id
  const queryClient = useQueryClient()
  const partners = usePartners(companyId)
  const key = partnerKeys.ofEvent(companyId, eventId)
  const linked = useQuery({ queryKey: key, queryFn: () => fetchEventPartners(companyId, eventId), retry: false })
  const [choice, setChoice] = useState('')
  const [kind, setKind] = useState<EventPartner['kind']>('organizer')
  const [creating, setCreating] = useState(false)
  const [adding, setAdding] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const link = useMutation({
    mutationFn: (partnerId: string) => linkPartner(companyId, eventId, partnerId, kind),
    onSuccess: () => {
      setChoice('')
      setAdding(false)
    },
    onSettled: refresh,
  })
  // Starý event s organizátorom len ako text: jedným klikom ho uložiť do adresára a priradiť.
  const saveLegacy = useMutation({
    mutationFn: () => setEventOrganizer(companyId, eventId, 'new', event),
    onSettled: () => Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: partnerKeys.list(companyId) })]),
  })
  const unlink = useMutation({ mutationFn: (partnerId: string) => unlinkPartner(eventId, partnerId), onSettled: refresh })
  if (partners.isError || linked.isError || !partners.data || !linked.data) return null

  const rows = linked.data
    .map((item) => ({ ...item, partner: partners.data.find((partner) => partner.id === item.partnerId) }))
    .filter((item) => item.partner)
    .sort((a, b) => Number(b.kind === 'organizer') - Number(a.kind === 'organizer'))
  const available = partners.data.filter((partner) => !linked.data.some((item) => item.partnerId === partner.id))
  const legacy = !rows.some((row) => row.kind === 'organizer') && event.organizer.trim() !== ''

  return (
    <CollapsibleSection id="event.partners" title={`Organizátor a firmy (${rows.length})`}>
      {rows.length > 0 && (
        <ul className="mb-3 flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.partnerId}>
              <PartnerCard
                companyId={companyId}
                partner={row.partner!}
                canEdit={canEdit}
                actions={
                  <>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{KIND_LABELS[row.kind]}</span>
                    {canEdit && (
                      <Button variant="ghost" size="sm" aria-label={`Odobrať ${row.partner!.name} z eventu`} disabled={unlink.isPending} onClick={() => unlink.mutate(row.partnerId)}>
                        <X className="size-4" aria-hidden />
                      </Button>
                    )}
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
      {legacy && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border bg-surface p-4 text-sm">
          <span className="min-w-0 flex-1">
            <span className="text-muted-foreground">Organizátor: </span>
            <span className="font-medium">{event.organizer}</span>
            {[event.organizerPerson, event.organizerPhone, event.organizerEmail].filter(Boolean).length > 0 && (
              <span className="text-muted-foreground"> · {[event.organizerPerson, event.organizerPhone, event.organizerEmail].filter(Boolean).join(', ')}</span>
            )}
          </span>
          {canEdit && (
            <Button size="sm" variant="outline" disabled={saveLegacy.isPending} onClick={() => saveLegacy.mutate()}>
              Uložiť do Firmy a kontakty
            </Button>
          )}
        </div>
      )}
      {canEdit && !adding && !creating && (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden />
          {rows.length === 0 && !legacy ? 'Pridať organizátora' : 'Pridať firmu'}
        </Button>
      )}
      {canEdit &&
        (adding || creating) &&
        (creating ? (
          <PartnerForm
            companyId={companyId}
            current={null}
            onDone={(id) => {
              setCreating(false)
              setAdding(false)
              if (id) link.mutate(id)
            }}
          />
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border bg-surface p-4 sm:flex-row sm:items-end">
            <SelectField label="Firma z adresára" className="sm:flex-1" value={choice} onChange={(event) => setChoice(event.target.value)}>
              <option value="">— vyberte —</option>
              {available.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                  {partner.contacts.length > 0 && ` (${partner.contacts.map((contact) => contact.name).join(', ')})`}
                </option>
              ))}
            </SelectField>
            <SelectField label="Ako" className="sm:w-52" value={kind} onChange={(event) => setKind(event.target.value as EventPartner['kind'])}>
              <option value="organizer">Organizátor</option>
              <option value="partner">Spolupracujúca firma</option>
            </SelectField>
            <Button size="sm" disabled={!choice || link.isPending} onClick={() => link.mutate(choice)}>
              Pridať k eventu
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Nová firma
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Zrušiť
            </Button>
          </div>
        ))}
      <p className="mt-2 text-xs text-muted-foreground">
        Firmy a ich ľudí spravujete v <Link to="/partners" className="text-accent hover:underline">Firmy a kontakty</Link> – použijú sa aj na ďalšie akcie.
      </p>
    </CollapsibleSection>
  )
}
