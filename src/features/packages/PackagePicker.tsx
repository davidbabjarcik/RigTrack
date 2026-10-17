import { useQuery } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/field'
import type { Equipment } from '@/features/equipment/model'
import { fetchPackages, packageKeys } from './api'
import { describePackage, packageAdditions } from './model'

type Props = {
  companyId: string
  equipment: Equipment[]
  cases: { id: string; name: string }[]
  disabled: boolean
  /** Pridá techniku (pripočíta k tomu, čo už je vybrané) a celé cases. */
  onAdd: (additions: { items: { equipmentId: string; quantity: number }[]; cases: string[] }) => void
}

/** Výber balíka a jeho pridanie jedným klikom (event aj výpožička). Bez balíkov sa nezobrazí. */
export function PackagePicker({ companyId, equipment, cases, disabled, onAdd }: Props) {
  const packages = useQuery({ queryKey: packageKeys.list(companyId), queryFn: () => fetchPackages(companyId) })
  const [chosen, setChosen] = useState('')
  const list = packages.data ?? []
  if (list.length === 0) return null
  const pkg = list.find((item) => item.id === chosen)
  const additions = pkg ? packageAdditions(pkg, equipment, cases) : null
  const categories = [...new Set(list.map((item) => item.category))]

  return (
    <div className="mb-3 rounded-xl border bg-surface p-3">
      <div className="flex flex-wrap items-end gap-2">
        <SelectField label="Pridať balík" className="min-w-56 flex-1" value={chosen} onChange={(event) => setChosen(event.target.value)}>
          <option value="">— vyberte balík —</option>
          {categories.map((category) => (
            <optgroup key={category} label={category || 'Ostatné'}>
              {list
                .filter((item) => item.category === category)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </SelectField>
        <Button
          disabled={disabled || !additions || additions.items.length + additions.cases.length === 0}
          onClick={() => {
            if (!additions) return
            onAdd(additions)
            setChosen('')
          }}
        >
          <Package className="size-4" aria-hidden />
          Pridať balík
        </Button>
      </div>
      {pkg && (
        <p className="mt-2 text-xs text-muted-foreground">
          {describePackage(pkg, equipment, cases)}
          {additions && additions.skipped > 0 && ` · ${additions.skipped} položiek už neexistuje, preskočia sa`}
          {pkg.note && ` · ${pkg.note}`}
        </p>
      )}
    </div>
  )
}
