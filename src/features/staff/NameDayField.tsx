import { SelectField } from '@/components/ui/field'
const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december']

/** Meniny: deň a mesiac (bez roka), uložené ako „MM-DD“. */
export function NameDayField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [month = '', day = ''] = value ? value.split('-') : []
  const update = (nextMonth: string, nextDay: string) => onChange(nextMonth && nextDay ? `${nextMonth}-${nextDay}` : '')
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">Meniny</legend>
      <div className="flex gap-2">
        <SelectField label="Deň" hideLabel className="w-24" value={day} onChange={(event) => update(month || '01', event.target.value)}>
          <option value="">deň</option>
          {Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0')).map((option) => (
            <option key={option} value={option}>
              {Number(option)}.
            </option>
          ))}
        </SelectField>
        <SelectField label="Mesiac" hideLabel className="flex-1" value={month} onChange={(event) => update(event.target.value, day || '01')}>
          <option value="">mesiac</option>
          {MONTHS.map((name, index) => (
            <option key={name} value={String(index + 1).padStart(2, '0')}>
              {name}
            </option>
          ))}
        </SelectField>
      </div>
    </fieldset>
  )
}
