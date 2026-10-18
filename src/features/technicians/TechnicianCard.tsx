import { Mail, MapPin, Phone, Wrench } from 'lucide-react'
import type { ReactNode } from 'react'
import { AddToContactsButton } from '@/components/share/ShareButtons'
import { SCOPE_LABELS, technicianContact, type Technician } from './model'

/** Karta technika: kontakt, na čo je a uloženie do kontaktov. */
export function TechnicianCard({ technician, actions }: { technician: Technician; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Wrench className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium break-words">{technician.name}</p>
          <p className="text-sm text-muted-foreground">{[technician.firm, SCOPE_LABELS[technician.scope]].filter(Boolean).join(' · ')}</p>
          {technician.specialization && <p className="text-sm">{technician.specialization}</p>}
        </div>
        {actions}
      </div>
      <div className="flex flex-col gap-1 text-sm">
        {technician.phone && (
          <a href={`tel:${technician.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 text-accent hover:underline">
            <Phone className="size-4" aria-hidden />
            {technician.phone}
          </a>
        )}
        {technician.email && (
          <a href={`mailto:${technician.email}`} className="inline-flex items-center gap-2 break-all text-accent hover:underline">
            <Mail className="size-4" aria-hidden />
            {technician.email}
          </a>
        )}
        {technician.address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(technician.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-accent hover:underline"
          >
            <MapPin className="size-4" aria-hidden />
            {technician.address}
          </a>
        )}
        {technician.note && <p className="whitespace-pre-wrap text-muted-foreground">{technician.note}</p>}
      </div>
      <AddToContactsButton contact={technicianContact(technician)} className="self-start" />
    </div>
  )
}
