import { useState } from 'react'
import { Field, SelectField } from '@/components/ui/field'
import { tx } from '@/lib/i18n'

const OTHER = '__other__'

type Props = {
  label: string
  hideLabel?: boolean
  /** Mená ľudí z tímu (zamestnanci aj brigádnici). */
  names: string[]
  value: string
  onChange: (name: string) => void
}

/**
 * Kto kábel vyrobil: výber zo zamestnancov, alebo „Iná osoba“ a meno sa dopíše. Ukladá sa meno (aj pri ľuďoch mimo
 * tímu), preto staré zápisy s menom mimo zoznamu ostanú ako „Iná osoba“.
 */
export function MakerNameField({ label, hideLabel, names, value, onChange }: Props) {
  const known = names.includes(value)
  const [other, setOther] = useState(() => Boolean(value) && !known)
  const showOther = other || (Boolean(value) && !known)
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SelectField
        label={label}
        hideLabel={hideLabel}
        value={showOther ? OTHER : value}
        onChange={(event) => {
          if (event.target.value === OTHER) {
            setOther(true)
            if (known) onChange('')
          } else {
            setOther(false)
            onChange(event.target.value)
          }
        }}
      >
        <option value="">{tx('— vyberte —')}</option>
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
        <option value={OTHER}>{tx('Iná osoba…')}</option>
      </SelectField>
      {showOther && (
        <Field label={tx('Meno inej osoby')} hideLabel={hideLabel} maxLength={80} placeholder={tx('Meno inej osoby')} value={value} autoComplete="off" onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  )
}
