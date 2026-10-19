import type { Contact } from './vcard'

type PickedContact = { name?: string[]; tel?: string[]; email?: string[] }
type ContactsManager = { select: (properties: string[], options?: { multiple?: boolean }) => Promise<PickedContact[]> }

function manager() {
  return (navigator as Navigator & { contacts?: ContactsManager }).contacts
}

/** Vie prehliadač otvoriť kontakty telefónu (Chrome na Androide)? iPhone to zatiaľ nevie. */
export function canPickContacts() {
  return typeof navigator !== 'undefined' && typeof manager()?.select === 'function'
}

/** Otvorí výber kontaktu v telefóne; zrušenie vráti null. */
export async function pickPhoneContact(): Promise<Contact | null> {
  const contacts = manager()
  if (!contacts) return null
  const [picked] = await contacts.select(['name', 'tel', 'email'], { multiple: false })
  if (!picked) return null
  return { name: picked.name?.[0]?.trim() ?? '', phone: picked.tel?.[0]?.trim() ?? '', email: picked.email?.[0]?.trim() ?? '' }
}
