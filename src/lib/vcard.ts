import { downloadText, safeFileName } from './download'

export type Contact = {
  /** Celé meno; keď chýba, použije sa firma. */
  name: string
  org?: string
  title?: string
  phone?: string
  email?: string
  address?: string
  note?: string
}

/** Escapovanie hodnôt podľa vCard 3.0 (čiarka, bodkočiarka, spätná lomka, nový riadok). */
function escape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

/** Kontakt vo formáte vCard 3.0, ktorý vedia importovať telefóny, Outlook aj Google. */
export function buildVCard(contact: Contact) {
  const name = contact.name.trim() || contact.org?.trim() || 'Kontakt'
  const parts = name.split(/\s+/)
  const family = parts.length > 1 ? parts[parts.length - 1] : ''
  const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : name
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${escape(family)};${escape(given)};;;`, `FN:${escape(name)}`]
  if (contact.org?.trim()) lines.push(`ORG:${escape(contact.org.trim())}`)
  if (contact.title?.trim()) lines.push(`TITLE:${escape(contact.title.trim())}`)
  if (contact.phone?.trim()) lines.push(`TEL;TYPE=CELL:${contact.phone.replace(/\s/g, '')}`)
  if (contact.email?.trim()) lines.push(`EMAIL;TYPE=INTERNET:${contact.email.trim()}`)
  if (contact.address?.trim()) lines.push(`ADR;TYPE=WORK:;;${escape(contact.address.trim())};;;;`)
  if (contact.note?.trim()) lines.push(`NOTE:${escape(contact.note.trim())}`)
  lines.push('END:VCARD')
  return lines.join('\r\n') + '\r\n'
}

/** Má kontakt aspoň telefón alebo e-mail (inak ho nemá zmysel ukladať)? */
export function isUsefulContact(contact: Contact) {
  return Boolean(contact.phone?.trim() || contact.email?.trim())
}

export function downloadVCard(contact: Contact) {
  downloadText(`${safeFileName(contact.name || contact.org || '', 'kontakt')}.vcf`, buildVCard(contact), 'text/vcard;charset=utf-8')
}

/** Z voľného textu kontaktu („0900 123 456, jano@firma.sk“) vytiahne telefón a e-mail. */
export function splitContact(text: string) {
  const email = text.match(/[^\s,;]+@[^\s,;]+\.[^\s,;]+/)?.[0] ?? ''
  const phone = text.replace(email, ' ').match(/\+?\d[\d\s/-]{5,}\d/)?.[0]?.trim() ?? ''
  return { phone, email }
}
