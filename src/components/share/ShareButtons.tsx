import { CalendarPlus, UserPlus } from 'lucide-react'
import { AnchorButton, Button } from '@/components/ui/button'
import { googleCalendarUrl, type CalendarItem } from '@/lib/ics'
import { downloadVCard, isUsefulContact, type Contact } from '@/lib/vcard'
import { cn } from '@/lib/utils'
import { tx } from '@/lib/i18n'

/** Uloží kontakt do telefónu / Outlooku (.vcf). Bez telefónu aj e-mailu sa neukáže. */
export function AddToContactsButton({ contact, className, label = 'Do kontaktov', compact = false }: { contact: Contact; className?: string; label?: string; /** Na mobile len ikona (text ostane pre čítačku). */ compact?: boolean }) {
  if (!isUsefulContact(contact)) return null
  return (
    <Button variant="outline" size="sm" className={className} onClick={() => downloadVCard(contact)} title={tx('Stiahne kontakt (.vcf), telefón ho ponúkne uložiť')}>
      <UserPlus className="size-4" aria-hidden />
      {compact ? <span className="max-sm:sr-only">{label}</span> : label}
    </Button>
  )
}

/** Pridá termín do Google Kalendára. */
export function AddToCalendarButtons({ item, className }: { item: CalendarItem; className?: string }) {
  return (
    <span className={cn('inline-flex flex-wrap gap-2', className)}>
      <AnchorButton variant="outline" size="sm" href={googleCalendarUrl(item)}>
        <CalendarPlus className="size-4" aria-hidden />{tx('Do Google Kalendára')}</AnchorButton>
    </span>
  )
}
