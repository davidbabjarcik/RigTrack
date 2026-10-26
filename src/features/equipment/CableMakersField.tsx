import { Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { useMembers } from '@/features/companies/useMembers'
import { cn } from '@/lib/utils'

import { type Maker, type MakerMode, type MakerRow, makersOver } from './makers'

export type { Maker, MakerMode, MakerRow } from './makers'

type Props = {
  companyId: string
  mode: MakerMode
  onMode: (mode: MakerMode) => void
  oneName: string
  onOneName: (name: string) => void
  rows: MakerRow[]
  onRow: (key: string, makers: Maker[]) => void
}

const MODES: { id: MakerMode; label: string }[] = [
  { id: 'none', label: 'Nezadávať' },
  { id: 'one', label: 'Všetky jeden človek' },
  { id: 'split', label: 'Rôzni ľudia' },
]

/** Kto káble vyrobil (spájkoval): jeden človek na všetko, alebo pri každej dĺžke kto koľko kusov. */
export function CableMakersField({ companyId, mode, onMode, oneName, onOneName, rows, onRow }: Props) {
  const members = useMembers(companyId)
  const listId = useId()
  const names = (members.data ?? []).map((member) => member.fullName || member.email)

  return (
    <div className="sm:col-span-2">
      <p className="mb-1.5 text-sm font-medium">Kto káble vyrobil</p>
      <div role="radiogroup" aria-label="Kto káble vyrobil" className="mb-2 flex flex-wrap gap-1 rounded-lg bg-muted p-1 sm:inline-flex">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={mode === item.id}
            onClick={() => onMode(item.id)}
            className={cn('rounded-md px-3 py-1.5 text-sm font-medium', mode === item.id ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {item.label}
          </button>
        ))}
      </div>
      <datalist id={listId}>
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {mode === 'one' && (
        <Field label="Kto vyrobil všetky kusy" list={listId} maxLength={80} placeholder="meno" value={oneName} onChange={(event) => onOneName(event.target.value)} />
      )}

      {mode === 'split' && (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const done = row.makers.reduce((sum, maker) => sum + (Number.isFinite(maker.count) ? maker.count : 0), 0)
            const over = makersOver(row)
            const set = (index: number, patch: Partial<Maker>) => onRow(row.key, row.makers.map((maker, i) => (i === index ? { ...maker, ...patch } : maker)))
            return (
              <li key={row.key} className="rounded-lg border p-3">
                <p className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {row.title} · {Number.isFinite(row.quantity) ? row.quantity : 0} ks
                  </span>
                  <span className={over ? 'text-destructive' : 'text-muted-foreground'}>
                    {over ? `Spolu ${done} ks – viac ako ${row.quantity}` : done < row.quantity ? `bez výrobcu ${row.quantity - done} ks` : 'všetky kusy majú výrobcu'}
                  </span>
                </p>
                {row.makers.length > 0 && (
                  <ul className="mb-2 flex flex-col gap-2">
                    {row.makers.map((maker, index) => (
                      <li key={index} className="grid grid-cols-[1fr_6rem_2.5rem] gap-2">
                        <Field label={`Kto – ${row.title}`} hideLabel list={listId} maxLength={80} placeholder="meno" value={maker.name} onChange={(event) => set(index, { name: event.target.value })} />
                        <Field
                          label={`Kusov – ${row.title}`}
                          hideLabel
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={Number.isFinite(maker.count) ? maker.count : ''}
                          onChange={(event) => set(index, { count: event.target.valueAsNumber })}
                        />
                        <Button variant="ghost" className="h-11 px-0" aria-label={`Odobrať výrobcu ${index + 1} – ${row.title}`} onClick={() => onRow(row.key, row.makers.filter((_, i) => i !== index))}>
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={done >= row.quantity}
                  onClick={() => onRow(row.key, [...row.makers, { name: '', count: Math.max(1, row.quantity - done) }])}
                >
                  <Plus className="size-4" aria-hidden />
                  Pridať človeka
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {mode !== 'none' && <p className="mt-1 text-xs text-muted-foreground">V Štatistikách potom uvidíte, kto spravil najviac káblov.</p>}
    </div>
  )
}
