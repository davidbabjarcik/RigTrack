import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Mail, Pencil, Phone, Plus, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { PhoneContactButton } from '@/components/share/PhoneContactButton'
import { AddToContactsButton } from '@/components/share/ShareButtons'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { setPartnerShared } from '@/features/links/api'
import { FoundCompanyButton } from './FoundCompanyButton'
import { formatDate } from '@/lib/format'
import { addContact, deleteContact, partnerKeys, updateContact, type Partner, type PartnerContact } from './api'

/** Firma / skupina (napr. organizátor) s ľuďmi a ich číslami; pri každom „Do kontaktov“. */
export function PartnerCard({ companyId, partner, canEdit, onEdit, actions }: { companyId: string; partner: Partner; canEdit: boolean; onEdit?: () => void; actions?: ReactNode }) {
  const queryClient = useQueryClient()
  // Pridanie nového človeka ('new') alebo úprava existujúceho (jeho id).
  const [adding, setAdding] = useState<string | null>(null)
  const empty = { name: '', role: '', phone: '', email: '', birthDate: '' }
  const [person, setPerson] = useState<Omit<PartnerContact, 'id'>>(empty)
  const refresh = () => queryClient.invalidateQueries({ queryKey: partnerKeys.list(companyId) })
  const add = useMutation({
    mutationFn: () => (adding && adding !== 'new' ? updateContact(adding, person) : addContact(companyId, partner.id, person)),
    onSuccess: () => {
      setPerson(empty)
      setAdding(null)
    },
    onSettled: refresh,
  })
  const edit = (contact: PartnerContact) => {
    setPerson({ name: contact.name, role: contact.role, phone: contact.phone, email: contact.email, birthDate: contact.birthDate ?? '' })
    setAdding(contact.id)
  }
  const remove = useMutation({ mutationFn: deleteContact, onSettled: refresh })
  const share = useMutation({ mutationFn: (shared: boolean) => setPartnerShared(partner.id, shared), onSettled: refresh })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (person.name.trim()) add.mutate()
  }
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Building2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium break-words">{partner.name}</p>
          <p className="text-sm text-muted-foreground">
            {[partner.legalName && partner.legalName !== partner.name && partner.legalName, partner.ico && `IČO ${partner.ico}`, partner.dic && `DIČ ${partner.dic}`, partner.icDph && `IČ DPH ${partner.icDph}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="text-sm text-muted-foreground">
            {[partner.ceo && `CEO ${partner.ceo}`, partner.address, partner.linkedCompanyId ? 'prepojené v RigTracku' : partner.usesApp && 'používa RigTrack'].filter(Boolean).join(' · ')}
          </p>
        </div>
        {actions}
        {canEdit && onEdit && (
          <Button variant="ghost" size="sm" aria-label={`Upraviť ${partner.name}`} onClick={onEdit}>
            <Pencil className="size-4" aria-hidden />
          </Button>
        )}
      </div>
      {partner.contacts.length > 0 && (
        <ul className="divide-y rounded-lg border text-sm">
          {partner.contacts.map((contact) => (
            <li key={contact.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
              <span className="font-medium">{contact.name}</span>
              {contact.role && <span className="text-muted-foreground">{contact.role}</span>}
              {contact.birthDate && <span className="text-muted-foreground">nar. {formatDate(contact.birthDate)}</span>}
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
              <span className="ml-auto flex items-center gap-1">
                <AddToContactsButton label="Do kontaktov" contact={{ name: contact.name, org: partner.name, title: contact.role, phone: contact.phone, email: contact.email }} />
                {canEdit && (
                  <button type="button" aria-label={`Upraviť ${contact.name}`} className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => edit(contact)}>
                    <Pencil className="size-4" aria-hidden />
                  </button>
                )}
                {canEdit && (
                  <button type="button" aria-label={`Odstrániť ${contact.name}`} className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => remove.mutate(contact.id)}>
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {partner.note && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{partner.note}</p>}
      {canEdit && onEdit && <FoundCompanyButton partner={partner} />}
      {canEdit && onEdit && partner.shared !== undefined && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4"
            checked={partner.shared}
            disabled={share.isPending}
            onChange={(event) => share.mutate(event.target.checked)}
          />
          Zdieľať s prepojenými firmami
        </label>
      )}
      {canEdit &&
        (adding ? (
          <form onSubmit={submit} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <PhoneContactButton
                onPick={(contact) =>
                  setPerson({ name: contact.name || person.name, role: contact.title || person.role, phone: contact.phone || person.phone, email: contact.email || person.email })
                }
              />
            </div>
            {adding !== 'new' && <p className="text-sm font-medium sm:col-span-2">Upraviť človeka</p>}
            <Field label="Meno *" autoFocus maxLength={120} value={person.name} onChange={(event) => setPerson({ ...person, name: event.target.value })} />
            <Field label="Úloha" placeholder="napr. produkcia, technik" maxLength={80} value={person.role} onChange={(event) => setPerson({ ...person, role: event.target.value })} />
            <Field label="Telefón" type="tel" maxLength={40} value={person.phone} onChange={(event) => setPerson({ ...person, phone: event.target.value })} />
            <Field label="E-mail" type="email" maxLength={120} value={person.email} onChange={(event) => setPerson({ ...person, email: event.target.value })} />
            <Field label="Dátum narodenia" type="date" value={person.birthDate ?? ''} onChange={(event) => setPerson({ ...person, birthDate: event.target.value })} />
            {add.isError && <p className="text-sm text-destructive sm:col-span-2">Nepodarilo sa uložiť.</p>}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm" disabled={!person.name.trim() || add.isPending}>
                {adding === 'new' ? 'Pridať človeka' : 'Uložiť'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => (setAdding(null), setPerson(empty))}>
                Zrušiť
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" size="sm" className="self-start" onClick={() => (setPerson(empty), setAdding('new'))}>
            <Plus className="size-4" aria-hidden />
            Pridať človeka
          </Button>
        ))}
    </div>
  )
}
