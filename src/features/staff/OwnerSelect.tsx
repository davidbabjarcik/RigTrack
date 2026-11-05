import { UserPlus } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type Ref, type SelectHTMLAttributes } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { useCompany } from '@/features/companies/company-context'
import { can } from '@/lib/permissions'
import { saveStaff } from './api'
import { useStaff } from './useStaff'
import { tx } from '@/lib/i18n'

type Props = SelectHTMLAttributes<HTMLSelectElement> & { companyId: string; error?: string; ref?: Ref<HTMLSelectElement> }

/**
 * Komu technika patrí: firme, alebo zamestnancovi (jeho vlastná). Člen bez karty zamestnanca má hodnotu
 * „m-<id>“ a karta sa mu založí pri uložení – za iného to smie len správca tímu. Správca tímu tu vie
 * rovno založiť aj človeka bez účtu (brigádnika), ktorému technika patrí.
 */
export function OwnerSelect({ companyId, error, ref, onChange, ...props }: Props) {
  const company = useCompany().active!
  const userId = useAuth().session?.user.id
  const staff = useStaff(companyId)
  const canManage = can(company, 'staff.manage')
  const people = staff.people.filter((person) => person.active && (person.staffId || person.memberId === userId || canManage))
  const element = useRef<HTMLSelectElement | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  // Select sa zaregistruje do formulára až s načítanými možnosťami, inak by neukázal uloženú hodnotu.
  if (staff.isPending) {
    return (
      <SelectField label={tx('Vlastník')} disabled>
        <option>{tx('Načítavam…')}</option>
      </SelectField>
    )
  }

  async function addPerson() {
    if (!name.trim()) return
    setSaving(true)
    setFailed(false)
    try {
      const id = await saveStaff(companyId, null, null, { name: name.trim(), position: '', phone: '', email: '', skills: '', note: '', active: true })
      await staff.refetch()
      // Po prekreslení už má select novú možnosť – vyberie sa a formulár sa to dozvie.
      requestAnimationFrame(() => {
        if (element.current) element.current.value = id
        onChange?.({ target: { value: id, name: props.name }, type: 'change' } as unknown as ChangeEvent<HTMLSelectElement>)
      })
      setAdding(false)
      setName('')
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <SelectField
        label={tx('Vlastník')}
        error={error}
        {...props}
        onChange={onChange}
        ref={(node: HTMLSelectElement | null) => {
          element.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
      >
        <option value="">{tx('Firma (')}{company.companyName})</option>
        {people.map((person) => (
          <option key={person.key} value={person.staffId ?? `m-${person.memberId}`}>
            {person.name}{' '}{tx('(vlastná technika)')}{person.isMember ? '' : tx(' – bez účtu')}
          </option>
        ))}
      </SelectField>
      {canManage &&
        (adding ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label={tx('Meno človeka bez účtu')}
              placeholder={tx('Meno a priezvisko')}
              maxLength={120}
              className="h-9 min-w-48 flex-1 rounded-lg border bg-background px-2 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button size="sm" disabled={saving || !name.trim()} onClick={() => void addPerson()}>
              {saving ? tx('Pridávam…') : tx('Pridať')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>{tx('Zrušiť')}</Button>
            {failed && <span className="text-sm text-destructive">{tx('Nepodarilo sa pridať.')}</span>}
          </div>
        ) : (
          <button type="button" className="inline-flex items-center gap-1 self-start text-sm text-accent hover:underline" onClick={() => setAdding(true)}>
            <UserPlus className="size-4" aria-hidden />{tx('Nový človek bez účtu (napr. brigádnik)')}</button>
        ))}
    </div>
  )
}
