import { useState } from 'react'
import { Field } from '@/components/ui/field'

type Props = { value: string; onChange: (icDph: string) => void; disabled?: boolean }

/** „Platiteľ DPH“: až po zaškrtnutí sa ukáže IČ DPH (neplatiteľ ho nemá, preto sa pri odškrtnutí vymaže). */
export function VatPayerField({ value, onChange, disabled }: Props) {
  const [payer, setPayer] = useState(Boolean(value.trim()))
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4"
          disabled={disabled}
          checked={payer}
          onChange={(event) => {
            setPayer(event.target.checked)
            if (!event.target.checked) onChange('')
          }}
        />
        Platiteľ DPH
      </label>
      {payer ? (
        <Field label="IČ DPH" hideLabel placeholder="IČ DPH, napr. SK2020123456" maxLength={20} disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <p className="text-sm text-muted-foreground">Neplatiteľ DPH – bez IČ DPH.</p>
      )}
    </div>
  )
}
