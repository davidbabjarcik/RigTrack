import type { SelectHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { SelectField } from '@/components/ui/field'
import { useTechnicians } from './api'
import { servesFor, sortTechnicians, technicianLabel } from './model'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  companyId: string
  kind: 'equipment' | 'vehicles'
  label?: string
  /** Aktuálne vybraný technik sa ukáže, aj keď už nesedí rozsahom. */
  current?: string | null
  className?: string
}

/** Výber servisného technika z adresára. Bez technikov (alebo bez migrácie 0049) len odkáže na adresár. */
export function TechnicianSelect({ companyId, kind, label = 'Servisný technik', current, className, ...props }: Props) {
  const technicians = useTechnicians(companyId)
  const options = sortTechnicians(technicians.data ?? []).filter((technician) => servesFor(technician, kind) || technician.id === current)

  if (technicians.isError) return null
  // Select sa zaregistruje do formulára až s načítanými možnosťami, inak by neukázal uloženú hodnotu.
  if (technicians.isPending) {
    return (
      <div className={className}>
        <SelectField label={label} disabled>
          <option>Načítavam…</option>
        </SelectField>
      </div>
    )
  }
  return (
    <div className={className}>
      <SelectField label={label} {...props}>
        <option value="">— bez technika z adresára —</option>
        {options.map((technician) => (
          <option key={technician.id} value={technician.id}>
            {technicianLabel(technician)}
          </option>
        ))}
      </SelectField>
      {options.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Zatiaľ žiadni.{' '}
          <Link to="/technicians" className="text-accent hover:underline">
            Pridať servisného technika
          </Link>
        </p>
      )}
    </div>
  )
}
