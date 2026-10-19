import type { UseFormRegister, UseFormSetValue } from 'react-hook-form'
import { PhoneContactButton } from '@/components/share/PhoneContactButton'
import { Field, SelectField } from '@/components/ui/field'
import type { EventFormValues } from '@/features/events/model'
import type { Partner } from './api'

export const NEW_ORGANIZER = 'new'

type Props = {
  partners: Partner[] | undefined
  /** Vybraný organizátor z adresára, NEW_ORGANIZER pre nového, '' = žiadny. */
  value: string
  onChange: (value: string) => void
  register: UseFormRegister<EventFormValues>
  setValue: UseFormSetValue<EventFormValues>
  errors: Partial<Record<'organizer' | 'organizerPerson' | 'organizerPhone' | 'organizerEmail', { message?: string }>>
}

/**
 * Organizátor eventu: firma / skupina z Firmy a kontakty (s jej ľuďmi), alebo nový – ten sa pri uložení
 * eventu založí v adresári a dá sa použiť aj na ďalšie akcie. Bez adresára (stará databáza) len text.
 */
export function OrganizerField({ partners, value, onChange, register, setValue, errors }: Props) {
  const typed = !partners || value === NEW_ORGANIZER
  const chosen = partners?.find((partner) => partner.id === value)
  return (
    <fieldset className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
      <legend className="px-1 text-sm font-medium">Organizátor</legend>
      {partners && (
        <SelectField
          label="Organizátor z Firmy a kontakty"
          className="sm:col-span-2"
          value={value}
          onChange={(event) => {
            const next = event.target.value
            onChange(next)
            const partner = partners.find((item) => item.id === next)
            // Text organizátora sa vyplní aj kvôli tlači eventu.
            const person = partner?.contacts[0]
            setValue('organizer', partner?.name ?? '', { shouldDirty: true })
            setValue('organizerPerson', person?.name ?? '', { shouldDirty: true })
            setValue('organizerPhone', person?.phone ?? '', { shouldDirty: true })
            setValue('organizerEmail', person?.email ?? '', { shouldDirty: true })
          }}
        >
          <option value="">— bez organizátora —</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.name}
              {partner.contacts.length > 0 && ` (${partner.contacts.map((contact) => contact.name).join(', ')})`}
            </option>
          ))}
          <option value={NEW_ORGANIZER}>+ Nový organizátor…</option>
        </SelectField>
      )}
      {chosen && (
        <p className="text-sm text-muted-foreground sm:col-span-2">
          {[chosen.ico && `IČO ${chosen.ico}`, chosen.address].filter(Boolean).join(' · ')}
          {chosen.contacts.length > 0 && ` · ${chosen.contacts.map((contact) => [contact.name, contact.phone].filter(Boolean).join(' ')).join(', ')}`}
        </p>
      )}
      {typed && (
        <>
          <div className="sm:col-span-2">
            <PhoneContactButton
              onPick={(contact) => {
                const opts = { shouldDirty: true }
                if (contact.org) setValue('organizer', contact.org, opts)
                if (contact.name) setValue('organizerPerson', contact.name, opts)
                if (contact.phone) setValue('organizerPhone', contact.phone, opts)
                if (contact.email) setValue('organizerEmail', contact.email, opts)
              }}
            />
          </div>
          <Field label="Organizátor (firma / skupina)" placeholder="napr. JESKO, Mesto Stropkov" error={errors.organizer?.message} {...register('organizer')} />
          <Field label="Kontaktná osoba" placeholder="napr. Simeon" error={errors.organizerPerson?.message} {...register('organizerPerson')} />
          <Field label="Telefón" type="tel" autoComplete="off" error={errors.organizerPhone?.message} {...register('organizerPhone')} />
          <Field label="E-mail" type="email" autoComplete="off" error={errors.organizerEmail?.message} {...register('organizerEmail')} />
          {partners && <p className="text-xs text-muted-foreground sm:col-span-2">Nový organizátor sa uloží do Firmy a kontakty; ďalších ľudí k nemu pridáte pri evente alebo tam.</p>}
        </>
      )}
    </fieldset>
  )
}
