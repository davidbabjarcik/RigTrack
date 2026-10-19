import { Contact as ContactIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { canPickContacts, pickPhoneContact } from '@/lib/contactPicker'
import { parseVCards, type Contact } from '@/lib/vcard'

/**
 * Vyplní človeka z kontaktov telefónu: na Androide (Chrome) otvorí zoznam kontaktov,
 * inde (iPhone, počítač) nahrá kontakt ako súbor .vcf – na iPhone Kontakty → Zdieľať kontakt.
 */
export function PhoneContactButton({ onPick }: { onPick: (contact: Contact) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const picker = canPickContacts()

  async function choose() {
    setMessage('')
    if (!picker) {
      input.current?.click()
      return
    }
    try {
      const contact = await pickPhoneContact()
      if (contact) onPick(contact)
    } catch {
      setMessage('Kontakty telefónu sa nepodarilo otvoriť.')
    }
  }

  async function readFile(file: File) {
    const [contact] = parseVCards(await file.text())
    if (contact) onPick(contact)
    else setMessage('V súbore nie je žiadny kontakt.')
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <Button variant="outline" size="sm" onClick={() => void choose()}>
        <ContactIcon className="size-4" aria-hidden />
        {picker ? 'Z telefónu' : 'Z kontaktu (.vcf)'}
      </Button>
      <input
        ref={input}
        type="file"
        accept=".vcf,text/vcard,text/x-vcard"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void readFile(file)
        }}
      />
      {message && <span className="text-xs text-destructive">{message}</span>}
    </span>
  )
}
