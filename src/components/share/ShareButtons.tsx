import { CalendarPlus, UserPlus } from 'lucide-react'
import { AnchorButton, Button } from '@/components/ui/button'
import { downloadIcs, googleCalendarUrl, type CalendarItem } from '@/lib/ics'
import { downloadVCard, isUsefulContact, type Contact } from '@/lib/vcard'
import { cn } from '@/lib/utils'

/** Uloží kontakt do telefónu / Outlooku (.vcf). Bez telefónu aj e-mailu sa neukáže. */
export function AddToContactsButton({ contact, className, label = 'Do kontaktov' }: { contact: Contact; className?: string; label?: string }) {
  if (!isUsefulContact(contact)) return null
  return (
    <Button variant="outline" size="sm" className={className} onClick={() => downloadVCard(contact)} title="Stiahne kontakt (.vcf), telefón ho ponúkne uložiť">
      <UserPlus className="size-4" aria-hidden />
      {label}
    </Button>
  )
}

/** Pridá termín do kalendára: súbor .ics (telefón, Outlook, Apple) alebo rovno Google Kalendár. */
export function AddToCalendarButtons({ item, className }: { item: CalendarItem; className?: string }) {
  return (
    <span className={cn('inline-flex flex-wrap gap-2', className)}>
      <Button variant="outline" size="sm" onClick={() => downloadIcs(item.title, [item])} title="Stiahne termín (.ics) pre telefón, Outlook alebo Apple Kalendár">
        <CalendarPlus className="size-4" aria-hidden />
        Do kalendára
      </Button>
      <AnchorButton variant="outline" size="sm" href={googleCalendarUrl(item)}>
        Google Kalendár
      </AnchorButton>
    </span>
  )
}
